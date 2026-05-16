import { createSmartFetch } from "./smartFetch";
import { logger } from "./utils/logger";

/**
 * On some Windows boxes (typically Microsoft Defender real-time scanning,
 * or third-party AV doing TLS inspection), Node's bundled OpenSSL gets
 * `ECONNRESET` mid-response from googleapis.com after ~60s, while curl.exe
 * on the same machine succeeds in seconds.
 *
 * Only Google/Gemini hosts use curl. ElevenLabs and Pixazo use native fetch
 * (avoids curl's --max-time cap on large MP3 / image downloads).
 *
 * Imported for its side effect from `server.ts` BEFORE any module that
 * performs a Gemini request is loaded.
 *
 * To disable (e.g. in CI / on a Mac), set `USE_CURL_FETCH=false`.
 */
if ((process.env.USE_CURL_FETCH ?? "true").toLowerCase() !== "false") {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = createSmartFetch(nativeFetch);
  logger("startup").info(
    "HTTP transport: curl for Google APIs, native fetch for ElevenLabs/Pixazo. Set USE_CURL_FETCH=false to disable.",
  );
}
