import { z } from "zod";

export const contentTypeSchema = z.enum([
  "tweet",
  "linkedin",
  "reel",
  "email",
]);

export const formFieldTypeSchema = z.enum(["text", "email", "select"]);

export const formFieldSchema = z.object({
  id: z.string().min(1),
  type: formFieldTypeSchema,
  label: z.string().min(1),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const contentItemSchema = z.object({
  id: z.string().min(1),
  type: contentTypeSchema,
  scheduled_at: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid ISO date"),
  copy: z.string(),
  asset_refs: z
    .object({
      flyer_id: z.string().optional(),
      audio_id: z.string().optional(),
    })
    .optional(),
});

export const eventDraftSchema = z.object({
  headline: z.string().min(1, "Headline is required"),
  subhead: z.string(),
  body_md: z.string(),
  form_fields: z.array(formFieldSchema),
});

export const campaignStrategySchema = z.object({
  summary: z.string(),
  timeline: z.array(contentItemSchema).max(50, "Too many timeline items"),
  event_draft: eventDraftSchema,
});

export type CampaignStrategyInput = z.infer<typeof campaignStrategySchema>;

export function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  if (!first) return "Invalid payload";
  const path = first.path.join(".");
  return path ? `${path}: ${first.message}` : first.message;
}
