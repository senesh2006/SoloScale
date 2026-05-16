import { config } from "../../config";
import { logger } from "../../utils/logger";

const EL_VOICES = "https://api.elevenlabs.io/v1/voices";
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface VoiceOption {
  name: string;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
}

interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[];
}

interface VoiceCache {
  /** Display name → voice_id (first wins on duplicate names). */
  byName: Map<string, string>;
  /** voice_id → display name */
  idToName: Map<string, string>;
  fetchedAt: number;
}

let cache: VoiceCache | null = null;

async function fetchVoicesFromApi(): Promise<VoiceCache> {
  const log = logger("elevenlabs.voices");
  log.info("fetching voice catalog from ElevenLabs");

  const response = await fetch(EL_VOICES, {
    headers: { "xi-api-key": config.elevenlabs.apiKey },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `ElevenLabs voices ${response.status}: ${text.slice(0, 200) || response.statusText}`,
    );
  }

  const data = (await response.json()) as ElevenLabsVoicesResponse;
  const byName = new Map<string, string>();
  const idToName = new Map<string, string>();

  for (const v of data.voices ?? []) {
    if (!v.voice_id || !v.name?.trim()) continue;
    const name = v.name.trim();
    const key = name.toLowerCase();
    if (!byName.has(key)) byName.set(key, v.voice_id);
    idToName.set(v.voice_id, name);
  }

  log.ok(`${byName.size} voices loaded`);
  return { byName, idToName, fetchedAt: Date.now() };
}

async function getCache(): Promise<VoiceCache> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }
  cache = await fetchVoicesFromApi();
  return cache;
}

/** Sorted voice names for UI dropdowns (no IDs exposed). */
export async function listVoiceNames(): Promise<{
  voices: VoiceOption[];
  defaultVoiceName: string;
}> {
  const { byName, idToName } = await getCache();
  const defaultVoiceName =
    idToName.get(config.elevenlabs.voiceId) ?? "Rachel";

  const names = [...new Set(idToName.values())].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  return {
    voices: names.map((name) => ({ name })),
    defaultVoiceName,
  };
}

/**
 * Resolve a human-readable voice name to an ElevenLabs voice_id.
 * Empty / omitted → `ELEVENLABS_VOICE_ID` from env.
 */
export async function resolveVoiceIdByName(
  voiceName?: string,
): Promise<{ voiceId: string; displayName: string }> {
  const trimmed = voiceName?.trim();
  if (!trimmed) {
    const { idToName } = await getCache();
    const displayName =
      idToName.get(config.elevenlabs.voiceId) ?? "default";
    return { voiceId: config.elevenlabs.voiceId, displayName };
  }

  const { byName, idToName } = await getCache();
  const voiceId = byName.get(trimmed.toLowerCase());
  if (!voiceId) {
    const available = [...idToName.values()].sort().slice(0, 12).join(", ");
    throw new Error(
      `Unknown voice name "${trimmed}". Pick one from your ElevenLabs account` +
        (available ? ` (e.g. ${available}...)` : "."),
    );
  }

  return {
    voiceId,
    displayName: idToName.get(voiceId) ?? trimmed,
  };
}
