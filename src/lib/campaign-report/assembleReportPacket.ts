import { COLLECTIONS } from "@/lib/firestore/collections";
import { aggregateEventAnalytics } from "@/lib/firestore/aggregateEventAnalytics";
import { snapshotToObject } from "@/lib/firestore/serialize";
import type {
  CampaignReportPacket,
  CampaignReportStrategy,
} from "@/types/campaignReport";
import type { CampaignMode, CampaignStatus, CampaignStrategy } from "@/types/campaign";

const STRATEGY_TIMELINE_CAP = 30;

function formatTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return null;
}

function formatPriceSummary(price: unknown): string | null {
  if (!price || typeof price !== "object") return null;
  const p = price as { amount_cents?: number; currency?: string; type?: string };
  if (p.type === "free" || p.amount_cents === 0) return "Free";
  if (typeof p.amount_cents === "number" && p.currency) {
    return `${(p.amount_cents / 100).toFixed(2)} ${p.currency}`;
  }
  return null;
}

function buildStrategySection(
  strategy: CampaignStrategy | null,
): CampaignReportStrategy | null {
  if (!strategy) return null;
  const timeline = strategy.timeline ?? [];
  return {
    summary: strategy.summary,
    post_count: timeline.length,
    timeline_sample: timeline.slice(0, STRATEGY_TIMELINE_CAP).map((item) => ({
      type: item.type,
      scheduled_at: item.scheduled_at,
      copy_preview: item.copy.slice(0, 160),
    })),
    event_draft_headline: strategy.event_draft?.headline ?? null,
  };
}

function buildMetricsForAi(packet: Omit<CampaignReportPacket, "metrics_for_ai">): string {
  const lines: string[] = [
    `Campaign: ${packet.campaign.title} (${packet.campaign.status})`,
    `Events: ${packet.totals.event_count}`,
    `Total registrations: ${packet.totals.attendee_count} (paid: ${packet.totals.paid_count}, free: ${packet.totals.free_count})`,
    `Total revenue (cents): ${packet.totals.revenue_cents}${packet.totals.currency ? ` (${packet.totals.currency})` : ""}`,
    `Creative assets: ${packet.totals.asset_count}`,
    `Form responses: ${packet.totals.form_response_count}`,
    `Announcements sent: ${packet.totals.announcement_count}`,
    `Payments recorded: ${packet.totals.payment_count}`,
  ];

  if (packet.strategy) {
    lines.push(`Strategy posts planned: ${packet.strategy.post_count}`);
  }

  for (const ev of packet.events) {
    const a = ev.analytics;
    lines.push(
      `Event "${ev.title}": ${a.attendee_count} registrations, ${a.paid_count} paid, revenue ${a.revenue_cents} cents, ${a.response_count} form responses`,
    );
  }

  if (packet.totals.registrations_by_day.length > 0) {
    const peak = [...packet.totals.registrations_by_day].sort(
      (x, y) => y.count - x.count,
    )[0];
    lines.push(
      `Peak registration day: ${peak.date} (${peak.count} signups)`,
    );
  }

  return lines.join("\n");
}

