import type { CampaignStrategy } from "@/types/campaign";

/**
 * Minimal strategy for hand-built campaigns so dashboards, calendar, and event
 * creation work without calling AI.
 */
export function buildManualCampaignStrategy(args: {
  title: string;
  goal_prompt: string;
}): CampaignStrategy {
  const title = args.title.trim() || "New campaign";
  const goal = args.goal_prompt.trim();
  const summary = goal
    ? `${goal} (manual campaign — edit the timeline and event below).`
    : "Manual campaign — add timeline posts in the strategy editor and customize the event page.";
  return {
    summary,
    timeline: [],
    event_draft: {
      headline: title,
      subhead: "",
      body_md: `## ${title}\n\n_Edit this copy in the event editor. Add schedule, details, and registration information._`,
      form_fields: [
        { id: "name", type: "text", label: "Full name", required: true },
        { id: "email", type: "email", label: "Email", required: true },
      ],
    },
  };
}
