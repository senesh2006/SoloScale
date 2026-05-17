"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Rocket,
  Calendar,
  Menu,
  X,
  Plus,
  Settings,
  LogOut,
  ChevronDown,
  CreditCard,
  MessageCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn, initials } from "@/lib/utils";
import { CampaignNavTree } from "@/components/layout/CampaignNavTree";
import { useAuth } from "@/lib/firebase/auth-context";
import { DashboardChatProvider } from "@/components/chat/dashboard-chat-context";
import { ChatFloatingDock } from "@/components/chat/ChatFloatingDock";
import { DashboardTopBar } from "@/components/layout/DashboardTopBar";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

/** Unsplash: sun rays above clouds (Paweł Czerwiński) — https://unsplash.com/photos/Ih3-ww0fBHM */
const DASHBOARD_BG =
  "https://images.unsplash.com/photo-1536259199821-24af7564fe9b?auto=format&fit=max&w=2400&q=80";

const nav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Rocket },
  { href: "/dashboard/chat", label: "Chat", icon: MessageCircle },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

type MeResponse = {
  uid: string;
  user: { name?: string | null; email?: string | null } | null;
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    apiFetch<MeResponse>("/api/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const displayName =
    me?.user?.name?.trim() ||
    user?.displayName?.trim() ||
    user?.email ||
    user?.phoneNumber ||
    "Your account";
  const displayEmail =
    me?.user?.email?.trim() ||
    user?.email ||
    user?.phoneNumber ||
    me?.uid ||
    "";

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      router.replace("/login");
    }
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <DashboardChatProvider>
      <div className="relative min-h-screen overflow-x-hidden">
        <div
          className="pointer-events-none fixed inset-0 z-0 min-h-[100dvh]"
          aria-hidden
        >
          <Image
            src={DASHBOARD_BG}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center brightness-[0.56]"
            priority={false}
          />
        </div>
        <div
          className="pointer-events-none fixed inset-0 z-[1] min-h-[100dvh] bg-gradient-to-br from-white/78 via-sky-50/38 to-white/84"
          aria-hidden
        />
        <div className="relative z-10 min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur-xl transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm shadow-violet-500/30">
              <span className="font-semibold">S</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-semibold tracking-tight text-zinc-950">
                SoloScale
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Workspace
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pt-2">
          <Link
            href="/dashboard/campaigns/new"
            className="group flex items-center justify-between rounded-xl bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-zinc-800"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </span>
            <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70 sm:inline">
              ⌘N
            </kbd>
          </Link>
        </div>

        <nav className="mt-6 flex flex-col gap-0.5 px-3">
          <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Navigation
          </p>
          {nav.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const isCampaigns = item.href === "/dashboard/campaigns";
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-violet-50 text-violet-700"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] transition-colors",
                      active
                        ? "text-violet-600"
                        : "text-zinc-400 group-hover:text-zinc-600",
                    )}
                  />
                  <span>{item.label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-600" />
                  )}
                </Link>
                {isCampaigns ? (
                  <Suspense
                    fallback={
                      <p className="px-3 py-2 text-xs text-zinc-400">
                        Loading campaigns…
                      </p>
                    }
                  >
                    <CampaignNavTree onNavigate={() => setMobileOpen(false)} />
                  </Suspense>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col border-t border-[0.5px] border-[var(--border)]">
          <div className="p-3">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-zinc-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-white">
                {displayName ? initials(displayName) : "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {displayName || "Loading…"}
                </p>
                <p className="truncate text-xs font-normal text-zinc-500">{displayEmail}</p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
                  userMenuOpen && "rotate-180",
                )}
              />
            </button>
            {userMenuOpen && (
              <div className="mt-1 space-y-0.5 rounded-xl border border-[0.5px] border-[var(--border)] bg-white p-1">
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-normal text-zinc-700 hover:bg-zinc-50">
                  <Settings className="h-4 w-4 text-zinc-400" />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-normal text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-[0.5px] border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <p className="text-[11px] font-medium tracking-wide text-zinc-500">
              Upgrade your plan
            </p>
            <p className="mt-1 text-[11px] font-normal leading-relaxed text-zinc-500">
              Unlock unlimited campaigns and real-time AI.
            </p>
            <Link
              href="/dashboard/billing"
              className="mt-3 block rounded-lg bg-zinc-900 px-3 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-zinc-800"
            >
              See plans
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-zinc-900/40 backdrop-blur-sm lg:hidden"
          aria-hidden
        />
      )}

      {/* Main area */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <DashboardTopBar onOpenMobileMenu={() => setMobileOpen(true)} />

        <main className="px-4 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
    </div>
      <ChatFloatingDock />
    </DashboardChatProvider>
  );
}
