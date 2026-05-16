"use client";

import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import type { BillingPeriod, Plan } from "@/types/billing";
import { cn } from "@/lib/utils";

type Props = {
  plan: Plan;
  period: BillingPeriod;
  current?: boolean;
  onSelect: (plan: Plan) => void;
};

export function PricingCard({ plan, period, current, onSelect }: Props) {
  const cents =
    period === "monthly" ? plan.price_monthly_cents : plan.price_yearly_cents;
  const monthly =
    period === "monthly"
      ? cents
      : Math.round(cents / 12);
  const dollars = monthly / 100;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg",
        plan.highlighted
          ? "border-zinc-950 shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-950"
          : "border-zinc-200",
      )}
    >
      {plan.highlighted && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 blur-3xl"
        />
      )}

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold tracking-tight text-zinc-950">
              {plan.name}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{plan.tagline}</p>
          </div>
          {plan.highlighted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Sparkles className="h-2.5 w-2.5" />
              Popular
            </span>
          )}
          {current && !plan.highlighted && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              Current
            </span>
          )}
        </div>

        <div className="mt-6 flex items-baseline gap-1">
          <span className="text-4xl font-semibold tracking-tight text-zinc-950">
            $<CountUp value={dollars} format={(n) => Math.round(n).toString()} />
          </span>
          <span className="text-sm text-zinc-500">/ month</span>
        </div>
        {period === "yearly" && cents > 0 && (
          <p className="mt-1 text-xs text-emerald-600">
            Billed yearly · save 20%
          </p>
        )}

        <ul className="mt-6 space-y-2.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-zinc-700">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-6 pt-6">
        <Button
          variant={plan.highlighted ? "dark" : current ? "outline" : "secondary"}
          className="w-full"
          disabled={current}
          onClick={() => onSelect(plan)}
        >
          {current ? "Current plan" : plan.cta}
        </Button>
      </div>
    </div>
  );
}
