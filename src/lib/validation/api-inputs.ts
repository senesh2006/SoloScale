import { z } from "zod";
import {
  TICKET_IMAGE_URL_MAX_LEN,
  isValidTicketHeaderImageRef,
  normalizeTicketHeaderImageUrl,
} from "@/lib/tickets/header-image-url";

const formFieldTypes = [
  "text",
  "textarea",
  "email",
  "phone",
  "url",
  "number",
  "date",
  "select",
  "checkbox",
] as const;

export const formFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(formFieldTypes),
  label: z.string().min(1),
  required: z.boolean(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  options: z.array(z.string()).optional(),
});

export const eventPriceSchema = z.object({
  amount_cents: z.number().int().nonnegative(),
  currency: z.enum(["USD", "EUR", "GBP", "INR", "LKR"]),
});

const ticketHexColor = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    let s = v.trim();
    if (/^#[0-9A-Fa-f]{8}$/.test(s)) {
      s = s.slice(0, 7);
    }
    return s;
  },
  z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Use #RGB or #RRGGBB"),
);

const ticketHeaderImageUrl = z.preprocess(
  (v) => {
    if (v == null || v === "") return null;
    if (typeof v !== "string") return v;
    const t = v.trim();
    if (t === "") return null;
    return normalizeTicketHeaderImageUrl(t);
  },
  z.union([
    z.null(),
    z
      .string()
      .max(TICKET_IMAGE_URL_MAX_LEN)
      .refine((s) => isValidTicketHeaderImageRef(s), {
        message:
          "Use https URL, //…, site path /…, or domain/path (e.g. cdn.example.com/x.jpg)",
      }),
  ]),
);

const ticketColorMid = z.preprocess(
  (v) => {
    if (v === "" || v === undefined) return null;
    return v;
  },
  ticketHexColor.nullable(),
);

function asNumber(v: unknown): unknown {
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return v;
}

const ticketDesignFieldsSchema = z.object({
  header_style: z.enum(["gradient", "solid"]),
  header_gradient_angle: z.preprocess(asNumber, z.number().min(0).max(360)),
  header_color_start: ticketHexColor,
  header_color_mid: ticketColorMid,
  header_color_end: ticketHexColor,
  header_background_image_url: ticketHeaderImageUrl,
  header_image_overlay_opacity: z.preprocess(
    asNumber,
    z.number().min(0).max(0.85),
  ),
  header_text_color: ticketHexColor,
  header_text_align: z.enum(["left", "center", "right"]),
  header_padding_px: z.preprocess(
    asNumber,
    z.number().int().min(8).max(48),
  ),
  body_background: ticketHexColor,
  body_text_color: ticketHexColor,
  muted_text_color: ticketHexColor,
  label_text_color: ticketHexColor,
  qr_position: z.enum(["left", "right"]),
  accent_color: ticketHexColor,
  border_color: ticketHexColor,
  show_perforation: z.preprocess(
    (v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      return v;
    },
    z.boolean(),
  ),
});

export const ticketDesignSchema = ticketDesignFieldsSchema;

export const updateEventTicketDesignBodySchema = z.object({
  ticket_design: ticketDesignSchema,
});

export const sponsorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  logo_url: z.string().url().optional(),
  website: z.string().url().optional(),
});

export const landingSchema = z.object({
  headline: z.string().min(1),
  subhead: z.string().default(""),
  body_md: z.string().default(""),
});

/* -------------------- USERS -------------------- */
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  avatar_url: z.string().url().nullable().optional(),
  plan_id: z.enum(["free", "pro", "team"]).optional().default("free"),
});

/**
 * Accepts either a full ISO datetime (`2026-05-20T09:00:00.000Z`) or the
 * browser-local shape produced by `<input type="datetime-local">`
 * (`2026-05-20T09:00`). The handler converts to `Date` before persisting.
 */
const flexibleDateString = z
  .string()
  .min(1)
  .refine(
    (v) => !Number.isNaN(new Date(v).getTime()),
    "Must be a valid date/time",
  );

