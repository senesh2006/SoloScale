import { Timestamp } from "firebase-admin/firestore";

/**
 * Recursively converts admin Firestore `Timestamp`s in a document to ISO strings,
 * so values can cross the JSON boundary cleanly. Other types pass through.
 */
export function serializeFirestore<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (value instanceof Timestamp) {
    return value.toDate().toISOString() as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => serializeFirestore(v)) as unknown as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeFirestore(v);
    }
    return out as unknown as T;
  }
  return value;
}

/** Convert a doc snapshot into `{ id, ...serialized }` for API responses. */
export function snapshotToObject<T = Record<string, unknown>>(snapshot: {
  id: string;
  data: () => Record<string, unknown> | undefined;
}): (T & { id: string }) | null {
  const data = snapshot.data();
  if (!data) return null;
  return { id: snapshot.id, ...(serializeFirestore(data) as object) } as T & {
    id: string;
  };
}
