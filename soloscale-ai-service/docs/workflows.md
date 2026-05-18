# Workflows

Step-by-step behavior for each endpoint.

---

## `POST /api/strategy`

1. Validate body (`goal`, optional `eventDate`, `audience`, `durationDays`).
2. Build user prompt via `buildStrategyUserPrompt()` in `strategyPrompt.ts`.
3. Call Gemini `generateContent`:
   - Model: `SS_AI_SERVICE_GEMINI_TEXT_MODEL` (legacy `GEMINI_TEXT_MODEL`; default `gemini-2.5-flash`)
   - System: `STRATEGY_SYSTEM_INSTRUCTION`
   - `responseMimeType: application/json` + `responseSchema`
4. Rotate API keys on 429 (strategy pool).
5. Parse JSON → Zod `CampaignStrategySchema`.
6. Return `{ strategy }`.

**Output:** JSON only (no files). **Failure:** whole request fails.

---

## `POST /api/flyer`

1. Validate `prompt`, optional `headline`, `subtext`.
2. `buildFlyerPrompt()` in `imageService.ts`.
3. Gemini `generateContent`:
   - Model: **`gemini-2.5-flash-image`**
   - `responseModalities: [IMAGE]`, `aspectRatio: "9:16"`
4. Rotate image API keys on 429 / transient errors.
5. Extract `inlineData` (base64 image) from response.
6. Save to `uploads/flyers/{uuid}.{ext}`.
7. Return `{ asset: { url, path, mimeType } }`.

---

## `GET /api/voices`

1. Fetch ElevenLabs `/v1/voices` (cached 5 minutes).
2. Return sorted `{ name }` list + `defaultVoiceName` from env (`SS_AI_SERVICE_ELEVENLABS_VOICE_ID` or legacy `ELEVENLABS_VOICE_ID`).

---

## `POST /api/voiceover`

1. Validate `script`, optional `voiceName`.
2. `resolveVoiceIdByName(voiceName)` — empty → env default.
3. ElevenLabs TTS → MP3 bytes.
4. Estimate `durationMs`, save to `uploads/voiceovers/`.
5. Return `{ asset }`.

---

## `POST /api/campaign`

### Phase 1 — Strategy (blocking)

Same as `/api/strategy`. Failure aborts entire request.

### Phase 2 — Hero selection

| Asset | Pick order |
| ----- | ---------- |
| Flyer | `suggestedFlyerPrompt` → `type === "image"` → first post |
| Voice | `suggestedVoiceoverScript` → `type === "reel"` → first post |

Build flyer + voice inputs via `flyerPromptFor()` / `voiceoverScriptFor()`.

### Phase 3 — Parallel assets

`Promise.allSettled` on `generateFlyer` + `generateVoiceover`.

- Success → `assets.flyer` / `assets.voiceover`
- Failure → `null` + `flyerError` / `voiceoverError` string
- HTTP **200** even if assets fail

---

## Dev console (`public/index.html`)

1. Load `GET /health`, `GET /api/voices` → voice dropdowns.
2. Individual panels or **Run Full Campaign** → `POST /api/campaign`.
3. Renders strategy timeline, hero image, hero audio.
