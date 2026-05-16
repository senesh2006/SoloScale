import { FlyerRequest } from "../../schemas/requests";

/**
 * Art-direction prompt for Pixazo Flux 1 Schnell (free tier).
 * Visual-first: Schnell handles composition and mood better than crisp on-image type.
 */
export function buildFlyerPrompt(input: FlyerRequest): string {
  const parts: string[] = [
    "Vertical 9:16 portrait social media marketing flyer, professional campaign quality.",
    "Single clear focal subject, strong foreground/background separation, rule-of-thirds composition.",
    "Bold color palette with 2-3 dominant colors, high contrast, modern indie-brand aesthetic.",
    "Clean negative space suitable for text overlay; uncluttered layout.",
    "Photorealistic OR polished illustrated style — pick one and commit consistently.",
    "No watermarks, no stock-photo logos, no QR codes, no lorem ipsum, no random gibberish text.",
    `Creative brief: ${input.prompt}`,
  ];

  if (input.headline || input.subtext) {
    const textParts: string[] = [];
    if (input.headline) {
      textParts.push(
        `Reserve the top third for a large, bold headline reading exactly: "${input.headline}"`,
      );
    }
    if (input.subtext) {
      textParts.push(
        `Below the headline, a smaller subline reading exactly: "${input.subtext}"`,
      );
    }
    parts.push(
      "Typography: sans-serif, high legibility, strong hierarchy. " +
        textParts.join(". ") +
        ". If exact lettering fails, keep clear empty space where text belongs.",
    );
  }

  parts.push(
    "Lighting: soft directional light, subtle depth. Mood: energetic, trustworthy, launch-ready.",
  );

  return parts.join(" ");
}
