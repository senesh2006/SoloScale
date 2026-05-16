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
  ImageIcon,
  AudioLines,
  Users,
  ChevronLeft,
  Layers,
  Mic,
  Wand2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Campaign } from "@/types/campaign";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

type Mode = "all" | "strategy" | "flyer" | "voice";

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
    description: "Strategy + flyer + voiceover + event page",
    icon: Layers,
    accent: "from-violet-500 to-indigo-600",
  },
  {
    id: "strategy",
    label: "Strategy only",
    description: "Just the 2-week content calendar",
    icon: CalendarIcon,
    accent: "from-sky-500 to-blue-600",
  },
  {
    id: "flyer",
    label: "Flyer",
    description: "Standalone promotional image",
    icon: ImageIcon,
    accent: "from-fuchsia-500 to-pink-600",
  },
  {
    id: "voice",
    label: "Voice over",
    description: "AI-narrated audio clip",
    icon: Mic,
    accent: "from-amber-500 to-orange-600",
  },
];

const voiceOptions = [
  { value: "auto", label: "Auto — pick best voice" },
  { value: "warm-f", label: "Aria · warm female" },
  { value: "bright-f", label: "Nova · bright female" },
  { value: "calm-m", label: "Atlas · calm male" },
  { value: "energetic-m", label: "Rio · energetic male" },
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
  flyer: [
    "Modern minimal, deep purple and warm beige, abstract type shapes",
    "Cinematic, dramatic lighting, retro futurism",
  ],
  voice: [
    "Hey React devs — this Friday at 3pm we're going hands-on with server components. Save your seat at the link below.",
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
            Generation studio
          </h1>
          <p className="text-sm text-zinc-500">
            Pick what you want the AI to build. Mix and match later.
          </p>
        </div>
      </header>

      {/* Mode picker */}
      <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modes.map((m, i) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-white p-4 text-left transition-all animate-fade-up shine",
                `stagger-${i}`,
                active
                  ? "border-zinc-950 shadow-lg shadow-zinc-900/10 ring-1 ring-zinc-950"
                  : "border-zinc-200 hover:-translate-y-px hover:border-zinc-300 hover:shadow-md",
              )}
            >
              {/* Active gradient wash */}
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500",
                  m.accent,
                  active && "opacity-30",
                )}
              />
              <div className="relative flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm transition-transform duration-300 group-hover:scale-110",
                    m.accent,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-semibold tracking-tight",
                      active ? "text-zinc-950" : "text-zinc-900",
                    )}
                  >
                    {m.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-zinc-500">
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
        {mode === "flyer" && <FlyerForm router={router} />}
        {mode === "voice" && <VoiceOverForm router={router} />}
      </div>

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
              onClick={() => fillExample(mode, ex)}
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

function fillExample(mode: Mode, value: string) {
  const targetId = mode === "all" || mode === "strategy" ? "goal" : mode === "flyer" ? "visual_prompt" : "script";
  const el = document.getElementById(targetId) as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) {
    el.focus();
    if ("value" in el) {
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      setter?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
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
  const [goal, setGoal] = useState("");
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
            title: derivedTitle(goal),
            goal_prompt: goal,
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
      subtitle="Just a multi-channel content calendar — no flyer, no event page."
      submitLabel="Generate strategy"
      onSubmit={submit}
      loading={loading}
      error={error}
    >
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
    </FormShell>
  );
}

/* ============================================================
   Flyer
   ============================================================ */
function FlyerForm({
  router,
}: {
  router: ReturnType<typeof useRouter>;
}) {
  const [visualPrompt, setVisualPrompt] = useState("");
  const [headline, setHeadline] = useState("");
  const [subtext, setSubtext] = useState("");
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
            mode: "flyer",
            title: headline || "Flyer",
            goal_prompt: `Flyer — ${headline}. ${subtext}`,
            flyer: {
              visual_prompt: visualPrompt,
              headline,
              subtext,
            },
          }),
        },
      );
      router.push(`/dashboard/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate flyer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormShell
      title="Flyer"
      subtitle="One promotional image, generated to spec."
      submitLabel="Generate flyer"
      onSubmit={submit}
      loading={loading}
      error={error}
      preview={
        <FlyerPreview
          headline={headline}
          subtext={subtext}
          prompt={visualPrompt}
        />
      }
    >
      <Textarea
        id="visual_prompt"
        name="visual_prompt"
        label="Visual prompt"
        leftIcon={<ImageIcon className="h-3.5 w-3.5" />}
        value={visualPrompt}
        onChange={(e) => setVisualPrompt(e.target.value)}
        placeholder="Describe the look: style, colors, mood, references..."
        required
        rows={3}
      />

      <TextField
        name="headline"
        label="Headline"
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        placeholder="e.g. The Future of Frontend"
        required
        hint={`${headline.length}/60 characters`}
        maxLength={60}
      />

      <TextField
        name="subtext"
        label="Subtext"
        value={subtext}
        onChange={(e) => setSubtext(e.target.value)}
        placeholder="e.g. A free workshop · May 22 · 3pm ET"
        required
        hint={`${subtext.length}/120 characters`}
        maxLength={120}
      />
    </FormShell>
  );
}

function FlyerPreview({
  headline,
  subtext,
  prompt,
}: {
  headline: string;
  subtext: string;
  prompt: string;
}) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl animate-float-slow" />
      <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-fuchsia-300/30 blur-3xl animate-float-slow" />

      <div className="relative flex h-full flex-col justify-between p-6 text-white">
        <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium backdrop-blur">
          <Sparkles className="h-3 w-3" />
          Live preview
        </div>

        <div className="space-y-3">
          <h3 className="text-balance text-2xl font-semibold leading-tight tracking-tight">
            {headline || "Your headline appears here"}
          </h3>
          <p className="text-sm text-white/85">
            {subtext || "Your subtext appears here."}
          </p>
        </div>

        <p className="line-clamp-2 text-[10px] font-medium text-white/60">
          {prompt ? `Style: ${prompt}` : "Add a visual prompt to set the mood"}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Voice over
   ============================================================ */
function VoiceOverForm({
  router,
}: {
  router: ReturnType<typeof useRouter>;
}) {
  const [script, setScript] = useState("");
  const [voice, setVoice] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seconds = Math.max(1, Math.round((script.split(/\s+/).filter(Boolean).length / 150) * 60));

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
            mode: "voice",
            title: "Voiceover",
            goal_prompt: script.slice(0, 120),
            voice: {
              script,
              voice_id: voice,
            },
          }),
        },
      );
      router.push(`/dashboard/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate voiceover");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormShell
      title="Voice over"
      subtitle="A short AI-narrated clip you can drop into reels, ads, or waiting rooms."
      submitLabel="Generate voiceover"
      onSubmit={submit}
      loading={loading}
      error={error}
      preview={<VoiceWavePreview active={!!script} />}
    >
      <Textarea
        id="script"
        name="script"
        label="Script"
        leftIcon={<AudioLines className="h-3.5 w-3.5" />}
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="Paste or write the exact words you want narrated..."
        required
        rows={6}
        hint={`${script.split(/\s+/).filter(Boolean).length} words · ~${seconds}s read time`}
      />

      <Select
        name="voice"
        label="Voice (optional)"
        value={voice}
        onChange={(e) => setVoice(e.target.value)}
        options={voiceOptions}
      />
    </FormShell>
  );
}

