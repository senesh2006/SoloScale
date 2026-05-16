"use client";

import type { Asset } from "@/types/campaign";

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
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-medium text-zinc-900">Flyer</h3>
        {flyer?.status === "ready" && flyer.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={flyer.url}
            alt="Campaign flyer"
            className="mt-4 aspect-video w-full rounded-md object-cover"
          />
        ) : (
          <div className="mt-4 flex aspect-video items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500">
            {processing ? "Generating flyer…" : "Not generated yet"}
          </div>
        )}
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-medium text-zinc-900">Voice-over</h3>
        {audio?.status === "ready" && audio.url ? (
          <audio controls className="mt-4 w-full" src={audio.url} />
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            {processing ? "Generating audio…" : "Not generated yet"}
          </p>
        )}
      </div>
      <div className="md:col-span-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading || processing}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {processing ? "Generating assets…" : "Generate assets"}
        </button>
      </div>
    </div>
  );
}
