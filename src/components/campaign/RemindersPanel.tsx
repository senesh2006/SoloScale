"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { apiFetch } from "@/lib/api";
import type { EventReminder, ReminderPresetId } from "@/types/campaign";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  Bell,
  BellRing,
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Mail,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

type Props = {
  eventId: string | null;
  campaignId: string;
  attendeeCount: number;
  eventDate: string | null;
  eventTitle: string;
};

type PresetDef = {
  id: Exclude<ReminderPresetId, "custom">;
  label: string;
  short: string;
  icon: string;
  defaultSubject: string;
  defaultBody: string;
};

const PRESETS: PresetDef[] = [
  {
    id: "7d",
    label: "1 week before",
    short: "7d",
    icon: "📅",
    defaultSubject: "One week until {event}",
    defaultBody:
      "Your event is coming up in 7 days. Save the date, review the agenda, and make sure your ticket is handy.",
  },
  {
    id: "24h",
    label: "24 hours before",
    short: "24h",
    icon: "⏰",
    defaultSubject: "Tomorrow: {event}",
    defaultBody:
      "You're registered — here's everything you need for tomorrow: join link, schedule, and how to get your ticket ready.",
  },
  {
    id: "1h",
    label: "1 hour before",
    short: "1h",
    icon: "🔔",
    defaultSubject: "Starting in 1 hour — {event}",
    defaultBody:
      "We go live in about an hour. Grab your ticket link below and join us on time.",
  },
];

