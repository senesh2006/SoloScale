# Architecture

## High-level diagram

```
┌─────────────┐     HTTP/JSON      ┌──────────────────────────────────┐
│ Dev console │ ◄────────────────► │  Express (soloscale-ai-service)   │
│ public/     │                    │  Routes /api/*  +  Middleware      │
└─────────────┘                    │  Services: Gemini + ElevenLabs   │
                                   │  StorageAdapter → ./uploads/     │
┌─────────────┐                    └──────────┬───────────────────────┘
│ Dev 2 app   │ ◄─────────────────────────────┘
└─────────────┘                              │
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        ▼
            Google Gemini API         ElevenLabs API           (future Supabase)
```

## Request pipeline

1. **CORS** + JSON body parser (1 MB limit)
2. **Request logger** — per-request ID for `POST /api/*`
3. **Route handler** — Zod validation
4. **Service layer** — external APIs + file save
5. **Error handler** — JSON error responses

## AI providers

| Feature | Provider | Model / API | Source file |
| ------- | -------- | ----------- | ----------- |
| Strategy | Google Gemini | `gemini-2.5-flash` | `strategyService.ts` |
| Flyer | Google Gemini | `gemini-2.5-flash-image` (fixed) | `imageService.ts` |
| Voice-over | ElevenLabs | `POST /v1/text-to-speech/{id}` | `ttsService.ts` |
| Voice catalog | ElevenLabs | `GET /v1/voices` | `voicesService.ts` |

Flyers use **`generateContent`** with `responseModalities: [IMAGE]`, not Imagen’s `generateImages`.

## API key pools

Implemented in `keyPool.ts` via `tryAcrossKeys`:

- Round-robin start index per pool
- On **HTTP 429** → next key
- On **transient network error** → next key (after `withRetry` on current key)

| Pool | Keys | Used for |
| ---- | ---- | -------- |
| **Image** | `GEMINI_IMAGE_API_KEYS` or `GEMINI_API_KEY` | `/api/flyer` only |
| **Strategy** | `GEMINI_API_KEY` + image pool keys (deduped) | `/api/strategy`; main key first |

## HTTP transport (Windows)

When `USE_CURL_FETCH` is not `false`, `httpAgent.ts` installs `curlFetch` as `globalThis.fetch`. Request bodies go through temp files so curl sends `Content-Length` (required by ElevenLabs).

## Storage

```ts
interface StorageAdapter {
  save(buffer, { folder, ext, mimeType }): Promise<{ url, path, mimeType }>;
  getUrl(path): string;
  delete(path): Promise<void>;
}
```

`LocalStorageAdapter` → `./uploads/flyers/`, `./uploads/voiceovers/`. URLs use `PUBLIC_BASE_URL`.

## Logging

`utils/logger.ts` — AsyncLocalStorage request IDs, structured terminal lines per phase.

## Statelessness

No database. Dev 2 persists `CampaignStrategy` and asset `path` from API responses.

## Project layout

```
src/
├── server.ts
├── config.ts
├── routes/           strategy, flyer, voiceover, voices, campaign
├── services/
│   ├── gemini/       client, strategyService, imageService, keyPool, withRetry, models
│   ├── elevenlabs/   ttsService, voicesService
│   └── prompts/      strategyPrompt.ts
├── storage/
├── schemas/          campaign.ts, requests.ts
├── middleware/       errorHandler.ts
├── curlFetch.ts
├── httpAgent.ts
└── utils/            logger, asyncHandler
public/index.html
uploads/
docs/
```
