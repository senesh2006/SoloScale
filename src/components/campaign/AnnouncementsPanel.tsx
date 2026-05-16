"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Announcement } from "@/types/campaign";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Send,
  MessageSquare,
  Users as UsersIcon,
  Inbox,
  Sparkles,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  eventId: string | null;
  attendeeCount: number;
};

const TEMPLATES: { name: string; subject: string; body: string }[] = [
  {
    name: "Last call",
    subject: "Last 24 hours to grab your seat",
    body: "Hey — just a heads-up that registration closes in 24 hours. If you've been on the fence, this is your nudge. See you there.",
  },
  {
    name: "Day-of details",
    subject: "Everything you need for tomorrow",
    body: "We're live tomorrow. Here's the join link, the schedule, and a quick checklist so you're set.",
  },
  {
    name: "Speaker reveal",
    subject: "A new speaker just joined the lineup",
    body: "Big news — we're adding a guest you'll want to hear from. Full details inside.",
  },
];

export function AnnouncementsPanel({ eventId, attendeeCount }: Props) {
  const [list, setList] = useState<Announcement[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    apiFetch<{ announcements: Announcement[] }>(
      `/api/events/${eventId}/announcements`,
    )
      .then(({ announcements }) => setList(announcements))
      .catch(() => undefined);
  }, [eventId]);

  if (!eventId) {
    return (
      <Card className="p-6 text-center text-sm text-zinc-500">
        Add an event page first to message attendees.
      </Card>
    );
  }

  async function send() {
    if (!eventId) return;
    setSending(true);
    setError(null);
    try {
      const { announcement } = await apiFetch<{ announcement: Announcement }>(
        `/api/events/${eventId}/announcements`,
        {
          method: "POST",
          body: JSON.stringify({ subject, body, channel: "email" }),
        },
      );
      setList((curr) => [announcement, ...curr]);
      setSubject("");
      setBody("");
      setJustSent(announcement.id);
      setTimeout(() => setJustSent(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  function applyTemplate(t: (typeof TEMPLATES)[number]) {
    setSubject(t.subject);
    setBody(t.body);
  }

  const charsLeft = 140 - subject.length;
  const disabled = sending || subject.trim().length < 2 || body.trim().length < 4;

  return (
    <div className="space-y-5">
      <Card>
        <div className="border-b border-zinc-100 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-bold text-zinc-900">
                Compose update
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600">
              <UsersIcon className="h-3 w-3" />
              {attendeeCount} attendee
              {attendeeCount === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Sends to everyone who registered. Test before launch.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => applyTemplate(t)}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-600 transition-colors hover:border-violet-300 hover:text-violet-700"
              >
                <Sparkles className="h-3 w-3" />
                {t.name}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 140))}
              placeholder="A short, scannable subject line"
              className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
            />
            <p
              className={cn(
                "mt-1 text-right text-[10px] font-medium tabular-nums",
                charsLeft < 20 ? "text-amber-600" : "text-zinc-400",
              )}
            >
              {charsLeft} characters left
            </p>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your update. Keep it brief — what changed, what attendees need to do, when."
              rows={5}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-zinc-400">
              Sends instantly via email (mock mode logs only).
            </p>
            <Button
              variant="dark"
              size="md"
              leftIcon={<Send className="h-3.5 w-3.5" />}
              loading={sending}
              disabled={disabled}
              onClick={send}
            >
              Send to {attendeeCount}
            </Button>
          </div>
        </div>
      </Card>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            History
          </p>
          <span className="text-[10px] font-semibold tabular-nums text-zinc-400">
            {list.length}
          </span>
        </div>

        {list.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 px-6 py-8 text-center">
            <Inbox className="h-5 w-5 text-zinc-300" />
            <p className="text-xs font-medium text-zinc-500">
              No updates sent yet
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {list.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all",
                  justSent === a.id &&
                    "ring-2 ring-emerald-300 animate-fade-in",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-950">
                    {a.subject}
                  </p>
                  <span className="shrink-0 text-[10px] font-medium tabular-nums text-zinc-400">
                    {timeAgo(a.sent_at)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-600">
                  {a.body}
                </p>
                <div className="mt-2 flex items-center gap-3 text-[10px] font-medium text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <UsersIcon className="h-3 w-3" />
                    {a.recipient_count} recipient
                    {a.recipient_count === 1 ? "" : "s"}
                  </span>
                  <span>·</span>
                  <span className="uppercase tracking-wider">
                    {a.channel === "in_app" ? "in-app" : "email"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const sec = Math.max(1, Math.floor((Date.now() - +new Date(iso)) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}
