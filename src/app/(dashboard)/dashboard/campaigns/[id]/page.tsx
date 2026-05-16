"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  Calendar,
  Image as ImageIcon,
  Globe,
  Users,
  PenSquare,
  Rocket,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Wand2,
  Mail,
  Share2,
} from "lucide-react";
import { AssetGenerationPanel } from "@/components/campaign/AssetGenerationPanel";
import { AddAssetModal } from "@/components/campaign/AddAssetModal";
import { StrategyTimeline } from "@/components/campaign/StrategyTimeline";
import { ParticipantsList } from "@/components/campaign/ParticipantsList";
import { AnnouncementsPanel } from "@/components/campaign/AnnouncementsPanel";
import { ShareLinksPanel } from "@/components/campaign/ShareLinksPanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/payment";
import type {
  Asset,
  AssetKind,
  Campaign,
  Event,
  Attendee,
  FlyerInput,
  VoiceoverInput,
} from "@/types/campaign";

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingKind, setAddingKind] = useState<AssetKind | null>(null);

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
        const { attendees: att } = await apiFetch<{ attendees: Attendee[] }>(
          `/api/events/${c.event_id}/attendees`,
        );
        setAttendees(att);
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

  async function addEventPage() {
    setCreatingEvent(true);
    try {
      await apiFetch(`/api/campaigns/${id}/event`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add event page");
    } finally {
      setCreatingEvent(false);
    }
  }

  async function publishEvent() {
    if (!event) return;
    setPublishing(true);
    try {
      const { event: e } = await apiFetch<{ event: Event }>(
        `/api/events/${event.id}/publish`,
        { method: "POST" },
      );
      setEvent(e);
      await load();
    } finally {
      setPublishing(false);
    }
  }

  function copyLink() {
    if (!event) return;
    const url = `${window.location.origin}/e/${event.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Rocket className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-950">
          Campaign not found
        </h2>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          This campaign may have been deleted or your session expired.
        </p>
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
        onClick={() => router.push("/dashboard/campaigns")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Campaigns
      </button>

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-zinc-200 pb-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              {campaign.title}
            </h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">
            {campaign.goal_prompt}
          </p>
        </div>

        {event && !event.published && (
          <Button
            size="lg"
            leftIcon={<Rocket className="h-4 w-4" />}
            loading={publishing}
            onClick={publishEvent}
          >
            Launch campaign
          </Button>
        )}
      </header>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <Section
            icon={<Calendar className="h-4 w-4" />}
            title="Strategy timeline"
            description="Multi-channel posts queued for the next two weeks"
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
                  <div className="flex h-10 w-10 animate-pulse-soft items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-zinc-900">
                    AI agents are brainstorming…
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Generating your multi-channel strategy
                  </p>
                </div>
              )}
            </Card>
          </Section>

          <Section
            icon={<ImageIcon className="h-4 w-4" />}
            title="Creative assets"
            description="Flyer + voiceover, generated on demand"
          >
            <AssetGenerationPanel
              assets={assets}
              loading={loadingAssets}
              actions={{
                onAdd: (k) => setAddingKind(k),
                onGenerateBoth: generateBoth,
                onRegenerate: regenerateAsset,
                onDelete: deleteAsset,
              }}
            />
          </Section>

          <Section
            icon={<Users className="h-4 w-4" />}
            title="Participants"
            description={`${attendees.length} registered`}
          >
            <ParticipantsList attendees={attendees} />
          </Section>

          {event && (
            <Section
              icon={<Mail className="h-4 w-4" />}
              title="Updates & messages"
              description="Broadcast to everyone registered for this event"
            >
              <AnnouncementsPanel
                eventId={event.id}
                attendeeCount={event.attendee_count}
              />
            </Section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Section
            icon={<Globe className="h-4 w-4" />}
            title="Event hub"
            description="Public landing page and registration"
          >
            {event ? (
              <Card>
                <div className="border-b border-zinc-100 bg-gradient-to-br from-violet-50/60 via-white to-white p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-violet-700/70">
                        Live attendees
                      </p>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-semibold tracking-tight text-zinc-950">
                          {event.attendee_count}
                        </span>
                        <span className="text-sm font-medium text-zinc-500">
                          registered
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                        event.price && event.price.amount_cents > 0
                          ? "bg-violet-100 text-violet-700"
                          : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {formatPrice(event.price)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Updated every few seconds
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-zinc-500">
                      Public link
                    </p>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-xl border bg-zinc-50 p-2 pl-3 text-xs",
                        event.published
                          ? "border-zinc-200"
                          : "border-dashed border-zinc-200 text-zinc-400",
                      )}
                    >
                      {event.published ? (
                        <>
                          <span className="truncate font-mono text-zinc-700">
                            /e/{event.slug}
                          </span>
                          <button
                            onClick={copyLink}
                            className="ml-auto inline-flex h-7 items-center gap-1 rounded-md bg-white px-2 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 hover:text-violet-600"
                          >
                            {copied ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <span className="italic">Draft — not published</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link href={`/dashboard/campaigns/${id}/event/edit`}>
                      <Button
                        variant="outline"
                        className="w-full"
                        leftIcon={<PenSquare className="h-4 w-4" />}
                      >
                        Edit landing page
                      </Button>
                    </Link>
                    {event.published && (
                      <Link href={`/e/${event.slug}`} target="_blank">
                        <Button
                          variant="dark"
                          className="w-full"
                          leftIcon={<ExternalLink className="h-4 w-4" />}
                        >
                          View live page
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ) : campaign.strategy_json ? (
              <Card className="p-6 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  <Globe className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-zinc-900">
                  No event page yet
                </p>
                <p className="mt-1 text-xs leading-snug text-zinc-500">
                  This campaign is strategy-only. Add a public landing page when
                  you&apos;re ready to collect signups.
                </p>
                <Button
                  variant="dark"
                  className="mt-4 w-full"
                  leftIcon={<Sparkles className="h-4 w-4" />}
                  loading={creatingEvent}
                  onClick={addEventPage}
                >
                  Add event page
                </Button>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <Sparkles className="mx-auto h-5 w-5 text-zinc-300 animate-pulse-soft" />
                <p className="mt-3 text-sm text-zinc-500">
                  AI agents are drafting your strategy…
                </p>
              </Card>
            )}
          </Section>

          {event && (
            <Section
              icon={<Share2 className="h-4 w-4" />}
              title="Share links"
              description="UTM-tagged URLs per channel"
            >
              <ShareLinksPanel
                slug={event.slug}
                campaignTitle={campaign.title}
              />
            </Section>
          )}
        </aside>
      </div>

      <AddAssetModal
        open={addingKind !== null}
        kind={addingKind}
        onClose={() => setAddingKind(null)}
        onSubmit={addCustomAsset}
        onGenerateScript={generateScript}
      />
    </div>
  );
}
