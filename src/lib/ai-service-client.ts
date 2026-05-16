const DEFAULT_URL = "http://localhost:4000";
const CAMPAIGN_TIMEOUT_MS = 180_000;
const DEFAULT_TIMEOUT_MS = 90_000;

export function isAiServiceEnabled(): boolean {
  const raw = process.env.AI_SERVICE_URL?.trim();
  if (raw === "false" || raw === "0" || raw === "") return false;
  return true;
}

export function getAiServiceUrl(): string {
  const raw = process.env.AI_SERVICE_URL?.trim();
  if (!raw || raw === "true") return DEFAULT_URL;
  return raw.replace(/\/$/, "");
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
