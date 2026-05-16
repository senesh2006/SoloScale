import { CampaignPost, CampaignStrategy } from "../../schemas/campaign";

const PLATFORM_VISUAL_HINT: Record<CampaignPost["platform"], string> = {
  twitter: "clean, high-contrast, readable at small thumbnail size",
  linkedin: "professional, credible, minimal clutter",
  instagram: "scroll-stopping, lifestyle energy, strong focal point",
  reel: "dynamic, vertical story energy, motion-friendly composition",
};

/**
 * Builds flyer input for Pixazo from a strategy post + campaign context.
 */
export function flyerPromptFor(
  post: CampaignPost,
  strategy: CampaignStrategy,
): { prompt: string; headline: string; subtext?: string } {
  const event = strategy.event;
  const eventTitle = event?.title;
  const eventDate = event?.dateISO ?? post.dateISO;
  const platformHint = PLATFORM_VISUAL_HINT[post.platform];

  const visualCore =
    post.suggestedFlyerPrompt ??
    [
      `Promotional vertical social flyer for "${post.headline}".`,
      post.body,
      post.cta ? `Call to action: ${post.cta}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

  const contextLines: string[] = [
    visualCore,
    `Campaign goal: ${strategy.goal}.`,
    `Platform vibe: ${post.platform} — ${platformHint}.`,
  ];

  if (event) {
    contextLines.push(
      `Event: "${event.title}" (${event.format}, ${eventDate}). ${event.description}`,
    );
  }

  if (post.hashtags.length > 0) {
    contextLines.push(
      `Theme keywords (visual mood only, do not render as text): ${post.hashtags.slice(0, 5).join(", ")}.`,
    );
  }

  return {
    prompt: contextLines.join(" "),
    headline: eventTitle ?? post.headline,
    subtext:
      post.cta ??
      (event
        ? `${eventDate} · ${event.format}`
        : post.body.slice(0, 72).replace(/\s+/g, " ").trim()),
  };
}

/**
 * Builds a spoken script for ElevenLabs from a strategy post.
 */
export function voiceoverScriptFor(post: CampaignPost): string {
  if (post.suggestedVoiceoverScript) {
    return normalizeSpokenScript(post.suggestedVoiceoverScript);
  }

  const cta = post.cta?.trim();
  const parts = [
    `Hook: ${post.headline}.`,
    post.body,
    cta ? `So here's what to do next: ${cta}` : "",
    "Follow for more — and I'll see you there.",
  ].filter(Boolean);

  return normalizeSpokenScript(parts.join(" "));
}

/** Strip markdown-ish noise; keep natural speech for TTS. */
function normalizeSpokenScript(raw: string): string {
  return raw
    .replace(/\*\*|__|#+\s?/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
