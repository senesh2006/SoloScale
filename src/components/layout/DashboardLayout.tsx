"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Rocket,
  Calendar,
  Search,
  Bell,
  Menu,
  X,
  Plus,
  Settings,
  LogOut,
  ChevronDown,
  CreditCard,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn, initials } from "@/lib/utils";
import { CampaignNavTree } from "@/components/layout/CampaignNavTree";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Rocket },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

type MeResponse = {
  uid: string;
  user: { name?: string | null; email?: string | null } | null;
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    apiFetch<MeResponse>("/api/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const displayName = me?.user?.name?.trim() || (me?.uid ? "Your account" : "");
  const displayEmail = me?.user?.email?.trim() || me?.uid || "";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 lg:translate-x-0",
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

        <div className="mt-auto p-3">
          <div className="group relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-300/30 blur-2xl animate-float-slow"
            />
            <p className="relative text-xs font-semibold text-violet-900">
              Upgrade your plan
            </p>
            <p className="relative mt-1 text-xs text-violet-700/80">
              Unlock unlimited campaigns and real-time AI.
            </p>
            <Link
              href="/dashboard/billing"
              className="relative mt-3 block overflow-hidden rounded-lg bg-violet-600 px-3 py-1.5 text-center text-xs font-semibold text-white shadow-sm transition-all hover:bg-violet-500 shine"
            >
              See plans
            </Link>
          </div>

          <div className="mt-3 border-t border-zinc-100 pt-3">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-zinc-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 text-xs font-semibold text-white">
                {displayName ? initials(displayName) : "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {displayName || "Loading…"}
                </p>
                <p className="truncate text-xs text-zinc-500">{displayEmail}</p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
                  userMenuOpen && "rotate-180",
                )}
              />
            </button>
            {userMenuOpen && (
              <div className="mt-1 space-y-0.5 rounded-xl border border-zinc-100 bg-white p-1 shadow-sm">
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                  <Settings className="h-4 w-4 text-zinc-400" />
                  Settings
                </button>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
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
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-zinc-200/80 bg-white/80 px-4 backdrop-blur-md sm:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              placeholder="Search campaigns, attendees, posts..."
              className="h-9 w-full rounded-xl border border-transparent bg-zinc-100 pl-9 pr-16 text-sm text-zinc-900 placeholder:text-zinc-400 transition-all hover:bg-zinc-50 focus:border-violet-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 sm:inline">
              ⌘K
            </kbd>
          </div>

          <button
            className="relative rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-1.5 top-1.5 inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-violet-600 ring-2 ring-white" />
              <span className="absolute inset-0 rounded-full bg-violet-500 animate-ping-soft" />
            </span>
          </button>
        </header>

        <main className="px-4 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
