"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Campaign, Event, FormField, FormFieldType } from "@/types/campaign";
import { ChevronLeft, Save, Layout, Eye, Type, AlignLeft, ListPlus, Trash2, Plus, GripVertical, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELD_TEMPLATES: { label: string; type: FormFieldType }[] = [
  { label: "Company Name", type: "text" },
  { label: "Job Title", type: "text" },
  { label: "Twitter / X Handle", type: "text" },
  { label: "LinkedIn Profile", type: "text" },
  { label: "Dietary Requirements", type: "text" },
];

export default function EventEditPage() {
  const { id: campaignId } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "form">("content");

  useEffect(() => {
    apiFetch<{ campaign: Campaign }>(`/api/campaigns/${campaignId}`)
      .then(({ campaign }) => {
        if (!campaign.event_id) return;
        return apiFetch<{ event: Event }>(`/api/events/${campaign.event_id}`);
      })
      .then((res) => res && setEvent(res.event))
      .catch(console.error);
  }, [campaignId]);

  async function save() {
    if (!event) return;
    setSaving(true);
    try {
      await apiFetch(`/api/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          landing: event.landing,
          form_fields: event.form_fields,
        }),
      });
      router.push(`/dashboard/campaigns/${campaignId}`);
    } finally {
      setSaving(false);
    }
  }

  function addField(template: { label: string; type: FormFieldType }) {
    if (!event) return;
    const newField: FormField = {
      id: Math.random().toString(36).slice(2, 10),
      label: template.label,
      type: template.type,
      required: false,
    };
    setEvent({
      ...event,
      form_fields: [...event.form_fields, newField],
    });
  }

  function removeField(id: string) {
    if (!event) return;
    setEvent({
      ...event,
      form_fields: event.form_fields.filter((f) => f.id !== id),
    });
  }

  function updateField(id: string, patch: Partial<FormField>) {
    if (!event) return;
    setEvent({
      ...event,
      form_fields: event.form_fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  }

  if (!event) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push(`/dashboard/campaigns/${campaignId}`)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Campaign
        </button>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 disabled:opacity-50 transition-all"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving Changes..." : "Save Landing Page"}
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab("content")}
                className={cn(
                  "pb-2 text-sm font-bold transition-all",
                  activeTab === "content" ? "border-b-2 border-violet-600 text-zinc-950" : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                Page Content
              </button>
              <button
                onClick={() => setActiveTab("form")}
                className={cn(
                  "pb-2 text-sm font-bold transition-all",
                  activeTab === "form" ? "border-b-2 border-violet-600 text-zinc-950" : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                Registration Form
              </button>
            </div>
          </div>

          {activeTab === "content" ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                  <Type className="h-4 w-4 text-zinc-400" />
                  Main Headline
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-600/5"
                  value={event.landing.headline}
                  onChange={(e) =>
                    setEvent({
                      ...event,
                      landing: { ...event.landing, headline: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                  <AlignLeft className="h-4 w-4 text-zinc-400" />
                  Subheadline
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-600/5"
                  value={event.landing.subhead}
                  onChange={(e) =>
                    setEvent({
                      ...event,
                      landing: { ...event.landing, subhead: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                  <AlignLeft className="h-4 w-4 text-zinc-400" />
                  Body Copy (Markdown supported)
                </label>
                <textarea
                  className="mt-2 min-h-64 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-600/5"
                  value={event.landing.body_md}
                  onChange={(e) =>
                    setEvent({
                      ...event,
                      landing: { ...event.landing, body_md: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                  <ListPlus className="h-4 w-4 text-violet-600" />
                  Form Fields
                </h3>
                <div className="space-y-3">
                  {/* Default Fields (Read Only) */}
                  <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 opacity-60">
                    <GripVertical className="h-4 w-4 text-zinc-300" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-zinc-900">Full Name</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Required · Email</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 opacity-60">
                    <GripVertical className="h-4 w-4 text-zinc-300" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-zinc-900">Email Address</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Required · Email</p>
                    </div>
                  </div>

                  {/* Custom Fields */}
                  {event.form_fields.map((field) => (
                    <div key={field.id} className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-violet-600">
                      <GripVertical className="h-4 w-4 text-zinc-300" />
                      <div className="flex-1">
                        <input
                          className="w-full bg-transparent text-sm font-bold text-zinc-900 outline-none focus:text-violet-600"
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                        />
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{field.type}</p>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              className="h-3 w-3 rounded border-zinc-300 text-violet-600 focus:ring-violet-600"
                              checked={field.required}
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Required</span>
                          </label>
                        </div>
                      </div>
                      <button
                        onClick={() => removeField(field.id)}
                        className="text-zinc-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-zinc-300 p-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Add Quick Fields</h3>
                <div className="flex flex-wrap gap-2">
                  {FIELD_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.label}
                      onClick={() => addField(tmpl)}
                      className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 hover:border-violet-600 hover:text-violet-600 transition-all"
                    >
                      <Plus className="h-3 w-3" />
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-5 w-5 text-violet-600" />
            <h1 className="text-xl font-bold">Live Preview</h1>
          </div>

          <div className="rounded-2xl border-4 border-zinc-100 bg-white overflow-hidden shadow-2xl min-h-[600px] flex flex-col">
            <div className="bg-zinc-100 px-4 py-3 border-b border-zinc-200 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-zinc-300" />
                <div className="h-3 w-3 rounded-full bg-zinc-300" />
                <div className="h-3 w-3 rounded-full bg-zinc-300" />
              </div>
              <div className="mx-auto rounded-md bg-white px-3 py-1 text-[10px] text-zinc-400 w-64 truncate text-center">
                soloscale.com/e/{event.slug}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-12 space-y-8">
                <div className="space-y-4 text-center">
                  <h2 className="text-4xl font-black tracking-tight text-zinc-900 leading-[1.1]">
                    {event.landing.headline || "Your Headline Here"}
                  </h2>
                  <p className="text-xl text-zinc-500 font-medium leading-relaxed italic">
                    {event.landing.subhead || "Your subheadline goes here..."}
                  </p>
                </div>

                <div className="prose prose-zinc prose-sm mx-auto text-center border-y border-zinc-100 py-6">
                   <p className="whitespace-pre-wrap text-zinc-600 leading-relaxed">
                    {event.landing.body_md || "Write something amazing about your event..."}
                  </p>
                </div>

                <div className="mx-auto max-w-sm rounded-2xl bg-zinc-50 p-6 border border-zinc-100 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-6 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-violet-600" />
                    Register
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Full Name</p>
                      <div className="h-10 w-full rounded-lg bg-white border border-zinc-200 shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Email Address</p>
                      <div className="h-10 w-full rounded-lg bg-white border border-zinc-200 shadow-inner" />
                    </div>
                    {event.form_fields.map((field) => (
                      <div key={field.id} className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {field.label} {field.required && <span className="text-violet-600">*</span>}
                        </p>
                        <div className="h-10 w-full rounded-lg bg-white border border-zinc-200 shadow-inner" />
                      </div>
                    ))}
                    <div className="pt-2">
                      <div className="h-12 w-full rounded-xl bg-violet-600 shadow-lg shadow-violet-600/20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
