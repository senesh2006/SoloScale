"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, isToday, isThisWeek } from "date-fns";
import {
  Calendar as CalendarIcon,
  Send,
  MessageSquare,
  Globe,
  X,
  Clock,
  ExternalLink,
  Mail,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { CalendarEntry } from "@/types/campaign";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { glassPanelClass } from "@/components/ui/Card";

const typeIcons: Record<string, React.ElementType> = {
  event: Globe,
  tweet: MessageSquare,
  linkedin: Share2,
  email: Mail,
  reel: Send,
  default: Send,
};

const typeStyles: Record<string, string> = {
  event: "bg-violet-50 text-violet-600 ring-violet-100",
  tweet: "bg-sky-50 text-sky-600 ring-sky-100",
  linkedin: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  email: "bg-amber-50 text-amber-600 ring-amber-100",
  reel: "bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-100",
  default: "bg-zinc-50 text-zinc-600 ring-zinc-100",
};

const typeLabels: Record<string, string> = {
  event: "Event",
  tweet: "Tweet",
  linkedin: "LinkedIn",
  email: "Email",
  reel: "Reel",
};

type Filter = "all" | string;

export default function CalendarPage() {
  const [entries, setEntries] = useState<CalendarEntry[] | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch<{ entries: CalendarEntry[] }>("/api/calendar")
      .then(({ entries: e }) => setEntries(e))
      .catch(() => setEntries([]));
  }, []);

  const filtered = useMemo(() => {
    if (!entries) return [];
    if (filter === "all") return entries;
    return entries.filter((e) => e.type === filter);
  }, [entries, filter]);

  const types = useMemo(() => {
    if (!entries) return [];
    return Array.from(new Set(entries.map((e) => e.type)));
  }, [entries]);

  const thisWeek = entries?.filter((e) => isThisWeek(new Date(e.scheduled_at))).length ?? 0;

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Content calendar
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {entries === null
                ? "Loading…"
                : `${entries.length} items scheduled · ${thisWeek} this week`}
            </p>
          </div>
        </div>
      </header>

      {/* Filter chips */}
      {entries && entries.length > 0 && (
        <div
          className={cn(
            glassPanelClass,
            "mt-8 flex flex-wrap gap-1 rounded-xl p-1",
          )}
        >
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              filter === "all"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:text-zinc-900",
            )}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filter === t
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900",
              )}
            >
              {typeLabels[t] ?? t}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {entries === null ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon className="h-5 w-5" />}
              title="No scheduled content"
              description="Create your first campaign to generate a content calendar."
            />
          ) : (
            <div className="relative space-y-3">
              {filtered.map((entry) => {
                const Icon = typeIcons[entry.type] ?? typeIcons.default;
                const styles = typeStyles[entry.type] ?? typeStyles.default;
                const date = new Date(entry.scheduled_at);
                const isSelected = selectedEntry?.id === entry.id;

                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={cn(
                      glassPanelClass,
                      "group flex w-full items-center gap-4 p-4 text-left transition-all hover:-translate-y-px hover:border-white/60 hover:shadow-md",
                      isSelected
                        ? "border-violet-400/70 ring-2 ring-violet-200/60"
                        : "",
                    )}
                  >
                    <div className="flex w-12 shrink-0 flex-col items-center">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                        {format(date, "MMM")}
                      </span>
                      <span className="text-xl font-semibold tracking-tight text-zinc-950">
                        {format(date, "dd")}
                      </span>
                    </div>

                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
                        styles,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {entry.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                        <span className="truncate">{entry.campaign_title}</span>
                        <span className="text-zinc-300">·</span>
                        <span>{format(date, "h:mm a")}</span>
                        {isToday(date) && (
                          <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                            Today
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            {selectedEntry ? (
              <div
                className={cn(
                  glassPanelClass,
                  "animate-fade-in p-6 shadow-xl shadow-zinc-900/8",
                )}
              >
                <div className="mb-5 flex items-start justify-between">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset",
                      typeStyles[selectedEntry.type] ?? typeStyles.default,
                    )}
                  >
                    {(() => {
                      const Icon =
                        typeIcons[selectedEntry.type] ?? typeIcons.default;
                      return <Icon className="h-4 w-4" />;
                    })()}
                  </div>
                  <button
                    onClick={() => setSelectedEntry(null)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Scheduled
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      {format(
                        new Date(selectedEntry.scheduled_at),
                        "EEEE, MMM d · h:mm a",
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Content
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-700">
                      {selectedEntry.title}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Campaign
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {selectedEntry.campaign_title}
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-zinc-100 pt-5">
                    <Button
                      variant="outline"
                      className="w-full"
                      leftIcon={
                        copied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )
                      }
                      onClick={() => copyText(selectedEntry.title)}
                    >
                      {copied ? "Copied" : "Copy text"}
                    </Button>
                    <Link
                      href={`/dashboard/campaigns/${selectedEntry.campaign_id}`}
                    >
                      <Button
                        variant="dark"
                        className="w-full"
                        leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                      >
                        View campaign
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/45 bg-white/35 p-8 text-center backdrop-blur-md">
                <Clock className="mx-auto h-5 w-5 text-zinc-300" />
                <p className="mt-2 text-xs font-medium text-zinc-500">
                  Select an entry to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
