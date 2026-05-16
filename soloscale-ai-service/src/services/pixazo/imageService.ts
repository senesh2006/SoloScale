import { config } from "../../config";
import { FlyerRequest } from "../../schemas/requests";
import { SavedAsset, getStorage } from "../../storage";
import { fmtBytes, logger } from "../../utils/logger";
import { buildFlyerPrompt } from "../flyer/prompt";
import { withRetry } from "../gemini/withRetry";
import {
  PIXAZO_FLYER_ENDPOINT,
  PIXAZO_FLYER_MODEL,
} from "./models";

interface PixazoGenerateResponse {
  output?: string;
  error?: string;
  message?: string;
}

function extFromUrl(url: string): string {
  const path = new URL(url).pathname.toLowerCase();
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "jpg";
  if (path.endsWith(".webp")) return "webp";
  return "png";
}

function mimeFromExt(ext: string): string {
  if (ext === "jpg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "image/png";
}

function pixazoError(status: number, body: string): Error {
  if (status === 401 || status === 403) {
    return new Error(
      "Pixazo rejected the API key (HTTP " +
        status +
        "). Check PIXAZO_API_KEY in .env — copy it from https://api-console.pixazo.ai/api_keys",
    );
  }
  if (status === 429) {
    return new Error(
      "Pixazo free-tier rate limit reached (HTTP 429). Wait a moment or check quota in the Pixazo dashboard.",
    );
  }
  return new Error(
    `Pixazo image generation failed (HTTP ${status}): ${body.slice(0, 300)}`,
  );
}

async function generateWithPixazo(prompt: string): Promise<string> {
  const { apiKey, width, height, numSteps } = config.pixazo;

  const res = await fetch(PIXAZO_FLYER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": apiKey,
    },
    body: JSON.stringify({
      prompt,
      num_steps: numSteps,
      width,
      height,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw pixazoError(res.status, text);
  }

  let data: PixazoGenerateResponse;
  try {
    data = JSON.parse(text) as PixazoGenerateResponse;
  } catch {
    throw new Error(`Pixazo returned non-JSON: ${text.slice(0, 200)}`);
  }

  const outputUrl = data.output?.trim();
  if (!outputUrl) {
    const detail = data.message ?? data.error ?? text.slice(0, 200);
    throw new Error(`Pixazo did not return an image URL. ${detail}`);
  }

  return outputUrl;
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to download Pixazo image (HTTP ${res.status}) from ${url}`,
    );
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const headerMime = res.headers.get("content-type")?.split(";")[0]?.trim();
  const ext = extFromUrl(url);
  const mimeType =
    headerMime && headerMime.startsWith("image/")
      ? headerMime
      : mimeFromExt(ext);
  return { buffer, mimeType };
}

export async function generateFlyer(input: FlyerRequest): Promise<SavedAsset> {
  const log = logger("flyer");
  const prompt = buildFlyerPrompt(input);
  const { width, height, numSteps } = config.pixazo;

  log.start(
    `calling Pixazo ${PIXAZO_FLYER_MODEL} (free) ${width}x${height} steps=${numSteps} ` +
      `(prompt ${fmtBytes(prompt.length)}${input.headline ? `, headline="${input.headline}"` : ""})`,
  );

  const imageUrl = await withRetry(() => generateWithPixazo(prompt), {
    label: "pixazo.image",
    retries: 2,
  });

  log.info(`Pixazo returned image URL, downloading`);
  const { buffer, mimeType } = await withRetry(() => downloadImage(imageUrl), {
    label: "pixazo.download",
    retries: 2,
  });

  log.info(`decoded image ${fmtBytes(buffer.length)} (${mimeType}), saving`);

  const saved = await getStorage().save(buffer, {
    folder: "flyers",
    ext: extFromUrl(imageUrl),
    mimeType,
  });

  log.ok(`saved ${saved.path} (${fmtBytes(buffer.length)})`);
  return saved;
}
