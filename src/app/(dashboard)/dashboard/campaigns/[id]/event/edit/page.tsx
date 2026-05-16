"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type {
  Campaign,
  Currency,
  Event,
  FormField,
  FormFieldType,
  Sponsor,
  SponsorDisplay,
} from "@/types/campaign";
import {
  ChevronLeft,
  Save,
  Eye,
  Lock,
  Type,
  AlignLeft,
  ListPlus,
  Trash2,
  Plus,
  GripVertical,
  CheckCircle2,
  Tag,
  Banknote,
  ImagePlus,
  Image as ImageIcon,
  Building2,
  LayoutGrid,
  Rows3,
  Upload,
  Link2,
  X,
  Calendar,
  MapPin,
  TextCursorInput,
  AtSign,
  Phone,
  Globe,
  Hash,
  CalendarDays,
  ChevronDown,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/payment";
import { uploadImage } from "@/lib/upload-client";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const FIELD_TEMPLATES: { label: string; type: FormFieldType }[] = [
  { label: "Company Name", type: "text" },
  { label: "Job Title", type: "text" },
  { label: "Phone Number", type: "phone" },
  { label: "LinkedIn Profile", type: "url" },
  { label: "Dietary Requirements", type: "textarea" },
  { label: "T-Shirt Size", type: "select" },
  { label: "Subscribe to updates", type: "checkbox" },
];

const FIELD_TYPE_META: Record<
  FormFieldType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  text: { label: "Short text", icon: TextCursorInput },
  textarea: { label: "Long text", icon: AlignLeft },
  email: { label: "Email", icon: AtSign },
  phone: { label: "Phone", icon: Phone },
  url: { label: "URL", icon: Globe },
  number: { label: "Number", icon: Hash },
  date: { label: "Date", icon: CalendarDays },
  select: { label: "Dropdown", icon: ChevronDown },
  checkbox: { label: "Checkbox", icon: CheckSquare },
};

