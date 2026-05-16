"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";
import type { CalendarEntry } from "@/types/campaign";

export default function CalendarPage() {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);

  useEffect(() => {
    apiFetch<{ entries: CalendarEntry[] }>("/api/calendar")
      .then(({ entries: e }) => setEntries(e))
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">Calendar</h1>
      <p className="mt-2 text-zinc-600">
        Unified view of scheduled content and events.
      </p>
      <ul className="mt-8 space-y-3">
        {entries.length === 0 ? (
          <li className="text-sm text-zinc-500">
            No entries yet — create a campaign first.
          </li>
        ) : (
          entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm"
            >
              <span className="font-medium text-violet-600">
                {format(new Date(entry.scheduled_at), "MMM d, yyyy")}
              </span>
              <span className="mx-2 text-zinc-400">·</span>
              <span className="uppercase text-xs text-zinc-500">
                {entry.type}
              </span>
              <p className="mt-1 text-zinc-700">{entry.title}</p>
              <p className="text-xs text-zinc-400">{entry.campaign_title}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
