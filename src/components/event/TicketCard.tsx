"use client";

import { useRef, useState } from "react";
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
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const code = attendee.ticket_code ?? "PENDING";
  const hasTicketCode = Boolean(attendee.ticket_code);
  const ticketUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/t/${encodeURIComponent(code)}`
      : `/t/${encodeURIComponent(code)}`;
  /** Same-origin image so html2canvas can export without CORS taint. */
  const qrUrl = hasTicketCode ? `/api/tickets/${encodeURIComponent(code)}/qr` : "";

  const dateLabel = event.event_date
    ? new Date(event.event_date).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Date TBA";

  async function waitForImagesInTicket(root: HTMLElement) {
    const imgs = [...root.querySelectorAll("img")];
    await Promise.all(
      imgs.map(async (img) => {
        if (img.complete && img.naturalHeight > 0) return;
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
        if (img.decode) {
          await img.decode().catch(() => undefined);
        }
      }),
    );
    // Let layout/fonts settle after decode
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  function saveBlobAsFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function downloadQrOnlyPng() {
    const res = await fetch(
      `/api/tickets/${encodeURIComponent(code)}/qr?attachment=1`,
    );
    if (!res.ok) throw new Error("qr");
    const blob = await res.blob();
    saveBlobAsFile(blob, `ticket-${code}-qr.png`);
  }

  async function downloadTicketPng() {
    const el = ticketRef.current;
    if (!el || downloading || !hasTicketCode) return;
    setDownloading(true);
    try {
      await waitForImagesInTicket(el);

      let blob: Blob | null = null;

      try {
        const { toBlob } = await import("html-to-image");
        blob = await toBlob(el, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
        });
      } catch {
        blob = null;
      }

      if (!blob || blob.size === 0) {
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 20000,
          foreignObjectRendering: true,
        });
        blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/png", 1);
        });
      }

      if (blob && blob.size > 0) {
        saveBlobAsFile(blob, `ticket-${code}.png`);
      } else {
        throw new Error("empty ticket capture");
      }
    } catch {
      try {
        await downloadQrOnlyPng();
      } catch {
        alert(
          "Could not save the ticket image. Wait until the QR code is visible, then try again.",
        );
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        ref={ticketRef}
        className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl"
      >
        <div className="bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-90">
              <TicketIcon className="h-3.5 w-3.5" />
              Admit one
            </div>
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
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
          </div>

          <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl border border-zinc-100 bg-white p-2 shadow-sm">
            {qrUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt={`QR code for ticket ${code}`}
                  className="h-full w-full object-contain"
                />
              </>
            ) : (
              <span className="px-2 text-center text-[10px] font-medium text-zinc-400">
                Code pending
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
        >
          <TicketIcon className="h-3.5 w-3.5" />
          View ticket
        </a>
        <button
          type="button"
          onClick={downloadTicketPng}
          disabled={downloading || !hasTicketCode}
          aria-label="Download ticket as PNG image"
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
        >
          <Download
            className={cn("h-3.5 w-3.5", downloading && "animate-pulse")}
          />
          {downloading
            ? "Downloading…"
            : hasTicketCode
              ? "Download ticket"
              : "Download unavailable"}
        </button>
      </div>
    </div>
  );
}
