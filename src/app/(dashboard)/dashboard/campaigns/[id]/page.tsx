"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  Calendar,
  Image as ImageIcon,
  Globe,
  Rocket,
  Sparkles,
  Wand2,
} from "lucide-react";
import { AssetGenerationPanel } from "@/components/campaign/AssetGenerationPanel";
import { AddAssetModal } from "@/components/campaign/AddAssetModal";
import { StrategyTimeline } from "@/components/campaign/StrategyTimeline";
import { CampaignEventsPanel } from "@/components/campaign/CampaignEventsPanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/api";
import type {
  Asset,
  AssetKind,
  Campaign,
  Event,
  FlyerInput,
  VoiceoverInput,
} from "@/types/campaign";

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignEvents, setCampaignEvents] = useState<Event[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingFromStrategy, setLoadingFromStrategy] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingKind, setAddingKind] = useState<AssetKind | null>(null);

  const load = useCallback(async () => {
    try {
      const { campaign: c } = await apiFetch<{ campaign: Campaign }>(
        `/api/campaigns/${id}`,
      );
      setCampaign(c);

      if (c.strategy_json) {
        const { events } = await apiFetch<{ events: Event[] }>(
          `/api/campaigns/${id}/events`,
        );
        setCampaignEvents(events);
      } else {
        setCampaignEvents([]);
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
  }, [load]);

  async function generateBoth() {
    setLoadingAssets(true);
    try {
      await apiFetch(`/api/campaigns/${id}/assets`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await load();
    } finally {
      setLoadingAssets(false);
    }
  }

  async function generateFromStrategy(kind: AssetKind | "both" = "both") {
    setLoadingFromStrategy(true);
    try {
      await apiFetch(`/api/campaigns/${id}/assets/strategy`, {
        method: "POST",
        body: JSON.stringify({ kind }),
      });
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate from strategy",
      );
    } finally {
      setLoadingFromStrategy(false);
    }
  }

  async function fillAssetFromStrategy(kind: AssetKind) {
    const data = await apiFetch<{
      flyer?: FlyerInput;
      voice?: VoiceoverInput;
    }>(`/api/campaigns/${id}/assets/strategy`, {
      method: "POST",
      body: JSON.stringify({ kind, preview: true }),
    });
    if (kind === "flyer" && data.flyer) {
      return {
        prompt: data.flyer.prompt,
        headline: data.flyer.headline,
        subtext: data.flyer.subtext,
        label: data.flyer.label,
      };
    }
    if (kind === "voiceover" && data.voice) {
      return { script: data.voice.script, label: data.voice.label };
    }
    throw new Error("No strategy brief available");
  }

  async function addCustomAsset(payload: {
    kind: AssetKind;
    flyer?: FlyerInput;
    voice?: VoiceoverInput;
  }) {
    await apiFetch(`/api/campaigns/${id}/assets`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await load();
  }

  async function regenerateAsset(assetId: string) {
    await apiFetch(`/api/campaigns/${id}/assets/${assetId}/regenerate`, {
      method: "POST",
    });
    await load();
  }

  async function deleteAsset(assetId: string) {
    await apiFetch(`/api/campaigns/${id}/assets/${assetId}`, {
      method: "DELETE",
    });
    await load();
  }

  async function generateScript(hint?: string): Promise<string> {
    const { script } = await apiFetch<{ script: string }>(
      `/api/campaigns/${id}/script`,
      {
        method: "POST",
        body: JSON.stringify(hint ? { hint } : {}),
      },
    );
    return script;
  }

  async function createCampaignEvent(title?: string) {
    setCreatingEvent(true);
    try {
      const { event: created } = await apiFetch<{ event: Event }>(
        `/api/campaigns/${id}/events`,
        {
          method: "POST",
          body: JSON.stringify(title ? { title } : {}),
        },
      );
      router.push(`/dashboard/campaigns/${id}/events/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setCreatingEvent(false);
    }
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Rocket className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-950">Campaign not found</h2>
        <Link href="/dashboard/campaigns" className="mt-6">
          <Button variant="dark" leftIcon={<ChevronLeft className="h-4 w-4" />}>
            Back to campaigns
          </Button>
        </Link>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-16">
      <button
        type="button"
        onClick={() => router.push("/dashboard/campaigns")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Campaigns
      </button>

      <header className="border-b border-zinc-200 pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-violet-600">
            Campaign topic
          </p>
          <StatusBadge status={campaign.status} />
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
          {campaign.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          {campaign.goal_prompt}
        </p>
        <p className="mt-4 text-xs text-zinc-500">
          Strategy and creative assets live here. Each{" "}
          <strong className="font-medium text-zinc-700">event</strong> under this
          campaign has its own landing page, registrations, and communications.
        </p>
      </header>

      <Section
        icon={<Globe className="h-4 w-4" />}
        title="Events"
        description="Landing pages, signups, and attendee tools — one per occurrence or venue"
      >
        <CampaignEventsPanel
          campaignId={id}
          events={campaignEvents}
          onCreate={createCampaignEvent}
          canCreate={Boolean(campaign.strategy_json)}
          creating={creatingEvent}
        />
      </Section>

      <Section
        icon={<Calendar className="h-4 w-4" />}
        title="Strategy"
        description="Multi-channel plan for this campaign topic"
        action={
          campaign.strategy_json ? (
            <Link href={`/dashboard/campaigns/${id}/strategy/edit`}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Wand2 className="h-3.5 w-3.5" />}
              >
                Edit strategy
              </Button>
            </Link>
          ) : undefined
        }
      >
        <Card className="p-6">
          {campaign.strategy_json ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-100 bg-gradient-to-br from-zinc-50 to-white p-4 text-sm leading-relaxed text-zinc-700">
                {campaign.strategy_json.summary}
              </div>
              <StrategyTimeline items={campaign.strategy_json.timeline} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-5 w-5 text-violet-600 animate-pulse-soft" />
              <p className="mt-3 text-sm font-medium text-zinc-900">
                Generating strategy…
              </p>
            </div>
          )}
        </Card>
      </Section>

      <Section
        icon={<ImageIcon className="h-4 w-4" />}
        title="Creative assets"
        description="Flyers and voiceovers for this campaign topic"
      >
        <AssetGenerationPanel
          assets={assets}
          loading={loadingAssets}
          loadingFromStrategy={loadingFromStrategy}
          hasStrategy={Boolean(campaign.strategy_json)}
          actions={{
            onAdd: (k) => setAddingKind(k),
            onGenerateBoth: generateBoth,
            onGenerateFromStrategy: generateFromStrategy,
            onRegenerate: regenerateAsset,
            onDelete: deleteAsset,
          }}
        />
      </Section>

      <AddAssetModal
        open={addingKind !== null}
        kind={addingKind}
        hasStrategy={Boolean(campaign?.strategy_json)}
        onClose={() => setAddingKind(null)}
        onSubmit={addCustomAsset}
        onGenerateScript={generateScript}
        onFillFromStrategy={fillAssetFromStrategy}
      />
    </div>
  );
}
