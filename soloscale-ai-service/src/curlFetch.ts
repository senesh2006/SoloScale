import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { fmtBytes, logger } from "./utils/logger";

/**
 * Drop-in `fetch` replacement that delegates to curl.exe as a subprocess.
 *
 * Why: on some Windows boxes (notably with Microsoft Defender real-time
 * scanning or third-party AV doing TLS inspection), Node's bundled
 * OpenSSL gets ECONNRESET mid-response from googleapis.com, while
 * curl.exe (which uses Windows Schannel and is signed/whitelisted by MS)
 * succeeds in seconds.
 *
 * This shim is intentionally minimal: it covers exactly what the
 * `@google/genai` SDK uses (POST with JSON body, optional headers,
 * response with status + headers + body). It is NOT a general-purpose
 * fetch implementation.
 *
 * Installed in `src/httpAgent.ts` by assigning to `globalThis.fetch`
 * BEFORE the SDK is imported.
 */

const CURL = process.platform === "win32" ? "curl.exe" : "curl";

/**
 * Curl exit codes that indicate a transient network/TLS problem worth
 * retrying. Higher-level code (`withRetry`, `tryAcrossKeys`) keys off
 * the `.transient` flag we attach to errors thrown for these codes.
 *
 * Reference: <https://curl.se/libcurl/c/libcurl-errors.html>
 *   6  CURLE_COULDNT_RESOLVE_HOST       transient DNS
 *   7  CURLE_COULDNT_CONNECT
 *   18 CURLE_PARTIAL_FILE               server closed mid-response
 *   28 CURLE_OPERATION_TIMEDOUT
 *   35 CURLE_SSL_CONNECT_ERROR
 *   52 CURLE_GOT_NOTHING                empty reply
 *   55 CURLE_SEND_ERROR                 failed sending data
 *   56 CURLE_RECV_ERROR                 connection reset mid-response  <-- the AV one
 *   92 CURLE_HTTP2_STREAM
 */
const CURL_TRANSIENT_CODES = new Set([6, 7, 18, 28, 35, 52, 55, 56, 92]);

export interface CurlFetchError extends Error {
  /** Exit code from curl.exe. */
  curlExitCode?: number;
  /** True if this error matches a known transient network failure. */
  transient?: boolean;
}

interface CurlResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: Buffer;
}

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

function flattenHeaders(input: FetchInit["headers"]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input) return out;
  if (input instanceof Headers) {
    input.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  if (Array.isArray(input)) {
    for (const [k, v] of input) out[k] = String(v);
    return out;
  }
  for (const [k, v] of Object.entries(input as Record<string, string>)) {
    out[k] = String(v);
  }
  return out;
}

function bodyToBuffer(body: FetchInit["body"]): Buffer | null {
  if (body == null) return null;
  if (typeof body === "string") return Buffer.from(body, "utf-8");
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  // ReadableStream / FormData / Blob etc. not supported - SDK doesn't use them
  throw new TypeError(
    `curlFetch: unsupported body type (${Object.prototype.toString.call(body)})`,
  );
}

function parseRawResponse(raw: Buffer): CurlResult {
  // curl -i emits one or more HTTP response blocks (e.g. 100 Continue then 200).
  // The final response is the last "HTTP/" block. Find the last header/body split.
  const text = raw.toString("binary");
  const headerEnds: number[] = [];
  let idx = 0;
  while (true) {
    const found = text.indexOf("\r\n\r\n", idx);
    if (found === -1) break;
    headerEnds.push(found);
    idx = found + 4;
  }
  if (headerEnds.length === 0) {
    throw new Error("curlFetch: malformed response (no header terminator)");
  }
  // Find the start of the LAST response block. Walk backwards over header ends
  // and find the one whose preceding line starts with "HTTP/".
  let lastHeaderEnd = headerEnds[headerEnds.length - 1];
  let lastBlockStart = 0;
  for (let i = headerEnds.length - 1; i >= 0; i--) {
    const end = headerEnds[i];
    // Find start of this block (after the previous header terminator, or 0)
    const start = i === 0 ? 0 : headerEnds[i - 1] + 4;
    const firstLineEnd = text.indexOf("\r\n", start);
    const statusLine =
      firstLineEnd === -1 ? text.slice(start) : text.slice(start, firstLineEnd);
    if (statusLine.startsWith("HTTP/")) {
      lastBlockStart = start;
      lastHeaderEnd = end;
      break;
    }
  }

  const headerText = text.slice(lastBlockStart, lastHeaderEnd);
  const body = raw.subarray(lastHeaderEnd + 4);

  const lines = headerText.split("\r\n");
  const statusLine = lines.shift() || "";
  const statusMatch = /^HTTP\/[\d.]+\s+(\d{3})\s*(.*)$/.exec(statusLine);
  const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
  const statusText = statusMatch ? statusMatch[2] : "";

  const headers: Record<string, string> = {};
  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const k = line.slice(0, colon).trim().toLowerCase();
    const v = line.slice(colon + 1).trim();
    headers[k] = headers[k] ? `${headers[k]}, ${v}` : v;
  }
  return { status, statusText, headers, body };
}

