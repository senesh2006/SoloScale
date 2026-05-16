import type {
  CampaignStrategy,
  ContentItem,
  ContentType,
  EventDraft,
  FlyerInput,
} from "@/types/campaign";
import type {
  Dev1CampaignStrategy,
  Dev1Post,
} from "@/types/dev1-ai";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function platformToContentType(platform: Dev1Post["platform"]): ContentType {
  if (platform === "twitter") return "tweet";
  if (platform === "reel") return "reel";
  if (platform === "linkedin") return "linkedin";
  return "linkedin";
}

function postToCopy(post: Dev1Post): string {
  const parts = [post.headline, post.body];
  if (post.hashtags?.length) {
    parts.push(post.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" "));
  }
  if (post.cta) parts.push(`CTA: ${post.cta}`);
  return parts.filter(Boolean).join("\n\n");
}

function dateToScheduledAt(dateISO: string, day: number): string {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(dateISO)
    ? dateISO
    : dateISO.slice(0, 10);
  const hour = 9 + (day % 8);
  return `${base}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

function defaultFormFields(): EventDraft["form_fields"] {
  return [
    { id: "f_name", type: "text", label: "Full name", required: true },
    { id: "f_email", type: "email", label: "Email", required: true },
  ];
}

function buildEventDraft(
  dev1: Dev1CampaignStrategy,
  ctx: { title: string; goal_prompt: string },
): EventDraft {
  if (dev1.event) {
    const e = dev1.event;
    return {
      headline: e.title,
      subhead: `${e.dateISO} · ${e.format.replace("-", " ")}`,
      body_md: e.description,
      form_fields: defaultFormFields(),
    };
  }

  return {
    headline: ctx.title || "Your event",
    subhead: "Register to save your spot",
    body_md: ctx.goal_prompt || dev1.goal,
    form_fields: defaultFormFields(),
  };
}

export function adaptDev1StrategyToDashboard(
  dev1: Dev1CampaignStrategy,
  ctx: { title: string; goal_prompt: string },
): CampaignStrategy {
  const timeline: ContentItem[] = dev1.posts.map((post) => ({
    id: uid("c"),
    type: platformToContentType(post.platform),
    scheduled_at: dateToScheduledAt(post.dateISO, post.day),
    copy: postToCopy(post),
  }));

  return {
    summary: dev1.goal,
    timeline,
    event_draft: buildEventDraft(dev1, ctx),
  };
}

function pickHeroPosts(dev1: Dev1CampaignStrategy): {
  flyerPost: Dev1Post | null;
  voiceoverPost: Dev1Post | null;
} {
  const flyerPost =
    dev1.posts.find((p) => p.suggestedFlyerPrompt) ??
    dev1.posts.find((p) => p.type === "image") ??
    dev1.posts[0] ??
    null;

  const voiceoverPost =
    dev1.posts.find((p) => p.suggestedVoiceoverScript) ??
    dev1.posts.find((p) => p.type === "reel") ??
    dev1.posts[0] ??
    null;

  return { flyerPost, voiceoverPost };
}

export function pickFlyerInput(
  dev1: Dev1CampaignStrategy,
): FlyerInput | null {
  const { flyerPost } = pickHeroPosts(dev1);
  if (!flyerPost) return null;

  const event = dev1.event;
  const visualCore =
    flyerPost.suggestedFlyerPrompt ??
    `Promotional vertical social flyer for "${flyerPost.headline}". ${flyerPost.body}`;

  return {
    prompt: [visualCore, `Campaign goal: ${dev1.goal}.`].join(" "),
    headline: event?.title ?? flyerPost.headline,
    subtext:
      flyerPost.cta ??
      (event
        ? `${event.dateISO} · ${event.format}`
        : flyerPost.body.slice(0, 72)),
  };
}

export function pickVoiceScript(dev1: Dev1CampaignStrategy): string | null {
  const { voiceoverPost } = pickHeroPosts(dev1);
  if (!voiceoverPost) return null;

  if (voiceoverPost.suggestedVoiceoverScript) {
    return voiceoverPost.suggestedVoiceoverScript
      .replace(/\*\*|__|#+\s?/g, "")
      .trim();
  }

  const cta = voiceoverPost.cta?.trim();
  return [
    `${voiceoverPost.headline}.`,
    voiceoverPost.body,
    cta ? `So here's what to do next: ${cta}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildAiHeroMeta(dev1: Dev1CampaignStrategy): {
  flyer?: FlyerInput;
  voiceScript?: string;
} {
  const flyer = pickFlyerInput(dev1);
  const voiceScript = pickVoiceScript(dev1);
  return {
    ...(flyer ? { flyer } : {}),
    ...(voiceScript ? { voiceScript } : {}),
  };
}

/** Normalize datetime-local or ISO strings to YYYY-MM-DD for the AI service. */
export function normalizeEventDate(input?: string | null): string | undefined {
  if (!input?.trim()) return undefined;
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}
