import type { CampaignStatus } from "@/types/campaign";

const styles: Record<CampaignStatus, string> = {
  draft: "bg-zinc-200 text-zinc-700",
  strategy_ready: "bg-blue-100 text-blue-800",
  assets_ready: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
};

const labels: Record<CampaignStatus, string> = {
  draft: "Draft",
  strategy_ready: "Strategy ready",
  assets_ready: "Assets ready",
  published: "Published",
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
