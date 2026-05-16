import demoStrategy from "@/mocks/demo-campaign.json";
import type {
  Asset,
  Attendee,
  CalendarEntry,
  Campaign,
  CampaignStrategy,
  Event,
} from "@/types/campaign";

const campaigns = new Map<string, Campaign>();
const events = new Map<string, Event>();
const assets = new Map<string, Asset[]>();
const attendees = new Map<string, Attendee[]>();

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function useMocks() {
  return process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
}

export function listCampaigns(): Campaign[] {
  return Array.from(campaigns.values()).sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
}

export function getCampaign(id: string): Campaign | undefined {
  return campaigns.get(id);
}

export function createCampaign(input: {
  title: string;
  goal_prompt: string;
  user_id?: string;
}): Campaign {
  const id = uid("camp");
  const campaign: Campaign = {
    id,
    user_id: input.user_id ?? "demo-user",
    title: input.title,
    goal_prompt: input.goal_prompt,
    status: "draft",
    strategy_json: null,
    created_at: new Date().toISOString(),
    event_id: null,
  };
  campaigns.set(id, campaign);

  setTimeout(() => {
    const current = campaigns.get(id);
    if (!current) return;
    const strategy = demoStrategy as CampaignStrategy;
    const eventId = uid("evt");
    const event: Event = {
      id: eventId,
      campaign_id: id,
      slug: slugify(input.title || "react-workshop"),
      published: false,
      landing: {
        headline: strategy.event_draft.headline,
        subhead: strategy.event_draft.subhead,
        body_md: strategy.event_draft.body_md,
      },
      form_fields: strategy.event_draft.form_fields,
      attendee_count: 0,
    };
    events.set(eventId, event);
    campaigns.set(id, {
      ...current,
      status: "strategy_ready",
      strategy_json: strategy,
      event_id: eventId,
    });
  }, 800);

  return campaign;
}

export function getCampaignAssets(campaignId: string): Asset[] {
  return assets.get(campaignId) ?? [];
}

export function startAssetGeneration(campaignId: string): Asset[] {
  const flyerId = uid("asset");
  const audioId = uid("asset");
  const list: Asset[] = [
    {
      id: flyerId,
      campaign_id: campaignId,
      kind: "flyer",
      status: "processing",
      url: null,
    },
    {
      id: audioId,
      campaign_id: campaignId,
      kind: "voiceover",
      status: "processing",
      url: null,
    },
  ];
  assets.set(campaignId, list);

  const campaign = campaigns.get(campaignId);
  if (campaign) {
    campaigns.set(campaignId, { ...campaign, status: "strategy_ready" });
  }

  setTimeout(() => {
    assets.set(campaignId, [
      {
        ...list[0],
        status: "ready",
        url: "/demo/flyer-placeholder.svg",
        thumbnail_url: "/demo/flyer-placeholder.svg",
      },
      {
        ...list[1],
        status: "ready",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      },
    ]);
    const c = campaigns.get(campaignId);
    if (c) campaigns.set(campaignId, { ...c, status: "assets_ready" });
  }, 2000);

  return list;
}

export function getEvent(id: string): Event | undefined {
  return events.get(id);
}

export function getEventBySlug(slug: string): Event | undefined {
  return Array.from(events.values()).find((e) => e.slug === slug);
}

export function updateEvent(
  id: string,
  patch: Partial<Pick<Event, "landing" | "form_fields">>,
): Event | undefined {
  const event = events.get(id);
  if (!event) return undefined;
  const updated = { ...event, ...patch };
  events.set(id, updated);
  return updated;
}

export function publishEvent(id: string): Event | undefined {
  const event = events.get(id);
  if (!event) return undefined;
  const updated = { ...event, published: true };
  events.set(id, updated);
  const campaign = Array.from(campaigns.values()).find(
    (c) => c.event_id === id,
  );
  if (campaign) {
    campaigns.set(campaign.id, { ...campaign, status: "published" });
  }
  return updated;
}

export function registerAttendee(
  eventId: string,
  data: { name: string; email: string },
): Attendee | undefined {
  const event = events.get(eventId);
  if (!event || !event.published) return undefined;
  const record: Attendee = {
    id: uid("att"),
    event_id: eventId,
    name: data.name,
    email: data.email,
    created_at: new Date().toISOString(),
  };
  const list = attendees.get(eventId) ?? [];
  list.push(record);
  attendees.set(eventId, list);
  events.set(eventId, { ...event, attendee_count: list.length });
  return record;
}

export function getCalendarEntries(from: string, to: string): CalendarEntry[] {
  const fromMs = +new Date(from);
  const toMs = +new Date(to);
  const entries: CalendarEntry[] = [];

  for (const campaign of campaigns.values()) {
    if (!campaign.strategy_json) continue;
    for (const item of campaign.strategy_json.timeline) {
      const at = +new Date(item.scheduled_at);
      if (at >= fromMs && at <= toMs) {
        entries.push({
          id: item.id,
          campaign_id: campaign.id,
          campaign_title: campaign.title,
          type: item.type,
          scheduled_at: item.scheduled_at,
          title: item.copy.slice(0, 60),
        });
      }
    }
    if (campaign.event_id) {
      const event = events.get(campaign.event_id);
      if (event) {
        const at = +new Date(campaign.created_at);
        if (at >= fromMs && at <= toMs) {
          entries.push({
            id: `event-${event.id}`,
            campaign_id: campaign.id,
            campaign_title: campaign.title,
            type: "event",
            scheduled_at: campaign.created_at,
            title: event.landing.headline,
          });
        }
      }
    }
  }

  return entries.sort(
    (a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at),
  );
}
