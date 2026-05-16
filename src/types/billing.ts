import { Timestamp } from "firebase/firestore";

export type PlanId = "free" | "pro" | "team";
export type BillingPeriod = "monthly" | "yearly";

export type Currency = "USD" | "EUR" | "GBP" | "INR" | "LKR";

export type Price = {
  cents: number;
  whole: number;
  currency: Currency;
};

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
};

export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unknown";

export type PaymentMethod = {
  id: string;
  brand: CardBrand;
  last4: string;
  exp_month: number;
  exp_year: number;
  cardholder: string;
  is_default?: boolean;
};

export type Payment = {
  id: string;
  attendee_id: string;
  email: string;
  
  event_id: string;
  amount: Price;
  status: "succeeded" | "pending" | "failed" | "refunded";
  created_at: Timestamp;
  refund_reason?: string;
};
