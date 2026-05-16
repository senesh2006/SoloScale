"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Globe,
  Loader2,
  MapPin,
  PenSquare,
  Plus,
  Users,
} from "lucide-react";
import type { Event } from "@/types/campaign";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";

type Props = {
  campaignId: string;
  events: Event[];
  onCreate: (title?: string) => Promise<void>;
  canCreate: boolean;
  creating?: boolean;
};

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
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Event landing pages
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Each event has its own page, registrations, and communications
            </p>
          </div>
          {canCreate ? (
            <Button
              variant="dark"
              size="sm"
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
            <Globe className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-800">No events yet</p>
            <p className="mt-1 text-xs text-zinc-500">
              {canCreate
                ? "Create an event to get a landing page and registration."
                : "Generate your strategy first."}
            </p>
            {canCreate ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setModalOpen(true)}
              >
                Create first event
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {events.map((evt) => (
              <li key={evt.id}>
                <Link
                  href={`/dashboard/campaigns/${campaignId}/events/${evt.id}`}
                  className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-violet-50/50"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 group-hover:bg-violet-600 group-hover:text-white">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {evt.landing.headline}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      /e/{evt.slug}
                      {evt.published ? (
                        <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Live
                        </span>
                      ) : (
                        <span className="ml-2 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600">
                          Draft
                        </span>
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {evt.attendee_count} registered
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
                        className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-400 group-hover:border-violet-200 group-hover:text-violet-600"
                        title="Edit landing page"
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
                        className="rounded-lg border border-zinc-100 bg-zinc-50 p-2 text-zinc-300"
                        title="Unpublish the event to edit the landing page"
                      >
                        <PenSquare className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-violet-600" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="sm">
        <form onSubmit={handleCreate}>
          <div className="border-b border-zinc-100 p-6">
            <h2 className="text-lg font-semibold text-zinc-950">New event</h2>
            <p className="mt-1 text-xs text-zinc-500">
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
          <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-4">
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
