export type StorageFolder = "flyers" | "voiceovers";

export interface SaveOptions {
  folder: StorageFolder;
  ext: string;
  mimeType: string;
}

export interface SavedAsset {
  url: string;
  path: string;
  mimeType: string;
}

/**
 * StorageAdapter is the seam that lets Developer 2 swap LocalStorageAdapter
 * for a SupabaseStorageAdapter without touching service code.
 *
 * Implementations MUST:
 * - Return an absolute, publicly fetchable URL from `save`.
 * - Treat `path` as the opaque internal identifier (e.g. file path or
 *   Supabase object key) used by `delete` and `getUrl`.
 */
export interface StorageAdapter {
  save(buffer: Buffer, opts: SaveOptions): Promise<SavedAsset>;
  getUrl(path: string): string;
  delete(path: string): Promise<void>;
}
