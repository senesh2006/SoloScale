import { z } from "zod";

/**
 * The cross-team contract. Dev 2 stores this; Dev 3 renders it.
 * Keep this in sync with the Gemini responseSchema in strategyService.
 */

export const PlatformSchema = z.enum([
  "twitter",
  "linkedin",
  "instagram",
  "reel",
]);
export type Platform = z.infer<typeof PlatformSchema>;

export const PostTypeSchema = z.enum(["text", "image", "reel"]);
export type PostType = z.infer<typeof PostTypeSchema>;

export const EventFormatSchema = z.enum(["virtual", "in-person", "hybrid"]);
export type EventFormat = z.infer<typeof EventFormatSchema>;

// Gemini honors `nullable: true` literally and returns `null` (not absent)
// for optional fields. `.nullish().transform(...)` accepts both null and
// undefined from the wire, but the inferred TS type stays `string | undefined`
// so downstream code can keep using `?.` / `??` naturally.
const optionalString = () =>
  z
    .string()
    .nullish()
    .transform((v) => (v == null ? undefined : v));

export const CampaignPostSchema = z.object({
  day: z.number().int().min(1),
  dateISO: z.string().min(1),
  platform: PlatformSchema,
  type: PostTypeSchema,
  headline: z.string().min(1),
  body: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  cta: optionalString(),
  suggestedFlyerPrompt: optionalString(),
  suggestedVoiceoverScript: optionalString(),
});
export type CampaignPost = z.infer<typeof CampaignPostSchema>;

export const CampaignEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  dateISO: z.string().min(1),
  format: EventFormatSchema,
});
export type CampaignEvent = z.infer<typeof CampaignEventSchema>;

export const CampaignStrategySchema = z.object({
  goal: z.string().min(1),
  durationDays: z.number().int().min(1),
  event: CampaignEventSchema.nullish().transform((v) => v ?? undefined),
  posts: z.array(CampaignPostSchema).min(1),
});
export type CampaignStrategy = z.infer<typeof CampaignStrategySchema>;
