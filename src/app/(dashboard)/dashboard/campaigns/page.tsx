"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Campaign, CampaignStatus } from "@/types/campaign";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Plus, Rocket, ArrowUpRight, Search, Sparkles } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { glassPanelClass } from "@/components/ui/Card";

type Filter = "all" | CampaignStatus;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafting" },
  { value: "strategy_ready", label: "Strategy" },
  { value: "assets_ready", label: "Assets" },
  { value: "published", label: "Live" },
];

const progress: Record<CampaignStatus, { pct: string; color: string }> = {
  draft: { pct: "w-1/4", color: "bg-zinc-300" },
  strategy_ready: { pct: "w-1/2", color: "bg-sky-500" },
  assets_ready: { pct: "w-3/4", color: "bg-violet-500" },
  published: { pct: "w-full", color: "bg-emerald-500" },
};

export default function CampaignsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl space-y-8 py-10">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-12 max-w-xl rounded-xl" />
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      <CampaignsPageContent />
    </Suspense>
  );
}

function CampaignsPageContent() {
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    const fromUrl = searchParams.get("q");
    if (fromUrl) setQ(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    apiFetch<{ campaigns: Campaign[] }>("/api/campaigns")
      .then(({ campaigns: c }) => setCampaigns(c))
      .catch(() => setCampaigns([]));
  }, []);

  const filtered = useMemo(() => {
    if (!campaigns) return [];
    return campaigns.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      const needle = q.trim().toLowerCase();
      if (
        needle &&
        !c.title.toLowerCase().includes(needle) &&
        !(c.goal_prompt?.toLowerCase().includes(needle) ?? false)
      ) {
        return false;
      }
      return true;
    });
  }, [campaigns, filter, q]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Campaigns
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Every AI-built strategy, asset, and event in one place.
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>New campaign</Button>
        </Link>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            glassPanelClass,
            "flex flex-wrap gap-1 rounded-xl p-1",
          )}
        >
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.value
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search campaigns..."
            className="h-9 w-full rounded-xl border border-white/45 bg-white/45 pl-9 pr-3 text-sm placeholder:text-zinc-400 backdrop-blur-md transition-colors focus:border-violet-400/80 focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-violet-100/80"
          />
        </div>
      </div>

      {campaigns === null ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        q || filter !== "all" ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="No campaigns match your filters"
            description="Try clearing the search or selecting a different status."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQ("");
                  setFilter("all");
                }}
              >
                Reset filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Rocket className="h-5 w-5" />}
            title="No campaigns yet"
            description="Spin up your first campaign and let the AI agents do the heavy lifting."
            action={
              <Link href="/dashboard/campaigns/new">
                <Button leftIcon={<Sparkles className="h-4 w-4" />}>
                  Create first campaign
                </Button>
              </Link>
            }
          />
        )
      ) : (
        <ul className="grid gap-3">
          {filtered.map((campaign, i) => {
            const p = progress[campaign.status];
            return (
              <li
                key={campaign.id}
                className={cn("animate-fade-up", `stagger-${Math.min(i, 6)}`)}
              >
                <Link
                  href={`/dashboard/campaigns/${campaign.id}`}
                  className={cn(
                    glassPanelClass,
                    "group relative block overflow-hidden p-5 transition-all hover:-translate-y-px hover:border-white/60 hover:shadow-md",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-zinc-950 group-hover:text-violet-700">
                          {campaign.title}
                        </h3>
                        <StatusBadge status={campaign.status} />
                      </div>
                      <p className="line-clamp-1 max-w-2xl text-sm text-zinc-500">
                        {campaign.goal_prompt}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                          Created
                        </p>
                        <p
                          className="text-sm font-semibold text-zinc-900"
                          title={format(new Date(campaign.created_at), "PPpp")}
                        >
                          {formatDistanceToNow(new Date(campaign.created_at))} ago
                        </p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-50 text-zinc-400 transition-colors group-hover:bg-violet-50 group-hover:text-violet-600">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={cn(
                        "h-full transition-all duration-500",
                        p.pct,
                        p.color,
                      )}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
