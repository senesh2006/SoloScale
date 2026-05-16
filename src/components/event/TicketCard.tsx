"use client";

import { Calendar, MapPin, Ticket as TicketIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  attendee: { name: string; email: string; ticket_code?: string };
  event: {
    landing: { headline: string };
    event_date?: string | null;
    location?: string | null;
    slug: string;
  };
  className?: string;
};

export function TicketCard({ attendee, event, className }: Props) {
  const code = attendee.ticket_code ?? "PENDING";
  const ticketUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/t/${code}`
      : `/t/${code}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
    ticketUrl,
  )}`;

  const dateLabel = event.event_date
    ? new Date(event.event_date).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Date TBA";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl",
        className,
      )}
    >
      <div className="bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-90">
            <TicketIcon className="h-3.5 w-3.5" />
            Admit one
          </div>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur">
            confirmed
          </span>
        </div>
        <h3 className="mt-3 text-xl font-bold leading-tight">
          {event.landing.headline}
        </h3>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {dateLabel}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              {event.location}
            </span>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-zinc-50" />
        <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-zinc-50" />
        <div className="border-b border-dashed border-zinc-200" />
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Attendee
          </p>
          <p className="mt-1 text-base font-bold text-zinc-950">
            {attendee.name}
          </p>
          <p className="text-xs text-zinc-500">{attendee.email}</p>

          <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Ticket code
          </p>
          <p className="mt-1 font-mono text-sm font-bold tracking-wider text-zinc-950">
            {code}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
            >
              <TicketIcon className="h-3.5 w-3.5" />
              View ticket
            </a>
            <a
              href={qrUrl}
              download={`ticket-${code}.png`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              <Download className="h-3.5 w-3.5" />
              Save QR
            </a>
          </div>
        </div>

        <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl border border-zinc-100 bg-white p-2 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`QR code for ticket ${code}`}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
