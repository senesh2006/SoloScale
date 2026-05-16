"use client";

import { useEffect, useState } from "react";
import { format, isToday } from "date-fns";
import { apiFetch } from "@/lib/api";
import type { CalendarEntry } from "@/types/campaign";
import { Calendar as CalendarIcon, Send, MessageSquare, Globe, ArrowUpRight, X, Clock, ExternalLink } from "lucide-react";
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
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);

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
    <div className="max-w-6xl">
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

      <div className="mt-12 flex gap-10">
        <div className="flex-1 space-y-8">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-violet-600" />
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-zinc-200 p-12 text-center">
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
                const isSelected = selectedEntry?.id === entry.id;
                
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

                    <button 
                      onClick={() => setSelectedEntry(entry)}
                      className={cn(
                        "flex-1 text-left rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md group outline-none",
                        isToday(date) && "ring-2 ring-violet-600/10 border-violet-200",
                        isSelected && "border-violet-600 ring-4 ring-violet-600/5 shadow-md bg-zinc-50/30"
                      )}
                    >
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
                        
                        <ArrowUpRight className={cn(
                          "h-4 w-4 transition-all",
                          isSelected ? "text-violet-600 translate-x-0.5 -translate-y-0.5" : "text-zinc-300 group-hover:text-violet-600"
                        )} />
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick View Sidebar */}
        <div className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-10">
            {selectedEntry ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-8">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border",
                    typeColors[selectedEntry.type] || typeColors.default
                  )}>
                    {(() => {
                      const Icon = typeIcons[selectedEntry.type] || typeIcons.default;
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </div>
                  <button 
                    onClick={() => setSelectedEntry(null)}
                    className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-950"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">
                      Scheduled for
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-zinc-400" />
                      <p className="text-sm font-bold text-zinc-950">
                        {format(new Date(selectedEntry.scheduled_at), "MMMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Content Details
                    </span>
                    <p className="mt-2 text-sm font-medium text-zinc-700 leading-relaxed italic">
                      "{selectedEntry.title}"
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Associated Campaign
                    </span>
                    <p className="mt-1 text-sm font-bold text-zinc-950">
                      {selectedEntry.campaign_title}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-zinc-100">
                    <Link 
                      href={`/dashboard/campaigns/${selectedEntry.campaign_id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-all"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Campaign
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-zinc-200 p-8 text-center bg-zinc-50/50">
                <Clock className="mx-auto h-8 w-8 text-zinc-300" />
                <p className="mt-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Select an entry to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