function VoiceWavePreview({ active }: { active: boolean }) {
  return (
    <div className="relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl animate-float-slow" />

      <div className="relative flex h-20 items-end gap-1">
        {Array.from({ length: 24 }).map((_, i) => {
          const h = 20 + Math.abs(Math.sin(i * 0.6)) * 60;
          return (
            <span
              key={i}
              style={{
                height: `${h}%`,
                animationDelay: `${i * 70}ms`,
              }}
              className={cn(
                "w-1 rounded-full bg-gradient-to-t from-amber-400 to-orange-500",
                active && "animate-pulse-soft",
              )}
            />
          );
        })}
      </div>

      <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30">
        <Mic className="h-5 w-5" />
        {active && (
          <span className="absolute inset-0 rounded-full ring-2 ring-amber-400 animate-ping-soft" />
        )}
      </div>

      <p className="relative text-center text-xs font-medium text-zinc-600">
        {active ? "Ready to synthesize" : "Add a script to preview"}
      </p>
    </div>
  );
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
  preview,
  children,
}: {
  title: string;
  subtitle: string;
  submitLabel: string;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
  preview?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className={cn("grid gap-0", preview ? "lg:grid-cols-[1fr_320px]" : "")}>
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

        {preview ? (
          <div className="border-t border-zinc-100 bg-zinc-50/40 p-6 lg:border-l lg:border-t-0">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Preview
            </p>
            {preview}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function derivedTitle(goal: string): string {
  const trimmed = goal.trim();
  if (!trimmed) return "Strategy draft";
  return trimmed.split(/[.!?\n]/)[0].slice(0, 60) || "Strategy draft";
}
