"use client";

import { useMemo, useState } from "react";
import { Lock, ShieldCheck, Sparkles, Check, CreditCard } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { CardBrandMark } from "./CardBrandMark";
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  formatMoney,
  isCvcValid,
  isExpiryValid,
  luhnValid,
} from "@/lib/payment";
import type { Currency } from "@/types/campaign";
import { cn } from "@/lib/utils";

export type CheckoutItem = {
  title: string;
  description?: string;
  amount_cents: number;
  currency: Currency;
  recurring?: "month" | "year";
};

type Props = {
  open: boolean;
  onClose: () => void;
  item: CheckoutItem | null;
  onSuccess?: (details: {
    last4: string;
    cardholder: string;
    email: string;
  }) => void;
};

export function CheckoutModal({ open, onClose, item, onSuccess }: Props) {
  const [cardholder, setCardholder] = useState("");
  const [email, setEmail] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const brand = useMemo(() => detectCardBrand(number), [number]);

  function reset() {
    setCardholder("");
    setEmail("");
    setNumber("");
    setExpiry("");
    setCvc("");
    setZip("");
    setLoading(false);
    setDone(false);
    setError(null);
  }

  function close() {
    if (loading) return;
    reset();
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setError(null);

    if (!cardholder.trim()) return setError("Cardholder name is required.");
    if (!email.trim() || !email.includes("@"))
      return setError("Enter a valid email.");
    if (!luhnValid(number)) return setError("Card number isn't valid.");
    if (!isExpiryValid(expiry)) return setError("Expiry date isn't valid.");
    if (!isCvcValid(cvc, brand)) return setError("CVC isn't valid.");

    setLoading(true);
    // Simulate Stripe-style processing
    await new Promise((r) => setTimeout(r, 1400));
    const last4 = number.replace(/\D/g, "").slice(-4);
    setLoading(false);
    setDone(true);
    onSuccess?.({ last4, cardholder, email });
  }

  if (!item) return null;

  return (
    <Modal open={open} onClose={close} size="lg">
      {done ? (
        <SuccessState item={item} onClose={close} />
      ) : (
        <div className="grid md:grid-cols-[1fr_1.1fr]">
          {/* Order summary */}
          <aside className="relative overflow-hidden border-b border-zinc-100 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-7 text-white md:border-b-0 md:border-r">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-600/30 blur-3xl animate-float-slow"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-500/30 blur-3xl animate-float-slow"
              style={{ animationDelay: "3s" }}
            />

            <div className="relative">
              <p className="text-xs font-medium uppercase tracking-wider text-white/60">
                Order summary
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">
                {item.title}
              </h3>
              {item.description && (
                <p className="mt-1 text-sm leading-relaxed text-white/70">
                  {item.description}
                </p>
              )}

              <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Subtotal</span>
                  <span>{formatMoney(item.amount_cents, item.currency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Tax</span>
                  <span>{formatMoney(0, item.currency)}</span>
                </div>
                <div className="flex items-end justify-between border-t border-white/10 pt-4">
                  <span className="text-sm text-white/70">
                    Total{" "}
                    {item.recurring && (
                      <span className="text-white/40">/ {item.recurring}</span>
                    )}
                  </span>
                  <span className="text-3xl font-semibold tracking-tight">
                    {formatMoney(item.amount_cents, item.currency)}
                  </span>
                </div>
              </div>

              <div className="mt-8 space-y-2 text-xs text-white/60">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  256-bit SSL encryption
                </p>
                <p className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-emerald-300" />
                  Card data never touches our servers
                </p>
              </div>

              <div className="absolute bottom-0 left-0 right-0 mt-10 hidden items-center justify-between text-[10px] text-white/40 md:flex">
                <div className="flex items-center gap-1">
                  <span>Powered by</span>
                  <span className="font-semibold text-white/70">stripe</span>
                </div>
                <CreditCard className="h-3 w-3" />
              </div>
            </div>
          </aside>

          {/* Card form */}
          <form onSubmit={submit} className="space-y-4 p-7">
            <header>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                Payment details
              </h2>
              <p className="text-sm text-zinc-500">
                Use any card — this is a demo, no real charges.
              </p>
            </header>

            <TextField
              name="email"
              type="email"
              label="Email for receipt"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <TextField
              name="cardholder"
              label="Cardholder name"
              placeholder="As it appears on the card"
              value={cardholder}
              onChange={(e) => setCardholder(e.target.value)}
              autoComplete="cc-name"
              required
            />

            <div>
              <label
                htmlFor="cardnumber"
                className="text-xs font-medium text-zinc-700"
              >
                Card number
              </label>
              <div className="relative mt-1.5">
                <input
                  id="cardnumber"
                  name="cardnumber"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={number}
                  onChange={(e) => setNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  className={cn(
                    "h-11 w-full rounded-xl border border-zinc-200 bg-white pl-3.5 pr-16 text-sm tabular-nums text-zinc-900 placeholder:text-zinc-400 transition-all",
                    "focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100",
                  )}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <CardBrandMark brand={brand} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="expiry"
                  className="text-xs font-medium text-zinc-700"
                >
                  Expiry
                </label>
                <input
                  id="expiry"
                  name="expiry"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm tabular-nums text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
                />
              </div>
              <div>
                <label
                  htmlFor="cvc"
                  className="text-xs font-medium text-zinc-700"
                >
                  CVC
                </label>
                <input
                  id="cvc"
                  name="cvc"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  value={cvc}
                  onChange={(e) =>
                    setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder={brand === "amex" ? "4 digits" : "3 digits"}
                  className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm tabular-nums text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            <TextField
              name="zip"
              label="ZIP / postal code"
              placeholder="94103"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              autoComplete="postal-code"
            />

            {error && (
              <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="dark"
              size="lg"
              className="relative w-full overflow-hidden shine"
              loading={loading}
              leftIcon={!loading ? <Lock className="h-4 w-4" /> : undefined}
            >
              {loading
                ? "Charging your card"
                : `Pay ${formatMoney(item.amount_cents, item.currency)}${
                    item.recurring ? ` / ${item.recurring}` : ""
                  }`}
            </Button>

            <p className="text-center text-[11px] text-zinc-400">
              By paying you agree to our terms. Cancel anytime from your account.
            </p>
          </form>
        </div>
      )}
    </Modal>
  );
}

function SuccessState({
  item,
  onClose,
}: {
  item: CheckoutItem;
  onClose: () => void;
}) {
  return (
    <div className="space-y-6 p-10 text-center">
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
        <Check className="h-7 w-7" />
        <span className="absolute inset-0 rounded-full ring-2 ring-emerald-300 animate-ping-soft" />
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-semibold tracking-tight text-zinc-950">
          Payment successful
        </h3>
        <p className="text-sm text-zinc-500">
          We charged{" "}
          <span className="font-semibold text-zinc-900">
            {formatMoney(item.amount_cents, item.currency)}
          </span>{" "}
          for <span className="font-semibold text-zinc-900">{item.title}</span>.
          A receipt is on the way.
        </p>
      </div>
      <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500">
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        Confetti not included.
      </div>
      <Button onClick={onClose} variant="dark" className="w-full">
        Done
      </Button>
    </div>
  );
}
