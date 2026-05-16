import type { Timestamp } from "firebase/firestore";
import type {
  EventMedia,
  EventPrice,
  FormField,
  Landing,
  Sponsor,
  SponsorDisplay,
} from "@/types/shared";

/** `events/{eventId}` — Firestore document (no doc id in body). */
export type EventDocument = {
  campaign_id: string;
  slug: string;
  published: boolean;
  landing: Landing;
  event_date: Timestamp | null;
  location: string | null;
  form_fields: FormField[];
  media: EventMedia;
  sponsors: Sponsor[];
  sponsors_display: SponsorDisplay;
  attendee_count: number;
  price: EventPrice | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

/** API / mock serialized event. */
export type Event = {
  id: string;
  campaign_id: string;
  slug: string;
  published: boolean;
  landing: Landing;
  form_fields: FormField[];
  attendee_count: number;
  price?: EventPrice | null;
  media?: EventMedia;
  sponsors?: Sponsor[];
  sponsors_display?: SponsorDisplay;
  event_date?: string | null;
  location?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type EventWithId = Event;
