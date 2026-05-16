"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Campaign } from "@/types/campaign";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Plus, Rocket, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ campaigns: Campaign[] }>("/api/campaigns")
      .then(({ campaigns: c }) => {
        setCampaigns(c);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-5xl space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Your Campaigns</h1>
          <p className="mt-1 text-zinc-500">
            Manage your AI-powered marketing strategies and assets.
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </header>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-violet-600" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-zinc-200 p-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-400">
            <Rocket className="h-8 w-8" />
          </div>
          <h3 className="mt-6 text-lg font-bold text-zinc-950">No campaigns yet</h3>
          <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
            Ready to scale? Create your first campaign and let our AI agents do the heavy lifting.
          </p>
          <Link
            href="/dashboard/campaigns/new"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            Launch First Campaign
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/dashboard/campaigns/${campaign.id}`}
              className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-violet-600 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-zinc-950 group-hover:text-violet-600 transition-colors">
                      {campaign.title}
                    </h3>
                    <StatusBadge status={campaign.status} />
                  </div>
                  <p className="text-sm text-zinc-500 line-clamp-1 max-w-2xl italic">
                    "{campaign.goal_prompt}"
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Created</p>
                    <p className="text-sm font-bold text-zinc-900">
                      {format(new Date(campaign.created_at), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-50 text-zinc-400 group-hover:bg-violet-50 group-hover:text-violet-600 transition-all">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </div>
              
              {/* Progress Bar (Decorative) */}
              <div className="mt-6 h-1 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    campaign.status === 'published' ? 'w-full bg-emerald-500' :
                    campaign.status === 'assets_ready' ? 'w-3/4 bg-violet-500' :
                    campaign.status === 'strategy_ready' ? 'w-1/2 bg-blue-500' : 'w-1/4 bg-zinc-300'
                  )} 
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
