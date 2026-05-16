"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  Globe,
  Users,
  PenSquare,
  Rocket,
  Copy,
  Check,
  ExternalLink,
  Mail,
  Share2,
} from "lucide-react";
import { ParticipantsList } from "@/components/campaign/ParticipantsList";
import { AttendeeCommunicationsPanel } from "@/components/campaign/AttendeeCommunicationsPanel";
import { ShareLinksPanel } from "@/components/campaign/ShareLinksPanel";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/payment";
import type { Campaign, Event, Attendee } from "@/types/campaign";

export default function EventDetailPage() {
  const router = useRouter();
  const { id: campaignId, eventId } = useParams<{
    id: string;
    eventId: string;
  }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { campaign: c } = await apiFetch<{ campaign: Campaign }>(
        `/api/campaigns/${campaignId}`,
      );
      setCampaign(c);
      const { event: e } = await apiFetch<{ event: Event }>(
        `/api/events/${eventId}`,
      );
      if (e.campaign_id !== campaignId) {
        setError("This event does not belong to that campaign");
        return;
      }
      setEvent(e);
      const { attendees: att } = await apiFetch<{ attendees: Attendee[] }>(
        `/api/events/${eventId}/attendees`,
      );
      setAttendees(att);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    }
  }, [campaignId, eventId]);

  useEffect(() => {
    load().catch(console.error);
    const timer = setInterval(() => {
      load().catch(() => undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, [load]);

  async function publishEvent() {
    if (!event) return;
    setPublishing(true);
    try {
      const { event: e } = await apiFetch<{ event: Event }>(
        `/api/events/${event.id}/publish`,
        { method: "POST" },
      );
      setEvent(e);
    } finally {
      setPublishing(false);
    }
  }

  function copyLink() {
    if (!event) return;
    navigator.clipboard.writeText(`${window.location.origin}/e/${event.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link href={`/dashboard/campaigns/${campaignId}`} className="mt-4 inline-block">
          <Button variant="outline">Back to campaign</Button>
        </Link>
      </div>
    );
  }

  if (!event || !campaign) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-16">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <Link
          href="/dashboard/campaigns"
          className="hover:text-zinc-900"
        >
          Campaigns
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/campaigns/${campaignId}`}
          className="hover:text-zinc-900"
        >
          {campaign.title}
        </Link>
        <span>/</span>
        <span className="font-medium text-zinc-900">{event.landing.headline}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-zinc-200 pb-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-violet-600">
            Event · landing page
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
            {event.landing.headline}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            {event.landing.subhead}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Campaign topic:{" "}
            <Link
              href={`/dashboard/campaigns/${campaignId}`}
              className="font-medium text-violet-700 hover:underline"
            >
              {campaign.title}
            </Link>
          </p>
        </div>

        {!event.published ? (
          <Button
            size="lg"
            leftIcon={<Rocket className="h-4 w-4" />}
            loading={publishing}
            onClick={publishEvent}
          >
            Publish event
          </Button>
        ) : (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Live
          </span>
        )}
      </header>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <Section
            icon={<Users className="h-4 w-4" />}
            title="Participants"
            description={`${attendees.length} registered`}
          >
            <ParticipantsList attendees={attendees} />
          </Section>

          <Section
            icon={<Mail className="h-4 w-4" />}
            title="Attendee communications"
            description="Reminders and broadcasts for this event"
          >
            <AttendeeCommunicationsPanel
              eventId={event.id}
              campaignId={campaignId}
              attendeeCount={event.attendee_count}
              eventDate={event.event_date ?? null}
              eventTitle={event.landing.headline}
            />
          </Section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Section
            icon={<Globe className="h-4 w-4" />}
            title="Landing page"
            description="Public registration and event details"
          >
            <Card>
              <div className="border-b border-zinc-100 bg-gradient-to-br from-violet-50/60 via-white to-white p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-violet-700/70">
                  Registrations
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold tracking-tight text-zinc-950">
                    {event.attendee_count}
                  </span>
                  <span className="text-sm font-medium text-zinc-500">
                    attendees
                  </span>
                </div>
                <span
                  className={cn(
                    "mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    event.price && event.price.amount_cents > 0
                      ? "bg-violet-100 text-violet-700"
                      : "bg-emerald-100 text-emerald-700",
                  )}
                >
                  {formatPrice(event.price)}
                </span>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-zinc-500">
                    Public URL
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
                          type="button"
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
                      <span className="italic">Draft — publish to go live</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/events/${eventId}/edit`}
                  >
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
          </Section>

          <Section
            icon={<Share2 className="h-4 w-4" />}
            title="Share links"
            description="UTM-tagged URLs for this event"
          >
            <ShareLinksPanel
              slug={event.slug}
              campaignTitle={campaign.title}
            />
          </Section>
        </aside>
      </div>
    </div>
  );
}
