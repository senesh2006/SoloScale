"use client";

import { useState } from "react";
import type { ConfirmationResult } from "firebase/auth";
import { ArrowRight, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/lib/firebase/auth-context";

type Props = {
  onSuccess: () => void;
  /** Each instance needs its own container id (login vs signup). */
  recaptchaContainerId?: string;
  sendLabel?: string;
  verifyLabel?: string;
};

/**
 * Two-step phone sign-in:
 *   1. Enter E.164 number → Firebase sends an SMS code via reCAPTCHA.
 *   2. Enter the 6-digit code → confirmation completes the sign-in.
 *
 * Uses an invisible reCAPTCHA bound to a hidden div so the user never sees
 * a challenge unless Firebase's risk model demands one.
 */
export function PhoneAuthForm({
  onSuccess,
  recaptchaContainerId = "recaptcha-container",
  sendLabel = "Send code",
  verifyLabel = "Verify & continue",
}: Props) {
  const { startPhoneSignIn } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = phone.trim();
    if (!/^\+\d{6,15}$/.test(trimmed)) {
      setError("Use E.164 format, e.g. +14155551234");
      return;
    }
    setBusy(true);
    try {
      const result = await startPhoneSignIn(trimmed, recaptchaContainerId);
      setConfirmation(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send verification code",
      );
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!confirmation) return;
    setBusy(true);
    try {
      await confirmation.confirm(code.trim());
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid verification code — try again",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!confirmation ? (
        <form onSubmit={sendCode} className="space-y-4">
          <TextField
            name="phone"
            type="tel"
            label="Phone number"
            placeholder="+14155551234"
            leftIcon={<Phone className="h-4 w-4" />}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            hint="Include the country code (E.164)."
          />
          <Button
            type="submit"
            variant="dark"
            size="lg"
            className="w-full"
            loading={busy}
            rightIcon={!busy ? <ArrowRight className="h-4 w-4" /> : undefined}
          >
            {busy ? "Sending code" : sendLabel}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Code sent to <span className="font-semibold">{phone}</span>. Check
            your messages.
          </p>
          <TextField
            name="code"
            label="6-digit code"
            placeholder="123456"
            leftIcon={<ShieldCheck className="h-4 w-4" />}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            required
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setConfirmation(null);
                setCode("");
                setError(null);
              }}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="dark"
              size="lg"
              className="flex-1"
              loading={busy}
              rightIcon={!busy ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              {busy ? "Verifying" : verifyLabel}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {/* Invisible reCAPTCHA target — Firebase mounts the widget here. */}
      <div id={recaptchaContainerId} />
    </div>
  );
}
