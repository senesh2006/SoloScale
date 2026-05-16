"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Target,
  Type,
  Calendar as CalendarIcon,
  Users,
  ChevronLeft,
  Layers,
  Wand2,
  ImageIcon,
  Mic,
  Upload,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Campaign } from "@/types/campaign";
import type { VisionCampaignSeed } from "@/types/dev1-ai";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";

type Mode = "all" | "strategy";

const modes: {
  id: Mode;
  label: string;
  description: string;
  icon: React.ElementType;
  accent: string;
}[] = [
  {
    id: "all",
    label: "All-in-one",
    description: "Strategy + flyer + voiceover + event page in a single pass",
    icon: Layers,
    accent: "from-violet-500 to-indigo-600",
  },
  {
    id: "strategy",
    label: "Strategy only",
    description: "Just the 2-week multi-channel content calendar",
    icon: CalendarIcon,
    accent: "from-sky-500 to-blue-600",
  },
];

const examplePrompts: Record<Mode, string[]> = {
  all: [
    "Host a 30-day fitness challenge for busy professionals",
    "Launch my new SaaS pricing page to indie designers",
    "Promote a weekly devlog series for AI builders",
  ],
  strategy: [
    "Build buzz for an open-source release in 2 weeks",
    "Drive signups for my Discord community",
  ],
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("all");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Link
        href="/dashboard/campaigns"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Campaigns
      </Link>

      <header className="relative flex items-center gap-4 overflow-hidden">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30 animate-glow">
          <Wand2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            New campaign
          </h1>
          <p className="text-sm text-zinc-500">
            Start with the full package or a strategy-first draft. Add flyers
            and voiceovers from inside the campaign.
          </p>
        </div>
      </header>

      {/* Mode picker */}
      <div className="grid gap-4 sm:grid-cols-2">
        {modes.map((m, i) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-white p-5 text-left transition-all animate-fade-up shine",
                `stagger-${i}`,
                active
                  ? "border-zinc-950 shadow-lg shadow-zinc-900/10 ring-1 ring-zinc-950"
                  : "border-zinc-200 hover:-translate-y-px hover:border-zinc-300 hover:shadow-md",
              )}
            >
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500",
                  m.accent,
                  active && "opacity-30",
                )}
              />
              <div className="relative flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm transition-transform duration-300 group-hover:scale-110",
                    m.accent,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-base font-semibold tracking-tight",
                      active ? "text-zinc-950" : "text-zinc-900",
                    )}
                  >
                    {m.label}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-zinc-500">
                    {m.description}
                  </p>
                </div>
              </div>
              {active && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 origin-left rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 animate-tab-slide" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active form */}
      <div key={mode} className="animate-fade-up">
        {mode === "all" && <AllInOneForm router={router} />}
        {mode === "strategy" && <StrategyOnlyForm router={router} />}
      </div>

      {/* Standalone-assets callout */}
      <Card className="animate-fade-up overflow-hidden border-dashed bg-gradient-to-br from-zinc-50 to-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-500 ring-1 ring-zinc-200">
              <span className="relative flex items-center gap-0.5">
                <ImageIcon className="h-3.5 w-3.5" />
                <Mic className="h-3.5 w-3.5" />
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                Just need a flyer or voiceover?
              </p>
              <p className="mt-0.5 text-xs leading-snug text-zinc-500">
                Standalone assets live inside an existing campaign so they stay
                tied to your strategy and event page.
              </p>
            </div>
          </div>
          <Link href="/dashboard/campaigns">
            <Button
              variant="outline"
              size="sm"
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Open a campaign
            </Button>
          </Link>
        </div>
      </Card>

      {/* Example prompts */}
      <Card className="bg-gradient-to-br from-zinc-50 to-white p-5">
        <p className="flex items-center gap-2 text-xs font-medium text-zinc-700">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          Try a prompt
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {examplePrompts[mode].map((ex, i) => (
            <button
              key={ex}
              type="button"
              onClick={() => fillExample(ex)}
              className={cn(
                "rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 transition-all animate-fade-up hover:border-zinc-300 hover:text-zinc-900",
                `stagger-${i}`,
              )}
            >
              {ex}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function fillExample(value: string) {
  const el = document.getElementById("goal") as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  if (!el) return;
  el.focus();
  const proto = Object.getPrototypeOf(el);
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/* ============================================================
   All-in-one
   ============================================================ */
function AllInOneForm({
  router,
}: {
  router: ReturnType<typeof useRouter>;
}) {
  const [title, setTitle] = useState("React Workshop Campaign");
  const [goal, setGoal] = useState(
    "I'm hosting a virtual workshop on React on Friday. Build my campaign.",
  );
  const [eventDate, setEventDate] = useState("");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { campaign } = await apiFetch<{ campaign: Campaign }>(
        "/api/campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            mode: "all",
            title,
            goal_prompt: goal,
            event_date: eventDate || null,
            audience: audience || null,
          }),
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
    <FormShell
      title="All-in-one campaign"
      subtitle="Strategy, assets, and a hosted event page from a single prompt."
      submitLabel="Generate everything"
      onSubmit={submit}
      loading={loading}
      error={error}
    >
      <SketchExtractSection
        onSeed={(seed) => {
          if (seed.campaignTitle) setTitle(seed.campaignTitle);
          if (seed.goal) setGoal(seed.goal);
          if (seed.audience) setAudience(seed.audience);
          if (seed.eventDate) setEventDate(seedDateToDatetimeLocal(seed.eventDate));
        }}
      />

      <TextField
        name="title"
        label="Campaign title"
        leftIcon={<Type className="h-4 w-4" />}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Summer Product Launch"
        required
      />

      <Textarea
        id="goal"
        name="goal"
        label="What's your goal?"
        leftIcon={<Target className="h-3.5 w-3.5" />}
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="Describe your event, product, or campaign in plain English..."
        required
        rows={4}
        hint="Be specific — the more context, the sharper the output."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="event_date"
          label="Event date"
          type="datetime-local"
          leftIcon={<CalendarIcon className="h-4 w-4" />}
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          hint="Optional — helps schedule the timeline"
        />
        <TextField
          name="audience"
          label="Audience"
          leftIcon={<Users className="h-4 w-4" />}
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="e.g. solo devs in SaaS"
          hint="Optional — tunes voice and channels"
        />
      </div>
    </FormShell>
  );
}

/* ============================================================
   Strategy only
   ============================================================ */
function StrategyOnlyForm({
  router,
}: {
  router: ReturnType<typeof useRouter>;
}) {
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { campaign } = await apiFetch<{ campaign: Campaign }>(
        "/api/campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            mode: "strategy",
            title: title.trim() || derivedTitle(goal),
            goal_prompt: goal,
            event_date: eventDate || null,
            audience: audience || null,
          }),
        },
      );
      router.push(`/dashboard/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate strategy");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormShell
      title="Strategy only"
      subtitle="Just a multi-channel content calendar — flyer and voiceover come later."
      submitLabel="Generate strategy"
      onSubmit={submit}
      loading={loading}
      error={error}
    >
      <SketchExtractSection
        compact
        onSeed={(seed) => {
          if (seed.campaignTitle) setTitle(seed.campaignTitle);
          if (seed.goal) setGoal(seed.goal);
          if (seed.audience) setAudience(seed.audience);
          if (seed.eventDate) setEventDate(seedDateToDatetimeLocal(seed.eventDate));
        }}
      />

      <Textarea
        id="goal"
        name="goal"
        label="What's your goal?"
        leftIcon={<Target className="h-3.5 w-3.5" />}
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="Describe the outcome you want — launches, signups, awareness..."
        required
        rows={5}
        hint="Output: 2 weeks of tweets, LinkedIn posts, and email beats."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="event_date"
          label="Event date"
          type="datetime-local"
          leftIcon={<CalendarIcon className="h-4 w-4" />}
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          hint="Optional"
        />
        <TextField
          name="audience"
          label="Audience"
          leftIcon={<Users className="h-4 w-4" />}
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="e.g. indie founders"
          hint="Optional"
        />
      </div>
    </FormShell>
  );
}

/* ============================================================
   Sketch extract
   ============================================================ */
function SketchExtractSection({
  onSeed,
  compact = false,
}: {
  onSeed: (seed: VisionCampaignSeed) => void;
  compact?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [hint, setHint] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState(false);

  async function extract() {
    if (!file) {
      setExtractError("Choose a sketch image first.");
      return;
    }
    setExtracting(true);
    setExtractError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      if (hint.trim()) form.append("hint", hint.trim());
      const res = await fetch("/api/vision/campaign-seed", {
        method: "POST",
        body: form,
      });
      const body = (await res.json()) as { seed?: VisionCampaignSeed; error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Could not read sketch");
      }
      if (!body.seed) throw new Error("No seed returned from vision");
      onSeed(body.seed);
      setExtracted(true);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extract failed");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80",
        compact ? "p-3 space-y-2" : "p-4 space-y-3",
      )}
    >
      <div className="flex items-start gap-2">
        <Upload className={cn("shrink-0 text-violet-500", compact ? "h-4 w-4 mt-0.5" : "h-5 w-5")} />
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium text-zinc-900", compact ? "text-xs" : "text-sm")}>
            Start from a sketch
          </p>
          <p className={cn("text-zinc-500", compact ? "text-[11px] leading-snug" : "text-xs")}>
            Upload a whiteboard or napkin photo — AI fills the form below.
          </p>
        </div>
      </div>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="block w-full text-xs text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-100"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setExtracted(false);
          setExtractError(null);
        }}
      />

      {!compact && (
        <TextField
          name="sketch_hint"
          label="Hint (optional)"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="e.g. focus on the workshop date in the corner"
          hint="Helps when handwriting is unclear"
        />
      )}

      {extractError && (
        <p className="text-xs font-medium text-red-600">{extractError}</p>
      )}
      {extracted && !extractError && (
        <p className="text-xs font-medium text-emerald-600">
          Fields updated from sketch — review and edit before submitting.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={extracting}
        disabled={!file}
        onClick={() => void extract()}
        leftIcon={<Sparkles className="h-3.5 w-3.5" />}
      >
        {extracting ? "Reading sketch…" : "Extract from sketch"}
      </Button>
    </div>
  );
}

function seedDateToDatetimeLocal(iso?: string): string {
  if (!iso?.trim()) return "";
  const day = iso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  return `${day}T09:00`;
}

/* ============================================================
   Shared form shell
   ============================================================ */
function FormShell({
  title,
  subtitle,
  submitLabel,
  onSubmit,
  loading,
  error,
  children,
}: {
  title: string;
  subtitle: string;
  submitLabel: string;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            {title}
          </h2>
          <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>

        <div className="space-y-4">{children}</div>

        {error && (
          <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="dark"
          size="lg"
          className="w-full"
          loading={loading}
          rightIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
        >
          {loading ? "Orchestrating AI agents" : submitLabel}
        </Button>
      </form>
    </Card>
  );
}

function derivedTitle(goal: string): string {
  const trimmed = goal.trim();
  if (!trimmed) return "Strategy draft";
  return trimmed.split(/[.!?\n]/)[0].slice(0, 60) || "Strategy draft";
}
