"use client";

import { useRef, useState } from "react";
import { Calendar, MapPin, Ticket as TicketIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildHeaderBackground,
  resolveTicketDesign,
  type TicketDesign,
} from "@/types/ticket-design";

type Props = {
  attendee: { name: string; email: string; ticket_code?: string };
  event: {
    landing: { headline: string };
    event_date?: string | null;
    location?: string | null;
    slug: string;
    ticket_design?: Partial<TicketDesign> | null;
  };
  className?: string;
};

export function TicketCard({ attendee, event, className }: Props) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const d = resolveTicketDesign(event.ticket_design);
  const code = attendee.ticket_code ?? "PENDING";
  const hasTicketCode = Boolean(attendee.ticket_code);
  const ticketUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/t/${encodeURIComponent(code)}`
      : `/t/${encodeURIComponent(code)}`;
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
      const imgUrl = d.header_background_image_url?.trim();
      if (imgUrl) {
        await prefetchHeaderBackground(imgUrl);
      }

      let blob: Blob | null = null;

      try {
        const { toBlob } = await import("html-to-image");
        blob = await toBlob(el, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: d.body_background,
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
          backgroundColor: d.body_background,
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

  const headerBg = buildHeaderBackground(d);
  const headerImageUrl = d.header_background_image_url?.trim() ?? "";
  const useHeaderImage = headerImageUrl.length > 0;

  async function prefetchHeaderBackground(url: string) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        ref={ticketRef}
        className="overflow-hidden rounded-3xl border shadow-2xl"
        style={{
          backgroundColor: d.body_background,
          borderColor: d.border_color,
        }}
      >
        <div
          className="p-5"
          style={
            useHeaderImage
              ? {
                  backgroundImage: `linear-gradient(rgba(0,0,0,${d.header_image_overlay_opacity}), rgba(0,0,0,${d.header_image_overlay_opacity})), url(${JSON.stringify(headerImageUrl)})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  color: d.header_text_color,
                  paddingLeft: d.header_padding_px,
                  paddingRight: d.header_padding_px,
                  paddingTop: d.header_padding_px,
                  paddingBottom: d.header_padding_px,
                }
              : {
                  background: headerBg,
                  color: d.header_text_color,
                  paddingLeft: d.header_padding_px,
                  paddingRight: d.header_padding_px,
                  paddingTop: d.header_padding_px,
                  paddingBottom: d.header_padding_px,
                }
          }
        >
          <div
            className={cn(
              "flex w-full flex-wrap items-center gap-3",
              d.header_text_align === "left" && "justify-between",
              d.header_text_align === "center" && "justify-center",
              d.header_text_align === "right" && "justify-end",
            )}
          >
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-90">
              <TicketIcon className="h-3.5 w-3.5 shrink-0" />
              Admit one
            </div>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
              style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
            >
              confirmed
            </span>
          </div>
          <h3
            className={cn(
              "mt-3 text-xl font-bold leading-tight",
              d.header_text_align === "center" && "text-center",
              d.header_text_align === "right" && "text-right",
            )}
          >
            {event.landing.headline}
          </h3>
          <div
            className={cn(
              "mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-95",
              d.header_text_align === "center" && "justify-center",
              d.header_text_align === "right" && "justify-end",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3 w-3 shrink-0" />
              {dateLabel}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0" />
                {event.location}
              </span>
            )}
          </div>
        </div>

        {d.show_perforation ? (
          <div className="relative">
            <div
              className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: d.body_background }}
            />
            <div
              className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: d.body_background }}
            />
            <div
              className="border-b border-dashed"
              style={{ borderColor: d.border_color }}
            />
          </div>
        ) : (
          <div className="h-px" style={{ backgroundColor: d.border_color }} />
        )}

        <div
          className={cn(
            "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between",
            d.qr_position === "left" && "sm:flex-row-reverse",
          )}
        >
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: d.label_text_color }}
            >
              Attendee
            </p>
            <p
              className="mt-1 text-base font-bold"
              style={{ color: d.body_text_color }}
            >
              {attendee.name}
            </p>
            <p className="text-xs" style={{ color: d.muted_text_color }}>
              {attendee.email}
            </p>

            <p
              className="mt-4 text-[10px] font-black uppercase tracking-widest"
              style={{ color: d.label_text_color }}
            >
              Ticket code
            </p>
            <p
              className="mt-1 font-mono text-sm font-bold tracking-wider"
              style={{ color: d.body_text_color }}
            >
              {code}
            </p>
          </div>

          <div
            className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl border bg-white p-2 shadow-sm"
            style={{
              borderColor: d.border_color,
              backgroundColor: d.body_background,
            }}
          >
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
              <span
                className="px-2 text-center text-[10px] font-medium"
                style={{ color: d.muted_text_color }}
              >
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
          style={{ borderColor: d.border_color, color: d.accent_color }}
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
