"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
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

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?next=${next}`);
    }
  }, [user, initializing, pathname, router]);

  if (initializing || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
