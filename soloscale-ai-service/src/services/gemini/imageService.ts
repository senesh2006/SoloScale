/**
 * @deprecated Flyers use Pixazo (`src/services/pixazo/imageService.ts`).
 * Kept for reference / optional Gemini image experiments.
 */
import { Modality } from "@google/genai";

import { config } from "../../config";
import { FlyerRequest } from "../../schemas/requests";
import { SavedAsset, getStorage } from "../../storage";
import { fmtBytes, logger } from "../../utils/logger";
import { buildFlyerPrompt } from "../flyer/prompt";
import { getGemini } from "./client";
import { createKeyPool, tryAcrossKeys } from "./keyPool";
import { GEMINI_IMAGE_MODEL } from "./models";
import { withRetry } from "./withRetry";

function extByMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "png";
}

/**
 * Pool of API keys used for image generation. Built once at module load:
 *  - If `GEMINI_IMAGE_API_KEYS` is set, use ONLY those keys (each should
 *    come from a separate Google Cloud project so they have independent
 *    free-tier quotas).
 *  - Otherwise fall back to the main `GEMINI_API_KEY` (single-key
 *    behavior, backward compatible).
 */
export const IMAGE_KEY_POOL = createKeyPool(
  config.gemini.imageApiKeys.length > 0
    ? config.gemini.imageApiKeys
    : [config.gemini.apiKey],
);

export async function generateFlyer(input: FlyerRequest): Promise<SavedAsset> {
  const log = logger("flyer");
  const prompt = buildFlyerPrompt(input);
  const poolSize = IMAGE_KEY_POOL.keys.length;
  log.start(
    `calling ${GEMINI_IMAGE_MODEL} (prompt ${fmtBytes(prompt.length)}, pool=${poolSize} key${poolSize === 1 ? "" : "s"}${input.headline ? `, headline="${input.headline}"` : ""})`,
  );

  const response = await tryAcrossKeys(
    { label: "image", pool: IMAGE_KEY_POOL, log },
    (apiKey) =>
      withRetry(
        () =>
          getGemini(apiKey).models.generateContent({
            model: GEMINI_IMAGE_MODEL,
            contents: prompt,
            config: {
              responseModalities: [Modality.IMAGE],
              imageConfig: { aspectRatio: "9:16" },
            },
          }),
        // 1 retry per key (= 2 attempts) so a fully-stuck network path
        // fails over to the next pool key in ~3 min instead of ~4.5 min.
        { label: "gemini.image", retries: 1 },
      ),
  );

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(
    (p) => p.inlineData?.data && p.inlineData.mimeType?.startsWith("image/"),
  );

  if (!imagePart?.inlineData?.data) {
    log.fail("no image part in response");
    throw new Error(
      "Gemini did not return an image part for the flyer request.",
    );
  }

  const mimeType = imagePart.inlineData.mimeType ?? "image/png";
  const buffer = Buffer.from(imagePart.inlineData.data, "base64");
  log.info(`decoded image ${fmtBytes(buffer.length)} (${mimeType}), saving`);

  const saved = await getStorage().save(buffer, {
    folder: "flyers",
    ext: extByMime(mimeType),
    mimeType,
  });
  log.ok(`saved ${saved.path} (${fmtBytes(buffer.length)})`);
  return saved;
}
