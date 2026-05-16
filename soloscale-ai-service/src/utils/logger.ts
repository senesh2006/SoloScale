import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Tiny logger built around AsyncLocalStorage so any code path can stamp lines
 * with the current request ID without us having to thread it through every
 * function signature.
 *
 * Output format:
 *   HH:MM:SS.mmm  rNNNN  [scope]              SYM  message
 *
 * Symbols:
 *   >    starting an operation (records start time)
 *   OK   succeeded (prints duration since last `start`)
 *   FAIL failed (prints duration + reason)
 *   ..   informational mid-step (no timing)
 *
 * Read the terminal top-to-bottom by request ID to follow each request's
 * lifecycle even when multiple are in flight in parallel.
 */

interface RequestContext {
  id: string;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

let reqCounter = 0;

export function nextReqId(): string {
  reqCounter = (reqCounter + 1) % 10000;
  return `r${reqCounter.toString().padStart(4, "0")}`;
}

export function runInRequest<T>(id: string, fn: () => T): T {
  return requestContext.run({ id }, fn);
}

export function currentReqId(): string {
  return requestContext.getStore()?.id ?? "----";
}

function ts(): string {
  const d = new Date();
  const hms = [
    d.getHours().toString().padStart(2, "0"),
    d.getMinutes().toString().padStart(2, "0"),
    d.getSeconds().toString().padStart(2, "0"),
  ].join(":");
  return `${hms}.${d.getMilliseconds().toString().padStart(3, "0")}`;
}

export interface Logger {
  start(message: string): void;
  ok(message?: string): void;
  fail(message: string): void;
  info(message: string): void;
  durationMs(): number;
}

export function logger(scope: string): Logger {
  const tag = `[${scope}]`.padEnd(20);
  let startedAt = 0;

  const out = (symbol: string, message: string): void => {
    // eslint-disable-next-line no-console
    console.log(`${ts()}  ${currentReqId()}  ${tag}  ${symbol}  ${message}`);
  };

  return {
    start(message: string) {
      startedAt = Date.now();
      out("> ", message);
    },
    ok(message?: string) {
      const ms = startedAt ? Date.now() - startedAt : 0;
      out("OK", `${ms}ms${message ? ` - ${message}` : ""}`);
    },
    fail(message: string) {
      const ms = startedAt ? Date.now() - startedAt : 0;
      out("XX", `${ms}ms - ${message}`);
    },
    info(message: string) {
      out("..", message);
    },
    durationMs() {
      return startedAt ? Date.now() - startedAt : 0;
    },
  };
}

/** Compact byte/duration formatters used in messages. */
export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
