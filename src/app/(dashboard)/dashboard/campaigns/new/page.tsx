"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Campaign } from "@/types/campaign";
import { Sparkles, ArrowRight, Target, Type } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewCampaignPage() {
  const router = useRouter();
  const [title, setTitle] = useState("React Workshop Campaign");
  const [goal, setGoal] = useState(
    "I'm hosting a virtual workshop on React on Friday. Build my campaign.",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { campaign } = await apiFetch<{ campaign: Campaign }>(
        "/api/campaigns",
        {
          method: "POST",
          body: JSON.stringify({ title, goal_prompt: goal }),
        },
      );
      router.push(`/dashboard/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create new campaign</h1>
          <p className="text-sm text-zinc-500">
            Let the AI Strategist build your 2-week marketing plan.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                    <Type className="h-4 w-4 text-zinc-400" />
                    Campaign Title
                  </label>
                  <input
                    placeholder="e.g. Summer Product Launch"
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-600/5"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                    <Target className="h-4 w-4 text-zinc-400" />
                    What is your goal?
                  </label>
                  <textarea
                    placeholder="Describe your event or product launch in detail..."
                    className="mt-2 min-h-32 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-600/5"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    required
                  />
                  <p className="mt-2 text-xs text-zinc-400">
                    Pro tip: Include target audience and key dates for better results.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "group flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 py-4 text-sm font-semibold text-white transition-all hover:bg-zinc-800 disabled:opacity-50",
                loading && "animate-pulse"
              )}
            >
              {loading ? (
                "Orchestrating AI agents..."
              ) : (
                <>
                  Generate Strategy
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-violet-600 p-6 text-white shadow-xl shadow-violet-600/20">
            <h3 className="font-semibold">AI Capabilities</h3>
            <ul className="mt-4 space-y-3 text-sm text-violet-100">
              <li className="flex items-start gap-3">
                <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white" />
                Multi-channel content calendar
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white" />
                Custom graphic assets & flyers
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white" />
                AI-generated promotional audio
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white" />
                Integrated event registration
              </li>
            </ul>
          </div>
          
          <div className="rounded-2xl border border-dashed border-zinc-300 p-6">
            <h3 className="text-sm font-semibold text-zinc-900">Need inspiration?</h3>
            <p className="mt-2 text-xs text-zinc-500">
              Try: "Launch a 30-day challenge for my new fitness app targeting busy professionals."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
