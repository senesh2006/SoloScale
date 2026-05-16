/**
 * Browser-side helper for uploading an image. Calls POST /api/upload which
 * forwards the file to Firebase Storage and returns its public URL.
 */
export async function uploadImage(
  file: File,
  options: { folder?: string } = {},
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  if (options.folder) form.append("folder", options.folder);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };

  if (!res.ok || !data.url) {
    throw new Error(data.error ?? `Upload failed (${res.status})`);
  }

  return data.url;
}
