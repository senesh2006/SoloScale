"use client";

import { useState } from "react";
import { Bell, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnnouncementsPanel } from "@/components/campaign/AnnouncementsPanel";
import { RemindersPanel } from "@/components/campaign/RemindersPanel";

type Tab = "broadcast" | "reminders";

type Props = {
  eventId: string | null;
  campaignId: string;
  attendeeCount: number;
  eventDate: string | null;
  eventTitle: string;
};

export function AttendeeCommunicationsPanel({
  eventId,
  campaignId,
  attendeeCount,
  eventDate,
  eventTitle,
}: Props) {
  const [tab, setTab] = useState<Tab>("reminders");

  return (
    <div className="space-y-5">
      <div className="flex rounded-xl border border-zinc-200 bg-zinc-50/80 p-1">
        {(
          [
            {
              id: "reminders" as const,
              label: "Reminders",
              icon: Bell,
              hint: "Scheduled before the event",
            },
            {
              id: "broadcast" as const,
              label: "Broadcast",
              icon: Mail,
              hint: "Send immediately",
            },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-3 py-2.5 text-center transition-all sm:flex-row sm:justify-center sm:gap-2",
                active
                  ? "bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200"
                  : "text-zinc-500 hover:text-zinc-800",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active && t.id === "reminders" && "text-violet-600",
                  active && t.id === "broadcast" && "text-violet-600",
                )}
              />
              <span className="text-sm font-semibold">{t.label}</span>
              <span className="hidden text-[10px] font-medium text-zinc-400 sm:inline">
                · {t.hint}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "reminders" ? (
        <RemindersPanel
          eventId={eventId}
          campaignId={campaignId}
          attendeeCount={attendeeCount}
          eventDate={eventDate}
          eventTitle={eventTitle}
        />
      ) : (
        <AnnouncementsPanel
          eventId={eventId}
          attendeeCount={attendeeCount}
        />
      )}
    </div>
  );
}
