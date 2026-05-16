# Troubleshooting

## Port in use (`EADDRINUSE`)

```powershell
Get-NetTCPConnection -LocalPort 4000 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
npm run dev
```

## `.env` changes not applied

`npm run dev` watches `.env` via `tsx watch --include=.env`. Save the file or restart the server.

## Gemini HTTP 429

| Model | Typical issue |
| ----- | ------------- |
| `gemini-2.5-flash` | ~20 requests/day per project (free tier) |
| `gemini-2.5-flash-image` | Often zero free quota without billing |

**Fixes:**

- Set `GEMINI_IMAGE_API_KEYS` from **separate** Google Cloud projects
- Strategy auto-falls back to image-pool keys when main key is exhausted
- Enable billing on AI Studio / GCP project
- Wait for daily quota reset

Check: `curl http://localhost:4000/health` → `keyPools`.

## Flyer fails, strategy works

Image quota is separate. All image keys may be rate-limited or on projects without image entitlement.

## `fetch failed` / ECONNRESET / curl 56

Keep `USE_CURL_FETCH=true` (default on Windows). Uses `curl.exe` instead of Node’s TLS stack.

## Voices not loading in UI

- Check `ELEVENLABS_API_KEY`
- Test: `curl http://localhost:4000/api/voices`
- Ensure server is running

## Unknown voice name

Use a name from `GET /api/voices`. Omit `voiceName` for default (`ELEVENLABS_VOICE_ID`).

## Campaign 200 but null assets

Read `assets.flyerError` and `assets.voiceoverError` — partial success is intentional.

## Reading terminal logs

```
[strategy]  ..  attempt 2/3 using strategy#2/3 (AIza...q90o)
[flyer]     ..  image#1/2 returned HTTP 429, rotating to next key
```

Shows key rotation and which phase failed.
