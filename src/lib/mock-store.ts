import demoStrategy from "@/mocks/demo-campaign.json";
import type {
  Announcement,
  EventReminder,
  ReminderPresetId,
  Asset,
  AssetKind,
  Attendee,
  CalendarEntry,
  Campaign,
  CampaignStatus,
  CampaignStrategy,
  Event,
  FlyerInput,
  VoiceoverInput,
} from "@/types/campaign";

// Persistence across HMR in development
const globalForMock = global as unknown as {
  campaigns: Map<string, Campaign>;
  events: Map<string, Event>;
  assets: Map<string, Asset[]>;
  attendees: Map<string, Attendee[]>;
  announcements: Map<string, Announcement[]>;
  reminders: Map<string, EventReminder[]>;
};

const campaigns = globalForMock.campaigns || new Map<string, Campaign>();
const events = globalForMock.events || new Map<string, Event>();
const assets = globalForMock.assets || new Map<string, Asset[]>();
const attendees = globalForMock.attendees || new Map<string, Attendee[]>();
const announcements =
  globalForMock.announcements || new Map<string, Announcement[]>();
const reminders =
  globalForMock.reminders || new Map<string, EventReminder[]>();

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
    updated_at: new Date(Date.now() - 86400000).toISOString(),
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
    event_date: new Date(Date.now() + 86400000 * 10).toISOString(),
    location: "Virtual · Zoom + livestream",
    media: {
      hero_url:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=80",
      gallery_urls: [
        "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800&q=80",
        "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80",
        "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80",
      ],
    },
    sponsors: [
      { id: "sp_1", name: "Vercel", website: "https://vercel.com" },
      { id: "sp_2", name: "Linear", website: "https://linear.app" },
      { id: "sp_3", name: "Stripe", website: "https://stripe.com" },
    ],
    sponsors_display: "grid",
  });

  assets.set(demoId, [
    {
      id: "asset_flyer_demo",
      campaign_id: demoId,
      kind: "flyer",
      status: "ready",
      url: "/demo/flyer-placeholder.svg",
      thumbnail_url: "/demo/flyer-placeholder.svg",
      label: "Hero flyer",
      prompt: "Bold modern type, deep violet gradient, abstract waves",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "asset_audio_demo",
      campaign_id: demoId,
      kind: "voiceover",
      status: "ready",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      label: "Teaser narration",
      voice_id: "warm-f",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    }
  ]);

  attendees.set(eventId, [
    { id: "att_1", event_id: eventId, name: "Senesh Fernando", email: "senesh@example.com", created_at: new Date(Date.now() - 3600000).toISOString(), ticket_code: "TKT-A4F2-X8L9" },
    { id: "att_2", event_id: eventId, name: "Gemini AI", email: "gemini@google.com", created_at: new Date(Date.now() - 7200000).toISOString(), ticket_code: "TKT-B7K1-M2N5" },
    { id: "att_3", event_id: eventId, name: "Cursor Bot", email: "bot@cursor.sh", created_at: new Date(Date.now() - 10800000).toISOString(), ticket_code: "TKT-C3Q8-R6T0" },
  ]);
  events.get(eventId)!.attendee_count = 3;

  announcements.set(eventId, [
    {
      id: "ann_demo_1",
      event_id: eventId,
      subject: "Speaker lineup just dropped",
      body: "Hey everyone — we're stoked to share the full speaker lineup for React Summit 2026. Eight talks, three workshops, and a closing fireside. See you there.",
      sent_at: new Date(Date.now() - 86400000).toISOString(),
      recipient_count: 3,
      channel: "email",
    },
  ]);

  const eventDate = events.get(eventId)!.event_date!;
  reminders.set(eventId, [
  {
      id: "rem_demo_24h",
      event_id: eventId,
      preset_id: "24h",
      label: "24 hours before",
      scheduled_for: new Date(+new Date(eventDate) - 86400000).toISOString(),
      subject: "Tomorrow: React Summit 2026",
      body: "You're registered — here's everything you need for tomorrow: join link, schedule, and how to get your ticket ready.",
      status: "scheduled",
      enabled: true,
      channel: "email",
      sent_at: null,
    },
  ]);
}