function mergeRegistrationsByDay(
  events: CampaignReportPacket["events"],
): { date: string; count: number }[] {
  const map = new Map<string, number>();
  for (const ev of events) {
    for (const row of ev.analytics.registrations_by_day) {
      map.set(row.date, (map.get(row.date) ?? 0) + row.count);
    }
  }
  return [...map.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function assembleReportPacket(
  db: FirebaseFirestore.Firestore,
  campaignId: string,
  campaignData: Record<string, unknown>,
): Promise<CampaignReportPacket> {
  const strategyJson = campaignData.strategy_json as CampaignStrategy | null;

  const [eventsSnap, assetsSnap] = await Promise.all([
    db
      .collection(COLLECTIONS.events)
      .where("campaign_id", "==", campaignId)
      .limit(50)
      .get(),
    db
      .collection(COLLECTIONS.assets)
      .where("campaign_id", "==", campaignId)
      .limit(100)
      .get(),
  ]);

  const eventsRaw = eventsSnap.docs
    .map((d) =>
      snapshotToObject<Record<string, unknown>>({
        id: d.id,
        data: () => d.data(),
      }),
    )
    .filter((e): e is Record<string, unknown> & { id: string } => Boolean(e))
    .sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );

  const primaryEventId =
    (campaignData.event_id as string | null) ?? eventsRaw[0]?.id ?? null;

  const assets = assetsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      kind: String(data.kind ?? "unknown"),
      label: (data.label as string | undefined) ?? null,
      status: String(data.status ?? "unknown"),
      url:
        (data.url as string | undefined) ??
        (data.public_url as string | undefined) ??
        null,
    };
  });

  const by_kind: Record<string, number> = {};
  for (const a of assets) {
    by_kind[a.kind] = (by_kind[a.kind] ?? 0) + 1;
  }

  const events: CampaignReportPacket["events"] = [];
  let totalAnnouncements = 0;
  let totalPayments = 0;
  let totalFormResponses = 0;
  let totalAttendees = 0;
  let totalPaid = 0;
  let totalRevenue = 0;
  let currency: string | null = null;

  for (const ev of eventsRaw) {
    const eventCurrency =
      (ev.price as { currency?: string } | null)?.currency ?? null;
    if (eventCurrency) currency = eventCurrency;

    const analytics = await aggregateEventAnalytics(db, ev.id, eventCurrency);

    let announcement_count = 0;
    let payment_count = 0;

    if (ev.id === primaryEventId) {
      const [annSnap, paySnap] = await Promise.all([
        db
          .collection(COLLECTIONS.announcements)
          .where("event_id", "==", ev.id)
          .get(),
        db
          .collection(COLLECTIONS.payments)
          .where("event_id", "==", ev.id)
          .get(),
      ]);
      announcement_count = annSnap.size;
      payment_count = paySnap.size;
    }

    totalAnnouncements += announcement_count;
    totalPayments += payment_count;
    totalFormResponses += analytics.response_count;
    totalAttendees += analytics.attendee_count;
    totalPaid += analytics.paid_count;
    totalRevenue += analytics.revenue_cents;

    events.push({
      id: ev.id,
      title: String(ev.title ?? "Untitled event"),
      status: (ev.status as string | null) ?? null,
      slug: (ev.slug as string | null) ?? null,
      price_summary: formatPriceSummary(ev.price),
      announcement_count,
      payment_count,
      analytics,
    });
  }

  const partial: Omit<CampaignReportPacket, "metrics_for_ai"> = {
    generated_at: new Date().toISOString(),
    campaign: {
      id: campaignId,
      title: String(campaignData.title ?? "Untitled campaign"),
      goal_prompt: String(campaignData.goal_prompt ?? ""),
      status: (campaignData.status as CampaignStatus) ?? "draft",
      mode: (campaignData.mode as CampaignMode | undefined) ?? null,
      audience: (campaignData.audience as string | null) ?? null,
      event_date: formatTimestamp(campaignData.event_date),
      created_at: formatTimestamp(campaignData.created_at),
    },
    strategy: buildStrategySection(strategyJson),
    assets: {
      total: assets.length,
      by_kind,
      items: assets,
    },
    events,
    totals: {
      attendee_count: totalAttendees,
      paid_count: totalPaid,
      free_count: totalAttendees - totalPaid,
      revenue_cents: totalRevenue,
      currency,
      event_count: events.length,
      asset_count: assets.length,
      form_response_count: totalFormResponses,
      announcement_count: totalAnnouncements,
      payment_count: totalPayments,
      registrations_by_day: mergeRegistrationsByDay(events),
    },
  };

  return {
    ...partial,
    metrics_for_ai: buildMetricsForAi(partial),
  };
}
