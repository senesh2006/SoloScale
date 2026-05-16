import { format } from "date-fns";
import type { ContentItem } from "@/types/campaign";
import { MessageSquare, Mail, Send, Calendar, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, any> = {
  tweet: MessageSquare,
  post: Share2,
  email: Mail,
  default: Send
};

const typeColors: Record<string, string> = {
  tweet: "bg-sky-50 text-sky-500 border-sky-100",
  post: "bg-emerald-50 text-emerald-500 border-emerald-100",
  email: "bg-amber-50 text-amber-500 border-amber-100",
  default: "bg-violet-50 text-violet-500 border-violet-100"
};

export function StrategyTimeline({ items }: { items: ContentItem[] }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-100" />
        <p className="mt-4 text-sm text-zinc-500 font-medium tracking-tight uppercase tracking-widest">Orchestrating Strategy...</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      {/* Vertical Line */}
      <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-zinc-100" />

      {items.map((item, index) => {
        const Icon = typeIcons[item.type] || typeIcons.default;
        const colorClass = typeColors[item.type] || typeColors.default;
        
        return (
          <div key={item.id} className="relative flex gap-6 group">
            {/* Timeline Dot/Icon */}
            <div className={cn(
              "z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-white shadow-sm transition-all group-hover:scale-110",
              colorClass
            )}>
              <Icon className="h-4 w-4" />
            </div>

            <div className="flex-1 space-y-3 pb-8">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {format(new Date(item.scheduled_at), "MMMM dd")}
                </span>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border",
                  colorClass
                )}>
                  {item.type}
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-5 transition-all hover:bg-white hover:shadow-md hover:border-zinc-200">
                <p className="text-sm font-medium text-zinc-700 leading-relaxed italic">
                  "{item.copy}"
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