export function RemindersPanel({
  eventId,
  campaignId,
  attendeeCount,
  eventDate,
  eventTitle,
}: Props) {
  const [reminders, setReminders] = useState<EventReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customAt, setCustomAt] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await apiFetch<{
        reminders: EventReminder[];
        event_date: string | null;
      }>(`/api/events/${eventId}/reminders`);
      setReminders(res.reminders);
    } catch {
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const eventMs = eventDate ? +new Date(eventDate) : null;
  const activeCount = reminders.filter(
    (r) => r.enabled && r.status === "scheduled",
  ).length;

  const timelineItems = useMemo(() => {
    if (!eventMs) return [];
    const items: { id: string; ms: number; label: string; kind: "reminder" | "event" }[] =
      reminders
        .filter((r) => r.enabled && r.status !== "cancelled")
        .map((r) => ({
          id: r.id,
          ms: +new Date(r.scheduled_for),
          label: r.label,
          kind: "reminder" as const,
        }));
    items.push({
      id: "event",
      ms: eventMs,
      label: "Event starts",
      kind: "event",
    });
    return items.sort((a, b) => a.ms - b.ms);
  }, [reminders, eventMs]);

  if (!eventId) {
    return (
      <Card className="p-6 text-center text-sm text-zinc-500">
        Add an event page first to schedule reminders.
      </Card>
    );
  }

  if (!eventDate) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-amber-50 via-white to-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <CalendarClock className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-zinc-950">
            Set an event date first
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-500">
            Reminders are scheduled relative to your event start time. Add a
            date on the landing page editor, then come back to turn on
            automatic nudges.
          </p>
          <Link
            href={
              eventId
                ? `/dashboard/campaigns/${campaignId}/events/${eventId}/edit`
                : `/dashboard/campaigns/${campaignId}`
            }
            className="mt-5 inline-flex"
          >
            <Button variant="dark" size="md">
              Add event date
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  async function togglePreset(preset: PresetDef, enabled: boolean) {
    if (!eventId) return;
    setBusyId(preset.id);
    setError(null);
    try {
      const existing = reminders.find((r) => r.preset_id === preset.id);
      const { reminder } = await apiFetch<{ reminder: EventReminder | null }>(
        `/api/events/${eventId}/reminders`,
        {
          method: "POST",
          body: JSON.stringify({
            preset_id: preset.id,
            enabled,
            subject: existing?.subject,
            body: existing?.body,
          }),
        },
      );
      if (reminder) {
        setReminders((curr) => {
          const without = curr.filter((r) => r.preset_id !== preset.id);
          return [...without, reminder].sort(
            (a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for),
          );
        });
      } else {
        setReminders((curr) =>
          curr.map((r) =>
            r.preset_id === preset.id
              ? { ...r, enabled: false, status: "cancelled" }
              : r,
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update reminder");
    } finally {
      setBusyId(null);
    }
  }

  async function saveCustom() {
    if (!eventId) return;
    setBusyId("custom");
    setError(null);
    try {
      const { reminder } = await apiFetch<{ reminder: EventReminder }>(
        `/api/events/${eventId}/reminders`,
        {
          method: "POST",
          body: JSON.stringify({
            scheduled_for: customAt
              ? new Date(customAt).toISOString()
              : "",
            subject: customSubject,
            body: customBody,
            label: "Custom reminder",
          }),
        },
      );
      setReminders((curr) =>
        [...curr, reminder].sort(
          (a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for),
        ),
      );
      setShowCustom(false);
      setCustomAt("");
      setCustomSubject("");
      setCustomBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create reminder");
    } finally {
      setBusyId(null);
    }
  }

  async function removeReminder(reminderId: string) {
    if (!eventId) return;
    setBusyId(reminderId);
    try {
      await apiFetch(`/api/events/${eventId}/reminders/${reminderId}`, {
        method: "DELETE",
      });
      setReminders((curr) => curr.filter((r) => r.id !== reminderId));
    } finally {
      setBusyId(null);
    }
  }

  function getPresetReminder(presetId: string) {
    return reminders.find((r) => r.preset_id === presetId);
  }

  function computeSendTime(presetId: Exclude<ReminderPresetId, "custom">) {
    const offsets: Record<string, number> = {
      "7d": 7 * 86400000,
      "24h": 86400000,
      "1h": 3600000,
    };
    return new Date(eventMs! - offsets[presetId]);
  }

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 bg-gradient-to-r from-violet-50/80 via-white to-fuchsia-50/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/25">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-950">
                Automatic reminders
              </p>
              <p className="text-xs text-zinc-500">
                Email attendees before the event — no manual send needed.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">
              <Calendar className="h-3.5 w-3.5 text-violet-600" />
              {format(new Date(eventDate), "EEE, MMM d · h:mm a")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <Check className="h-3.5 w-3.5" />
              {activeCount} active
            </span>
          </div>
        </div>

        {/* Timeline */}
        {timelineItems.length > 0 && (
          <div className="border-b border-zinc-100 px-5 py-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Send schedule
            </p>
            <div className="relative">
              <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-violet-200 via-violet-400 to-fuchsia-400" />
              <div className="relative flex justify-between gap-1">
                {timelineItems.map((item) => {
                  const isEvent = item.kind === "event";
                  const past = isPast(item.ms);
                  return (
                    <div
                      key={item.id}
                      className="flex max-w-[88px] flex-col items-center text-center"
                    >
                      <div
                        className={cn(
                          "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white text-xs shadow-sm",
                          isEvent
                            ? "border-fuchsia-500 text-fuchsia-600"
                            : past
                              ? "border-zinc-300 text-zinc-400"
                              : "border-violet-500 text-violet-600",
                        )}
                      >
                        {isEvent ? "🎯" : "✉️"}
                      </div>
                      <p className="mt-2 text-[10px] font-bold leading-tight text-zinc-800">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[9px] tabular-nums text-zinc-400">
                        {format(item.ms, "MMM d")}
                      </p>
                      <p className="text-[9px] tabular-nums text-zinc-400">
                        {format(item.ms, "h:mm a")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Preset cards */}
      <div>
        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Quick presets
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {PRESETS.map((preset) => {
            const record = getPresetReminder(preset.id);
            const enabled =
              !!record?.enabled && record.status === "scheduled";
            const sendAt = computeSendTime(preset.id);
            const sendPast = isPast(sendAt);
            const isBusy = busyId === preset.id;

            return (
              <PresetCard
                key={preset.id}
                preset={preset}
                enabled={enabled}
                sendAt={sendAt}
                sendPast={sendPast}
                isBusy={isBusy}
                expanded={expandedId === preset.id}
                record={record}
                eventTitle={eventTitle}
                onToggle={(on) => togglePreset(preset, on)}
                onExpand={() =>
                  setExpandedId((id) => (id === preset.id ? null : preset.id))
                }
              />
            );
          })}
        </div>
      </div>

      {/* Custom reminder */}
      <Card>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-bold text-zinc-900">Custom reminder</h3>
          </div>
          {!showCustom && (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-violet-300 hover:text-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add one-off
            </button>
          )}
        </div>

        {showCustom && (
          <div className="space-y-4 p-5 animate-in fade-in duration-200">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Send at
              </label>
              <div className="relative mt-1.5">
                <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="datetime-local"
                  value={customAt}
                  onChange={(e) => setCustomAt(e.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm tabular-nums focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Must be before the event starts (
                {format(new Date(eventDate), "MMM d, h:mm a")}).
              </p>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Subject
              </label>
              <input
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder={`Reminder: ${eventTitle}`}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Message
              </label>
              <textarea
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                rows={3}
                placeholder="What should attendees know at this moment?"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <Button
                variant="dark"
                size="md"
                loading={busyId === "custom"}
                disabled={
                  !customAt ||
                  customSubject.trim().length < 2 ||
                  customBody.trim().length < 4
                }
                onClick={saveCustom}
              >
                Schedule reminder
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Scheduled list */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-zinc-400" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            All reminders
          </p>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-600">
            {reminders.length}
          </span>
        </div>

        {loading ? (
          <Card className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-violet-600" />
          </Card>
        ) : reminders.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Bell className="h-6 w-6 text-zinc-300" />
            <p className="text-sm font-medium text-zinc-700">No reminders yet</p>
            <p className="max-w-xs text-xs text-zinc-500">
              Toggle a preset above or add a custom reminder to start nudging
              attendees.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => (
              <ReminderRow
                key={r.id}
                reminder={r}
                attendeeCount={attendeeCount}
                busy={busyId === r.id}
                onDelete={() => removeReminder(r.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-[11px] text-zinc-400">
        Reminders send via email to {attendeeCount} registered attendee
        {attendeeCount === 1 ? "" : "s"} (mock mode — logged only).
      </p>
    </div>
  );
}

function PresetCard({
  preset,
  enabled,
  sendAt,
  sendPast,
  isBusy,
  expanded,
  record,
  eventTitle,
  onToggle,
  onExpand,
}: {
  preset: PresetDef;
  enabled: boolean;
  sendAt: Date;
  sendPast: boolean;
  isBusy: boolean;
  expanded: boolean;
  record?: EventReminder;
  eventTitle: string;
  onToggle: (enabled: boolean) => void;
  onExpand: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-sm transition-all",
        enabled
          ? "border-violet-300 ring-1 ring-violet-200"
          : "border-zinc-200 hover:border-zinc-300",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-lg" aria-hidden>
          {preset.icon}
        </span>
        <Toggle
          checked={enabled}
          disabled={isBusy || (sendPast && !enabled)}
          onChange={onToggle}
        />
      </div>
      <p className="mt-2 text-sm font-bold text-zinc-950">{preset.label}</p>
      <p className="mt-1 text-xs text-zinc-500">
        Sends {format(sendAt, "EEE, MMM d · h:mm a")}
      </p>
      {sendPast && !enabled && (
        <p className="mt-2 text-[10px] font-semibold text-amber-600">
          This time has passed — pick a later event date or use custom.
        </p>
      )}
      {enabled && (
        <button
          type="button"
          onClick={onExpand}
          className="mt-3 flex w-full items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-600 hover:text-violet-800"
        >
          {expanded ? (
            <>
              Hide preview <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Preview message <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
      {expanded && enabled && record && (
        <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-xs animate-in fade-in">
          <p className="font-semibold text-zinc-800">{record.subject}</p>
          <p className="mt-1 leading-relaxed text-zinc-600 line-clamp-3">
            {record.body}
          </p>
        </div>
      )}
      {!record && enabled && (
        <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-xs">
          <p className="font-semibold text-zinc-800">
            {preset.defaultSubject.replace("{event}", eventTitle)}
          </p>
        </div>
      )}
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2",
        checked ? "bg-violet-600" : "bg-zinc-200",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

function ReminderRow({
  reminder,
  attendeeCount,
  busy,
  onDelete,
}: {
  reminder: EventReminder;
  attendeeCount: number;
  busy: boolean;
  onDelete: () => void;
}) {
  const scheduled = new Date(reminder.scheduled_for);
  const sent = reminder.status === "sent";
  const cancelled = reminder.status === "cancelled" || !reminder.enabled;
  const upcoming = !cancelled && !sent && !isPast(scheduled);

  return (
    <li
      className={cn(
        "rounded-xl border bg-white p-4 shadow-sm transition-all",
        cancelled && "opacity-60",
        upcoming && "border-violet-200",
        sent && "border-emerald-200 bg-emerald-50/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-zinc-950">
              {reminder.label}
            </p>
            <StatusPill
              status={
                sent ? "sent" : cancelled ? "off" : isPast(scheduled) ? "past" : "scheduled"
              }
            />
          </div>
          <p className="mt-0.5 text-xs font-medium text-zinc-600">
            {reminder.subject}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(scheduled, "MMM d, yyyy · h:mm a")}
            </span>
            {upcoming && (
              <span className="text-violet-600">
                {formatDistanceToNow(scheduled, { addSuffix: true })}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {attendeeCount} recipients
            </span>
          </div>
        </div>
        {reminder.preset_id === "custom" && (
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label="Delete reminder"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  );
}

function StatusPill({
  status,
}: {
  status: "scheduled" | "sent" | "off" | "past";
}) {
  const styles = {
    scheduled: "bg-violet-100 text-violet-700",
    sent: "bg-emerald-100 text-emerald-700",
    off: "bg-zinc-100 text-zinc-500",
    past: "bg-amber-100 text-amber-700",
  };
  const labels = {
    scheduled: "Scheduled",
    sent: "Sent",
    off: "Off",
    past: "Past",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}
