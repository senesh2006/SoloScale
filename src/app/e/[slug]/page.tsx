"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Event } from "@/types/campaign";

export default function PublicEventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ event: Event }>(`/api/events/slug/${slug}`)
      .then(({ event: e }) => setEvent(e))
      .catch(() => setError("Event not found or not published"));
  }, [slug]);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch(`/api/events/slug/${slug}/register`, {
        method: "POST",
        body: JSON.stringify({ name, email }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  if (error && !event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600">{error}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading event…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white px-6 py-16">
      <article className="mx-auto max-w-xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          {event.landing.headline}
        </h1>
        <p className="mt-3 text-lg text-zinc-600">{event.landing.subhead}</p>
        <p className="mt-6 text-left text-sm leading-relaxed text-zinc-700">
          {event.landing.body_md}
        </p>
      </article>
      <form
        onSubmit={register}
        className="mx-auto mt-10 max-w-md space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        {done ? (
          <p className="text-center text-sm font-medium text-emerald-600">
            You&apos;re registered! Check your inbox for details.
          </p>
        ) : (
          <>
            <input
              required
              placeholder="Full name"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              required
              type="email"
              placeholder="Email"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white"
            >
              Register
            </button>
          </>
        )}
      </form>
    </div>
  );
}
