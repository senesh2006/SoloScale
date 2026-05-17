"use client";

import type { Asset, AssetKind } from "@/types/campaign";
import {
  ImageIcon,
  Music,
  Sparkles,
  Download,
  Play,
  Pause,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  Mic,
  Wand2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { glassPanelClass } from "@/components/ui/Card";

type Actions = {
  onAdd: (kind: AssetKind) => void;
  onGenerateBoth: () => void | Promise<void>;
  onGenerateFromStrategy?: (kind?: AssetKind | "both") => void | Promise<void>;
  onRegenerate: (assetId: string) => void | Promise<void>;
  onDelete: (assetId: string) => void | Promise<void>;
};

export function AssetGenerationPanel({
  assets,
  actions,
  loading,
  hasStrategy,
  loadingFromStrategy,
}: {
  assets: Asset[];
  actions: Actions;
  loading?: boolean;
  hasStrategy?: boolean;
  loadingFromStrategy?: boolean;
}) {
  const flyers = assets.filter((a) => a.kind === "flyer");
  const voiceovers = assets.filter((a) => a.kind === "voiceover");

  if (assets.length === 0) {
    return (
      <EmptyState
        loading={loading}
        loadingFromStrategy={loadingFromStrategy}
        hasStrategy={hasStrategy}
        onGenerateBoth={actions.onGenerateBoth}
        onGenerateFromStrategy={actions.onGenerateFromStrategy}
        onAdd={actions.onAdd}
      />
    );
  }

  return (
    <div className="space-y-10">
      {hasStrategy && actions.onGenerateFromStrategy ? (
        <StrategyAssetBar
          loading={loadingFromStrategy}
          onGenerate={(kind) => actions.onGenerateFromStrategy?.(kind)}
        />
      ) : null}
      <AssetGroup
        title="Flyers"
        kind="flyer"
        items={flyers}
        actions={actions}
        hasStrategy={hasStrategy}
        onGenerateFromStrategy={actions.onGenerateFromStrategy}
        loadingFromStrategy={loadingFromStrategy}
      />
      <AssetGroup
        title="Voiceovers"
        kind="voiceover"
        items={voiceovers}
        actions={actions}
        hasStrategy={hasStrategy}
        onGenerateFromStrategy={actions.onGenerateFromStrategy}
        loadingFromStrategy={loadingFromStrategy}
      />
    </div>
  );
}

function StrategyAssetBar({
  loading,
  onGenerate,
}: {
  loading?: boolean;
  onGenerate: (kind: AssetKind | "both") => void | Promise<void>;
}) {
  return (
    <div
      className={cn(
        glassPanelClass,
        "flex flex-col gap-4 border-violet-200/40 bg-gradient-to-br from-violet-50/50 via-white/55 to-fuchsia-50/35 p-5 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
          <Calendar className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">
            Generate from strategy
          </p>
          <p className="mt-0.5 text-xs text-zinc-600">
            Flyer and voiceover copy pulled from your calendar and event page.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="dark"
          size="sm"
          loading={loading}
          leftIcon={<Sparkles className="h-3.5 w-3.5" />}
          onClick={() => onGenerate("both")}
        >
          Both from strategy
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          leftIcon={<ImageIcon className="h-3.5 w-3.5" />}
          onClick={() => onGenerate("flyer")}
        >
          Flyer
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          leftIcon={<Mic className="h-3.5 w-3.5" />}
          onClick={() => onGenerate("voiceover")}
        >
          Voice
        </Button>
      </div>
    </div>
  );
}

function EmptyState({
  loading,
  loadingFromStrategy,
  hasStrategy,
  onGenerateBoth,
  onGenerateFromStrategy,
  onAdd,
}: {
  loading?: boolean;
  loadingFromStrategy?: boolean;
  hasStrategy?: boolean;
  onGenerateBoth: () => void | Promise<void>;
  onGenerateFromStrategy?: (kind?: AssetKind | "both") => void | Promise<void>;
  onAdd: (kind: AssetKind) => void;
}) {
  return (
    <div
      className={cn(
        glassPanelClass,
        "border-dashed border-zinc-300/50 bg-gradient-to-br from-white/45 to-white/25 p-8 text-center backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/55 text-zinc-400 shadow-sm ring-1 ring-white/55 backdrop-blur-sm">
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-zinc-900">
        No creative assets yet
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Tell the AI what you want and it&apos;ll draft it.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {hasStrategy && onGenerateFromStrategy ? (
          <Button
            variant="dark"
            loading={loadingFromStrategy}
            leftIcon={<Calendar className="h-4 w-4" />}
            onClick={() => onGenerateFromStrategy("both")}
          >
            Generate from strategy
          </Button>
        ) : null}
        <Button
          variant={hasStrategy ? "outline" : "dark"}
          leftIcon={<ImageIcon className="h-4 w-4" />}
          onClick={() => onAdd("flyer")}
        >
          Custom flyer
        </Button>
        <Button
          variant="outline"
          leftIcon={<Mic className="h-4 w-4" />}
          onClick={() => onAdd("voiceover")}
        >
          Custom voiceover
        </Button>
      </div>
      {!hasStrategy ? (
        <button
          type="button"
          onClick={onGenerateBoth}
          disabled={loading}
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating defaults…
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              or generate both with defaults
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

function AssetGroup({
  title,
  kind,
  items,
  actions,
  hasStrategy,
  onGenerateFromStrategy,
  loadingFromStrategy,
}: {
  title: string;
  kind: AssetKind;
  items: Asset[];
  actions: Actions;
  hasStrategy?: boolean;
  onGenerateFromStrategy?: (kind?: AssetKind | "both") => void | Promise<void>;
  loadingFromStrategy?: boolean;
}) {
  const Icon = kind === "flyer" ? ImageIcon : Music;
  return (
    <section
      className={cn(
        glassPanelClass,
        "space-y-5 p-5 sm:p-7 md:p-8 shadow-[0_4px_24px_rgba(9,9,11,0.06)]",
      )}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900">
            {title}
          </h3>
          <span className="rounded-full bg-white/55 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600 ring-1 ring-white/60 backdrop-blur-sm">
            {items.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {hasStrategy && onGenerateFromStrategy ? (
            <Button
              variant="outline"
              size="sm"
              disabled={loadingFromStrategy}
              leftIcon={<Calendar className="h-3.5 w-3.5" />}
              onClick={() => onGenerateFromStrategy(kind)}
            >
              From strategy
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => actions.onAdd(kind)}
          >
            Custom
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
        {items.map((asset, i) => (
          <div
            key={asset.id}
            className={cn("animate-fade-up", `stagger-${Math.min(i, 5)}`)}
          >
            {asset.kind === "flyer" ? (
              <FlyerCard asset={asset} actions={actions} />
            ) : (
              <AudioCard asset={asset} actions={actions} />
            )}
          </div>
        ))}
        <AddTile kind={kind} onClick={() => actions.onAdd(kind)} />
      </div>
    </section>
  );
}

function AddTile({
  kind,
  onClick,
}: {
  kind: AssetKind;
  onClick: () => void;
}) {
  const Icon = kind === "flyer" ? ImageIcon : Mic;
  return (
    <button
      onClick={onClick}
      className={cn(
        glassPanelClass,
        "group flex min-h-[18rem] w-full flex-col items-center justify-center gap-4 border-2 border-dashed border-white/55 bg-white/30 p-8 text-center backdrop-blur-xl transition-all hover:-translate-y-px hover:border-violet-400/45 hover:bg-white/45 hover:shadow-lg md:min-h-[20rem]",
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/55 text-zinc-400 shadow-sm ring-1 ring-white/55 backdrop-blur-sm transition-colors group-hover:bg-violet-100/80 group-hover:text-violet-600">
        <Wand2 className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-900">
          Add another {kind === "flyer" ? "flyer" : "voiceover"}
        </p>
        <p className="mt-1 flex items-center justify-center gap-1 text-xs text-zinc-500">
          <Icon className="h-3 w-3" />
          Custom prompt
        </p>
      </div>
    </button>
  );
}

function CardHeader({
  asset,
  actions,
}: {
  asset: Asset;
  actions: Actions;
}) {
  const ready = asset.status === "ready" && asset.url;
  return (
    <div className="flex items-center justify-between border-b border-zinc-200/35 bg-white/25 px-4 py-3.5 backdrop-blur-md sm:px-5">
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-semibold text-zinc-900">
          {asset.label ?? (asset.kind === "flyer" ? "Flyer" : "Voiceover")}
        </h4>
        {asset.prompt ? (
          <p
            className="mt-0.5 truncate text-[11px] text-zinc-500"
            title={asset.prompt}
          >
            {asset.prompt}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          label="Regenerate"
          onClick={() => actions.onRegenerate(asset.id)}
          disabled={asset.status === "processing"}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </IconButton>
        {ready ? (
          <a
            href={asset.url!}
            download
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/40 hover:text-violet-600"
            aria-label="Download"
            title="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        ) : null}
        <IconButton
          label="Delete"
          danger
          onClick={() => actions.onDelete(asset.id)}
          disabled={asset.status === "processing"}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/40 disabled:opacity-40",
        danger ? "hover:text-red-600" : "hover:text-violet-600",
      )}
    >
      {children}
    </button>
  );
}

function FlyerCard({
  asset,
  actions,
}: {
  asset: Asset;
  actions: Actions;
}) {
  const ready = asset.status === "ready" && asset.url;
  const processing = asset.status === "processing";

  return (
    <div
      className={cn(
        glassPanelClass,
        "flex flex-col overflow-hidden shadow-[0_2px_12px_rgba(9,9,11,0.08)] ring-1 ring-white/60",
      )}
    >
      <CardHeader asset={asset} actions={actions} />
      <div className="relative flex min-h-[20rem] w-full flex-1 flex-col justify-center bg-gradient-to-b from-white/35 via-white/20 to-white/30 p-5 backdrop-blur-xl sm:min-h-[24rem] md:min-h-[26rem]">
        {ready ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.url!}
            alt={asset.label ?? "Campaign flyer"}
            className="mx-auto max-h-[min(32rem,calc(100vh-14rem))] w-full rounded-xl object-contain shadow-lg ring-1 ring-black/10"
          />
        ) : (
          <div className="flex min-h-[14rem] flex-1 flex-col items-center justify-center gap-3 text-center">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl bg-white/55 text-zinc-500 shadow-sm ring-1 ring-white/55 backdrop-blur-sm",
                processing &&
                  "animate-pulse-soft bg-violet-100/70 text-violet-600 ring-violet-200/60",
              )}
            >
              {processing ? (
                <Sparkles className="h-5 w-5" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </div>
            <p className="text-xs font-medium text-zinc-500">
              {processing ? "Designing your flyer…" : "Waiting"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AudioCard({
  asset,
  actions,
}: {
  asset: Asset;
  actions: Actions;
}) {
  const ready = asset.status === "ready" && asset.url;
  const processing = asset.status === "processing";

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
  }, [asset.url]);

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
    <div
      className={cn(
        glassPanelClass,
        "flex flex-col overflow-hidden shadow-[0_2px_12px_rgba(9,9,11,0.08)] ring-1 ring-white/60",
      )}
    >
      <CardHeader asset={asset} actions={actions} />
      <div className="relative flex min-h-[20rem] w-full flex-1 flex-col justify-center bg-gradient-to-b from-white/35 via-white/20 to-white/30 p-6 backdrop-blur-xl sm:min-h-[24rem] md:min-h-[26rem]">
        {ready ? (
          <div className="flex min-h-[16rem] flex-1 flex-col items-center justify-center gap-6 py-2">
            <div className="flex h-16 items-end gap-0.5 px-1">
              {Array.from({ length: 22 }).map((_, i) => {
                const active = (i / 22) * 100 < progress;
                const h = 18 + Math.abs(Math.sin(i * 0.7)) * 60;
                return (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className={cn(
                      "w-0.5 rounded-full transition-colors",
                      active ? "bg-violet-600" : "bg-zinc-300/65",
                    )}
                  />
                );
              })}
            </div>

            <button
              onClick={toggle}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/30 transition-transform hover:scale-105 active:scale-95"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 translate-x-0.5" />
              )}
            </button>

            <div className="w-full space-y-1.5">
              <div
                onClick={seek}
                className="h-1 w-full cursor-pointer rounded-full bg-white/45 ring-1 ring-white/50 backdrop-blur-sm"
              >
                <div
                  className="h-full rounded-full bg-violet-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-medium text-zinc-500">
                <span>{fmtTime(current)}</span>
                <span>{fmtTime(duration)}</span>
              </div>
            </div>

            <audio
              ref={audioRef}
              src={asset.url!}
              preload="metadata"
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex min-h-[14rem] flex-1 flex-col items-center justify-center gap-4 text-center">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl bg-white/55 text-zinc-500 shadow-sm ring-1 ring-white/55 backdrop-blur-sm",
                processing &&
                  "animate-pulse-soft bg-violet-100/70 text-violet-600 ring-violet-200/60",
              )}
            >
              {processing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Music className="h-5 w-5" />
              )}
            </div>
            <p className="text-xs font-medium text-zinc-500">
              {processing ? "Synthesizing voice…" : "Waiting"}
            </p>
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
