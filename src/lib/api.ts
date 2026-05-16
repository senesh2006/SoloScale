import { getCurrentIdToken } from "@/lib/firebase/auth-context";

/**
 * Authenticated `fetch` wrapper for our internal API.
 *
 * - Attaches `Authorization: Bearer <id_token>` automatically when a Firebase
 *   user is signed in (no-op on the server / when nobody is logged in).
 * - On 401, force-refreshes the ID token once and retries (covers expiry).
 * - Throws `Error` with the server's `error` message when `res.ok === false`.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = await getCurrentIdToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(path, { ...init, headers });

  if (res.status === 401 && token) {
    const fresh = await getCurrentIdToken(true);
    if (fresh && fresh !== token) {
      headers.set("Authorization", `Bearer ${fresh}`);
      res = await fetch(path, { ...init, headers });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
