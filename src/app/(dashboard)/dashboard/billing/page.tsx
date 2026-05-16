"use client";

import { useState } from "react";
import {
  CreditCard,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  Download,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { PricingCard } from "@/components/billing/PricingCard";
import { CardBrandMark } from "@/components/billing/CardBrandMark";
import {
  CheckoutModal,
  type CheckoutItem,
} from "@/components/billing/CheckoutModal";
import type {
  BillingHistoryItem,
  BillingPeriod,
  PaymentMethod,
  Plan,
  PlanId,
} from "@/types/billing";
import { formatMoney, maskCard } from "@/lib/payment";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "For tinkerers & first launches",
    price_monthly_cents: 0,
    price_yearly_cents: 0,
    currency: "USD",
    features: [
      "1 active campaign",
      "Limited AI generations",
      "Up to 50 attendees / event",
      "Community support",
    ],
    cta: "Stay on Free",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For solo founders shipping weekly",
    price_monthly_cents: 1900,
    price_yearly_cents: 18240,
    currency: "USD",
    features: [
      "Unlimited campaigns",
      "Real Gemini, image, & TTS APIs",
      "Up to 5,000 attendees / event",
      "Custom domain for event pages",
      "Email + chat support",
    ],
    highlighted: true,
    cta: "Upgrade to Pro",
  },
  {
    id: "team",
    name: "Team",
    tagline: "For small teams scaling fast",
    price_monthly_cents: 4900,
    price_yearly_cents: 47040,
    currency: "USD",
    features: [
      "Everything in Pro",
      "3 seats included",
      "Shared brand library",
      "Priority Stripe payouts",
      "SLA & dedicated support",
    ],
    cta: "Upgrade to Team",
  },
];

const initialMethods: PaymentMethod[] = [];

const history: BillingHistoryItem[] = [];

const statusStyles: Record<BillingHistoryItem["status"], string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-zinc-50 text-zinc-700 border-zinc-200",
};

export default function BillingPage() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [methods, setMethods] = useState<PaymentMethod[]>(initialMethods);
  const [checkout, setCheckout] = useState<CheckoutItem | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);

  function selectPlan(plan: Plan) {
    if (plan.id === "free") {
      setCurrentPlan("free");
      return;
    }
    const cents =
      period === "monthly"
        ? plan.price_monthly_cents
        : plan.price_yearly_cents;
    setPendingPlan(plan.id);
    setCheckout({
      title: `${plan.name} plan`,
      description: `Billed ${period}. Cancel or change anytime.`,
      amount_cents: cents,
      currency: plan.currency,
      recurring: period === "monthly" ? "month" : "year",
    });
  }

  function openAddCard() {
    setPendingPlan(null);
    setCheckout({
      title: "Save card on file",
      description:
        "We'll authorize $1 and refund immediately to verify your card.",
      amount_cents: 100,
      currency: "USD",
    });
  }

  function handleSuccess({
    last4,
    cardholder,
  }: {
    last4: string;
    cardholder: string;
  }) {
    setMethods((prev) => {
      const others = prev.map((m) => ({ ...m, is_default: false }));
      return [
        {
          id: `pm_${Date.now()}`,
          brand: "visa",
          last4,
          exp_month: 12,
          exp_year: 2030,
          cardholder,
          is_default: true,
        },
        ...others,
      ];
    });
    if (pendingPlan) setCurrentPlan(pendingPlan);
  }

  function removeMethod(id: string) {
    setMethods((prev) => prev.filter((m) => m.id !== id));
  }

  function setDefault(id: string) {
    setMethods((prev) =>
      prev.map((m) => ({ ...m, is_default: m.id === id })),
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Billing & plans
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Manage your subscription, payment methods, and invoices.
          </p>
        </div>
        <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-1 shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
          {(["monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "relative rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors",
                period === p
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900",
              )}
            >
              {p === "monthly" ? "Monthly" : "Yearly"}
              {p === "yearly" && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                  −20%
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Pricing */}
      <Section
        icon={<Sparkles className="h-4 w-4" />}
        title="Choose your plan"
        description="Switch or cancel anytime. Prorated automatically."
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <div
              key={plan.id}
              className={cn("animate-fade-up", `stagger-${i}`)}
            >
              <PricingCard
                plan={plan}
                period={period}
                current={currentPlan === plan.id}
                onSelect={selectPlan}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Payment methods */}
      <Section
        icon={<CreditCard className="h-4 w-4" />}
        title="Payment methods"
        description="Cards on file for subscriptions and event payouts."
        action={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={openAddCard}
          >
            Add card
          </Button>
        }
      >
        <div className="space-y-3">
          {methods.length === 0 ? (
            <Card className="flex items-center justify-between p-5">
              <p className="text-sm text-zinc-500">
                No payment method on file.
              </p>
              <Button
                size="sm"
                onClick={openAddCard}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Add your first card
              </Button>
            </Card>
          ) : (
            methods.map((m, i) => (
              <Card
                key={m.id}
                className={cn(
                  "flex flex-wrap items-center gap-4 p-4 animate-fade-up",
                  `stagger-${i}`,
                )}
              >
                <CardBrandMark brand={m.brand} className="h-8 w-12 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900">
                    {maskCard(m.last4, m.brand)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {m.cardholder} · expires{" "}
                    {String(m.exp_month).padStart(2, "0")}/{String(m.exp_year).slice(-2)}
                  </p>
                </div>
                {m.is_default ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Default
                  </span>
                ) : (
                  <button
                    onClick={() => setDefault(m.id)}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
                  >
                    Make default
                  </button>
                )}
                <button
                  onClick={() => removeMethod(m.id)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove card"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            ))
          )}
        </div>
      </Section>

      {/* History */}
      <Section
        icon={<Receipt className="h-4 w-4" />}
        title="Billing history"
        description="Past invoices and receipts."
      >
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/40">
                <th className="px-5 py-3 text-xs font-medium text-zinc-500">
                  Description
                </th>
                <th className="px-5 py-3 text-xs font-medium text-zinc-500">
                  Date
                </th>
                <th className="px-5 py-3 text-xs font-medium text-zinc-500">
                  Amount
                </th>
                <th className="px-5 py-3 text-xs font-medium text-zinc-500">
                  Status
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-zinc-500"
                  >
                    No invoices yet — they&apos;ll show up here after your first
                    payment.
                  </td>
                </tr>
              )}
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-zinc-50/60">
                  <td className="px-5 py-3 font-medium text-zinc-900">
                    {h.description}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {format(new Date(h.date), "MMM d, yyyy")}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-zinc-900">
                    {formatMoney(h.amount_cents, h.currency)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
                        statusStyles[h.status],
                      )}
                    >
                      {h.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-violet-600"
                      title="Download receipt"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>

      <CheckoutModal
        open={!!checkout}
        item={checkout}
        onClose={() => setCheckout(null)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
