import path from "node:path";

import { config } from "../config";
import { LocalStorageAdapter } from "./LocalStorageAdapter";
import { StorageAdapter } from "./StorageAdapter";

export type { StorageAdapter, SaveOptions, SavedAsset } from "./StorageAdapter";

let cached: StorageAdapter | null = null;

/**
 * Factory: returns the configured StorageAdapter singleton.
 *
 * To add a new driver (e.g. Supabase):
 *   1. Implement `StorageAdapter` in a new file.
 *   2. Add another `case` below and a value to STORAGE_DRIVER.
 *   3. Set STORAGE_DRIVER=supabase in the env. No service code changes.
 */
export function getStorage(): StorageAdapter {
  if (cached) return cached;

  const projectRoot = path.resolve(__dirname, "..", "..");

  switch (config.storageDriver) {
    case "local":
      cached = new LocalStorageAdapter({
        baseDir: path.join(projectRoot, "uploads"),
        publicBaseUrl: config.publicBaseUrl,
        publicPathPrefix: "/uploads",
      });
      return cached;
    default: {
      const driver: string = config.storageDriver;
      throw new Error(`Unknown STORAGE_DRIVER: ${driver}`);
    }
  }
}
