"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Loader2,
  MapPin,
  PenSquare,
  Plus,
  Users,
} from "lucide-react";
import type { Event } from "@/types/campaign";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/utils";

const REGISTRATION_TARGET_DEFAULT = 20;

const LIVE_STRIPE = "#3B6D11";
const DRAFT_STRIPE = "#B4B2A9";
const PROGRESS_FILL = "#7F77DD";

type Props = {
  campaignId: string;
  events: Event[];
  onCreate: (title?: string) => Promise<void>;
  canCreate: boolean;
  creating?: boolean;
};

function EventGroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="bg-[var(--surface-muted)] px-5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label} · {count} event{count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function EventRow({ campaignId, evt }: { campaignId: string; evt: Event }) {
  const isLive = evt.published;
  const target = REGISTRATION_TARGET_DEFAULT;
  const count = evt.attendee_count ?? 0;
  const pct = Math.min(100, (count / target) * 100);

  return (
    <li className="border-b border-[0.5px] border-[var(--border)] last:border-b-0">
      <Link
        href={`/dashboard/campaigns/${campaignId}/events/${evt.id}`}
        className={cn(
          "group flex items-start gap-4 border-l-[3px] py-4 pl-4 pr-5 transition-colors hover:bg-[var(--surface-muted)]",
        )}
        style={{
          borderLeftColor: isLive ? LIVE_STRIPE : DRAFT_STRIPE,
        }}
      >
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-zinc-500 ring-[0.5px] ring-[var(--border)]">
          <Calendar className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">
            {evt.landing.headline}
          </p>
          <p className="mt-0.5 truncate text-xs font-normal text-zinc-500">
            /e/{evt.slug}
          </p>
          <p className="mt-2 text-[11px] font-normal text-zinc-500">
            {count} / {target} target
          </p>
          <div className="mt-1 h-1 w-full max-w-xs rounded-full bg-zinc-200">
            <div
              className="h-1 rounded-full"
              style={{
                width: `${pct}%`,
                backgroundColor: PROGRESS_FILL,
              }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-normal text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {count} registered
            </span>
            {evt.event_date ? (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(evt.event_date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            ) : null}
            {evt.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {evt.location}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!evt.published ? (
            <span
              className="rounded-lg border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-2 text-zinc-400 transition-colors group-hover:text-zinc-700"
              title="Edit landing page"
              role="presentation"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/dashboard/campaigns/${campaignId}/events/${evt.id}/edit`;
              }}
            >
              <PenSquare className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span
              className="rounded-lg border-[0.5px] border-[var(--border-muted)] bg-[var(--surface-muted)] p-2 text-zinc-400"
              title="Unpublish the event to edit the landing page"
            >
              <PenSquare className="h-3.5 w-3.5" />
            </span>
          )}
          <ArrowRight className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-zinc-600" />
        </div>
      </Link>
    </li>
  );
}

export function CampaignEventsPanel({
  campaignId,
  events,
  onCreate,
  canCreate,
  creating,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { live, draft } = useMemo(() => {
    const l = events.filter((e) => e.published);
    const d = events.filter((e) => !e.published);
    return { live: l, draft: d };
  }, [events]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreate(title.trim() || undefined);
      setTitle("");
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border-[0.5px] border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[0.5px] border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-sm font-medium text-zinc-900">
              Event landing pages
            </p>
            <p className="mt-0.5 text-xs font-normal text-zinc-500">
              Each event has its own page, registrations, and communications
            </p>
          </div>
          {canCreate ? (
            <Button
              variant="dark"
              size="sm"
              className="font-medium"
              leftIcon={
                creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )
              }
              disabled={creating}
              onClick={() => setModalOpen(true)}
            >
              New event
            </Button>
          ) : null}
        </div>

        {events.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Calendar className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-800">
              No events yet
            </p>
            <p className="mt-1 text-xs font-normal text-zinc-500">
              {canCreate
                ? "Create an event to get a landing page and registration."
                : "Generate your strategy first."}
            </p>
            {canCreate ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 font-medium"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setModalOpen(true)}
              >
                Create first event
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="list-none p-0">
            {live.length > 0 ? (
              <>
                <EventGroupLabel label="Live" count={live.length} />
                {live.map((evt) => (
                  <EventRow key={evt.id} campaignId={campaignId} evt={evt} />
                ))}
              </>
            ) : null}
            {draft.length > 0 ? (
              <>
                <EventGroupLabel label="Draft" count={draft.length} />
                {draft.map((evt) => (
                  <EventRow key={evt.id} campaignId={campaignId} evt={evt} />
                ))}
              </>
            ) : null}
          </ul>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="sm">
        <form onSubmit={handleCreate}>
          <div className="border-b border-[0.5px] border-[var(--border)] p-6">
            <h2 className="text-lg font-medium text-zinc-950">New event</h2>
            <p className="mt-1 text-xs font-normal text-zinc-500">
              A new landing page under this campaign topic. Strategy copy is used
              as the starting point.
            </p>
          </div>
          <div className="p-6">
            <TextField
              name="title"
              label="Event name (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Workshop night, VIP session"
              hint="Leave blank to use your strategy headline"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-[0.5px] border-[var(--border)] bg-[var(--surface-muted)] px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="dark" loading={submitting}>
              Create event
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
