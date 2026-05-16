import demoStrategy from "@/mocks/demo-campaign.json";
import type {
  Asset,
  Attendee,
  CalendarEntry,
  Campaign,
  CampaignStatus,
  CampaignStrategy,
  Event,
} from "@/types/campaign";

// Persistence across HMR in development
const globalForMock = global as unknown as {
  campaigns: Map<string, Campaign>;
  events: Map<string, Event>;
  assets: Map<string, Asset[]>;
  attendees: Map<string, Attendee[]>;
};

const campaigns = globalForMock.campaigns || new Map<string, Campaign>();
const events = globalForMock.events || new Map<string, Event>();
const assets = globalForMock.assets || new Map<string, Asset[]>();
const attendees = globalForMock.attendees || new Map<string, Attendee[]>();

// Initialize with a demo campaign if empty
if (campaigns.size === 0) {
  const demoId = "camp_demo_react";
  const eventId = "evt_demo_react";
  const strategy = demoStrategy as CampaignStrategy;
  
  campaigns.set(demoId, {
    id: demoId,
    user_id: "demo-user",
    title: "Global React Summit 2026",
    goal_prompt: "Host a worldwide virtual conference for React developers to discuss the future of the ecosystem.",
    status: "published",
    strategy_json: strategy,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    event_id: eventId,
  });

  events.set(eventId, {
    id: eventId,
    campaign_id: demoId,
    slug: "react-summit-2026",
    published: true,
    landing: {
      headline: strategy.event_draft.headline,
      subhead: strategy.event_draft.subhead,
      body_md: strategy.event_draft.body_md,
    },
    form_fields: strategy.event_draft.form_fields,
    attendee_count: 42,
    price: { amount_cents: 2500, currency: "USD" },
  });

  assets.set(demoId, [
    {
      id: "asset_flyer_demo",
      campaign_id: demoId,
      kind: "flyer",
      status: "ready",
      url: "/demo/flyer-placeholder.svg",
      thumbnail_url: "/demo/flyer-placeholder.svg",
    },
    {
      id: "asset_audio_demo",
      campaign_id: demoId,
      kind: "voiceover",
      status: "ready",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    }
  ]);

  attendees.set(eventId, [
    { id: "att_1", event_id: eventId, name: "Senesh Fernando", email: "senesh@example.com", created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: "att_2", event_id: eventId, name: "Gemini AI", email: "gemini@google.com", created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: "att_3", event_id: eventId, name: "Cursor Bot", email: "bot@cursor.sh", created_at: new Date(Date.now() - 10800000).toISOString() },
  ]);
  events.get(eventId)!.attendee_count = 3;
}

if (process.env.NODE_ENV !== "production") {
  globalForMock.campaigns = campaigns;
  globalForMock.events = events;
  globalForMock.assets = assets;
  globalForMock.attendees = attendees;
}

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
  strategy?: CampaignStrategy;
}): Campaign {
  const id = uid("camp");
  const campaign: Campaign = {
    id,
    user_id: input.user_id ?? "demo-user",
    title: input.title,
    goal_prompt: input.goal_prompt,
    status: "draft",
    strategy_json: input.strategy ?? null,
    created_at: new Date().toISOString(),
    event_id: null,
  };
  campaigns.set(id, campaign);

  if (!input.strategy) {
    // Default mock behavior if no strategy provided
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
  } else {
    // If strategy is provided, set it up immediately
    const eventId = uid("evt");
    const event: Event = {
      id: eventId,
      campaign_id: id,
      slug: slugify(input.title),
      published: false,
      landing: {
        headline: input.strategy.event_draft.headline,
        subhead: input.strategy.event_draft.subhead,
        body_md: input.strategy.event_draft.body_md,
      },
      form_fields: input.strategy.event_draft.form_fields,
      attendee_count: 0,
    };
    events.set(eventId, event);
    campaigns.set(id, { 
      ...campaign, 
      status: "strategy_ready", 
      strategy_json: input.strategy, 
      event_id: eventId 
    });
  }

  return campaign;
}

export function updateCampaignStrategy(id: string, strategy: CampaignStrategy): Campaign | undefined {
  const campaign = campaigns.get(id);
  if (!campaign) return undefined;

  const eventId = uid("evt");
  const event: Event = {
    id: eventId,
    campaign_id: id,
    slug: slugify(campaign.title),
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

  const updated = {
    ...campaign,
    status: "strategy_ready" as CampaignStatus,
    strategy_json: strategy,
    event_id: eventId,
  };
  campaigns.set(id, updated);
  return updated;
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
  patch: Partial<Pick<Event, "landing" | "form_fields" | "price">>,
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

export function getEventAttendees(eventId: string): Attendee[] {
  return attendees.get(eventId) ?? [];
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
          id: `${campaign.id}-${item.id}`,
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
