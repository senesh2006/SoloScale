"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Sparkles,
  Wand2,
  Save,
  Plus,
  Trash2,
  RotateCcw,
  Undo2,
  Mail,
  MessageSquare,
  Share2,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import type {
  Campaign,
  CampaignStrategy,
  ContentItem,
  ContentType,
} from "@/types/campaign";

const typeOptions = [
  { value: "tweet", label: "Tweet" },
  { value: "linkedin", label: "LinkedIn post" },
  { value: "reel", label: "Reel" },
  { value: "email", label: "Email" },
];

const typeIcons: Record<ContentType, React.ElementType> = {
  tweet: MessageSquare,
  linkedin: Share2,
  reel: Send,
  email: Mail,
};

const typeAccent: Record<ContentType, string> = {
  tweet: "bg-sky-50 text-sky-600 ring-sky-100",
  linkedin: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  reel: "bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-100",
  email: "bg-amber-50 text-amber-600 ring-amber-100",
};

const suggestionPrompts = [
  "Make the tone more casual and conversational",
  "Add two more LinkedIn posts in week two",
  "Shift everything one week later",
  "Tighten the copy to be more punchy",
];

type HistoryEntry = {
  id: string;
  instruction: string;
  snapshot: CampaignStrategy;
};

export default function EditStrategyPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [original, setOriginal] = useState<CampaignStrategy | null>(null);
  const [draft, setDraft] = useState<CampaignStrategy | null>(null);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Campaign | null>(null);
  const [instruction, setInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const load = useCallback(async () => {
    try {
      const { campaign: c } = await apiFetch<{ campaign: Campaign }>(
        `/api/campaigns/${id}`,
      );
      setCampaign(c);
      setBaseUpdatedAt(c.updated_at);
      if (c.strategy_json) {
        setOriginal(c.strategy_json);
        setDraft(JSON.parse(JSON.stringify(c.strategy_json)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
    }
  }, [id]);

  function reloadFromConflict() {
    if (!conflict) return;
    setCampaign(conflict);
    setBaseUpdatedAt(conflict.updated_at);
    if (conflict.strategy_json) {
      setOriginal(conflict.strategy_json);
      setDraft(JSON.parse(JSON.stringify(conflict.strategy_json)));
    }
    setHistory([]);
    setConflict(null);
    setError(null);
  }

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!original || !draft) return false;
    return JSON.stringify(original) !== JSON.stringify(draft);
  }, [original, draft]);

  async function refineWithAI(promptText?: string) {
    const text = (promptText ?? instruction).trim();
    if (!text || !draft) return;
    setRefining(true);
    setRefineError(null);
    try {
      const { strategy } = await apiFetch<{ strategy: CampaignStrategy }>(
        `/api/campaigns/${id}/strategy/refine`,
        {
          method: "POST",
          body: JSON.stringify({ instruction: text, current: draft }),
        },
      );
      setHistory((h) => [
        ...h,
        {
          id: `h_${Date.now()}`,
          instruction: text,
          snapshot: JSON.parse(JSON.stringify(draft)),
        },
      ]);
      setDraft(strategy);
      setInstruction("");
    } catch (err) {
      setRefineError(
        err instanceof Error ? err.message : "Couldn't refine the strategy",
      );
    } finally {
      setRefining(false);
    }
  }

  function undoLastAI() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setDraft(last.snapshot);
      return h.slice(0, -1);
    });
  }

  function resetAll() {
    if (!original) return;
    setDraft(JSON.parse(JSON.stringify(original)));
    setHistory([]);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/strategy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy: draft,
          if_updated_at: baseUpdatedAt ?? undefined,
        }),
      });

      if (res.status === 409) {
        const data = (await res.json().catch(() => ({}))) as {
          campaign?: Campaign;
          error?: string;
        };
        setConflict(data.campaign ?? null);
        setError(
          data.error ??
            "This strategy was edited somewhere else. Reload to see the latest version.",
        );
        return;
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Save failed (${res.status})`);
      }

      router.push(`/dashboard/campaigns/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save strategy");
    } finally {
      setSaving(false);
    }
  }

  function updateSummary(v: string) {
    setDraft((d) => (d ? { ...d, summary: v } : d));
  }

  function updateItem(idx: number, patch: Partial<ContentItem>) {
    setDraft((d) => {
      if (!d) return d;
      const timeline = d.timeline.map((it, i) =>
        i === idx ? { ...it, ...patch } : it,
      );
      return { ...d, timeline };
    });
  }

  function removeItem(idx: number) {
    setDraft((d) => {
      if (!d) return d;
      return { ...d, timeline: d.timeline.filter((_, i) => i !== idx) };
    });
  }

  function addItem() {
    setDraft((d) => {
      if (!d) return d;
      const last = d.timeline[d.timeline.length - 1];
      const base = last ? new Date(last.scheduled_at) : new Date();
      base.setDate(base.getDate() + 1);
      const item: ContentItem = {
        id: `item_${Math.random().toString(36).slice(2, 8)}`,
        type: "tweet",
        scheduled_at: base.toISOString(),
        copy: "",
      };
      return { ...d, timeline: [...d.timeline, item] };
    });
  }

  if (error && !campaign) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-sm font-medium text-red-600">{error}</p>
        <Link href={`/dashboard/campaigns/${id}`} className="mt-4">
          <Button variant="outline" leftIcon={<ChevronLeft className="h-4 w-4" />}>
            Back to campaign
          </Button>
        </Link>
      </div>
    );
  }

  if (!campaign || !draft) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-32">
      <Link
        href={`/dashboard/campaigns/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" />
        {campaign.title}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Edit strategy
            </h1>
            {dirty && (
              <span className="animate-fade-in rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-100">
                Unsaved changes
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Tweak anything by hand, or tell Gemini what to change.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dirty && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={resetAll}
            >
              Reset
            </Button>
          )}
          <Link href={`/dashboard/campaigns/${id}`}>
            <Button variant="outline" size="md">
              Cancel
            </Button>
          </Link>
          <Button
            variant="dark"
            size="md"
            leftIcon={<Save className="h-4 w-4" />}
            loading={saving}
            disabled={!dirty}
            onClick={save}
          >
            Save changes
          </Button>
        </div>
      </header>

      {conflict && (
        <div className="animate-fade-in rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                This strategy was edited elsewhere
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                Reload to pull in the latest version. Your unsaved local
                changes will be discarded.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConflict(null)}
              >
                Keep editing
              </Button>
              <Button
                size="sm"
                variant="dark"
                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={reloadFromConflict}
              >
                Reload latest
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && !conflict && (
        <div className="animate-fade-in rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* AI panel */}
      <Section
        icon={<Wand2 className="h-4 w-4" />}
        title="Refine with AI"
        description="Describe the change in plain English — Gemini will rework the strategy"
      >
        <Card className="overflow-hidden">
          <div className="space-y-4 p-5">
            <Textarea
              name="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={`e.g. "Make the LinkedIn posts more story-driven and shorten the tweets to one line each."`}
              rows={3}
              error={refineError ?? undefined}
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Try
              </span>
              {suggestionPrompts.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => refineWithAI(s)}
                  disabled={refining}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 transition-all hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<Undo2 className="h-3.5 w-3.5" />}
                    onClick={undoLastAI}
                  >
                    Undo last AI edit
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant="primary"
                leftIcon={
                  refining ? undefined : <Sparkles className="h-4 w-4" />
                }
                loading={refining}
                disabled={!instruction.trim()}
                onClick={() => refineWithAI()}
              >
                {refining ? "Refining" : "Refine with AI"}
              </Button>
            </div>
          </div>

          {history.length > 0 && (
            <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Recent AI edits
              </p>
              <ol className="space-y-1">
                {history
                  .slice()
                  .reverse()
                  .slice(0, 5)
                  .map((h, i) => (
                    <li
                      key={h.id}
                      className="flex items-center gap-2 text-xs text-zinc-600"
                    >
                      <span className="font-mono text-[10px] text-zinc-400">
                        {history.length - i}.
                      </span>
                      <span className="truncate">{h.instruction}</span>
                    </li>
                  ))}
              </ol>
            </div>
          )}
        </Card>
      </Section>

      {/* Summary */}
      <Section
        title="Strategy summary"
        description="The big-picture brief shown at the top of the campaign"
      >
        <Card className="p-5">
          <Textarea
            name="summary"
            value={draft.summary}
            onChange={(e) => updateSummary(e.target.value)}
            rows={4}
          />
        </Card>
      </Section>

      {/* Timeline */}
      <Section
        title="Content timeline"
        description={`${draft.timeline.length} items scheduled across your campaign`}
      >
        <div className="space-y-3">
          {draft.timeline.map((item, idx) => (
            <TimelineEditor
              key={item.id}
              item={item}
              index={idx}
              onChange={(patch) => updateItem(idx, patch)}
              onRemove={() => removeItem(idx)}
            />
          ))}

          <button
            type="button"
            onClick={addItem}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 bg-white py-4 text-sm font-semibold text-zinc-500 transition-all hover:-translate-y-px hover:border-violet-300 hover:bg-violet-50/40 hover:text-violet-700 hover:shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add timeline item
          </button>
        </div>
      </Section>

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/90 backdrop-blur-md animate-fade-up">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
            <p className="flex items-center gap-2 text-xs font-medium text-zinc-600">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-amber-500" />
              You have unsaved changes
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetAll}>
                Discard
              </Button>
              <Button
                variant="dark"
                size="md"
                leftIcon={<Save className="h-4 w-4" />}
                loading={saving}
                onClick={save}
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineEditor({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: ContentItem;
  index: number;
  onChange: (patch: Partial<ContentItem>) => void;
  onRemove: () => void;
}) {
  const Icon = typeIcons[item.type] ?? Send;
  const accent = typeAccent[item.type] ?? typeAccent.tweet;
  const dt = new Date(item.scheduled_at);
  const localValue = isNaN(dt.getTime())
    ? ""
    : new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

  return (
    <Card
      className={cn(
        "animate-fade-up p-4",
        `stagger-${Math.min(index, 5)}`,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
            accent,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-[160px_1fr]">
          <Select
            name={`type-${item.id}`}
            value={item.type}
            onChange={(e) =>
              onChange({ type: e.target.value as ContentType })
            }
            options={typeOptions}
          />
          <TextField
            name={`when-${item.id}`}
            type="datetime-local"
            value={localValue}
            onChange={(e) => {
              const next = new Date(e.target.value);
              if (!isNaN(next.getTime())) {
                onChange({ scheduled_at: next.toISOString() });
              }
            }}
            hint={
              isNaN(dt.getTime())
                ? "Pick a date"
                : format(dt, "EEE, MMM d · h:mm a")
            }
          />
          <div className="sm:col-span-2">
            <Textarea
              name={`copy-${item.id}`}
              value={item.copy}
              onChange={(e) => onChange({ copy: e.target.value })}
              rows={3}
              placeholder="What does this post say?"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove item"
          title="Remove"
          className="self-start rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
