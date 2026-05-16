"use client";

import { useCallback, useRef, useState } from "react";
import {
  Camera,
  Check,
  ImageIcon,
  Loader2,
  ScanLine,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import type { VisionCampaignSeed } from "@/types/vision";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { getCurrentIdToken } from "@/lib/firebase/auth-context";

type Props = {
  onApply: (seed: VisionCampaignSeed) => void;
  className?: string;
};

type Phase = "idle" | "preview" | "scanning" | "result" | "error";

const MAX_BYTES = 4 * 1024 * 1024;

export function VisionSeedUploader({ onApply, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [seed, setSeed] = useState<VisionCampaignSeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setSeed(null);
    setError(null);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  }, [previewUrl]);

  const pickFile = useCallback(
    (next: File) => {
      if (!next.type.startsWith("image/")) {
        setError("Please choose an image file.");
        setPhase("error");
        return;
      }
      if (next.size > MAX_BYTES) {
        setError("Image must be under 4 MB.");
        setPhase("error");
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(next);
      setPreviewUrl(URL.createObjectURL(next));
      setSeed(null);
      setError(null);
      setPhase("preview");
    },
    [previewUrl],
  );

  async function analyze() {
    if (!file) return;
    setPhase("scanning");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const headers = new Headers();
      const token = await getCurrentIdToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      let res = await fetch("/api/campaigns/vision-seed", {
        method: "POST",
        body: form,
        headers,
      });
      if (res.status === 401 && token) {
        const fresh = await getCurrentIdToken(true);
        if (fresh) {
          headers.set("Authorization", `Bearer ${fresh}`);
          res = await fetch("/api/campaigns/vision-seed", {
            method: "POST",
            body: form,
            headers,
          });
        }
      }
      const data = (await res.json().catch(() => ({}))) as {
        seed?: VisionCampaignSeed;
        error?: string;
      };
      if (!res.ok || !data.seed) {
        throw new Error(data.error ?? `Scan failed (${res.status})`);
      }
      setSeed(data.seed);
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setPhase("error");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) pickFile(dropped);
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/40",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-fuchsia-400/15 blur-3xl"
      />

      <div className="relative border-b border-violet-100/80 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/25">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                Vision-to-campaign
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                  Gemini vision
                </span>
              </p>
              <p className="mt-0.5 max-w-md text-xs leading-relaxed text-zinc-600">
                Snap a whiteboard, napkin sketch, or sticky-note plan. We read
                it and pre-fill your campaign fields.
              </p>
            </div>
          </div>
          {(phase === "preview" || phase === "result" || phase === "error") && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="relative p-5">
        {phase === "idle" && (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all",
              dragOver
                ? "border-violet-500 bg-violet-50/80"
                : "border-violet-200/80 bg-white/60 hover:border-violet-400 hover:bg-white",
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <Upload className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-semibold text-zinc-900">
              Drop a photo or click to upload
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              JPG, PNG, or WebP · max 4 MB
            </p>
          </div>
        )}

        {(phase === "preview" || phase === "scanning") && previewUrl && (
          <div className="grid gap-4 sm:grid-cols-[140px_1fr] sm:items-center">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Sketch preview"
                className={cn(
                  "h-full w-full object-cover transition-opacity",
                  phase === "scanning" && "opacity-70",
                )}
              />
              {phase === "scanning" && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-scan-line" />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-800">
                {phase === "scanning"
                  ? "Reading your sketch…"
                  : "Ready to scan"}
              </p>
              <p className="text-xs leading-relaxed text-zinc-500">
                {file?.name} · {file ? `${(file.size / 1024).toFixed(0)} KB` : ""}
              </p>
              {phase === "preview" && (
                <Button
                  variant="dark"
                  size="md"
                  leftIcon={<ScanLine className="h-4 w-4" />}
                  onClick={analyze}
                >
                  Scan with AI
                </Button>
              )}
              {phase === "scanning" && (
                <div className="inline-flex items-center gap-2 text-sm font-medium text-violet-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting title, goal, and audience…
                </div>
              )}
            </div>
          </div>
        )}

        {phase === "result" && seed && previewUrl && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-emerald-200 bg-zinc-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Sketch"
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-2 left-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  <Check className="mr-1 inline h-3 w-3" />
                  Read
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2">
                  <p className="text-xs font-medium text-emerald-800">
                    {seed.board_summary}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80">
                    Confidence: {seed.confidence}
                  </p>
                </div>
                <SeedField label="Title" value={seed.title} />
                <SeedField label="Goal" value={seed.goal} multiline />
                <SeedField label="Audience" value={seed.audience} />
                {seed.event_date && (
                  <SeedField
                    label="Event date"
                    value={new Date(seed.event_date).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  />
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="dark"
                size="md"
                leftIcon={<Sparkles className="h-4 w-4" />}
                onClick={() => onApply(seed)}
              >
                Apply to form below
              </Button>
              <Button variant="outline" size="md" onClick={reset}>
                Try another photo
              </Button>
            </div>
          </div>
        )}

        {phase === "error" && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              type="button"
              onClick={() => setPhase(file && previewUrl ? "preview" : "idle")}
              className="mt-2 block text-xs font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickFile(f);
        }}
      />
    </Card>
  );
}

function SeedField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-medium text-zinc-900",
          multiline && "leading-relaxed",
        )}
      >
        {value}
      </p>
    </div>
  );
}
