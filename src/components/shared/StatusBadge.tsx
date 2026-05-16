import type { CampaignStatus } from "@/types/campaign";
import { cn } from "@/lib/utils";

const styles: Record<CampaignStatus, string> = {
  draft: "border-zinc-200 bg-zinc-50 text-zinc-600",
  strategy_ready: "border-blue-200 bg-blue-50 text-blue-700",
  assets_ready: "border-amber-200 bg-amber-50 text-amber-700",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const dotColors: Record<CampaignStatus, string> = {
  draft: "bg-zinc-400",
  strategy_ready: "bg-blue-500",
  assets_ready: "bg-amber-500",
  published: "bg-emerald-500",
};

const labels: Record<CampaignStatus, string> = {
  draft: "Drafting Strategy",
  strategy_ready: "Strategy Ready",
  assets_ready: "Assets Generated",
  published: "Campaign Live",
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm transition-all",
        styles[status]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[status])} />
      {labels[status]}
    </span>
  );
}
