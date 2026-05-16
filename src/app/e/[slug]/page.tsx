"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Event } from "@/types/campaign";
import { CheckCircle2, Calendar, MapPin, Mail, User, Sparkles } from "lucide-react";
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

  useEffect(() => {
    apiFetch<{ event: Event }>(`/api/events/slug/${slug}`)
      .then(({ event: e }) => setEvent(e))
      .catch(() => setError("Event not found or not published"));
  }, [slug]);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch(`/api/events/slug/${slug}/register`, {
        method: "POST",
        body: JSON.stringify({ 
          name, 
          email,
          metadata: customFields 
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (error && !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-zinc-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 selection:bg-violet-100 selection:text-violet-900">
      {/* Decorative Background */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-violet-200 to-indigo-300 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      <main className="mx-auto max-w-4xl px-6 py-24 sm:py-32">
        <div className="grid gap-16 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-600/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-violet-600 ring-1 ring-inset ring-violet-600/10">
                <Sparkles className="h-3 w-3" />
                Featured Event
              </div>
              <h1 className="text-4xl font-black tracking-tight text-zinc-950 sm:text-6xl leading-[1.1]">
                {event.landing.headline}
              </h1>
              <p className="text-xl text-zinc-600 font-medium leading-relaxed italic border-l-4 border-violet-600 pl-4 py-2 bg-zinc-50 rounded-r-xl">
                {event.landing.subhead}
              </p>
            </div>

            <div className="prose prose-zinc prose-lg max-w-none">
               <p className="whitespace-pre-wrap text-zinc-600 leading-relaxed text-lg">
                {event.landing.body_md}
              </p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-12 rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl shadow-zinc-200/50">
              {done ? (
                <div className="text-center py-10 space-y-6">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 scale-110 animate-bounce">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-zinc-950">You're in!</h3>
                    <p className="text-sm text-zinc-500 font-medium px-4">
                      Registration successful. We've sent a confirmation email to <span className="text-violet-600 font-bold">{email}</span>.
                    </p>
                  </div>
                  <button 
                    onClick={() => setDone(false)}
                    className="text-xs font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors"
                  >
                    Register someone else
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-black text-zinc-950 tracking-tight">Save your spot</h3>
                    <p className="text-sm text-zinc-500 font-medium mt-1">Limited seats available for this event.</p>
                  </div>

                  <form onSubmit={register} className="space-y-4">
                    <div className="space-y-2">
                       <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        <User className="h-3 w-3" />
                        Full Name
                      </label>
                      <input
                        required
                        placeholder="e.g. Peter Senesh"
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-600/5"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                       <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        <Mail className="h-3 w-3" />
                        Email Address
                      </label>
                      <input
                        required
                        type="email"
                        placeholder="peter@example.com"
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-600/5"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    {/* Dynamic Custom Fields */}
                    {event.form_fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                         <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {field.label}
                        </label>
                        <input
                          required={field.required}
                          type={field.type === 'email' ? 'email' : 'text'}
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-600/5"
                          value={customFields[field.id] || ""}
                          onChange={(e) => setCustomFields({ ...customFields, [field.id]: e.target.value })}
                        />
                      </div>
                    ))}

                    {error && (
                      <div className="rounded-xl bg-red-50 p-4 text-xs font-bold text-red-600">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className={cn(
                        "w-full rounded-2xl bg-violet-600 py-4 text-sm font-black text-white shadow-xl shadow-violet-600/30 transition-all hover:bg-violet-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50",
                        loading && "animate-pulse"
                      )}
                    >
                      {loading ? "Registering..." : "Reserve My Seat"}
                    </button>
                  </form>

                  <div className="pt-6 border-t border-zinc-100 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                       <Calendar className="h-3 w-3" />
                       Coming soon
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                       <MapPin className="h-3 w-3" />
                       Virtual Event
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="mx-auto max-w-4xl px-6 py-12 border-t border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-white font-bold text-[10px]">
            S
          </div>
          <span className="text-xs font-black tracking-tight text-zinc-400">Powered by SoloScale</span>
        </div>
        <p className="text-xs text-zinc-400 font-medium">© 2026 SoloScale AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
