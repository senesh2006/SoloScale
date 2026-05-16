"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AssetGenerationPanel } from "@/components/campaign/AssetGenerationPanel";
import { StrategyTimeline } from "@/components/campaign/StrategyTimeline";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { apiFetch } from "@/lib/api";
import type { Asset, Campaign, Event } from "@/types/campaign";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const load = useCallback(async () => {
    const { campaign: c } = await apiFetch<{ campaign: Campaign }>(
      `/api/campaigns/${id}`,
    );
    setCampaign(c);
    if (c.event_id) {
      const { event: e } = await apiFetch<{ event: Event }>(
        `/api/events/${c.event_id}`,
      );
      setEvent(e);
    }
    const { assets: a } = await apiFetch<{ assets: Asset[] }>(
      `/api/campaigns/${id}/assets`,
    );
    setAssets(a);
  }, [id]);

  useEffect(() => {
    load().catch(console.error);
    const timer = setInterval(() => {
      load().catch(() => undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, [load]);

  async function generateAssets() {
    setLoadingAssets(true);
    try {
      await apiFetch(`/api/campaigns/${id}/assets`, { method: "POST" });
      await load();
    } finally {
      setLoadingAssets(false);
    }
  }

  async function publishEvent() {
    if (!event) return;
    const { event: e } = await apiFetch<{ event: Event }>(
      `/api/events/${event.id}/publish`,
      { method: "POST" },
    );
    setEvent(e);
    await load();
  }

  if (!campaign) {
    return <p className="text-sm text-zinc-500">Loading campaign…</p>;
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{campaign.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            {campaign.goal_prompt}
          </p>
        </div>
        <StatusBadge status={campaign.status} />
      </header>

      <section>
        <h2 className="text-lg font-semibold">Strategy timeline</h2>
        <div className="mt-4">
          {campaign.strategy_json ? (
            <>
              <p className="mb-4 text-sm text-zinc-600">
                {campaign.strategy_json.summary}
              </p>
              <StrategyTimeline items={campaign.strategy_json.timeline} />
            </>
          ) : (
            <p className="text-sm text-zinc-500">Generating strategy…</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Assets</h2>
        <div className="mt-4">
          <AssetGenerationPanel
            assets={assets}
            onGenerate={generateAssets}
            loading={loadingAssets}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Event</h2>
        {event ? (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-6">
            <p className="text-3xl font-bold text-violet-600">
              {event.attendee_count}
            </p>
            <p className="text-sm text-zinc-500">registered attendees</p>
            <p className="mt-4 text-sm">
              {event.published ? (
                <>
                  Live at{" "}
                  <Link
                    href={`/e/${event.slug}`}
                    className="font-medium text-violet-600 underline"
                  >
                    /e/{event.slug}
                  </Link>
                </>
              ) : (
                "Not published yet"
              )}
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href={`/dashboard/campaigns/${id}/event/edit`}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
              >
                Edit event page
              </Link>
              {!event.published && (
                <button
                  type="button"
                  onClick={publishEvent}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Publish event
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">Event draft pending…</p>
        )}
      </section>
    </div>
  );
}
