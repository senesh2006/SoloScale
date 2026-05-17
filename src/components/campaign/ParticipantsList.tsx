"use client";

import type { Attendee } from "@/types/campaign";
import type { AudienceInsights } from "@/types/audienceInsights";
import { format, formatDistanceToNow } from "date-fns";
import { User, Mail, Download, Search, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { glassPanelClass } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import { initials, cn } from "@/lib/utils";

type Props = {
  attendees: Attendee[];
  /** When set, shows "Analyze audience" (Gemini on form responses). */
  eventId?: string;
};

export function ParticipantsList({ attendees, eventId }: Props) {
  const [q, setQ] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insight, setInsight] = useState<AudienceInsights | null>(null);
  const [insightMeta, setInsightMeta] = useState<{
    response_count: number;
  } | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return attendees;
    return attendees.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        a.email.toLowerCase().includes(needle),
    );
  }, [attendees, q]);

  function exportCsv() {
    const header = "name,email,registered_at\n";
    const rows = attendees
      .map((a) => `"${a.name}","${a.email}","${a.created_at}"`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendees.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function analyzeAudience() {
    if (!eventId) return;
    setInsightLoading(true);
    setInsightError(null);
    setInsight(null);
    setInsightMeta(null);
    try {
      const res = await apiFetch<{
        insight: AudienceInsights;
        response_count: number;
      }>(`/api/events/${eventId}/audience-insights`, { method: "POST" });
      setInsight(res.insight);
      setInsightMeta({ response_count: res.response_count });
    } catch (e) {
      setInsightError(
        e instanceof Error ? e.message : "Could not analyze audience",
      );
    } finally {
      setInsightLoading(false);
    }
  }

  function clearInsight() {
    setInsight(null);
    setInsightMeta(null);
    setInsightError(null);
  }

  if (attendees.length === 0) {
    return (
      <EmptyState
        icon={<User className="h-5 w-5" />}
        title="No participants yet"
        description="When people sign up, they'll appear here in real time."
      />
    );
  }

  return (
    <div
      className={cn(
        glassPanelClass,
        "overflow-hidden shadow-[0_1px_2px_rgba(9,9,11,0.05)]",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-4">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${attendees.length} attendees...`}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {eventId ? (
            <Button
              variant="primary"
              size="sm"
              loading={insightLoading}
              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={analyzeAudience}
            >
              Analyze audience
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-3.5 w-3.5" />}
            onClick={exportCsv}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {(insightError || insight) && (
        <div className="border-b border-zinc-100 px-4 py-4">
          {insightError ? (
            <p className="text-sm text-red-600">{insightError}</p>
          ) : insight ? (
            <div className="relative rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-white p-4 text-sm text-zinc-800 shadow-sm">
              <button
                type="button"
                onClick={clearInsight}
                className="absolute right-3 top-3 rounded-md p-1 text-zinc-400 transition-colors hover:bg-white/80 hover:text-zinc-700"
                aria-label="Dismiss insights"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="pr-8 text-xs font-semibold uppercase tracking-wider text-sky-800">
                Smart attendee insights
                {insightMeta ? (
                  <span className="ml-2 font-normal normal-case text-zinc-500">
                    · {insightMeta.response_count} form response
                    {insightMeta.response_count === 1 ? "" : "s"}
                  </span>
                ) : null}
              </p>
              <p className="mt-2 font-medium leading-relaxed text-zinc-900">
                {insight.summary}
              </p>
              {insight.key_segments.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-zinc-500">
                    Audience signals
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-zinc-700">
                    {insight.key_segments.map((line, i) => (
                      <li key={`seg-${i}`}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              {insight.content_recommendations.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-zinc-500">
                    What to do next
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-zinc-700">
                    {insight.content_recommendations.map((line, i) => (
                      <li key={`rec-${i}`}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              {insight.caveats?.trim() ? (
                <p className="mt-3 text-xs text-zinc-500">{insight.caveats}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/40">
              <th className="px-5 py-3 text-xs font-medium text-zinc-500">
                Name
              </th>
              <th className="px-5 py-3 text-xs font-medium text-zinc-500">
                Email
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500">
                Registered
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filtered.map((a) => (
              <tr key={a.id} className="hover:bg-zinc-50/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 text-[11px] font-semibold text-violet-700">
                      {initials(a.name)}
                    </div>
                    <span className="font-medium text-zinc-900">{a.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-zinc-600">
                  <a
                    href={`mailto:${a.email}`}
                    className="inline-flex items-center gap-1.5 hover:text-violet-600"
                  >
                    <Mail className="h-3.5 w-3.5 text-zinc-400" />
                    {a.email}
                  </a>
                </td>
                <td
                  className="px-5 py-3 text-right text-zinc-500"
                  title={format(new Date(a.created_at), "PPpp")}
                >
                  {formatDistanceToNow(new Date(a.created_at))} ago
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-10 text-center text-sm text-zinc-500"
                >
                  No matches for "{q}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
