"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Attendee, Event } from "@/types/campaign";
import { Spinner } from "@/components/ui/Spinner";
import { TicketCard } from "@/components/event/TicketCard";
import { Countdown } from "@/components/event/Countdown";
import { AlertCircle, Calendar, MapPin, ArrowLeft } from "lucide-react";

export default function TicketPage() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<{ attendee: Attendee; event: Event } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ attendee: Attendee; event: Event }>(`/api/tickets/${code}`)
      .then(setData)
      .catch(() => setError("That ticket couldn't be found."));
  }, [code]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <div className="max-w-sm space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold text-zinc-950">
            Ticket not found
          </h1>
          <p className="text-sm text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Spinner size="lg" />
      </div>
    );
  }

  const { attendee, event } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-6 py-16">
      <div className="mx-auto max-w-md space-y-6">
        <a
          href={`/e/${event.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to event page
        </a>

        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Your ticket
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            {event.landing.headline}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            {event.event_date && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(event.event_date).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
            {event.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </span>
            )}
          </div>
        </div>

        <TicketCard attendee={attendee} event={event} />

        {event.event_date && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Starts in
            </p>
            <Countdown target={event.event_date} />
          </div>
        )}

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-xs text-zinc-500">
          Save the QR code or this link — you'll scan it at check-in. Lost the
          email? Just bookmark this page.
        </div>
      </div>
    </div>
  );
}
