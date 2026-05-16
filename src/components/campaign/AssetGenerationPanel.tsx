"use client";

import type { Asset } from "@/types/campaign";
import { ImageIcon, Music, Sparkles, Download, Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function AssetGenerationPanel({
  assets,
  onGenerate,
  loading,
}: {
  assets: Asset[];
  onGenerate: () => void;
  loading?: boolean;
}) {
  const flyer = assets.find((a) => a.kind === "flyer");
  const audio = assets.find((a) => a.kind === "voiceover");
  const processing = assets.some((a) => a.status === "processing");

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Flyer Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-tight">Campaign Flyer</h3>
            </div>
            {flyer?.status === "ready" && (
              <button className="text-zinc-400 hover:text-violet-600 transition-colors">
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="aspect-[4/5] w-full bg-zinc-50 flex items-center justify-center p-4">
            {flyer?.status === "ready" && flyer.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={flyer.url}
                alt="Campaign flyer"
                className="h-full w-full rounded-lg object-cover shadow-2xl ring-1 ring-black/5"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400",
                  flyer?.status === "processing" && "animate-pulse bg-violet-50 text-violet-400"
                )}>
                  {flyer?.status === "processing" ? <Sparkles className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900">
                    {flyer?.status === "processing" ? "Designing your flyer..." : "Flyer not generated"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {flyer?.status === "processing" ? "Choosing the best aesthetic for your brand" : "AI will create a custom design for your goal"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Audio Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md">
           <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-tight">AI Voiceover</h3>
            </div>
             {audio?.status === "ready" && (
              <button className="text-zinc-400 hover:text-violet-600 transition-colors">
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="aspect-[4/5] w-full bg-zinc-50 flex flex-col items-center justify-center p-8">
            {audio?.status === "ready" && audio.url ? (
              <div className="w-full space-y-8">
                <div className="flex justify-center">
                   <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl shadow-violet-600/30">
                    <Play className="h-8 w-8 ml-1" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
                    <div className="h-full w-1/3 bg-violet-600 rounded-full" />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    <span>0:12</span>
                    <span>0:45</span>
                  </div>
                  <audio controls className="hidden" src={audio.url} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400",
                  audio?.status === "processing" && "animate-pulse bg-violet-50 text-violet-400"
                )}>
                  {audio?.status === "processing" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Music className="h-6 w-6" />}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900">
                    {audio?.status === "processing" ? "Synthesizing voice..." : "Voiceover not generated"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {audio?.status === "processing" ? "Creating a natural sounding promotional clip" : "AI will narrate your campaign copy"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!flyer && !audio && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading || processing}
          className={cn(
            "flex w-full items-center justify-center gap-3 rounded-2xl bg-violet-600 py-4 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 disabled:opacity-50",
            (loading || processing) && "animate-pulse"
          )}
        >
          {loading || processing ? (
            <>
              <Sparkles className="h-5 w-5 animate-spin" />
              Generating Assets...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate All Creative Assets
            </>
          )}
        </button>
      )}
    </div>
  );
}