async function runCurl(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer | null,
  signal: AbortSignal | null | undefined,
): Promise<CurlResult> {
  // Write request body to a temp file so curl can stat it and send a real
  // Content-Length header. Streaming over stdin (`--data-binary @-`) makes
  // curl fall back to chunked transfer encoding, which some CDN edges
  // (e.g. ElevenLabs' Cloudflare) reject with TCP RST.
  let bodyPath: string | null = null;
  if (body) {
    bodyPath = join(tmpdir(), `soloscale-curl-${randomUUID()}.bin`);
    await writeFile(bodyPath, body);
  }

  const args: string[] = [
    "-sS", // silent but show errors
    "-i", // include headers in output
    "-X",
    method,
    "--http1.1", // force HTTP/1.1; matches curl's working baseline
    "--max-time",
    "120", // Gemini only (ElevenLabs/Pixazo use native fetch via smartFetch)
    "--connect-timeout",
    "20",
  ];
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === "content-length") continue; // curl manages it
    args.push("-H", `${k}: ${v}`);
  }
  if (bodyPath) {
    args.push("--data-binary", `@${bodyPath}`);
  }
  args.push(url);

  const cleanup = async () => {
    if (bodyPath) {
      try {
        await unlink(bodyPath);
      } catch {
        /* best effort */
      }
    }
  };

  try {
    return await new Promise<CurlResult>((resolve, reject) => {
      const child = spawn(CURL, args, { windowsHide: true });
      const outChunks: Buffer[] = [];
      let stderr = "";
      let aborted = false;

      const onAbort = () => {
        aborted = true;
        child.kill("SIGTERM");
      };
      if (signal) {
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener("abort", onAbort, { once: true });
        }
      }

      child.stdout.on("data", (chunk: Buffer) => outChunks.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf-8");
      });
      child.on("error", (err) => reject(err));
      child.on("close", (code) => {
        if (signal) signal.removeEventListener("abort", onAbort);
        if (aborted) return reject(new DOMException("Aborted", "AbortError"));
        if (code !== 0) {
          const err: CurlFetchError = new Error(
            `curl exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`,
          );
          if (code != null) {
            err.curlExitCode = code;
            err.transient = CURL_TRANSIENT_CODES.has(code);
          }
          return reject(err);
        }
        try {
          resolve(parseRawResponse(Buffer.concat(outChunks)));
        } catch (e) {
          reject(e);
        }
      });
    });
  } finally {
    await cleanup();
  }
}

export const curlFetch: typeof fetch = async (input, init = {}) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;

  const method = (init.method ?? "GET").toUpperCase();
  const headers = flattenHeaders(init.headers);
  const body = bodyToBuffer(init.body);
  const signal = (init.signal ?? null) as AbortSignal | null;

  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return "unknown-host";
    }
  })();

  const log = logger("curl");
  log.start(
    `${method} ${host}${body ? ` (body ${fmtBytes(body.length)})` : ""}`,
  );

  try {
    const result = await runCurl(url, method, headers, body, signal);
    const sym = result.status >= 400 ? "fail" : "ok";
    const msg = `HTTP ${result.status} (resp ${fmtBytes(result.body.length)})`;
    if (sym === "ok") log.ok(msg);
    else log.fail(msg);
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
    });
  } catch (err) {
    log.fail(err instanceof Error ? err.message : String(err));
    throw err;
  }
};
