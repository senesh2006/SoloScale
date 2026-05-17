
const DEFAULT_URL = "http://localhost:4000";
const CAMPAIGN_TIMEOUT_MS = 180_000;
const DEFAULT_TIMEOUT_MS = 90_000;

function normalizeEnv(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const t = raw.trim();
  return t === "" ? undefined : t;
}

function localLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

export function getAiServiceUrl(): string {
  const raw = normalizeEnv(process.env.AI_SERVICE_URL);
  if (!raw || raw === "true") return DEFAULT_URL;
  return raw.replace(/\/$/, "");
}

export function isAiServiceEnabled(): boolean {
  const explicit = process.env.AI_SERVICE_URL;
  if (explicit === "") return false;
  const raw = normalizeEnv(explicit);
  if (raw === "false" || raw === "0") return false;

  const baseUrl = getAiServiceUrl();
  if (!process.env.VERCEL) return true;

  try {
    const href = baseUrl.includes("://") ? baseUrl : `http://${baseUrl}`;
    return !localLoopbackHostname(new URL(href).hostname);
  } catch {
    return raw !== undefined;
  }
}

export class AiServiceError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

async function parseAiError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  const msg =
    (data as { message?: string }).message ??
    (data as { error?: string }).error ??
    `AI service HTTP ${res.status}`;
  return msg;
}

export async function aiFetchJson<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchInit } = init;
  const url = `${getAiServiceUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...fetchInit,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Accept: "application/json",
      ...fetchInit.headers,
    },
  });

  if (!res.ok) {
    throw new AiServiceError(await parseAiError(res), res.status);
  }

  return res.json() as Promise<T>;
}

export async function aiFetchMultipart<T>(
  path: string,
  formData: FormData,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const url = `${getAiServiceUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new AiServiceError(await parseAiError(res), res.status);
  }

  return res.json() as Promise<T>;
}

export const AI_TIMEOUT = {
  campaign: CAMPAIGN_TIMEOUT_MS,
  default: DEFAULT_TIMEOUT_MS,
} as const;
