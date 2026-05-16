"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Plus,
  Rocket,
  Calendar,
  Users,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Activity,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Campaign, CalendarEntry } from "@/types/campaign";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

type Stat = {
  label: string;
  value: number;
  delta?: string;
  trend?: "up" | "flat";
  icon: React.ElementType;
  accent: string;
};

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [calendar, setCalendar] = useState<CalendarEntry[] | null>(null);

  useEffect(() => {
    apiFetch<{ campaigns: Campaign[] }>("/api/campaigns")
      .then((r) => setCampaigns(r.campaigns))
      .catch(() => setCampaigns([]));
    apiFetch<{ entries: CalendarEntry[] }>("/api/calendar")
      .then((r) => setCalendar(r.entries))
      .catch(() => setCalendar([]));
  }, []);

  const loading = campaigns === null;
  const active = campaigns?.filter((c) => c.status !== "draft").length ?? 0;
  const live = campaigns?.filter((c) => c.status === "published").length ?? 0;
  const upcoming =
    calendar?.filter((e) => new Date(e.scheduled_at) > new Date()).length ?? 0;

  const totalAttendees = 142;

  const stats: Stat[] = [
    {
      label: "Active campaigns",
      value: campaigns?.length ?? 0,
      delta: live ? `${live} live` : undefined,
      trend: "up",
      icon: Rocket,
      accent: "from-violet-500/15 to-violet-500/0 text-violet-600",
    },
    {
      label: "Live this week",
      value: active,
      delta: "+2 vs last week",
      trend: "up",
      icon: Activity,
      accent: "from-emerald-500/15 to-emerald-500/0 text-emerald-600",
    },
    {
      label: "Scheduled posts",
      value: upcoming,
      delta: upcoming ? "Next 7 days" : undefined,
      trend: "flat",
      icon: Calendar,
      accent: "from-sky-500/15 to-sky-500/0 text-sky-600",
    },
    {
      label: "Total attendees",
      value: totalAttendees,
      delta: "Demo data",
      trend: "up",
      icon: Users,
      accent: "from-amber-500/15 to-amber-500/0 text-amber-600",
    },
  ];

  const recent = (campaigns ?? []).slice(0, 4);
  const upNext = (calendar ?? [])
    .filter((e) => new Date(e.scheduled_at) > new Date())
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm font-medium text-zinc-500">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
            Good afternoon, <span className="gradient-text">Senesh</span>
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Here's a snapshot of your workspace activity.
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button leftIcon={<Plus className="h-4 w-4" />} className="shine relative overflow-hidden">
            New campaign
          </Button>
        </Link>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Card
            key={s.label}
            className={cn(
              "group relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-md animate-fade-up",
              `stagger-${i}`,
            )}
          >
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-70 blur-2xl transition-all duration-500 group-hover:scale-125 group-hover:opacity-100",
                s.accent,
              )}
            />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  {s.label}
                </p>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <CountUp value={s.value} />
                  )}
                </div>
                {s.delta ? (
                  <p
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 text-xs font-medium",
                      s.trend === "up" ? "text-emerald-600" : "text-zinc-500",
                    )}
                  >
                    {s.trend === "up" && <TrendingUp className="h-3 w-3" />}
                    {s.delta}
                  </p>
                ) : null}
              </div>
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/80 transition-transform duration-300 group-hover:rotate-6",
                )}
              >
                <s.icon
                  className={cn(
                    "h-5 w-5",
                    s.accent.includes("violet") && "text-violet-600",
                    s.accent.includes("emerald") && "text-emerald-600",
                    s.accent.includes("sky") && "text-sky-600",
                    s.accent.includes("amber") && "text-amber-600",
                  )}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent campaigns */}
        <Card className="lg:col-span-2 animate-fade-up stagger-4">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-950">
                Recent campaigns
              </h2>
              <p className="text-xs text-zinc-500">
                Your latest AI-built marketing flows
              </p>
            </div>
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700"
            >
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-100 border-t border-zinc-100">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))
            ) : recent.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-zinc-500">
                <Sparkles className="mx-auto mb-3 h-5 w-5 text-zinc-300" />
                No campaigns yet. Spin up your first one to see it here.
              </div>
            ) : (
              recent.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/campaigns/${c.id}`}
                  className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-50/60"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 text-violet-600 ring-1 ring-violet-100">
                    <Rocket className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-950 group-hover:text-violet-700">
                        {c.title}
                      </p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      Created {formatDistanceToNow(new Date(c.created_at))} ago
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-violet-600" />
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Up next */}
        <Card className="animate-fade-up stagger-5">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-950">
                Up next
              </h2>
              <p className="text-xs text-zinc-500">Posts hitting the queue</p>
            </div>
            <Link
              href="/dashboard/calendar"
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700"
            >
              Calendar
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="border-t border-zinc-100 p-3">
            {calendar === null ? (
              <div className="space-y-3 p-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : upNext.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-zinc-500">
                <Clock className="mx-auto mb-2 h-4 w-4 text-zinc-300" />
                Nothing scheduled — yet.
              </div>
            ) : (
              <ul className="space-y-1">
                {upNext.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/dashboard/campaigns/${e.campaign_id}`}
                      className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-zinc-50"
                    >
                      <div className="flex w-10 shrink-0 flex-col items-center">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                          {format(new Date(e.scheduled_at), "MMM")}
                        </span>
                        <span className="text-sm font-semibold text-zinc-950">
                          {format(new Date(e.scheduled_at), "dd")}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-zinc-900">
                          {e.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                          {e.campaign_title} · {e.type}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
