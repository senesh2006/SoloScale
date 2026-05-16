"use client";

import { useEffect, useState } from "react";
import { format, isToday, isFuture, isPast } from "date-fns";
import { apiFetch } from "@/lib/api";
import type { CalendarEntry } from "@/types/campaign";
import { Calendar as CalendarIcon, Send, MessageSquare, Globe, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, any> = {
  event: Globe,
  tweet: MessageSquare,
  post: Send,
  default: CalendarIcon
};

const typeColors: Record<string, string> = {
  event: "text-violet-600 bg-violet-50 border-violet-100",
  tweet: "text-sky-500 bg-sky-50 border-sky-100",
  post: "text-emerald-500 bg-emerald-50 border-emerald-100",
  default: "text-zinc-500 bg-zinc-50 border-zinc-100"
};

export default function CalendarPage() {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ entries: CalendarEntry[] }>("/api/calendar")
      .then(({ entries: e }) => {
        setEntries(e);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600">
          <CalendarIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-sm text-zinc-500">
            Unified view of your AI-generated marketing schedule.
          </p>
        </div>
      </div>

      <div className="mt-12 space-y-8">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-violet-600" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center">
             <CalendarIcon className="mx-auto h-12 w-12 text-zinc-300" />
             <h3 className="mt-4 text-sm font-semibold text-zinc-900">No scheduled content</h3>
             <p className="mt-1 text-sm text-zinc-500">Create your first campaign to generate a content calendar.</p>
          </div>
        ) : (
          <div className="relative space-y-6">
            <div className="absolute left-10 top-2 bottom-2 w-px bg-zinc-200" />
            
            {entries.map((entry) => {
              const Icon = typeIcons[entry.type] || typeIcons.default;
              const date = new Date(entry.scheduled_at);
              
              return (
                <div key={entry.id} className="relative flex gap-6">
                  <div className="flex flex-col items-center min-w-20 pt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      {format(date, "MMM")}
                    </span>
                    <span className="text-2xl font-black tracking-tighter text-zinc-900 leading-none">
                      {format(date, "dd")}
                    </span>
                  </div>

                  <div className={cn(
                    "flex-1 rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md group",
                    isToday(date) && "ring-2 ring-violet-600/10 border-violet-200"
                  )}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg border",
                          typeColors[entry.type] || typeColors.default
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900 line-clamp-1">{entry.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                              {entry.campaign_title}
                            </span>
                            {isToday(date) && (
                              <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[8px] font-black text-white uppercase tracking-tighter">
                                Today
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button className="text-zinc-400 group-hover:text-violet-600 transition-colors">
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
