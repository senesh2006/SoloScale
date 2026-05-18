# SoloScale AI Service (Developer 1 module)

The AI engine of **SoloScale**: Gemini-powered **campaign strategy**, **flyer images** (`gemini-2.5-flash-image`), and **ElevenLabs voice-overs**, exposed as a standalone Express REST API with swappable file storage.

Standalone and demoable on its own. **Dev 2** integrates these endpoints from the Next.js backend; **Dev 3** drives them from the dashboard.

---

## Documentation

Full documentation lives in **[`docs/`](./docs/README.md)**:

| Guide | Description |
| ----- | ----------- |
| [Getting started](./docs/getting-started.md) | Install, `.env`, run locally |
| [API reference](./docs/api-reference.md) | All endpoints, schemas, errors |
| [Architecture](./docs/architecture.md) | Design, key pools, storage, HTTP |
| [Workflows](./docs/workflows.md) | Step-by-step per endpoint |
| [Prompts](./docs/prompts.md) | Where prompts are defined |
| [Troubleshooting](./docs/troubleshooting.md) | 429, ECONNRESET, voices |

---

## Quick start

```bash
cp .env.example .env
# Prefixed vars (see .env.example): SS_AI_SERVICE_GEMINI_*, PIXAZO, ELEVENLABS
npm install
npm run dev
```

- **Dev console:** http://localhost:4000/
- **Health:** http://localhost:4000/health

---

## What it does

| Endpoint | Description |
| -------- | ----------- |
| `POST /api/strategy` | Multi-post campaign JSON (`CampaignStrategy`) |
| `POST /api/flyer` | One social flyer image (9:16) |
| `GET /api/voices` | ElevenLabs voice **names** for UI dropdowns |
| `POST /api/voiceover` | Script → MP3 (`voiceName` optional) |
| `POST /api/campaign` | Strategy + hero flyer + hero voice-over (demo) |

---

## Environment (minimum)

| Variable | Required |
| -------- | -------- |
| `SS_AI_SERVICE_GEMINI_API_KEY` | Yes |
| `SS_AI_SERVICE_PIXAZO_API_KEY` | Yes |
| `SS_AI_SERVICE_ELEVENLABS_API_KEY` | Yes |

Legacy unprefixed names (`GEMINI_API_KEY`, …) still work when prefixed vars are unset. See [Getting started](./docs/getting-started.md).

**Flyer model:** always `gemini-2.5-flash-image` (not configurable).  
**Voices:** UI uses **names** (e.g. `Rachel`); server maps to ElevenLabs IDs.

---

## Cross-team contract

`CampaignStrategy` in [`src/schemas/campaign.ts`](src/schemas/campaign.ts) — shared with Dev 2 (storage) and Dev 3 (UI). Details in [API reference](./docs/api-reference.md).

---

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Hot reload (watches `.env`) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run production build |
| `npm run typecheck` | Type-check only |

---

## Out of scope (other devs)

- Supabase, auth, events DB (Dev 2)
- Production dashboard / calendar UI (Dev 3)
- Persisting campaigns — this service returns JSON + asset URLs; callers store them