if (process.env.NODE_ENV !== "production") {
  globalForMock.campaigns = campaigns;
  globalForMock.events = events;
  globalForMock.assets = assets;
  globalForMock.attendees = attendees;
  globalForMock.announcements = announcements;
  globalForMock.reminders = reminders;
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

export type CreateCampaignMode = "all" | "strategy";

export function createCampaign(input: {
  title: string;
  goal_prompt: string;
  mode?: CreateCampaignMode;
  user_id?: string;
  strategy?: CampaignStrategy;
}): Campaign {
  const id = uid("camp");
  const mode: CreateCampaignMode = input.mode ?? "all";
  const now = new Date().toISOString();
  const campaign: Campaign = {
    id,
    user_id: input.user_id ?? "demo-user",
    title: input.title,
    goal_prompt: input.goal_prompt,
    status: "draft",
    strategy_json: input.strategy ?? null,
    created_at: now,
    updated_at: now,
    event_id: null,
  };
  campaigns.set(id, campaign);

  if (!input.strategy) {
    // Default mock behavior if no strategy provided
    setTimeout(() => {
      const current = campaigns.get(id);
      if (!current) return;
      const strategy = demoStrategy as CampaignStrategy;
      const eventId = mode === "all" ? buildEventFromStrategy(id, input.title, strategy) : null;
      campaigns.set(id, {
        ...current,
        status: "strategy_ready",
        strategy_json: strategy,
        event_id: eventId,
        updated_at: new Date().toISOString(),
      });
    }, 800);
  } else {
    const eventId =
      mode === "all" ? buildEventFromStrategy(id, input.title, input.strategy) : null;
    campaigns.set(id, {
      ...campaign,
      status: "strategy_ready",
      strategy_json: input.strategy,
      event_id: eventId,
      updated_at: new Date().toISOString(),
    });
  }

  return campaign;
}

function buildEventFromStrategy(
  campaignId: string,
  title: string,
  strategy: CampaignStrategy,
): string {
  const eventId = uid("evt");
  const event: Event = {
    id: eventId,
    campaign_id: campaignId,
    slug: slugify(title || "campaign"),
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
  return eventId;
}

export function createEventForCampaign(campaignId: string): Event | undefined {
  const campaign = campaigns.get(campaignId);
  if (!campaign || !campaign.strategy_json) return undefined;
  if (campaign.event_id) return events.get(campaign.event_id);

  const eventId = buildEventFromStrategy(
    campaignId,
    campaign.title,
    campaign.strategy_json,
  );
  campaigns.set(campaignId, { ...campaign, event_id: eventId });
  return events.get(eventId);
}

export type UpdateStrategyResult =
  | { ok: true; campaign: Campaign }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "conflict"; current: Campaign };

export function updateCampaignStrategy(
  id: string,
  strategy: CampaignStrategy,
  options: { withEvent?: boolean; ifUpdatedAt?: string } = {},
): UpdateStrategyResult {
  const campaign = campaigns.get(id);
  if (!campaign) return { ok: false, reason: "not_found" };

  if (options.ifUpdatedAt && campaign.updated_at !== options.ifUpdatedAt) {
    return { ok: false, reason: "conflict", current: campaign };
  }

  let eventId = campaign.event_id;
  if (options.withEvent && !eventId) {
    eventId = buildEventFromStrategy(id, campaign.title, strategy);
  }

  const updated: Campaign = {
    ...campaign,
    status: "strategy_ready",
    strategy_json: strategy,
    event_id: eventId,
    updated_at: new Date().toISOString(),
  };
  campaigns.set(id, updated);
  return { ok: true, campaign: updated };
}

export function getCampaignAssets(campaignId: string): Asset[] {
  return assets.get(campaignId) ?? [];
}

function readyAssetFor(asset: Asset): Asset {
  if (asset.kind === "flyer") {
    return {
      ...asset,
      status: "ready",
      url: "/demo/flyer-placeholder.svg",
      thumbnail_url: "/demo/flyer-placeholder.svg",
    };
  }
  return {
    ...asset,
    status: "ready",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  };
}

function maybePromoteCampaign(campaignId: string) {
  const list = assets.get(campaignId) ?? [];
  const hasFlyer = list.some((a) => a.kind === "flyer" && a.status === "ready");
  const hasAudio = list.some((a) => a.kind === "voiceover" && a.status === "ready");
  if (hasFlyer && hasAudio) {
    const c = campaigns.get(campaignId);
    if (c && c.status !== "published") {
      campaigns.set(campaignId, { ...c, status: "assets_ready" });
    }
  }
}

function defaultLabel(campaignId: string, kind: AssetKind): string {
  const existing = (assets.get(campaignId) ?? []).filter((a) => a.kind === kind);
  const n = existing.length + 1;
  return kind === "flyer" ? `Flyer ${n}` : `Voiceover ${n}`;
}

export function addAsset(
  campaignId: string,
  kind: AssetKind,
  input: { flyer?: FlyerInput; voice?: VoiceoverInput } = {},
): Asset[] {
  const existing = assets.get(campaignId) ?? [];

  const base: Asset = {
    id: uid("asset"),
    campaign_id: campaignId,
    kind,
    status: "processing",
    url: null,
    created_at: new Date().toISOString(),
  };

  const placeholder: Asset =
    kind === "flyer"
      ? {
          ...base,
          label: input.flyer?.label?.trim() || defaultLabel(campaignId, "flyer"),
          prompt: input.flyer?.prompt?.trim(),
        }
      : {
          ...base,
          label:
            input.voice?.label?.trim() || defaultLabel(campaignId, "voiceover"),
          prompt: input.voice?.script?.trim(),
          voice_id: input.voice?.voice_id,
        };

  const next = [...existing, placeholder];
  assets.set(campaignId, next);

  setTimeout(() => {
    const current = assets.get(campaignId) ?? [];
    assets.set(
      campaignId,
      current.map((a) => (a.id === placeholder.id ? readyAssetFor(a) : a)),
    );
    maybePromoteCampaign(campaignId);
  }, 1500);

  return next;
}

export function regenerateAsset(
  campaignId: string,
  assetId: string,
): Asset[] | undefined {
  const current = assets.get(campaignId) ?? [];
  const target = current.find((a) => a.id === assetId);
  if (!target) return undefined;

  const processing: Asset = { ...target, status: "processing", url: null };
  const next = current.map((a) => (a.id === assetId ? processing : a));
  assets.set(campaignId, next);

  setTimeout(() => {
    const list = assets.get(campaignId) ?? [];
    assets.set(
      campaignId,
      list.map((a) => (a.id === assetId ? readyAssetFor(a) : a)),
    );
    maybePromoteCampaign(campaignId);
  }, 1500);

  return next;
}

export function deleteAsset(
  campaignId: string,
  assetId: string,
): Asset[] | undefined {
  const current = assets.get(campaignId) ?? [];
  if (!current.some((a) => a.id === assetId)) return undefined;
  const next = current.filter((a) => a.id !== assetId);
  assets.set(campaignId, next);
  return next;
}

export function startAssetGeneration(campaignId: string): Asset[] {
  addAsset(campaignId, "flyer");
  return addAsset(campaignId, "voiceover");
}

export function getEvent(id: string): Event | undefined {
  return events.get(id);
}

export function getEventBySlug(slug: string): Event | undefined {
  return Array.from(events.values()).find((e) => e.slug === slug);
}

export function updateEvent(
  id: string,
  patch: Partial<
    Pick<
      Event,
      | "landing"
      | "form_fields"
      | "price"
      | "media"
      | "sponsors"
      | "sponsors_display"
      | "event_date"
      | "location"
    >
  >,
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

function generateTicketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n: number) =>
    Array.from(
      { length: n },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  return `TKT-${pick(4)}-${pick(4)}`;
}

export function registerAttendee(
  eventId: string,
  data: {
    name: string;
    email: string;
    metadata?: Record<string, string>;
  },
): Attendee | undefined {
  const event = events.get(eventId);
  if (!event || !event.published) return undefined;

  // Reuse existing ticket if this email already registered (idempotent re-register)
  const list = attendees.get(eventId) ?? [];
  const existing = list.find(
    (a) => a.email.toLowerCase() === data.email.toLowerCase(),
  );

  const record: Attendee =
    existing ?? {
      id: uid("att"),
      event_id: eventId,
      name: data.name,
      email: data.email,
      created_at: new Date().toISOString(),
      ticket_code: generateTicketCode(),
      metadata: data.metadata,
    };

  if (!existing) {
    list.push(record);
    attendees.set(eventId, list);
    events.set(eventId, { ...event, attendee_count: list.length });
  } else if (data.metadata) {
    record.metadata = { ...(record.metadata ?? {}), ...data.metadata };
  }

  return record;
}

export function getAttendeeByTicket(code: string):
  | { attendee: Attendee; event: Event }
  | undefined {
  for (const [eventId, list] of attendees.entries()) {
    const attendee = list.find((a) => a.ticket_code === code);
    if (attendee) {
      const event = events.get(eventId);
      if (event) return { attendee, event };
    }
  }
  return undefined;
}

export function listAnnouncements(eventId: string): Announcement[] {
  return (announcements.get(eventId) ?? [])
    .slice()
    .sort((a, b) => +new Date(b.sent_at) - +new Date(a.sent_at));
}

export function createAnnouncement(
  eventId: string,
  input: { subject: string; body: string; channel?: "email" | "in_app" },
): Announcement | undefined {
  const event = events.get(eventId);
  if (!event) return undefined;
  const record: Announcement = {
    id: uid("ann"),
    event_id: eventId,
    subject: input.subject.trim(),
    body: input.body.trim(),
    sent_at: new Date().toISOString(),
    recipient_count: (attendees.get(eventId) ?? []).length,
    channel: input.channel ?? "email",
  };
  const list = announcements.get(eventId) ?? [];
  list.push(record);
  announcements.set(eventId, list);
  return record;
}

const REMINDER_OFFSETS: Record<
  Exclude<ReminderPresetId, "custom">,
  { label: string; ms: number }
> = {
  "7d": { label: "1 week before", ms: 7 * 86400000 },
  "24h": { label: "24 hours before", ms: 86400000 },
  "1h": { label: "1 hour before", ms: 3600000 },
};

const DEFAULT_REMINDER_COPY: Record<
  Exclude<ReminderPresetId, "custom">,
  { subject: string; body: string }
> = {
  "7d": {
    subject: "One week until {event}",
    body: "Your event is coming up in 7 days. Save the date, review the agenda, and make sure your ticket is handy.",
  },
  "24h": {
    subject: "Tomorrow: {event}",
    body: "You're registered — here's everything you need for tomorrow: join link, schedule, and how to get your ticket ready.",
  },
  "1h": {
    subject: "Starting in 1 hour — {event}",
    body: "We go live in about an hour. Grab your ticket link below and join us on time.",
  },
};

function fillReminderTemplate(text: string, eventTitle: string): string {
  return text.replace(/\{event\}/g, eventTitle);
}

function computePresetSchedule(
  eventDate: string,
  presetId: Exclude<ReminderPresetId, "custom">,
): string {
  return new Date(+new Date(eventDate) - REMINDER_OFFSETS[presetId].ms).toISOString();
}

export function listReminders(eventId: string): EventReminder[] {
  return (reminders.get(eventId) ?? [])
    .slice()
    .sort((a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for));
}

export function upsertPresetReminder(
  eventId: string,
  presetId: Exclude<ReminderPresetId, "custom">,
  input: { enabled: boolean; subject?: string; body?: string },
): EventReminder | undefined {
  const event = events.get(eventId);
  if (!event?.event_date) return undefined;

  const list = reminders.get(eventId) ?? [];
  const existing = list.find((r) => r.preset_id === presetId);
  const title = event.landing.headline;
  const defaults = DEFAULT_REMINDER_COPY[presetId];

  if (!input.enabled) {
    if (existing) {
      const updated = { ...existing, enabled: false, status: "cancelled" as const };
      reminders.set(
        eventId,
        list.map((r) => (r.id === existing.id ? updated : r)),
      );
      return updated;
    }
    return undefined;
  }

  const record: EventReminder = existing
    ? {
        ...existing,
        enabled: true,
        status: "scheduled",
        scheduled_for: computePresetSchedule(event.event_date, presetId),
        subject: input.subject?.trim() || existing.subject,
        body: input.body?.trim() || existing.body,
      }
    : {
        id: uid("rem"),
        event_id: eventId,
        preset_id: presetId,
        label: REMINDER_OFFSETS[presetId].label,
        scheduled_for: computePresetSchedule(event.event_date, presetId),
        subject: fillReminderTemplate(
          input.subject?.trim() || defaults.subject,
          title,
        ),
        body: fillReminderTemplate(input.body?.trim() || defaults.body, title),
        status: "scheduled",
        enabled: true,
        channel: "email",
        sent_at: null,
      };

  if (existing) {
    reminders.set(
      eventId,
      list.map((r) => (r.id === existing.id ? record : r)),
    );
  } else {
    list.push(record);
    reminders.set(eventId, list);
  }
  return record;
}

export function createCustomReminder(
  eventId: string,
  input: {
    scheduled_for: string;
    subject: string;
    body: string;
    label?: string;
  },
): EventReminder | undefined {
  const event = events.get(eventId);
  if (!event) return undefined;

  const scheduled = new Date(input.scheduled_for);
  if (Number.isNaN(scheduled.getTime())) return undefined;

  const record: EventReminder = {
    id: uid("rem"),
    event_id: eventId,
    preset_id: "custom",
    label: input.label?.trim() || "Custom reminder",
    scheduled_for: scheduled.toISOString(),
    subject: input.subject.trim(),
    body: input.body.trim(),
    status: "scheduled",
    enabled: true,
    channel: "email",
    sent_at: null,
  };
  const list = reminders.get(eventId) ?? [];
  list.push(record);
  reminders.set(eventId, list);
  return record;
}

export function updateReminder(
  eventId: string,
  reminderId: string,
  patch: Partial<Pick<EventReminder, "subject" | "body" | "enabled" | "scheduled_for">>,
): EventReminder | undefined {
  const list = reminders.get(eventId) ?? [];
  const idx = list.findIndex((r) => r.id === reminderId);
  if (idx < 0) return undefined;

  const current = list[idx];
  const updated: EventReminder = {
    ...current,
    ...patch,
    status:
      patch.enabled === false
        ? "cancelled"
        : patch.enabled === true
          ? "scheduled"
          : current.status,
  };
  list[idx] = updated;
  reminders.set(eventId, list);
  return updated;
}

export function deleteReminder(
  eventId: string,
  reminderId: string,
): boolean {
  const list = reminders.get(eventId) ?? [];
  const next = list.filter((r) => r.id !== reminderId);
  if (next.length === list.length) return false;
  reminders.set(eventId, next);
  return true;
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
