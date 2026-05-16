"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Event } from "@/types/campaign";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Mail,
  User,
  Sparkles,
  Users as UsersIcon,
  Lock,
  Ticket,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Spinner } from "@/components/ui/Spinner";
import {
  CheckoutModal,
  type CheckoutItem,
} from "@/components/billing/CheckoutModal";
import { formatPrice } from "@/lib/payment";
import { cn } from "@/lib/utils";

export default function PublicEventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    apiFetch<{ event: Event }>(`/api/events/slug/${slug}`)
      .then(({ event: e }) => setEvent(e))
      .catch(() => setError("Event not found or not published"));
  }, [slug]);

  const isPaid = !!event?.price && event.price.amount_cents > 0;

  const checkoutItem: CheckoutItem | null = useMemo(() => {
    if (!event || !isPaid) return null;
    return {
      title: event.landing.headline,
      description: event.landing.subhead,
      amount_cents: event.price!.amount_cents,
      currency: event.price!.currency,
    };
  }, [event, isPaid]);

  async function finalizeRegistration() {
    if (!event) return;
    await apiFetch(`/api/events/slug/${slug}/register`, {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        metadata: {
          ...customFields,
          ...(isPaid ? { paid: "true", amount_cents: String(event.price?.amount_cents) } : {}),
        },
      }),
    });
    setDone(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!event) return;

    // Free flow — register immediately
    if (!isPaid) {
      setLoading(true);
      try {
        await finalizeRegistration();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Paid flow — open checkout, register on success
    setCheckoutOpen(true);
  }

  async function handlePaymentSuccess() {
    setLoading(true);
    try {
      await finalizeRegistration();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (error && !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="text-sm text-zinc-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white text-zinc-950 selection:bg-violet-100 selection:text-violet-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-violet-200 via-fuchsia-200 to-indigo-300 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72rem]" />
      </div>

      <main className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="space-y-8 lg:col-span-3">
            <div className="space-y-5 animate-fade-up">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                  <Sparkles className="h-3 w-3" />
                  Featured event
                </div>
                {isPaid ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">
                    <Ticket className="h-3 w-3" />
                    <span className="tabular-nums">
                      {formatPrice(event.price)}
                    </span>
                    <span className="text-violet-400">per seat</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <Tag className="h-3 w-3" />
                    Free
                  </div>
                )}
              </div>
              <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
                {event.landing.headline}
              </h1>
              <p className="text-lg leading-relaxed text-zinc-600">
                {event.landing.subhead}
              </p>
            </div>

            <div className="prose prose-zinc max-w-none animate-fade-up stagger-1">
              <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-600">
                {event.landing.body_md}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-zinc-100 pt-6 text-sm text-zinc-500 animate-fade-up stagger-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-400" />
                Date announced soon
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-zinc-400" />
                Virtual event
              </div>
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-zinc-400" />
                {event.attendee_count} attendees registered
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 animate-fade-up stagger-2">
            <div className="sticky top-12 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/40">
              {isPaid && !done && (
                <div className="relative overflow-hidden border-b border-zinc-100 bg-gradient-to-br from-violet-50/80 via-white to-white px-7 pt-6 pb-5">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/40 blur-3xl animate-float-slow"
                  />
                  <p className="text-xs font-medium uppercase tracking-wider text-violet-700/70">
                    Ticket price
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tracking-tight text-zinc-950 tabular-nums">
                      {formatPrice(event.price)}
                    </span>
                    <span className="text-sm text-zinc-500">per attendee</span>
                  </div>
                </div>
              )}

              <div className="p-7">
                {done ? (
                  <div className="space-y-5 py-2 text-center">
                    <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                      <CheckCircle2 className="h-7 w-7" />
                      <span className="absolute inset-0 rounded-2xl ring-2 ring-emerald-300 animate-ping-soft" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-zinc-950">
                        You're in!
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {isPaid
                          ? "Payment received. Your ticket is on the way to "
                          : "Confirmation sent to "}
                        <span className="font-medium text-violet-700">
                          {email}
                        </span>
                        .
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setDone(false);
                        setName("");
                        setEmail("");
                        setCustomFields({});
                      }}
                      className="text-xs font-medium text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline"
                    >
                      Register someone else
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
                        {isPaid ? "Reserve your ticket" : "Save your spot"}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {isPaid
                          ? "Secure checkout · pay only after you review."
                          : "Free to register · takes 20 seconds."}
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <TextField
                        label="Full name"
                        placeholder="Peter Senesh"
                        leftIcon={<User className="h-4 w-4" />}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                      <TextField
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        leftIcon={<Mail className="h-4 w-4" />}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />

                      {event.form_fields
                        .filter((field) => {
                          const label = field.label.toLowerCase();
                          const isName =
                            label.includes("name") && field.type === "text";
                          const isEmail = field.type === "email";
                          return !isName && !isEmail;
                        })
                        .map((field) => (
                          <TextField
                            key={field.id}
                            label={field.label}
                            type={field.type === "email" ? "email" : "text"}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            value={customFields[field.id] || ""}
                            onChange={(e) =>
                              setCustomFields({
                                ...customFields,
                                [field.id]: e.target.value,
                              })
                            }
                            required={field.required}
                          />
                        ))}

                      {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                          {error}
                        </div>
                      )}

                      <Button
                        type="submit"
                        size="lg"
                        className={cn(
                          "relative w-full overflow-hidden shine",
                          isPaid && "bg-zinc-950 hover:bg-zinc-800",
                        )}
                        loading={loading}
                        leftIcon={
                          isPaid && !loading ? <Lock className="h-4 w-4" /> : undefined
                        }
                      >
                        {loading
                          ? isPaid
                            ? "Finalizing"
                            : "Registering"
                          : isPaid
                            ? `Continue to payment · ${formatPrice(event.price)}`
                            : "Reserve my seat"}
                      </Button>

                      <p className="text-center text-[11px] text-zinc-400">
                        {isPaid
                          ? "Secured by Stripe-style checkout · refundable within 7 days."
                          : "By registering, you agree to receive event updates."}
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-950 text-[10px] font-semibold text-white">
              S
            </div>
            <span>Powered by SoloScale</span>
          </div>
          <p>© 2026 SoloScale AI</p>
        </div>
      </footer>

      <CheckoutModal
        open={checkoutOpen}
        item={checkoutItem}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
