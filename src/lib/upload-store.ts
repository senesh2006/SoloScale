// In-memory file store for mock-mode uploads. Files survive a single
// dev session but are wiped on server restart — exactly like the rest of
// the mock backend. In real mode (`useMocks() === false`), uploads route
// to Firebase Storage instead and this store is unused.

type StoredFile = {
  bytes: Buffer;
  contentType: string;
  filename: string;
  createdAt: number;
};

const globalForUploads = global as unknown as {
  uploads?: Map<string, StoredFile>;
};

const uploads = globalForUploads.uploads ?? new Map<string, StoredFile>();

if (process.env.NODE_ENV !== "production") {
  globalForUploads.uploads = uploads;
}

const MAX_BYTES = 4 * 1024 * 1024; // 4MB hard cap for mock mode
const MAX_TOTAL_FILES = 200; // simple ceiling so a runaway demo can't OOM

function uid() {
  return `up_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function putUpload(input: {
  bytes: Buffer;
  contentType: string;
  filename: string;
}): { id: string; url: string } | { error: string } {
  if (input.bytes.byteLength > MAX_BYTES) {
    return { error: `File exceeds ${MAX_BYTES / 1024 / 1024}MB mock-mode limit` };
  }

  if (uploads.size >= MAX_TOTAL_FILES) {
    // Drop the oldest entry to keep the store bounded.
    const oldest = [...uploads.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt,
    )[0]?.[0];
    if (oldest) uploads.delete(oldest);
  }

  const id = uid();
  uploads.set(id, {
    bytes: input.bytes,
    contentType: input.contentType,
    filename: input.filename,
    createdAt: Date.now(),
  });

  return { id, url: `/api/uploads/${id}` };
}

export function getUpload(id: string): StoredFile | undefined {
  return uploads.get(id);
}
