import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { fmtBytes, logger } from "../utils/logger";
import {
  SaveOptions,
  SavedAsset,
  StorageAdapter,
} from "./StorageAdapter";

export interface LocalStorageOptions {
  baseDir: string;
  publicBaseUrl: string;
  publicPathPrefix?: string;
}

/**
 * Writes files to a local folder and exposes them over the Express
 * `/uploads` static mount. Intended for solo dev / demo use; Dev 2
 * replaces this with SupabaseStorageAdapter for production.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly baseDir: string;
  private readonly publicBaseUrl: string;
  private readonly publicPathPrefix: string;

  constructor(opts: LocalStorageOptions) {
    this.baseDir = opts.baseDir;
    this.publicBaseUrl = opts.publicBaseUrl.replace(/\/$/, "");
    this.publicPathPrefix = (opts.publicPathPrefix ?? "/uploads").replace(
      /\/$/,
      "",
    );
  }

  async save(buffer: Buffer, opts: SaveOptions): Promise<SavedAsset> {
    const log = logger("storage");
    const folderDir = path.join(this.baseDir, opts.folder);
    await fs.mkdir(folderDir, { recursive: true });

    const filename = `${crypto.randomUUID()}.${opts.ext.replace(/^\./, "")}`;
    const absPath = path.join(folderDir, filename);
    log.start(`writing ${opts.folder}/${filename} (${fmtBytes(buffer.length)})`);
    await fs.writeFile(absPath, buffer);

    const relPath = `${opts.folder}/${filename}`;
    log.ok(`-> ${this.getUrl(relPath)}`);
    return {
      url: this.getUrl(relPath),
      path: relPath,
      mimeType: opts.mimeType,
    };
  }

  getUrl(relPath: string): string {
    const normalized = relPath.replace(/^\/+/, "");
    return `${this.publicBaseUrl}${this.publicPathPrefix}/${normalized}`;
  }

  async delete(relPath: string): Promise<void> {
    const absPath = path.join(this.baseDir, relPath);
    try {
      await fs.unlink(absPath);
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== "ENOENT") throw err;
    }
  }
}
