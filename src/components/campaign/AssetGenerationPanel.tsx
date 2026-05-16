"use client";

import type { Asset } from "@/types/campaign";
import {
  ImageIcon,
  Music,
  Sparkles,
  Download,
  Play,
  Pause,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

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
  const allReady =
    !!flyer && !!audio && flyer.status === "ready" && audio.status === "ready";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <FlyerCard asset={flyer} />
        <AudioCard asset={audio} />
      </div>

      {!flyer && !audio ? (
        <Button
          size="lg"
          className="w-full"
          loading={loading || processing}
          leftIcon={!loading && !processing ? <Sparkles className="h-4 w-4" /> : undefined}
          onClick={onGenerate}
        >
          {loading || processing ? "Generating assets" : "Generate creative assets"}
        </Button>
      ) : allReady ? (
        <Button
          variant="outline"
          size="md"
          className="w-full"
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={onGenerate}
          loading={loading}
        >
          Regenerate assets
        </Button>
      ) : null}
    </div>
  );
}

function FlyerCard({ asset }: { asset?: Asset }) {
  const ready = asset?.status === "ready" && asset.url;
  const processing = asset?.status === "processing";

  return (
    <div className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold text-zinc-900">Campaign flyer</h3>
        </div>
        {ready ? (
          <a
            href={asset!.url!}
            download
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-violet-600"
            aria-label="Download flyer"
          >
            <Download className="h-4 w-4" />
          </a>
        ) : null}
      </div>

      <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-zinc-50 to-zinc-100/50 p-4">
        {ready ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset!.url!}
            alt="Campaign flyer"
            className="h-full w-full rounded-lg object-cover shadow-lg ring-1 ring-black/5"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200",
                processing && "animate-pulse-soft bg-violet-50 text-violet-500 ring-violet-100",
              )}
            >
              {processing ? (
                <Sparkles className="h-5 w-5" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {processing ? "Designing your flyer…" : "Flyer not generated"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {processing
                  ? "Composing layout and colors"
                  : "AI will draft an on-brand visual"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AudioCard({ asset }: { asset?: Asset }) {
  const ready = asset?.status === "ready" && asset.url;
  const processing = asset?.status === "processing";

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onEnd = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, [asset?.url]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play();
      setPlaying(true);
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    el.currentTime = pct * duration;
  }

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold text-zinc-900">AI voiceover</h3>
        </div>
        {ready ? (
          <a
            href={asset!.url!}
            download
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-violet-600"
            aria-label="Download audio"
          >
            <Download className="h-4 w-4" />
          </a>
        ) : null}
      </div>

      <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-zinc-50 to-zinc-100/50 p-6">
        {ready ? (
          <div className="flex h-full flex-col items-center justify-center gap-8">
            {/* Waveform-style decorative bars */}
            <div className="flex h-20 items-end gap-1">
              {Array.from({ length: 28 }).map((_, i) => {
                const active = (i / 28) * 100 < progress;
                const h = 20 + Math.abs(Math.sin(i * 0.7)) * 60;
                return (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className={cn(
                      "w-1 rounded-full transition-colors",
                      active ? "bg-violet-600" : "bg-zinc-200",
                    )}
                  />
                );
              })}
            </div>

            <button
              onClick={toggle}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/30 transition-transform hover:scale-105 active:scale-95"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-7 w-7" />
              ) : (
                <Play className="h-7 w-7 translate-x-0.5" />
              )}
            </button>

            <div className="w-full space-y-2">
              <div
                onClick={seek}
                className="group/bar h-1.5 w-full cursor-pointer rounded-full bg-zinc-200"
              >
                <div
                  className="h-full rounded-full bg-violet-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-medium text-zinc-500">
                <span>{fmtTime(current)}</span>
                <span>{fmtTime(duration)}</span>
              </div>
            </div>

            <audio ref={audioRef} src={asset!.url!} preload="metadata" className="hidden" />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200",
                processing && "animate-pulse-soft bg-violet-50 text-violet-500 ring-violet-100",
              )}
            >
              {processing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Music className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {processing ? "Synthesizing voice…" : "Voiceover not generated"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {processing
                  ? "Creating a natural promotional clip"
                  : "AI will narrate your campaign copy"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