export default function EventEditPage() {
  const { id: campaignId, eventId: eventIdParam } = useParams<{
    id: string;
    eventId?: string;
  }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "content" | "media" | "sponsors" | "form" | "pricing"
  >("content");

  useEffect(() => {
    const eventId =
      eventIdParam ??
      searchParams.get("eventId") ??
      null;
    if (!eventId) return;
    apiFetch<{ event: Event }>(`/api/events/${eventId}`)
      .then((res) => setEvent(res.event))
      .catch(console.error);
  }, [campaignId, eventIdParam, searchParams]);

  async function save() {
    if (!event || event.published) return;
    setSaving(true);
    try {
      await apiFetch(`/api/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          landing: event.landing,
          form_fields: event.form_fields,
          price: event.price ?? null,
          media: event.media ?? {},
          sponsors: event.sponsors ?? [],
          sponsors_display: event.sponsors_display ?? "grid",
          event_date: event.event_date ?? null,
          location: event.location ?? null,
        }),
      });
      router.push(`/dashboard/campaigns/${campaignId}/events/${event.id}`);
    } finally {
      setSaving(false);
    }
  }

  function updateMedia(patch: Partial<NonNullable<Event["media"]>>) {
    if (!event) return;
    setEvent({ ...event, media: { ...(event.media ?? {}), ...patch } });
  }

  function addGalleryUrl(url: string) {
    if (!event || !url.trim()) return;
    const current = event.media?.gallery_urls ?? [];
    updateMedia({ gallery_urls: [...current, url.trim()] });
  }

  function removeGalleryAt(idx: number) {
    if (!event) return;
    const current = event.media?.gallery_urls ?? [];
    updateMedia({
      gallery_urls: current.filter((_, i) => i !== idx),
    });
  }

  function addSponsor() {
    if (!event) return;
    const newSponsor: Sponsor = {
      id: Math.random().toString(36).slice(2, 10),
      name: "",
      logo_url: "",
      website: "",
    };
    setEvent({
      ...event,
      sponsors: [...(event.sponsors ?? []), newSponsor],
    });
  }

  function updateSponsor(id: string, patch: Partial<Sponsor>) {
    if (!event) return;
    setEvent({
      ...event,
      sponsors: (event.sponsors ?? []).map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });
  }

  function removeSponsor(id: string) {
    if (!event) return;
    setEvent({
      ...event,
      sponsors: (event.sponsors ?? []).filter((s) => s.id !== id),
    });
  }

  function setSponsorsDisplay(mode: SponsorDisplay) {
    if (!event) return;
    setEvent({ ...event, sponsors_display: mode });
  }

  function reorderGallery(from: number, to: number) {
    if (!event) return;
    const current = event.media?.gallery_urls ?? [];
    if (from === to || from < 0 || to < 0) return;
    updateMedia({ gallery_urls: arrayMove(current, from, to) });
  }

  function reorderSponsors(fromId: string, toId: string) {
    if (!event || fromId === toId) return;
    const current = event.sponsors ?? [];
    const from = current.findIndex((s) => s.id === fromId);
    const to = current.findIndex((s) => s.id === toId);
    if (from < 0 || to < 0) return;
    setEvent({ ...event, sponsors: arrayMove(current, from, to) });
  }

  function togglePaid(paid: boolean) {
    if (!event) return;
    setEvent({
      ...event,
      price: paid ? { amount_cents: 2500, currency: "USD" } : null,
    });
  }

  function setPriceAmount(value: string) {
    if (!event) return;
    const num = Math.max(0, Math.round(parseFloat(value || "0") * 100));
    setEvent({
      ...event,
      price: {
        amount_cents: num,
        currency: event.price?.currency ?? "USD",
      },
    });
  }

  function setPriceCurrency(currency: Currency) {
    if (!event || !event.price) return;
    setEvent({
      ...event,
      price: { ...event.price, currency },
    });
  }

  function addField(template: { label: string; type: FormFieldType }) {
    if (!event) return;
    const newField: FormField = {
      id: Math.random().toString(36).slice(2, 10),
      label: template.label,
      type: template.type,
      required: false,
      ...(template.type === "select" ? { options: ["Option 1", "Option 2"] } : {}),
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

  const readOnly = event.published === true;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      {readOnly ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <p>
            This event is live — landing content and registration fields are
            frozen so registrations stay consistent. Unpublish from the event
            page if you need to edit.
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            router.push(
              event
                ? `/dashboard/campaigns/${campaignId}/events/${event.id}`
                : `/dashboard/campaigns/${campaignId}`,
            )
          }
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to event
        </button>

        <button
          type="button"
          onClick={save}
          disabled={saving || readOnly}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 disabled:opacity-50 transition-all"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving Changes..." : "Save Landing Page"}
        </button>
      </div>

      <div
        className={cn(
          "grid gap-8 lg:grid-cols-2",
          readOnly && "pointer-events-none select-none opacity-[0.72]",
        )}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
            <div className="flex flex-wrap items-center gap-4">
              {(
                [
                  { id: "content", label: "Content" },
                  { id: "media", label: "Media" },
                  { id: "sponsors", label: "Sponsors" },
                  { id: "form", label: "Form" },
                  { id: "pricing", label: "Pricing" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "pb-2 text-sm font-bold transition-all",
                    activeTab === t.id
                      ? "border-b-2 border-violet-600 text-zinc-950"
                      : "text-zinc-400 hover:text-zinc-600",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "media" ? (
            <MediaTab
              event={event}
              onUpdateMedia={updateMedia}
              onAddGallery={addGalleryUrl}
              onRemoveGallery={removeGalleryAt}
              onReorderGallery={reorderGallery}
            />
          ) : activeTab === "sponsors" ? (
            <SponsorsTab
              event={event}
              onAdd={addSponsor}
              onUpdate={updateSponsor}
              onRemove={removeSponsor}
              onSetDisplay={setSponsorsDisplay}
              onReorder={reorderSponsors}
            />
          ) : activeTab === "pricing" ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-zinc-900">
                  <Tag className="h-4 w-4 text-violet-600" />
                  Ticket type
                </h3>
                <p className="mb-4 text-xs text-zinc-500">
                  Free events go straight to registration. Paid events route
                  through a Stripe-style checkout.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => togglePaid(false)}
                    className={cn(
                      "relative overflow-hidden rounded-xl border p-4 text-left transition-all",
                      !event.price
                        ? "border-zinc-950 ring-1 ring-zinc-950 shadow-md"
                        : "border-zinc-200 hover:border-zinc-300",
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-zinc-950">
                      Free
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Anyone can register at no cost.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePaid(true)}
                    className={cn(
                      "relative overflow-hidden rounded-xl border p-4 text-left transition-all",
                      event.price
                        ? "border-zinc-950 ring-1 ring-zinc-950 shadow-md"
                        : "border-zinc-200 hover:border-zinc-300",
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-zinc-950">
                      Paid
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Charge a one-time fee per registration.
                    </p>
                  </button>
                </div>

                {event.price && (
                  <div className="mt-6 grid grid-cols-[1fr_120px] gap-3 animate-fade-in">
                    <div>
                      <label className="text-xs font-medium text-zinc-700">
                        Price
                      </label>
                      <div className="relative mt-1.5">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-400">
                          {event.price.currency === "USD"
                            ? "$"
                            : event.price.currency === "EUR"
                              ? "€"
                              : event.price.currency === "GBP"
                                ? "£"
                                : event.price.currency === "INR"
                                  ? "₹"
                                  : "Rs"}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={(event.price.amount_cents / 100).toString()}
                          onChange={(e) => setPriceAmount(e.target.value)}
                          className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-3 text-sm tabular-nums text-zinc-900 transition-all focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-700">
                        Currency
                      </label>
                      <select
                        value={event.price.currency}
                        onChange={(e) =>
                          setPriceCurrency(e.target.value as Currency)
                        }
                        className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 transition-all focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="INR">INR</option>
                        <option value="LKR">LKR</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <p className="text-xs text-zinc-500">Displayed to attendees as</p>
                  <p className="text-base font-semibold tabular-nums text-zinc-950">
                    {formatPrice(event.price)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-zinc-200 p-5">
                <p className="text-xs font-medium text-zinc-700">
                  Stripe Connect (coming soon)
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Payouts route directly to your bank. For now, paid events use
                  the demo checkout — no real charges are made.
                </p>
              </div>
            </div>
          ) : activeTab === "content" ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
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

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-zinc-900">
                  <Calendar className="h-4 w-4 text-violet-600" />
                  Date & location
                </h3>
                <p className="mb-4 text-xs text-zinc-500">
                  Drives the countdown timer on your event page. Leave blank to
                  hide it.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-zinc-700">
                      Event date & time
                    </label>
                    <div className="relative mt-1.5">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="datetime-local"
                        value={toLocalDateTime(event.event_date)}
                        onChange={(e) =>
                          setEvent({
                            ...event,
                            event_date: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          })
                        }
                        className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm tabular-nums text-zinc-900 transition-all focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700">
                      Location
                    </label>
                    <div className="relative mt-1.5">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={event.location ?? ""}
                        onChange={(e) =>
                          setEvent({ ...event, location: e.target.value })
                        }
                        placeholder="Virtual · Zoom + livestream"
                        className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 transition-all focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <FormFieldsTab
              event={event}
              onAdd={addField}
              onUpdate={updateField}
              onRemove={removeField}
            />
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
              {event.media?.hero_url ? (
                <div className="relative h-44 w-full overflow-hidden bg-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.media.hero_url}
                    alt="Hero"
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/0 to-white/0" />
                </div>
              ) : null}
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
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-violet-600" />
                      Register
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                        event.price
                          ? "bg-violet-100 text-violet-700"
                          : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {formatPrice(event.price)}
                    </span>
                  </div>
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
                        {field.type === "textarea" ? (
                          <div className="h-20 w-full rounded-lg bg-white border border-zinc-200 shadow-inner" />
                        ) : field.type === "checkbox" ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded border border-zinc-300 bg-white" />
                            <span className="text-[11px] text-zinc-500">
                              {field.description || "I agree"}
                            </span>
                          </div>
                        ) : (
                          <div className="h-10 w-full rounded-lg bg-white border border-zinc-200 shadow-inner" />
                        )}
                      </div>
                    ))}
                    <div className="pt-2">
                      <div className="h-12 w-full rounded-xl bg-violet-600 shadow-lg shadow-violet-600/20" />
                    </div>
                  </div>
                </div>

                {(event.sponsors ?? []).length > 0 && (
                  <div className="mx-auto max-w-2xl border-t border-zinc-100 pt-6">
                    <p className="mb-3 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Sponsored by
                    </p>
                    {event.sponsors_display === "carousel" ? (
                      <div className="marquee">
                        <div className="marquee-track items-center">
                          {[...(event.sponsors ?? []), ...(event.sponsors ?? [])].map(
                            (s, i) => (
                              <SponsorPreview key={`${s.id}-${i}`} sponsor={s} />
                            ),
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {(event.sponsors ?? []).map((s) => (
                          <SponsorPreview key={s.id} sponsor={s} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function toLocalDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function FormFieldsTab({
  event,
  onAdd,
  onUpdate,
  onRemove,
}: {
  event: Event;
  onAdd: (template: { label: string; type: FormFieldType }) => void;
  onUpdate: (id: string, patch: Partial<FormField>) => void;
  onRemove: (id: string) => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState<FormFieldType>("text");

  function submitCustom() {
    const label = customLabel.trim();
    if (!label) return;
    onAdd({ label, type: customType });
    setCustomLabel("");
    setCustomType("text");
    setShowCustom(false);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-zinc-900">
          <ListPlus className="h-4 w-4 text-violet-600" />
          Registration form
        </h3>
        <p className="mb-4 text-xs text-zinc-500">
          Name + email are always collected. Add custom fields to capture
          anything else you need.
        </p>

        <div className="space-y-3">
          <DefaultFieldRow label="Full name" hint="Required · Text" />
          <DefaultFieldRow label="Email address" hint="Required · Email" />

          {event.form_fields.map((field) => (
            <FieldEditorRow
              key={field.id}
              field={field}
              onUpdate={(p) => onUpdate(field.id, p)}
              onRemove={() => onRemove(field.id)}
            />
          ))}

          {event.form_fields.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 p-6 text-center">
              <p className="text-xs font-medium text-zinc-500">
                No custom fields yet. Add one below.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-300 p-6">
        <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
          Add quick fields
        </h3>
        <div className="flex flex-wrap gap-2">
          {FIELD_TEMPLATES.map((tmpl) => {
            const Icon = FIELD_TYPE_META[tmpl.type].icon;
            return (
              <button
                key={tmpl.label}
                type="button"
                onClick={() => onAdd(tmpl)}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 transition-all hover:border-violet-600 hover:text-violet-600"
              >
                <Icon className="h-3 w-3" />
                {tmpl.label}
              </button>
            );
          })}
        </div>

        {!showCustom ? (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-all hover:border-violet-300 hover:text-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Build a custom field
          </button>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
            <input
              autoFocus
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitCustom()}
              placeholder="Field label, e.g. Years of experience"
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <select
              value={customType}
              onChange={(e) => setCustomType(e.target.value as FormFieldType)}
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            >
              {(Object.keys(FIELD_TYPE_META) as FormFieldType[]).map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_META[t].label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitCustom}
                disabled={!customLabel.trim()}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-zinc-950 px-3 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustom(false);
                  setCustomLabel("");
                }}
                className="inline-flex h-10 items-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DefaultFieldRow({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 opacity-60">
      <GripVertical className="h-4 w-4 text-zinc-300" />
      <div className="flex-1">
        <p className="text-sm font-bold text-zinc-900">{label}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          {hint}
        </p>
      </div>
    </div>
  );
}

function FieldEditorRow({
  field,
  onUpdate,
  onRemove,
}: {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = FIELD_TYPE_META[field.type].icon;
  const optionsText = (field.options ?? []).join("\n");

  return (
    <div className="group rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-violet-300">
      <div className="flex items-center gap-3 p-4">
        <GripVertical className="h-4 w-4 text-zinc-300" />
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <input
            className="w-full bg-transparent text-sm font-bold text-zinc-900 outline-none focus:text-violet-600"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Field label"
          />
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <select
              value={field.type}
              onChange={(e) => {
                const next = e.target.value as FormFieldType;
                onUpdate({
                  type: next,
                  options:
                    next === "select"
                      ? (field.options ?? ["Option 1", "Option 2"])
                      : undefined,
                });
              }}
              className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700 focus:border-violet-400 focus:outline-none"
            >
              {(Object.keys(FIELD_TYPE_META) as FormFieldType[]).map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_META[t].label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-3 w-3 rounded border-zinc-300 text-violet-600 focus:ring-violet-600"
                checked={field.required}
                onChange={(e) => onUpdate({ required: e.target.checked })}
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Required
              </span>
            </label>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-[10px] font-black uppercase tracking-widest text-violet-600 hover:text-violet-700"
            >
              {open ? "Hide details" : "Edit details"}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-zinc-300 transition-colors hover:text-red-500"
          aria-label="Remove field"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-zinc-100 bg-zinc-50/50 p-4 animate-in fade-in duration-200">
          {field.type !== "checkbox" && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Placeholder
              </label>
              <input
                value={field.placeholder ?? ""}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Shown inside the empty input"
                className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
            </div>
          )}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Help text {field.type === "checkbox" && "(checkbox label)"}
            </label>
            <input
              value={field.description ?? ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder={
                field.type === "checkbox"
                  ? "I agree to receive event updates"
                  : "Shown under the field as a hint"
              }
              className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          </div>
          {field.type === "select" && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Options (one per line)
              </label>
              <textarea
                value={optionsText}
                onChange={(e) =>
                  onUpdate({
                    options: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder={"Small\nMedium\nLarge"}
                className="mt-1 min-h-24 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SponsorPreview({ sponsor }: { sponsor: Sponsor }) {
  return (
    <div className="flex h-12 items-center justify-center rounded-xl border border-zinc-100 bg-white px-3 shrink-0">
      {sponsor.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sponsor.logo_url}
          alt={sponsor.name}
          className="max-h-7 max-w-full object-contain opacity-80"
        />
      ) : (
        <span className="truncate text-xs font-semibold text-zinc-600">
          {sponsor.name || "New sponsor"}
        </span>
      )}
    </div>
  );
}

function MediaTab({
  event,
  onUpdateMedia,
  onAddGallery,
  onRemoveGallery,
  onReorderGallery,
}: {
  event: Event;
  onUpdateMedia: (patch: Partial<NonNullable<Event["media"]>>) => void;
  onAddGallery: (url: string) => void;
  onRemoveGallery: (idx: number) => void;
  onReorderGallery: (from: number, to: number) => void;
}) {
  const [galleryUrl, setGalleryUrl] = useState("");
  const [heroUploading, setHeroUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const heroPickerRef = useRef<HTMLInputElement | null>(null);
  const galleryPickerRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  async function handleHeroPick(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setHeroUploading(true);
    try {
      const url = await uploadImage(file, { folder: "events/hero" });
      onUpdateMedia({ hero_url: url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setHeroUploading(false);
    }
  }

  async function handleGalleryPick(files: File[]) {
    if (!files.length) return;
    setUploadError(null);
    setGalleryUploading(true);
    try {
      for (const file of files) {
        const url = await uploadImage(file, { folder: "events/gallery" });
        onAddGallery(url);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setGalleryUploading(false);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = Number(String(active.id).split(":")[0]);
    const to = Number(String(over.id).split(":")[0]);
    if (Number.isFinite(from) && Number.isFinite(to)) {
      onReorderGallery(from, to);
    }
  }

  const heroUrl = event.media?.hero_url ?? "";
  const gallery = event.media?.gallery_urls ?? [];
  const galleryIds = gallery.map((url, i) => `${i}:${url}`);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero image */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-zinc-900">
          <ImagePlus className="h-4 w-4 text-violet-600" />
          Hero wallpaper
        </h3>
        <p className="mb-4 text-xs text-zinc-500">
          Shown full-width at the top of your event page. Use a wide image
          (16:9 or wider) for best results.
        </p>

        {heroUrl ? (
          <div className="relative mb-4 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroUrl}
              alt="Hero preview"
              className="h-48 w-full object-cover"
            />
            <button
              type="button"
              onClick={() => onUpdateMedia({ hero_url: "" })}
              className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-zinc-600 shadow-sm transition-colors hover:bg-white hover:text-red-600"
              aria-label="Remove hero"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mb-4 flex h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 text-zinc-400">
            <ImageIcon className="h-6 w-6" />
            <p className="text-xs font-medium">No hero image set</p>
          </div>
        )}

        <div className="space-y-2">
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="url"
              value={heroUrl}
              onChange={(e) => onUpdateMedia({ hero_url: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-3 text-sm transition-all focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-zinc-100" />
            or
            <span className="h-px flex-1 bg-zinc-100" />
          </div>
          <button
            type="button"
            onClick={() => heroPickerRef.current?.click()}
            disabled={heroUploading}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
          >
            <Upload
              className={cn("h-4 w-4", heroUploading && "animate-pulse")}
            />
            {heroUploading ? "Uploading…" : "Upload from device"}
          </button>
          <input
            ref={heroPickerRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleHeroPick(e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      {/* Gallery */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-zinc-900">
          <ImageIcon className="h-4 w-4 text-violet-600" />
          Gallery
        </h3>
        <p className="mb-4 text-xs text-zinc-500">
          Extra photos shown below the event details. Drag any tile to reorder.
        </p>

        {gallery.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={galleryIds} strategy={rectSortingStrategy}>
              <div className="mb-4 grid grid-cols-3 gap-3">
                {gallery.map((url, idx) => (
                  <SortableGalleryItem
                    key={galleryIds[idx]}
                    id={galleryIds[idx]}
                    url={url}
                    onRemove={() => onRemoveGallery(idx)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {uploadError && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {uploadError}
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="url"
              value={galleryUrl}
              onChange={(e) => setGalleryUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddGallery(galleryUrl);
                  setGalleryUrl("");
                }
              }}
              placeholder="Paste an image URL and press Enter"
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-3 text-sm transition-all focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
            />
          </div>
          <button
            type="button"
            onClick={() => galleryPickerRef.current?.click()}
            disabled={galleryUploading}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
          >
            <Upload
              className={cn("h-4 w-4", galleryUploading && "animate-pulse")}
            />
            {galleryUploading ? "Uploading…" : "Upload"}
          </button>
          <input
            ref={galleryPickerRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              handleGalleryPick(files);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SortableGalleryItem({
  id,
  url,
  onRemove,
}: {
  id: string;
  url: string;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative aspect-[4/3] overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 touch-none",
        isDragging && "z-10 opacity-60 ring-2 ring-violet-400 shadow-xl",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Gallery"
        className="pointer-events-none h-full w-full object-cover transition-transform group-hover:scale-105"
      />
      <div className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-white/90 p-1 text-zinc-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <button
        type="button"
        onClick={onRemove}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-1.5 top-1.5 rounded-md bg-white/90 p-1 text-zinc-600 opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:text-red-600"
        aria-label="Remove image"
        title="Remove"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SponsorsTab({
  event,
  onAdd,
  onUpdate,
  onRemove,
  onSetDisplay,
  onReorder,
}: {
  event: Event;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Sponsor>) => void;
  onRemove: (id: string) => void;
  onSetDisplay: (mode: SponsorDisplay) => void;
  onReorder: (fromId: string, toId: string) => void;
}) {
  const sponsors = event.sponsors ?? [];
  const display = event.sponsors_display ?? "grid";
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  async function handleLogoUpload(id: string, file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setUploadingId(id);
    try {
      const url = await uploadImage(file, { folder: "events/sponsors" });
      onUpdate(id, { logo_url: url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingId(null);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Display mode */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-zinc-900">
          <Building2 className="h-4 w-4 text-violet-600" />
          Display style
        </h3>
        <p className="mb-4 text-xs text-zinc-500">
          How sponsor logos appear on your event page.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <DisplayChoice
            active={display === "grid"}
            onClick={() => onSetDisplay("grid")}
            icon={<LayoutGrid className="h-4 w-4" />}
            label="Grid"
            hint="Static rows of logos"
          />
          <DisplayChoice
            active={display === "carousel"}
            onClick={() => onSetDisplay("carousel")}
            icon={<Rows3 className="h-4 w-4" />}
            label="Carousel"
            hint="Slowly scrolling marquee"
          />
        </div>
      </div>

      {/* Sponsor list */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900">
            <Building2 className="h-4 w-4 text-violet-600" />
            Sponsors
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
              {sponsors.length}
            </span>
          </h3>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-all hover:border-violet-300 hover:text-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add sponsor
          </button>
        </div>

        {sponsors.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 py-10 text-zinc-400">
            <Building2 className="h-6 w-6" />
            <p className="text-xs font-medium">No sponsors yet</p>
            <button
              type="button"
              onClick={onAdd}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:text-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add your first sponsor
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sponsors.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-3">
                {sponsors.map((sponsor) => (
                  <SortableSponsorRow
                    key={sponsor.id}
                    sponsor={sponsor}
                    uploading={uploadingId === sponsor.id}
                    onUpdate={(p) => onUpdate(sponsor.id, p)}
                    onRemove={() => onRemove(sponsor.id)}
                    onUpload={(file) => handleLogoUpload(sponsor.id, file)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {uploadError && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {uploadError}
          </div>
        )}
      </div>
    </div>
  );
}

function SortableSponsorRow({
  sponsor,
  uploading,
  onUpdate,
  onRemove,
  onUpload,
}: {
  sponsor: Sponsor;
  uploading: boolean;
  onUpdate: (patch: Partial<Sponsor>) => void;
  onRemove: () => void;
  onUpload: (file: File | undefined) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sponsor.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm touch-none",
        isDragging && "z-10 opacity-80 ring-2 ring-violet-400 shadow-xl",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          title="Drag to reorder"
          className="mt-1 cursor-grab rounded-md p-1 text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
          {sponsor.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sponsor.logo_url}
              alt={sponsor.name}
              className="max-h-10 max-w-full object-contain"
            />
          ) : (
            <ImageIcon className="h-5 w-5 text-zinc-300" />
          )}
        </div>
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          <input
            value={sponsor.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Sponsor name"
            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
          <input
            type="url"
            value={sponsor.website ?? ""}
            onChange={(e) => onUpdate({ website: e.target.value })}
            placeholder="Website (optional)"
            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
          <input
            type="url"
            value={sponsor.logo_url ?? ""}
            onChange={(e) => onUpdate({ logo_url: e.target.value })}
            placeholder="Logo URL"
            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 sm:col-span-2"
          />
          <label
            className={cn(
              "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 sm:col-span-2",
              uploading && "cursor-wait opacity-60",
            )}
          >
            <Upload className={cn("h-3.5 w-3.5", uploading && "animate-pulse")} />
            {uploading ? "Uploading…" : "Upload logo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                onUpload(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove sponsor"
          title="Remove"
          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function DisplayChoice({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 text-left transition-all",
        active
          ? "border-zinc-950 ring-1 ring-zinc-950 shadow-md"
          : "border-zinc-200 hover:border-zinc-300",
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-zinc-950">{label}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </button>
  );
}
