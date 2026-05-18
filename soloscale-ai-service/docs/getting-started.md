# Getting started

## Prerequisites

- **Node.js 20+**
- **Google AI Studio API key** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **ElevenLabs API key** — [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)
- **Windows:** `curl.exe` on PATH (used by default for outbound HTTP; see [Troubleshooting](./troubleshooting.md))

## Install and run

```bash
cd soloscale-ai-service
cp .env.example .env
# Minimum: SS_AI_SERVICE_GEMINI_API_KEY + SS_AI_SERVICE_ELEVENLABS_API_KEY + SS_AI_SERVICE_PIXAZO_API_KEY
npm install
npm run dev
```

Open **http://localhost:4000/** for the built-in dev console.

Production-style run:

```bash
npm run build
npm start
```

## Environment variables

Use **`SS_AI_SERVICE_*`** names from `.env.example` so keys never clash with the Next.js `.env.example` in the same monorepo (e.g. importing env into **Vercel**). The runtime still accepts **legacy names** (`GEMINI_API_KEY`, `ELEVENLABS_*`, …) if you omit the prefixed vars (handy for existing Render setups).

Copy from `.env.example`. Required keys:

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `SS_AI_SERVICE_GEMINI_API_KEY` | Yes | Strategy (text) + image fallback |
| `SS_AI_SERVICE_PIXAZO_API_KEY` | Yes | Flyer images (Flux 1 Schnell) |
| `SS_AI_SERVICE_ELEVENLABS_API_KEY` | Yes | Voice-over TTS |

Common optional settings:

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PORT` | `4000` | HTTP port |
| `PUBLIC_BASE_URL` | `http://localhost:PORT` | Base URL in saved asset links |
| `STORAGE_DRIVER` | `local` | `local` writes to `./uploads` |
| `SS_AI_SERVICE_GEMINI_TEXT_MODEL` | `gemini-2.5-flash` | Strategy model only |
| `SS_AI_SERVICE_GEMINI_IMAGE_API_KEYS` | _(empty)_ | Comma-separated keys for flyer gen only |
| `SS_AI_SERVICE_ELEVENLABS_VOICE_ID` | Rachel | Default voice when no `voiceName` sent |
| `SS_AI_SERVICE_ELEVENLABS_MODEL_ID` | `eleven_multilingual_v2` | TTS model |
| `SS_AI_SERVICE_ELEVENLABS_OUTPUT_FORMAT` | `mp3_44100_128` | MP3 output |
| `USE_CURL_FETCH` | `true` | Use `curl.exe` for HTTP (Windows workaround) |

**Image model:** Flyers always use **`gemini-2.5-flash-image`** (“Nano Banana”). It is not overridable via env.

**Voices in the UI:** The app uses **voice names** (e.g. `Rachel`), not IDs. IDs are resolved server-side from ElevenLabs. Default voice ID comes from `SS_AI_SERVICE_ELEVENLABS_VOICE_ID`.

## Verify the server

```bash
curl http://localhost:4000/health
```

Expect `status: "ok"` and `keyPools` showing strategy/image pool sizes.

## npm scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Hot reload (`tsx watch`, watches `.env`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run `dist/server.js` |
| `npm run typecheck` | Type-check without emit |

## Deploy on Render

Monorepo: set **Root Directory** to `soloscale-ai-service` (or use the repo-root `render.yaml`).

| Setting | Value |
| ------- | ----- |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check | `/health` |

`dist/` is not committed; the build **must** run `tsc`. Set `USE_CURL_FETCH=false` and `PUBLIC_BASE_URL` to your Render URL.

## Team integration

| Role | Responsibility |
| ---- | ---------------- |
| **Dev 1 (this service)** | AI generation APIs, local asset storage |
| **Dev 2** | Next.js backend, Supabase, persist `CampaignStrategy` + asset paths |
| **Dev 3** | Dashboard UI, calendar, campaign builder |

This service is **stateless**: it returns JSON and file URLs; Dev 2 stores them in the database.
