"use client";

import { useEffect, useState } from "react";
import {
  AudioLines,
  Calendar,
  ImageIcon,
  Mic,
  Sparkles,
  Type,
  Wand2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import type { AssetKind, FlyerInput, VoiceoverInput } from "@/types/campaign";

const voiceOptions = [
  { value: "auto", label: "Auto — pick best voice" },
  { value: "warm-f", label: "Aria · warm female" },
  { value: "bright-f", label: "Nova · bright female" },
  { value: "calm-m", label: "Atlas · calm male" },
  { value: "energetic-m", label: "Rio · energetic male" },
];

type Submit =
  | { kind: "flyer"; flyer: FlyerInput }
  | { kind: "voiceover"; voice: VoiceoverInput };

export function AddAssetModal({
  open,
  kind,
  onClose,
  onSubmit,
  onGenerateScript,
  onFillFromStrategy,
  hasStrategy,
}: {
  open: boolean;
  kind: AssetKind | null;
  onClose: () => void;
  onSubmit: (data: Submit) => Promise<void> | void;
  onGenerateScript?: (hint?: string) => Promise<string>;
  onFillFromStrategy?: (kind: AssetKind) => Promise<{
    prompt?: string;
    headline?: string;
    subtext?: string;
    label?: string;
    script?: string;
  }>;
  hasStrategy?: boolean;
}) {
  const [label, setLabel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [headline, setHeadline] = useState("");
  const [subtext, setSubtext] = useState("");
  const [voice, setVoice] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [fillingFromStrategy, setFillingFromStrategy] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLabel("");
      setPrompt("");
      setHeadline("");
      setSubtext("");
      setVoice("auto");
      setLoading(false);
      setGeneratingScript(false);
      setFillingFromStrategy(false);
      setScriptError(null);
    }
  }, [open, kind]);

  async function fillFromStrategy() {
    if (!onFillFromStrategy || !kind) return;
    setFillingFromStrategy(true);
    setScriptError(null);
    try {
      const data = await onFillFromStrategy(kind);
      if (kind === "flyer") {
        if (data.prompt) setPrompt(data.prompt);
        if (data.headline) setHeadline(data.headline);
        if (data.subtext) setSubtext(data.subtext);
        if (data.label) setLabel(data.label);
      } else {
        if (data.script) setPrompt(data.script);
        if (data.label) setLabel(data.label);
      }
    } catch (err) {
      setScriptError(
        err instanceof Error ? err.message : "Couldn't load strategy brief",
      );
    } finally {
      setFillingFromStrategy(false);
    }
  }

  async function generateScript() {
    if (!onGenerateScript) return;
    setGeneratingScript(true);
    setScriptError(null);
    try {
      const script = await onGenerateScript(prompt.trim() || undefined);
      setPrompt(script);
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : "Couldn't draft a script");
    } finally {
      setGeneratingScript(false);
    }
  }

  if (!kind) return null;

  const isFlyer = kind === "flyer";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      if (isFlyer) {
        await onSubmit({
          kind: "flyer",
          flyer: {
            prompt,
            label: label || undefined,
            headline: headline || undefined,
            subtext: subtext || undefined,
          },
        });
      } else {
        await onSubmit({
          kind: "voiceover",
          voice: {
            script: prompt,
            label: label || undefined,
            voice_id: voice === "auto" ? undefined : voice,
          },
        });
      }
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} size={isFlyer ? "lg" : "md"}>
      <form onSubmit={submit}>
        <div className="border-b border-zinc-100 p-6">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${
                isFlyer
                  ? "from-fuchsia-500 to-pink-600"
                  : "from-amber-500 to-orange-600"
              }`}
            >
              {isFlyer ? (
                <ImageIcon className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                Add {isFlyer ? "a new flyer" : "a new voiceover"}
              </h2>
              <p className="text-xs text-zinc-500">
                {isFlyer
                  ? "Describe the visual you want. Your existing flyers stay put."
                  : "Paste the script you want narrated. Your existing voiceovers stay put."}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <TextField
            name="label"
            label="Label (optional)"
            leftIcon={<Type className="h-4 w-4" />}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={isFlyer ? "e.g. Instagram square" : "e.g. 30s teaser"}
            maxLength={40}
          />

          {isFlyer ? (
            <>
              {hasStrategy && onFillFromStrategy ? (
                <button
                  type="button"
                  onClick={fillFromStrategy}
                  disabled={fillingFromStrategy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2.5 text-sm font-semibold text-violet-800 transition-colors hover:bg-violet-100 disabled:opacity-60"
                >
                  <Calendar
                    className={`h-4 w-4 ${fillingFromStrategy ? "animate-pulse" : ""}`}
                  />
                  {fillingFromStrategy
                    ? "Pulling from strategy…"
                    : "Fill from strategy"}
                </button>
              ) : null}
              <Textarea
                name="prompt"
                label="Visual prompt"
                leftIcon={<ImageIcon className="h-3.5 w-3.5" />}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the look: style, colors, mood, references..."
                required
                rows={3}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  name="headline"
                  label="Headline (optional)"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. The Future of Frontend"
                  maxLength={60}
                  hint={`${headline.length}/60`}
                />
                <TextField
                  name="subtext"
                  label="Subtext (optional)"
                  value={subtext}
                  onChange={(e) => setSubtext(e.target.value)}
                  placeholder="e.g. May 22 · 3pm ET"
                  maxLength={120}
                  hint={`${subtext.length}/120`}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <label
                    htmlFor="script"
                    className="text-xs font-medium text-zinc-700"
                  >
                    Script
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {hasStrategy && onFillFromStrategy ? (
                      <button
                        type="button"
                        onClick={fillFromStrategy}
                        disabled={fillingFromStrategy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-60"
                      >
                        <Calendar
                          className={`h-3 w-3 ${fillingFromStrategy ? "animate-pulse" : ""}`}
                        />
                        {fillingFromStrategy ? "Loading…" : "From strategy"}
                      </button>
                    ) : null}
                    {onGenerateScript ? (
                      <button
                        type="button"
                        onClick={generateScript}
                        disabled={generatingScript}
                        className="group inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-white px-2.5 py-1 text-xs font-semibold text-violet-700 shadow-sm transition-all hover:-translate-y-px hover:border-violet-300 hover:shadow disabled:opacity-60"
                      >
                        <Wand2
                          className={`h-3 w-3 ${generatingScript ? "animate-spin" : ""}`}
                        />
                        {generatingScript
                          ? "Drafting…"
                          : prompt.trim()
                            ? "Rewrite with AI"
                            : "Generate with AI"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <Textarea
                  id="script"
                  name="prompt"
                  leftIcon={<AudioLines className="h-3.5 w-3.5" />}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Paste or write the exact words — or let AI draft one from your campaign brief."
                  required
                  rows={5}
                  hint={
                    scriptError ??
                    `${prompt.split(/\s+/).filter(Boolean).length} words`
                  }
                  error={scriptError ?? undefined}
                />
              </div>
              <Select
                name="voice"
                label="Voice"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                options={voiceOptions}
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="dark"
            loading={loading}
            leftIcon={!loading ? <Sparkles className="h-4 w-4" /> : undefined}
            disabled={!prompt.trim()}
          >
            {loading
              ? "Generating"
              : isFlyer
                ? "Generate flyer"
                : "Generate voiceover"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