/* -------------------- CAMPAIGNS -------------------- */
export const createCampaignSchema = z
  .object({
    user_id: z.string().min(1).optional(),
    title: z.string().min(1).default("New Campaign"),
    goal_prompt: z.string().optional().default(""),
    mode: z
      .enum(["all", "strategy", "flyer", "voice", "manual"])
      .optional()
      .default("all"),
    /** AI strategy window (days). Ignored for `manual`. Capped at 90 locally; microservice may cap lower. */
    strategy_horizon_days: z.coerce
      .number()
      .int()
      .min(1)
      .max(90)
      .optional()
      .default(14),
    /** When `mode === "manual"`, set false to only create the campaign + blank strategy (no event doc). */
    create_initial_event: z.boolean().optional().default(true),
    audience: z.string().nullable().optional(),
    event_date: flexibleDateString.nullable().optional(),
    flyer_input: z
      .object({
        visual_prompt: z.string(),
        headline: z.string(),
        subtext: z.string(),
      })
      .nullable()
      .optional(),
    voice_input: z
      .object({
        script: z.string(),
        voice_id: z.string(),
      })
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    const needsGoal =
      data.mode === "all" || data.mode === "strategy";
    if (needsGoal && !data.goal_prompt.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "goal_prompt is required for AI-generated campaigns",
        path: ["goal_prompt"],
      });
    }
  });

/* -------------------- EVENTS -------------------- */
export const createEventSchema = z.object({
  campaign_id: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase, kebab-case"),
  landing: landingSchema,
  published: z.boolean().optional().default(false),
  event_date: z.string().datetime().nullable().optional(),
  location: z.string().nullable().optional(),
  form_fields: z.array(formFieldSchema).default([]),
  price: eventPriceSchema.nullable().optional(),
  media: z
    .object({
      hero_url: z.string().url().optional(),
      gallery_urls: z.array(z.string().url()).optional(),
    })
    .optional(),
  sponsors: z.array(sponsorSchema).optional(),
  sponsors_display: z.enum(["grid", "carousel"]).optional(),
});

/* -------------------- ATTENDEES -------------------- */
export const createAttendeeSchema = z.object({
  event_id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  metadata: z.record(z.string(), z.string()).optional(),
});

/** Body for `POST /api/events/[id]/tickets` — event id comes from the URL. */
export const createOrganizerTicketSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  note: z.string().max(500).optional(),
  /** Complimentary or manually recorded payment (no Stripe charge). */
  mark_paid: z.boolean().optional().default(false),
});

/* -------------------- FORM RESPONSES -------------------- */
export const formResponseAnswerSchema = z.object({
  field_id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(formFieldTypes),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null(),
  ]),
});

export const createFormResponseSchema = z.object({
  event_id: z.string().min(1),
  attendee_id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  answers: z.array(formResponseAnswerSchema).min(1),
  form_version: z.number().int().nonnegative().optional(),
});

/* -------------------- ANNOUNCEMENTS -------------------- */
export const createAnnouncementSchema = z.object({
  event_id: z.string().min(1),
  subject: z.string().min(2).max(140),
  body: z.string().min(4),
  channel: z.enum(["email", "in_app"]).optional().default("email"),
  scheduled_for: z.string().datetime().nullable().optional(),
});

/* -------------------- PAYMENTS -------------------- */
export const createPaymentSchema = z.object({
  attendee_id: z.string().min(1),
  event_id: z.string().min(1),
  email: z.string().email(),
  amount_cents: z.number().int().nonnegative(),
  currency: z.enum(["USD", "EUR", "GBP", "INR", "LKR"]),
  status: z
    .enum(["succeeded", "pending", "failed", "refunded"])
    .optional()
    .default("pending"),
  stripe_payment_intent_id: z.string().nullable().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type CreateAttendeeInput = z.infer<typeof createAttendeeSchema>;
export type CreateFormResponseInput = z.infer<typeof createFormResponseSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
