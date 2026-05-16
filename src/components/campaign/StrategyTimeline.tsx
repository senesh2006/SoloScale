import { format } from "date-fns";
import type { ContentItem } from "@/types/campaign";

export function StrategyTimeline({ items }: { items: ContentItem[] }) {
  if (!items.length) {
    return (
      <p className="text-sm text-zinc-500">Strategy will appear here shortly…</p>
    );
  }

  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex gap-4 rounded-lg border border-zinc-200 bg-white p-4"
        >
          <div className="w-24 shrink-0 text-xs text-zinc-500">
            {format(new Date(item.scheduled_at), "MMM d")}
            <div className="mt-1 font-medium uppercase text-violet-600">
              {item.type}
            </div>
          </div>
          <p className="text-sm text-zinc-700">{item.copy}</p>
        </li>
      ))}
    </ol>
  );
}
