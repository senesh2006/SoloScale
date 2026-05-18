"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Palette, RotateCcw } from "lucide-react";
import { TicketCard } from "@/components/event/TicketCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import type { Event } from "@/types/event";
import {
  DEFAULT_TICKET_DESIGN,
  TICKET_DESIGN_PRESETS,
  resolveTicketDesign,
  type TicketDesign,
} from "@/types/ticket-design";

const PREVIEW_ATTENDEE = {
  name: "Jordan Lee",
  email: "preview@example.com",
};

function expandHexForColorInput(hex: string): string {
  const h = hex.trim();
  if (/^#[0-9A-Fa-f]{3}$/.test(h)) {
    const r = h[1];
    const g = h[2];
    const b = h[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(h)) return h.toLowerCase();
  return "#000000";
}

function ColorPair({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-500">{label}</label>
      <div className="mt-1 flex gap-2">
        <input
          type="color"
          value={expandHexForColorInput(value)}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-9 w-11 shrink-0 cursor-pointer rounded border border-zinc-200 bg-white"
          aria-label={`${label} picker`}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-200 px-2 font-mono text-xs text-zinc-900"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

type Props = {
  event: Event;
  onSaved: (event: Event) => void;
};

export function TicketDesignPanel({ event, onSaved }: Props) {
  const [draft, setDraft] = useState<TicketDesign>(() =>
    resolveTicketDesign(event.ticket_design),
  );
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serverDesignKey = JSON.stringify(event.ticket_design ?? null);
  useEffect(() => {
    setDraft(resolveTicketDesign(event.ticket_design));
  }, [event.id, serverDesignKey]);

  const previewEvent = useMemo(
    () => ({
      ...event,
      ticket_design: draft,
    }),
    [event, draft],
  );

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const { event: next } = await apiFetch<{ event: Event }>(
        `/api/events/${event.id}/ticket-design`,
        {
          method: "PATCH",
          body: JSON.stringify({ ticket_design: draft }),
        },
      );
      onSaved(next);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function applyPreset(patch: Partial<TicketDesign>) {
    setDraft(resolveTicketDesign({ ...DEFAULT_TICKET_DESIGN, ...patch }));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start">
      <Card className="space-y-5 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-violet-600">
            Edit ticket
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            These settings apply to downloaded PNGs and the public{" "}
            <span className="font-mono text-xs">/t/…</span> page. Safe to change
            while the event is live.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-zinc-700">Presets</p>
          <div className="flex flex-wrap gap-2">
            {TICKET_DESIGN_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.patch)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:border-violet-300 hover:bg-violet-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-zinc-500">
              Header fill
            </label>
            <select
              value={draft.header_style}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  header_style: e.target.value as TicketDesign["header_style"],
                }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
            >
              <option value="gradient">Gradient</option>
              <option value="solid">Solid color</option>
            </select>
          </div>
          {draft.header_style === "gradient" ? (
            <div>
              <label className="text-xs font-medium text-zinc-500">
                Gradient angle (°)
              </label>
              <input
                type="range"
                min={0}
                max={360}
                value={draft.header_gradient_angle}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    header_gradient_angle: Number(e.target.value),
                  }))
                }
                className="mt-2 w-full"
              />
              <p className="text-[11px] text-zinc-400">
                {draft.header_gradient_angle}°
              </p>
            </div>
          ) : (
            <div />
          )}
        </div>

        {draft.header_style === "gradient" ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorPair
                label="Color start"
                value={draft.header_color_start}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, header_color_start: v }))
                }
              />
              <ColorPair
                label="Color end"
                value={draft.header_color_end}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, header_color_end: v }))
                }
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={draft.header_color_mid != null}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    header_color_mid: e.target.checked
                      ? DEFAULT_TICKET_DESIGN.header_color_mid
                      : null,
                  }))
                }
                className="rounded border-zinc-300"
              />
              Use three colors in the gradient
            </label>
            {draft.header_color_mid != null ? (
              <ColorPair
                label="Color middle"
                value={draft.header_color_mid}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, header_color_mid: v }))
                }
              />
            ) : null}
          </div>
        ) : (
          <ColorPair
            label="Header color"
            value={draft.header_color_start}
            onChange={(v) => setDraft((d) => ({ ...d, header_color_start: v }))}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <ColorPair
            label="Header text & icons"
            value={draft.header_text_color}
            onChange={(v) => setDraft((d) => ({ ...d, header_text_color: v }))}
          />
          <div>
            <label className="text-xs font-medium text-zinc-500">
              Title & meta alignment
            </label>
            <select
              value={draft.header_text_align}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  header_text_align: e.target.value as TicketDesign["header_text_align"],
                }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500">
            Header padding ({draft.header_padding_px}px)
          </label>
          <input
            type="range"
            min={8}
            max={48}
            value={draft.header_padding_px}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                header_padding_px: Number(e.target.value),
              }))
            }
            className="mt-2 w-full max-w-xs"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ColorPair
            label="Body background"
            value={draft.body_background}
            onChange={(v) => setDraft((d) => ({ ...d, body_background: v }))}
          />
          <ColorPair
            label="Body text"
            value={draft.body_text_color}
            onChange={(v) => setDraft((d) => ({ ...d, body_text_color: v }))}
          />
          <ColorPair
            label="Muted text"
            value={draft.muted_text_color}
            onChange={(v) => setDraft((d) => ({ ...d, muted_text_color: v }))}
          />
          <ColorPair
            label="Labels (Attendee, Code)"
            value={draft.label_text_color}
            onChange={(v) => setDraft((d) => ({ ...d, label_text_color: v }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-zinc-500">
              QR position
            </label>
            <select
              value={draft.qr_position}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  qr_position: e.target.value as TicketDesign["qr_position"],
                }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
            >
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>
          </div>
          <ColorPair
            label="Border"
            value={draft.border_color}
            onChange={(v) => setDraft((d) => ({ ...d, border_color: v }))}
          />
          <ColorPair
            label="Accent (links)"
            value={draft.accent_color}
            onChange={(v) => setDraft((d) => ({ ...d, accent_color: v }))}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={draft.show_perforation}
              onChange={(e) =>
                setDraft((d) => ({ ...d, show_perforation: e.target.checked }))
              }
              className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
            />
            Ticket perforation line
          </label>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
          <Button
            type="button"
            loading={saving}
            leftIcon={
              savedFlash ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Palette className="h-4 w-4" />
              )
            }
            onClick={() => save()}
          >
            {savedFlash ? "Saved" : "Save ticket design"}
          </Button>
          <Button
            type="button"
            variant="outline"
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={() => setDraft({ ...DEFAULT_TICKET_DESIGN })}
          >
            Reset to default
          </Button>
        </div>
      </Card>

      <div>
        <p className="mb-2 text-xs font-medium text-zinc-500">Live preview</p>
        <TicketCard attendee={PREVIEW_ATTENDEE} event={previewEvent} />
      </div>
    </div>
  );
}
