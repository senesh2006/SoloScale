"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AssetGenerationPanel } from "@/components/campaign/AssetGenerationPanel";
import { StrategyTimeline } from "@/components/campaign/StrategyTimeline";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { apiFetch } from "@/lib/api";
import type { Asset, Campaign, Event } from "@/types/campaign";
import { ChevronLeft, Calendar, Image as ImageIcon, Globe, Users, PenSquare, Rocket, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
    }
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

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600">
          <Rocket className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-zinc-950">Campaign not found</h2>
        <p className="mt-2 text-sm text-zinc-500">
          This campaign might have been deleted or the session expired.
        </p>
        <Link
          href="/dashboard/campaigns"
          className="mt-6 rounded-xl bg-zinc-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-all"
        >
          Back to Campaigns
        </Link>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-20">
      <button 
        onClick={() => router.push("/dashboard/campaigns")}
        className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Campaigns
      </button>

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-zinc-200 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950">{campaign.title}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="max-w-2xl text-zinc-600">
            {campaign.goal_prompt}
          </p>
        </div>
        
        {event && !event.published && (
           <button
            onClick={publishEvent}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 transition-all"
          >
            <Rocket className="h-4 w-4" />
            Launch Campaign
          </button>
        )}
      </header>

      <div className="grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="h-5 w-5 text-violet-600" />
              <h2 className="text-xl font-bold">Strategy Timeline</h2>
            </div>
            
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
              {campaign.strategy_json ? (
                <div className="space-y-6">
                  <div className="rounded-xl bg-zinc-50 p-4 border border-zinc-100 italic text-zinc-600 text-sm">
                    "{campaign.strategy_json.summary}"
                  </div>
                  <StrategyTimeline items={campaign.strategy_json.timeline} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-10 w-10 animate-bounce rounded-full bg-violet-100 flex items-center justify-center text-violet-600 mb-4">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-zinc-900">AI agents are brainstorming...</p>
                  <p className="text-xs text-zinc-500 mt-1">Generating your multi-channel strategy</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-6">
              <ImageIcon className="h-5 w-5 text-violet-600" />
              <h2 className="text-xl font-bold">Creative Assets</h2>
            </div>
            <AssetGenerationPanel
              assets={assets}
              onGenerate={generateAssets}
              loading={loadingAssets}
            />
          </section>
        </div>

        <aside className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Globe className="h-5 w-5 text-violet-600" />
              <h2 className="text-xl font-bold">Event Hub</h2>
            </div>
            
            {event ? (
              <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
                <div className="bg-zinc-50 p-6 border-b border-zinc-200">
                   <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tighter text-violet-600">
                      {event.attendee_count}
                    </span>
                    <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                      Attendees
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">Real-time registration tracking</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Public Link</p>
                    <div className="flex items-center gap-2 rounded-lg bg-zinc-100 p-2 text-xs font-mono text-zinc-600 overflow-hidden">
                      {event.published ? (
                        <Link
                          href={`/e/${event.slug}`}
                          className="truncate hover:text-violet-600 transition-colors"
                        >
                          soloscale.com/e/{event.slug}
                        </Link>
                      ) : (
                        <span className="italic">Draft (Unpublished)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/dashboard/campaigns/${id}/event/edit`}
                      className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold hover:bg-zinc-50 transition-colors"
                    >
                      <PenSquare className="h-4 w-4" />
                      Edit Landing Page
                    </Link>
                    
                    {event.published && (
                       <Link
                        href={`/e/${event.slug}`}
                        target="_blank"
                        className="flex items-center justify-center gap-2 rounded-xl bg-zinc-950 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        View Live Page
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
                <p className="text-sm text-zinc-500 italic">Event details are being drafted by AI...</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
