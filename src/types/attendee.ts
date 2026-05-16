import type { Timestamp } from "firebase/firestore";
import type { Currency } from "@/types/shared";

/** `attendees/{attendeeId}` — Firestore document (no doc id in body). */
export type AttendeeDocument = {
  event_id: string;
  name: string;
  email: string;
  ticket_code: string;
  metadata: Record<string, string>;
  paid: boolean;
  payment_id: string | null;
  amount_cents: number | null;
  currency: Currency | null;
  created_at: Timestamp;
};

/** API / mock serialized attendee. */
export type Attendee = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  ticket_code?: string;
  metadata?: Record<string, string>;
  paid?: boolean;
  payment_id?: string | null;
  amount_cents?: number | null;
  currency?: Currency | null;
  created_at: string;
};

export type AttendeeWithId = Attendee;
