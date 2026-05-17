/**
 * Sends email via Resend’s HTTP API (no SDK dependency).
 */

const RESEND_URL = "https://api.resend.com/emails";

export async function sendBulkEmailViaResend(args: {
  to: string[];
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey?.trim() || !from?.trim()) {
    return { ok: false, error: "missing_resend_config" };
  }
  const unique = [...new Set(args.to.map((e) => e.trim().toLowerCase()))].filter(
    Boolean,
  );
  if (unique.length === 0) {
    return { ok: false, error: "no_recipient_emails" };
  }

  for (const to of unique) {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: args.subject,
        text: args.text,
        ...(args.html ? { html: args.html } : {}),
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        error: `resend_${res.status}:${errText.slice(0, 400)}`,
      };
    }
  }

  return { ok: true };
}
