"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Calendar,
  ChevronRight,
  Menu,
  Rocket,
  Search,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Campaign } from "@/types/campaign";

type Props = {
  onOpenMobileMenu: () => void;
};

export function DashboardTopBar({ onOpenMobileMenu }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRootRef = useRef<HTMLDivElement>(null);
  const notifRootRef = useRef<HTMLDivElement>(null);
  const campaignsCache = useRef<Campaign[] | null>(null);
  const loadInFlight = useRef(false);

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const loadCampaigns = useCallback(async () => {
    if (campaignsCache.current) {
      setCampaigns(campaignsCache.current);
      return;
    }
    if (loadInFlight.current) return;
    loadInFlight.current = true;
    setSearchLoading(true);
    try {
      const { campaigns: c } = await apiFetch<{ campaigns: Campaign[] }>(
        "/api/campaigns",
      );
      campaignsCache.current = c;
      setCampaigns(c);
    } catch {
      campaignsCache.current = [];
      setCampaigns([]);
    } finally {
      loadInFlight.current = false;
      setSearchLoading(false);
    }
  }, []);

  const recent = useMemo(() => {
    if (!campaigns?.length) return [];
    return [...campaigns]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5);
  }, [campaigns]);

  const matches = useMemo(() => {
    if (!campaigns?.length || !query.trim()) return [];
    const n = query.trim().toLowerCase();
    return campaigns
      .filter(
        (c) =>
          c.title.toLowerCase().includes(n) ||
          (c.goal_prompt?.toLowerCase().includes(n) ?? false),
      )
      .slice(0, 8);
  }, [campaigns, query]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (searchRootRef.current?.contains(t)) return;
      setSearchOpen(false);
      if (notifRootRef.current?.contains(t)) return;
      setNotifOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        void loadCampaigns();
        setSearchOpen(true);
        queueMicrotask(() => inputRef.current?.focus());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loadCampaigns]);

  function goCampaign(id: string) {
    setSearchOpen(false);
    setQuery("");
    router.push(`/dashboard/campaigns/${id}`);
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (matches.length > 0) {
      goCampaign(matches[0]!.id);
      return;
    }
    const q = query.trim();
    if (q) {
      setSearchOpen(false);
      router.push(`/dashboard/campaigns?q=${encodeURIComponent(q)}`);
      setQuery("");
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-zinc-200/80 bg-white/80 px-4 backdrop-blur-md sm:px-8">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div ref={searchRootRef} className="relative max-w-md min-w-0 flex-1">
        <form onSubmit={onSearchSubmit} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              void loadCampaigns();
            }}
            onFocus={() => {
              void loadCampaigns();
              setSearchOpen(true);
            }}
            placeholder="Search campaigns, attendees, posts..."
            className="h-9 w-full rounded-xl border border-transparent bg-zinc-100 pl-9 pr-16 text-sm text-zinc-900 placeholder:text-zinc-400 transition-all hover:bg-zinc-50 focus:border-violet-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
            aria-expanded={searchOpen}
            aria-controls="dashboard-search-results"
            autoComplete="off"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 sm:inline">
            ⌘K
          </kbd>
        </form>

        {searchOpen ? (
          <div
            id="dashboard-search-results"
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-[100] max-h-[min(24rem,calc(100dvh-6rem))] overflow-hidden rounded-xl border border-zinc-200/80 bg-white/95 py-1 shadow-lg shadow-zinc-900/12 backdrop-blur-xl"
            role="listbox"
          >
            {searchLoading && campaigns === null ? (
              <p className="px-3 py-2.5 text-xs text-zinc-500">Loading…</p>
            ) : query.trim() ? (
              matches.length > 0 ? (
                <ul className="max-h-64 overflow-y-auto py-1">
                  {matches.map((c) => (
                    <li key={c.id} role="option">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-violet-50"
                        onClick={() => goCampaign(c.id)}
                      >
                        <Rocket className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                        <span className="min-w-0 truncate font-medium">
                          {c.title}
                        </span>
                        <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-2.5">
                  <p className="text-xs text-zinc-500">No campaigns match.</p>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-violet-600 hover:underline"
                    onClick={() => {
                      setSearchOpen(false);
                      router.push(
                        `/dashboard/campaigns?q=${encodeURIComponent(query.trim())}`,
                      );
                      setQuery("");
                    }}
                  >
                    Open campaigns with this query →
                  </button>
                </div>
              )
            ) : (
              <div className="py-1">
                <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Recent campaigns
                </p>
                {recent.length > 0 ? (
                  <ul className="max-h-52 overflow-y-auto">
                    {recent.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-violet-50"
                          onClick={() => goCampaign(c.id)}
                        >
                          <Rocket className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                          <span className="min-w-0 truncate">{c.title}</span>
                          <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-xs text-zinc-500">
                    No campaigns yet. Create one from the sidebar.
                  </p>
                )}
                <p className="border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-500">
                  Type to search by title or goal. Press{" "}
                  <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1">
                    Enter
                  </kbd>{" "}
                  to open the full campaigns list.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div ref={notifRootRef} className="relative shrink-0">
        <button
          type="button"
          className="relative rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
          aria-label="Workspace shortcuts"
          aria-expanded={notifOpen}
          aria-haspopup="true"
          onClick={() => setNotifOpen((v) => !v)}
        >
          <Bell className="h-[18px] w-[18px]" />
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-600 ring-2 ring-white"
            aria-hidden
          />
        </button>

        {notifOpen ? (
          <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-72 rounded-xl border border-zinc-200/80 bg-white/95 p-3 shadow-lg shadow-zinc-900/12 backdrop-blur-xl">
            <p className="text-xs font-semibold text-zinc-900">Workspace</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
              Email reminders and attendee messages are configured per event
              under{" "}
              <strong className="font-medium text-zinc-700">
                Attendee communications
              </strong>{" "}
              on each event page.
            </p>
            <ul className="mt-3 space-y-0.5">
              <li>
                <Link
                  href="/dashboard/calendar"
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-zinc-700 transition-colors hover:bg-violet-50/80"
                  onClick={() => setNotifOpen(false)}
                >
                  <Calendar className="h-4 w-4 text-violet-600" />
                  Content calendar
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/campaigns"
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-zinc-700 transition-colors hover:bg-violet-50/80"
                  onClick={() => setNotifOpen(false)}
                >
                  <Rocket className="h-4 w-4 text-violet-600" />
                  All campaigns
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </header>
  );
}
