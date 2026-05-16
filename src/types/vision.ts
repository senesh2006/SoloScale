export type VisionCampaignSeed = {
  title: string;
  goal: string;
  audience: string;
  event_date: string | null;
  board_summary: string;
  confidence: "high" | "medium" | "low";
};
