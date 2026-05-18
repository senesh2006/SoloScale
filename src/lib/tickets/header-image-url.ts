/**
 * Normalize and validate ticket header background image references.
 * Accepts full http(s) URLs, protocol-relative //..., site-relative /...,
 * and bare host/path (https:// added).
 */

export const TICKET_IMAGE_URL_MAX_LEN = 300_000;

export function normalizeTicketHeaderImageUrl(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("//")) {
    return `https:${t}`;
  }
  if (t.startsWith("/") && !t.startsWith("//")) {
    return t;
  }
  if (!/^https?:\/\//i.test(t)) {
    if (
      /^[\w.-]+(?:\.[\w.-]+)+(?:\/[^\s]*)?$/i.test(t) ||
      /^localhost(?::\d+)?(?:\/[^\s]*)?$/i.test(t)
    ) {
      return `https://${t}`;
    }
  }
  return t;
}

export function isValidTicketHeaderImageRef(s: string): boolean {
  const t = s.trim();
  if (t === "") return false;
  if (t.startsWith("/") && !t.startsWith("//")) {
    if (t.length < 2 || /\s/.test(t)) return false;
    if (/\.\.(?:\/|%2[fF])/.test(t)) return false;
    return true;
  }
  const n = normalizeTicketHeaderImageUrl(t);
  try {
    const u = new URL(n);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
