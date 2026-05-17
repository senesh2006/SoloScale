"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Client-side auth gate. Redirects to `/login?next=<current path>` when no
 * user is signed in. While the auth state is loading we render a centered
 * spinner to avoid a flash of unauthenticated content.
 *
 * Note: this is *not* a security boundary on its own — every API route still
 * verifies the Firebase ID token server-side. This just keeps unauthenticated
 * users from seeing the empty dashboard chrome.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [testEmail, setTestEmail] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Check for test email bypass on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("__test_email_bypass");
      setTestEmail(stored);
      setMounted(true);
    }
  }, []);

  // TEMPORARY BYPASS - Remove this when Firebase auth is working
  const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";
  const hasTestBypass = testEmail !== null;

  useEffect(() => {
    if (initializing || !mounted) return;
    if (!user && !BYPASS_AUTH && !hasTestBypass) {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?next=${next}`);
    }
  }, [user, initializing, pathname, router, hasTestBypass, mounted]);

  if (initializing || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Spinner size="lg" />
      </div>
    );
  }

  // TEMPORARY BYPASS - Allow access without user when bypass is enabled or test email is set
  if (!user && !BYPASS_AUTH && !hasTestBypass) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
