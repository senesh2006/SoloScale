"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Campaign } from "@/types/campaign";

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
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">New campaign</h1>
      <p className="mt-2 text-zinc-600">
        Describe your goal — the AI strategist builds your 2-week plan.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Goal</label>
          <textarea
            className="mt-1 min-h-32 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Creating…" : "Generate strategy"}
        </button>
      </form>
    </div>
  );
}
