import type { Timestamp } from "firebase/firestore";

export type Currency = "USD" | "EUR" | "GBP" | "INR" | "LKR";

export type EventPrice = {
  amount_cents: number;
  currency: Currency;
};

export type Landing = {
  headline: string;
  subhead: string;
  body_md: string;
};

export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "date"
  | "select"
  | "checkbox";

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: string[];
};

export type SponsorDisplay = "grid" | "carousel";

export type Sponsor = {
  id: string;
  name: string;
  logo_url?: string;
  website?: string;
};

export type EventMedia = {
  hero_url?: string;
  gallery_urls?: string[];
};

/** Firestore document fields shared by many collections. */
export type WithTimestamps = {
  created_at: Timestamp;
  updated_at: Timestamp;
};
