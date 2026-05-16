import { config } from "../../config";
import { VoiceoverRequest } from "../../schemas/requests";
import { SavedAsset, getStorage } from "../../storage";
import { fmtBytes, fmtMs, logger } from "../../utils/logger";
import { withRetry } from "../gemini/withRetry";
import { resolveVoiceIdByName } from "./voicesService";

export interface VoiceoverAsset extends SavedAsset {
  durationMs: number;
}

const EL_BASE = "https://api.elevenlabs.io/v1";

function extByOutputFormat(fmt: string): { ext: string; mimeType: string } {
  if (fmt.startsWith("mp3")) return { ext: "mp3", mimeType: "audio/mpeg" };
  if (fmt.startsWith("pcm")) return { ext: "pcm", mimeType: "audio/L16" };
  if (fmt.startsWith("ulaw")) return { ext: "ulaw", mimeType: "audio/basic" };
  return { ext: "mp3", mimeType: "audio/mpeg" };
}

/**
 * Best-effort duration estimate from MP3 byte length.
 * At 128 kbps CBR that's ~16,000 bytes/sec of playback. Good enough for UI.
 */
function estimateMp3DurationMs(bytes: number, format: string): number {
  if (!format.startsWith("mp3")) return 0;
  const kbpsMatch = /mp3_\d+_(\d+)/.exec(format);
  const kbps = kbpsMatch ? Number(kbpsMatch[1]) : 128;
  const bytesPerSec = (kbps * 1000) / 8;
  if (bytesPerSec === 0) return 0;
  return Math.round((bytes / bytesPerSec) * 1000);
}

interface ElevenLabsErrorBody {
  detail?: { status?: string; message?: string } | string;
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as ElevenLabsErrorBody;
    if (typeof parsed.detail === "string") return parsed.detail;
    if (parsed.detail?.message) return parsed.detail.message;
  } catch {
    /* fall through */
  }
  return text.slice(0, 300) || `HTTP ${response.status}`;
}

async function synthesizeSpeech(voiceId: string, script: string): Promise<Buffer> {
  const url = `${EL_BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(config.elevenlabs.outputFormat)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": config.elevenlabs.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: script,
      model_id: config.elevenlabs.modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(`ElevenLabs ${response.status}: ${message}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function generateVoiceover(
  input: VoiceoverRequest,
): Promise<VoiceoverAsset> {
  const log = logger("tts");
  const { voiceId, displayName } = await resolveVoiceIdByName(input.voiceName);
  log.start(
    `calling ElevenLabs (model=${config.elevenlabs.modelId}, voice="${displayName}", script ${input.script.length} chars)`,
  );

  let buffer: Buffer;
  try {
    buffer = await withRetry(() => synthesizeSpeech(voiceId, input.script), {
      label: "elevenlabs.tts",
      retries: 2,
      baseDelayMs: 1500,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.fail(msg);
    throw err instanceof Error ? err : new Error(msg);
  }
  const durationMs = estimateMp3DurationMs(buffer.length, config.elevenlabs.outputFormat);
  log.info(`received ${fmtBytes(buffer.length)} audio (~${fmtMs(durationMs)}), saving`);

  const { ext, mimeType } = extByOutputFormat(config.elevenlabs.outputFormat);
  const saved = await getStorage().save(buffer, {
    folder: "voiceovers",
    ext,
    mimeType,
  });
  log.ok(`saved ${saved.path} (${fmtBytes(buffer.length)}, ~${fmtMs(durationMs)})`);

  return { ...saved, durationMs };
}
