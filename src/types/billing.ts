import type { Currency } from "./campaign";

export type PlanId = "free" | "pro" | "team";
export type BillingPeriod = "monthly" | "yearly";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  price_monthly_cents: number;
  price_yearly_cents: number;
  currency: Currency;
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

export type BillingHistoryItem = {
  id: string;
  description: string;
  amount_cents: number;
  currency: Currency;
  date: string;
  status: "paid" | "pending" | "failed" | "refunded";
  invoice_url?: string;
};
