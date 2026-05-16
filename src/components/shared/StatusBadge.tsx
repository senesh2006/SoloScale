import type { CampaignStatus } from "@/types/campaign";
import { cn } from "@/lib/utils";

const styles: Record<CampaignStatus, string> = {
  draft: "border-zinc-200 bg-zinc-50 text-zinc-600",
  strategy_ready: "border-sky-200 bg-sky-50 text-sky-700",
  assets_ready: "border-violet-200 bg-violet-50 text-violet-700",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const dotColors: Record<CampaignStatus, string> = {
  draft: "bg-zinc-400",
  strategy_ready: "bg-sky-500",
  assets_ready: "bg-violet-500",
  published: "bg-emerald-500",
};

const labels: Record<CampaignStatus, string> = {
  draft: "Drafting",
  strategy_ready: "Strategy ready",
  assets_ready: "Assets ready",
  published: "Live",
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        styles[status],
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          dotColors[status],
          status === "published" && "animate-pulse",
        )}
      />
      {labels[status]}
    </span>
  );
}
