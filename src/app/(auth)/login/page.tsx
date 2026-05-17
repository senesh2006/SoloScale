"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowRight, Mail, Lock } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/lib/firebase/auth-context";

type Mode = "email" | "google";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your AI marketing workspace."
      footer={null}
    >
      <div className="h-40 animate-pulse rounded-xl bg-zinc-100" aria-hidden />
    </AuthShell>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const { user, initializing, signInWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTestMode, setShowTestMode] = useState(false);

  useEffect(() => {
    if (!initializing && user) router.replace(next);
  }, [initializing, user, router, next]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      router.replace(next);
    } catch (err) {
      setError(humanizeAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      router.replace(next);
    } catch (err) {
      setError(humanizeAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  function handleTestBypass(e: React.FormEvent) {
    e.preventDefault();
    if (testEmail.trim()) {
      localStorage.setItem("__test_email_bypass", testEmail.trim());
      router.replace(next);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your AI marketing workspace."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-violet-600 hover:text-violet-700"
          >
            Create one free
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-xs text-zinc-500">
          Pick one — email or Google to log in.
        </p>
        <ModeTabs mode={mode} onChange={setMode} />

        {mode === "email" && (
          <form onSubmit={handleEmailLogin} className="space-y-5">
            <TextField
              name="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              rightSlot={
                <Link
                  href="#"
                  className="text-xs font-medium text-violet-600 hover:text-violet-700"
                >
                  Forgot?
                </Link>
              }
            />
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            <Button
              type="submit"
              variant="dark"
              size="lg"
              className="w-full"
              loading={busy}
              rightIcon={!busy ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              {busy ? "Signing in" : "Log in"}
            </Button>
          </form>
        )}

        {mode === "google" && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              Use your Google account to sign in — we&apos;ll never see your
              password.
            </p>
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
            >
              <GoogleMark />
              {busy ? "Opening Google…" : "Continue with Google"}
            </button>
          </div>
        )}

        <div className="border-t border-zinc-200 pt-4">
          <button
            type="button"
            onClick={() => setShowTestMode(!showTestMode)}
            className="text-xs text-zinc-500 hover:text-zinc-700 underline"
          >
            {showTestMode ? "Hide test mode" : "Test mode"}
          </button>
          {showTestMode && (
            <form onSubmit={handleTestBypass} className="mt-3 space-y-3">
              <p className="text-xs text-zinc-500">
                Enter an email to bypass authentication (development only)
              </p>
              <TextField
                name="test-email"
                type="email"
                label="Test Email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <Button
                type="submit"
                variant="dark"
                size="lg"
                className="w-full"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Continue as Test User
              </Button>
            </form>
          )}
        </div>


      </div>
    </AuthShell>
  );
}

function ModeTabs({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Sign-in method"
      className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 text-sm"
    >
      <TabButton
        active={mode === "email"}
        onClick={() => onChange("email")}
        icon={<Mail className="h-3.5 w-3.5" />}
        label="Email"
      />
      <TabButton
        active={mode === "google"}
        onClick={() => onChange("google")}
        icon={<GoogleMark />}
        label="Google"
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors",
        active
          ? "bg-white text-zinc-950 shadow-sm"
          : "text-zinc-500 hover:text-zinc-900",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

function humanizeAuthError(err: unknown): string {
  const code = (err as { code?: string }).code ?? "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return "Invalid email or password.";
  }
  if (code === "auth/user-not-found") {
    return "No account with that email — try signing up.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Sign-in cancelled.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error — check your connection.";
  }
  return err instanceof Error ? err.message : "Could not sign in.";
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.9 35.8 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
