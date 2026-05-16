# API reference

Base URL (local): `http://localhost:4000`

All `POST /api/*` routes accept `Content-Type: application/json` and return JSON unless noted.

## Error format

```json
{
  "error": "ValidationError | GeminiApiError | InternalServerError | ...",
  "message": "Human-readable description",
  "issues": []
}
```

| HTTP | Typical cause |
| ---- | ------------- |
| 400 | Zod validation failed on request body |
| 429 | Gemini quota exceeded |
| 500 | Unexpected error, network failure, ElevenLabs error |

---

## `GET /health`

Liveness and configuration snapshot.

**Response 200**

```json
{
  "status": "ok",
  "service": "soloscale-ai-service",
  "storage": "local",
  "models": {
    "text": "gemini-2.5-flash",
    "image": "gemini-2.5-flash-image",
    "tts": "elevenlabs:eleven_multilingual_v2"
  },
  "keyPools": {
    "strategy": { "size": 3 },
    "image": { "size": 2, "dedicated": true }
  },
  "elevenlabs": {
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "outputFormat": "mp3_44100_128"
  }
}
```

---

## `GET /api/voices`

Lists ElevenLabs voices by **display name** for UI dropdowns. IDs are never exposed.

**Response 200**

```json
{
  "voices": [
    { "name": "Adam" },
    { "name": "Rachel" }
  ],
  "defaultVoiceName": "Rachel"
}
```

Cached for 5 minutes per server process.

---

## `POST /api/strategy`

Generates a structured multi-post **campaign strategy** (Gemini text model).

**Request body**

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `goal` | string | Yes | Min 3 characters |
| `eventDate` | string | No | e.g. `2026-05-22` |
| `audience` | string | No | Target audience |
| `durationDays` | number | No | 1–60, default 14 in prompt |

**Example**

```json
{
  "goal": "Launch my AI dev tool with a webinar next month",
  "eventDate": "2026-06-12",
  "audience": "indie devs",
  "durationDays": 14
}
```

**Response 200**

```json
{
  "strategy": { /* CampaignStrategy — see below */ }
}
```

**Failure:** Entire request fails (no partial data).

---

## `POST /api/flyer`

Generates one marketing **image** via `gemini-2.5-flash-image`, saves to `uploads/flyers/`.

**Request body**

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `prompt` | string | Yes | Visual subject / scene |
| `headline` | string | No | Rendered into image |
| `subtext` | string | No | Supporting line on image |

**Example**

```json
{
  "prompt": "Bold neon workshop flyer with code editor visuals",
  "headline": "React Workshop",
  "subtext": "Friday 7 PM IST"
}
```

**Response 200**

```json
{
  "asset": {
    "url": "http://localhost:4000/uploads/flyers/uuid.png",
    "path": "flyers/uuid.png",
    "mimeType": "image/png"
  }
}
```

**Failure:** Entire request fails.

---

## `POST /api/voiceover`

Converts a script to **MP3** via ElevenLabs.

**Request body**

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `script` | string | Yes | Min 3 characters |
| `voiceName` | string | No | From `GET /api/voices`; omit = env default |

**Example**

```json
{
  "script": "Hey builders! Join us Friday for a deep dive on React.",
  "voiceName": "Adam"
}
```

**Response 200**

```json
{
  "asset": {
    "url": "http://localhost:4000/uploads/voiceovers/uuid.mp3",
    "path": "voiceovers/uuid.mp3",
    "mimeType": "audio/mpeg",
    "durationMs": 18420
  }
}
```

`durationMs` is estimated from file size (not from ElevenLabs metadata).

---

## `POST /api/campaign`

**Orchestrator** for demos: strategy → pick hero posts → flyer + voice-over in parallel.

**Request body**

Same fields as `/api/strategy`, plus:

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `voiceName` | string | No | Hero voice-over voice |

**Example**

```json
{
  "goal": "I'm hosting a virtual workshop on React on Friday. Build my campaign.",
  "eventDate": "2026-05-22",
  "audience": "indie web developers",
  "voiceName": "Rachel"
}
```

**Response 200** (partial success allowed for assets)

```json
{
  "strategy": { /* CampaignStrategy */ },
  "heroes": {
    "flyerPostDay": 3,
    "voiceoverPostDay": 7
  },
  "assets": {
    "flyer": { "url": "...", "path": "...", "mimeType": "image/png" },
    "flyerError": null,
    "voiceover": { "url": "...", "path": "...", "mimeType": "audio/mpeg", "durationMs": 15000 },
    "voiceoverError": null
  }
}
```

- If strategy fails → **HTTP error**, no `strategy` in body.
- If flyer or voice-over fails → HTTP **200** with `null` asset and `*Error` string.

**Hero post selection**

| Asset | Priority |
| ----- | -------- |
| Flyer | First post with `suggestedFlyerPrompt` → first `type: "image"` → first post |
| Voice-over | First post with `suggestedVoiceoverScript` → first `type: "reel"` → first post |

---

## `CampaignStrategy` (cross-team contract)

Defined in `src/schemas/campaign.ts`. Enforced by Gemini `responseSchema` + Zod.

```ts
type CampaignStrategy = {
  goal: string;
  durationDays: number;
  event?: {
    title: string;
    description: string;
    dateISO: string;       // YYYY-MM-DD
    format: "virtual" | "in-person" | "hybrid";
  };
  posts: Array<{
    day: number;             // 1-indexed
    dateISO: string;
    platform: "twitter" | "linkedin" | "instagram" | "reel";
    type: "text" | "image" | "reel";
    headline: string;
    body: string;
    hashtags: string[];      // no leading '#'
    cta?: string;
    suggestedFlyerPrompt?: string;
    suggestedVoiceoverScript?: string;
  }>;
};
```

---

## Static assets

| Path | Description |
| ---- | ----------- |
| `GET /uploads/flyers/*` | Generated images |
| `GET /uploads/voiceovers/*` | Generated MP3s |
| `GET /` | Dev console (`public/index.html`) |
