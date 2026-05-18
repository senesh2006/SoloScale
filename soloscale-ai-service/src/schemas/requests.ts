import { z } from "zod";

export const StrategyRequestSchema = z.object({
  goal: z.string().min(3, "goal must be at least 3 characters"),
  eventDate: z.string().optional(),
  audience: z.string().optional(),
  durationDays: z.number().int().min(1).max(90).optional(),
});
export type StrategyRequest = z.infer<typeof StrategyRequestSchema>;

export const FlyerRequestSchema = z.object({
  prompt: z.string().min(3, "prompt must be at least 3 characters"),
  headline: z.string().optional(),
  subtext: z.string().optional(),
});
export type FlyerRequest = z.infer<typeof FlyerRequestSchema>;

export const VoiceoverRequestSchema = z.object({
  script: z.string().min(3, "script must be at least 3 characters"),
  /** ElevenLabs voice display name (e.g. "Rachel"). Omit for env default. */
  voiceName: z.string().min(1).optional(),
});
export type VoiceoverRequest = z.infer<typeof VoiceoverRequestSchema>;

export const CampaignRequestSchema = z.object({
  goal: z.string().min(3, "goal must be at least 3 characters"),
  eventDate: z.string().optional(),
  audience: z.string().optional(),
  durationDays: z.number().int().min(1).max(90).optional(),
  /** ElevenLabs voice display name for hero voice-over. Omit for env default. */
  voiceName: z.string().min(1).optional(),
});
export type CampaignRequest = z.infer<typeof CampaignRequestSchema>;
