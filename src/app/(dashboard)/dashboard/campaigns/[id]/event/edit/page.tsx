"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Campaign, Event } from "@/types/campaign";

export default function EventEditPage() {
  const { id: campaignId } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ campaign: Campaign }>(`/api/campaigns/${campaignId}`)
      .then(({ campaign }) => {
        if (!campaign.event_id) return;
        return apiFetch<{ event: Event }>(`/api/events/${campaign.event_id}`);
      })
      .then((res) => res && setEvent(res.event))
      .catch(console.error);
  }, [campaignId]);

  async function save() {
    if (!event) return;
    setSaving(true);
    try {
      await apiFetch(`/api/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          landing: event.landing,
          form_fields: event.form_fields,
        }),
      });
      router.push(`/dashboard/campaigns/${campaignId}`);
    } finally {
      setSaving(false);
    }
  }

  if (!event) {
    return <p className="text-sm text-zinc-500">Loading event…</p>;
  }

  return (
    <div className="grid max-w-5xl gap-8 lg:grid-cols-2">
      <div>
        <h1 className="text-2xl font-bold">Edit event page</h1>
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Headline
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={event.landing.headline}
              onChange={(e) =>
                setEvent({
                  ...event,
                  landing: { ...event.landing, headline: e.target.value },
                })
              }
            />
          </label>
          <label className="block text-sm font-medium">
            Subhead
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={event.landing.subhead}
              onChange={(e) =>
                setEvent({
                  ...event,
                  landing: { ...event.landing, subhead: e.target.value },
                })
              }
            />
          </label>
          <label className="block text-sm font-medium">
            Body
            <textarea
              className="mt-1 min-h-32 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={event.landing.body_md}
              onChange={(e) =>
                setEvent({
                  ...event,
                  landing: { ...event.landing, body_md: e.target.value },
                })
              }
            />
          </label>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-8">
        <p className="text-xs uppercase tracking-wide text-violet-600">
          Preview
        </p>
        <h2 className="mt-2 text-2xl font-bold">{event.landing.headline}</h2>
        <p className="mt-1 text-zinc-600">{event.landing.subhead}</p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-700">
          {event.landing.body_md}
        </p>
      </div>
    </div>
  );
}
