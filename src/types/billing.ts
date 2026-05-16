import type { Timestamp } from "firebase/firestore";
import type { Currency, EventPrice } from "@/types/shared";

export type PlanId = "free" | "pro" | "team";
export type BillingPeriod = "monthly" | "yearly";

export type { Currency, EventPrice };

/** UI pricing catalog — not a Firestore collection. */
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

export type CardBrand =
  | "visa"
  | "mastercard"
  | "amex"
  | "discover"
  | "unknown";

/** UI card on file — maps to `payment_methods` when persisted. */
export type PaymentMethod = {
  id: string;
  brand: CardBrand;
  last4: string;
  exp_month: number;
  exp_year: number;
  cardholder: string;
  is_default?: boolean;
};

/** UI invoice row — maps to `invoices` when persisted. */
export type BillingHistoryItem = {
  id: string;
  description: string;
  amount_cents: number;
  currency: Currency;
  date: string;
  status: "paid" | "pending" | "failed" | "refunded";
};

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

/** `subscriptions/{subscriptionId}` */
export type Subscription = {
  user_id: string;
  plan_id: PlanId;
  status: SubscriptionStatus;
  billing_period: BillingPeriod;
  stripe_subscription_id: string | null;
  current_period_start: Timestamp;
  current_period_end: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type SubscriptionWithId = Subscription & { id: string };

/** `payment_methods/{paymentMethodId}` */
export type PaymentMethodDocument = {
  user_id: string;
  brand: CardBrand;
  last4: string;
  exp_month: number;
  exp_year: number;
  cardholder: string;
  stripe_payment_method_id: string | null;
  is_default: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type PaymentMethodDocumentWithId = PaymentMethodDocument & { id: string };

export type InvoiceStatus = "paid" | "pending" | "failed" | "refunded";

/** `invoices/{invoiceId}` */
export type Invoice = {
  user_id: string;
  subscription_id: string | null;
  description: string;
  amount_cents: number;
  currency: Currency;
  status: InvoiceStatus;
  stripe_invoice_id: string | null;
  created_at: Timestamp;
  paid_at: Timestamp | null;
};

export type InvoiceWithId = Invoice & { id: string };

export type PaymentStatus = "succeeded" | "pending" | "failed" | "refunded";

/** `payments/{paymentId}` — event registration / checkout. */
export type Payment = {
  attendee_id: string;
  event_id: string;
  user_id: string | null;
  email: string;
  amount_cents: number;
  currency: Currency;
  status: PaymentStatus;
  stripe_payment_intent_id: string | null;
  refund_reason: string | null;
  created_at: Timestamp;
};

export type PaymentWithId = Payment & { id: string };

/** @deprecated Use EventPrice from shared types. */
export type Price = {
  cents: number;
  whole: number;
  currency: Currency;
};
