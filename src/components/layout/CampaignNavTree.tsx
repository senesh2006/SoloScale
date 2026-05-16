"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Calendar,
  ChevronRight,
  Globe,
  Loader2,
  Plus,
  Rocket,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Campaign, Event } from "@/types/campaign";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

type Props = {
  onNavigate?: () => void;
};

export function CampaignNavTree({ onNavigate }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeEventId =
    pathname.match(
      /^\/dashboard\/campaigns\/[^/]+\/events\/([^/]+)/,
    )?.[1] ?? searchParams.get("eventId");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [eventsByCampaign, setEventsByCampaign] = useState<
    Record<string, Event[]>
  >({});
  const [loadingEvents, setLoadingEvents] = useState<Set<string>>(new Set());

  const [createFor, setCreateFor] = useState<Campaign | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const loadedEventsRef = useRef<Set<string>>(new Set());

  const loadCampaigns = useCallback(() => {
    setLoading(true);
    apiFetch<{ campaigns: Campaign[] }>("/api/campaigns")
      .then((r) => setCampaigns(r.campaigns))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns, pathname]);

  const loadEvents = useCallback(async (campaignId: string, force = false) => {
    if (!force && loadedEventsRef.current.has(campaignId)) return;
    setLoadingEvents((prev) => new Set(prev).add(campaignId));
    try {
      const { events } = await apiFetch<{ events: Event[] }>(
        `/api/campaigns/${campaignId}/events`,
      );
      loadedEventsRef.current.add(campaignId);
      setEventsByCampaign((prev) => ({ ...prev, [campaignId]: events }));
    } catch {
      loadedEventsRef.current.add(campaignId);
      setEventsByCampaign((prev) => ({ ...prev, [campaignId]: [] }));
    } finally {
      setLoadingEvents((prev) => {
        const next = new Set(prev);
        next.delete(campaignId);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    const match = pathname.match(/^\/dashboard\/campaigns\/([^/]+)/);
    const campaignId = match?.[1];
    if (!campaignId || campaignId === "new") return;
    setExpanded((prev) => new Set(prev).add(campaignId));
    loadEvents(campaignId);
  }, [pathname, loadEvents]);

  function toggleCampaign(campaignId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
        void loadEvents(campaignId);
      }
      return next;
    });
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!createFor) return;
    setCreating(true);
    try {
      const { event } = await apiFetch<{ event: Event }>(
        `/api/campaigns/${createFor.id}/events`,
        {
          method: "POST",
          body: JSON.stringify(newTitle.trim() ? { title: newTitle.trim() } : {}),
        },
      );
      loadedEventsRef.current.delete(createFor.id);
      await loadEvents(createFor.id, true);
      setExpanded((prev) => new Set(prev).add(createFor.id));
      setCreateFor(null);
      setNewTitle("");
      onNavigate?.();
      router.push(
        `/dashboard/campaigns/${createFor.id}/events/${event.id}`,
      );
    } finally {
      setCreating(false);
    }
  }

  const activeCampaignId = pathname.match(
    /^\/dashboard\/campaigns\/([^/]+)/,
  )?.[1];

  return (
    <>
      <div className="mt-2 border-t border-zinc-100 pt-3">
        <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Your campaigns
        </p>

        {loading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : campaigns.length === 0 ? (
          <p className="px-3 py-2 text-xs text-zinc-500">No campaigns yet</p>
        ) : (
          <ul className="max-h-[min(40vh,320px)] space-y-0.5 overflow-y-auto px-1">
            {campaigns.map((campaign) => {
              const isOpen = expanded.has(campaign.id);
              const isCampaignActive = activeCampaignId === campaign.id;
              const events = eventsByCampaign[campaign.id];
              const eventsLoading = loadingEvents.has(campaign.id);

              return (
                <li key={campaign.id}>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => toggleCampaign(campaign.id)}
                      className={cn(
                        "flex h-8 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700",
                        isOpen && "text-violet-600",
                      )}
                      aria-label={isOpen ? "Collapse" : "Expand"}
                    >
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 transition-transform",
                          isOpen && "rotate-90",
                        )}
                      />
                    </button>
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      onClick={onNavigate}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                        isCampaignActive
                          ? "bg-violet-50 font-medium text-violet-800"
                          : "text-zinc-700 hover:bg-zinc-50",
                      )}
                    >
                      <Rocket className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      <span className="truncate">{campaign.title}</span>
                    </Link>
                  </div>

                  {isOpen ? (
                    <ul className="ml-4 border-l border-zinc-200 pl-2 pt-0.5">
                      {eventsLoading && !events ? (
                        <li className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-500">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading events…
                        </li>
                      ) : null}
                      {(events ?? []).map((evt) => {
                        const eventHref = `/dashboard/campaigns/${campaign.id}/events/${evt.id}`;
                        const eventActive =
                          isCampaignActive && activeEventId === evt.id;
                        return (
                          <li key={evt.id}>
                            <Link
                              href={eventHref}
                              onClick={onNavigate}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] transition-colors",
                                eventActive
                                  ? "bg-violet-100/80 font-medium text-violet-900"
                                  : "text-zinc-600 hover:bg-zinc-50",
                              )}
                            >
                              <Calendar className="h-3 w-3 shrink-0 text-zinc-400" />
                              <span className="truncate">
                                {evt.landing.headline}
                              </span>
                              {evt.published ? (
                                <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                              ) : null}
                            </Link>
                          </li>
                        );
                      })}
                      {(events ?? []).length === 0 && !eventsLoading ? (
                        <li className="px-2 py-1 text-[11px] text-zinc-500">
                          No events yet
                        </li>
                      ) : null}
                      <li>
                        <button
                          type="button"
                          disabled={!campaign.strategy_json}
                          title={
                            campaign.strategy_json
                              ? "Add event"
                              : "Generate strategy first"
                          }
                          onClick={() => {
                            if (!campaign.strategy_json) return;
                            setCreateFor(campaign);
                            setNewTitle("");
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors",
                            campaign.strategy_json
                              ? "text-violet-700 hover:bg-violet-50"
                              : "cursor-not-allowed text-zinc-400",
                          )}
                        >
                          <Plus className="h-3 w-3" />
                          Add event
                        </button>
                      </li>
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href="/dashboard/campaigns"
          onClick={onNavigate}
          className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          <Globe className="h-3.5 w-3.5" />
          View all campaigns
        </Link>
      </div>

      <Modal
        open={createFor !== null}
        onClose={() => setCreateFor(null)}
        size="sm"
      >
        <form onSubmit={createEvent}>
          <div className="border-b border-zinc-100 p-5">
            <h2 className="text-base font-semibold text-zinc-950">New event</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Under {createFor?.title}
            </p>
          </div>
          <div className="p-5">
            <TextField
              name="title"
              label="Event name (optional)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. VIP dinner, Day 2 workshop"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateFor(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="dark" loading={creating}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
