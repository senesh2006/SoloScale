import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type {
  CampaignStrategy,
  FormField,
} from "@/types/campaign";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

/**
 * Generates a unique kebab-case slug for an event by appending a short suffix
 * if the base form is already taken in the `events` collection.
 */
export async function uniqueEventSlug(
  db: Firestore,
  base: string,
): Promise<string> {
  const seed = slugify(base) || "event";
  const dup = await db
    .collection(COLLECTIONS.events)
    .where("slug", "==", seed)
    .limit(1)
    .get();
  if (dup.empty) return seed;
  for (let i = 0; i < 5; i++) {
    const candidate = `${seed}-${Math.random().toString(36).slice(2, 6)}`;
    const dup2 = await db
      .collection(COLLECTIONS.events)
      .where("slug", "==", candidate)
      .limit(1)
      .get();
    if (dup2.empty) return candidate;
  }
  throw new Error("Could not generate a unique slug after retries");
}

/**
 * Builds an `events` document from a campaign's strategy and writes it under
 * a new doc. Updates the parent campaign's `event_id` in the same batch.
 *
 * Returns the new event id.
 */
export async function createEventFromStrategy(
  db: Firestore,
  args: {
    campaignId: string;
    title: string;
    strategy: CampaignStrategy;
  },
): Promise<string> {
  const slug = await uniqueEventSlug(db, args.title);
  const eventRef = db.collection(COLLECTIONS.events).doc();
  const formFields = (args.strategy.event_draft.form_fields ??
    []) as FormField[];

  const batch = db.batch();
  batch.set(eventRef, {
    campaign_id: args.campaignId,
    slug,
    published: false,
    landing: {
      headline: args.strategy.event_draft.headline,
      subhead: args.strategy.event_draft.subhead,
      body_md: args.strategy.event_draft.body_md,
    },
    event_date: null,
    location: null,
    form_fields: formFields,
    media: {},
    sponsors: [],
    sponsors_display: "grid",
    attendee_count: 0,
    price: null,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });
  batch.update(db.collection(COLLECTIONS.campaigns).doc(args.campaignId), {
    event_id: eventRef.id,
    event_ids: FieldValue.arrayUnion(eventRef.id),
    updated_at: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return eventRef.id;
}
