# SoloScale

AI-powered content and event SaaS — strategy, assets, and registration in one dashboard.

## Team ownership

| Area | Owner | Path |
|------|-------|------|
| AI (Gemini, image, TTS) | Dev 1 | `src/services/ai/` |
| Backend, Supabase, public events | Dev 2 | `src/app/api/`, `supabase/`, `src/app/e/` |
| Dashboard & UX | Dev 3 | `src/app/(dashboard)/`, `src/components/` |

## Project structure

```
soloscale/
├── src/
│   ├── app/
│   │   ├── (auth)/login, signup
│   │   ├── (dashboard)/dashboard/...
│   │   ├── api/                 # REST API (mock store by default)
│   │   └── e/[slug]/            # Public event landing pages
│   ├── components/
│   ├── lib/                     # Supabase clients, mock store, api helper
│   ├── mocks/
│   ├── services/ai/             # Dev 1 stubs
│   └── types/
├── supabase/migrations/
└── docs/api-samples/
```

## Setup (after clone)

```bash
cd soloscale
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Mock mode** is on by default (`NEXT_PUBLIC_USE_MOCKS=true`). APIs use an in-memory store — no Supabase or AI keys required for the hackathon demo.

## Demo flow

1. `/dashboard/campaigns/new` — submit goal → strategy generates (~1s)
2. Campaign detail — **Generate assets** → flyer + audio (~2s)
3. **Publish event** → visit `/e/{slug}` and register
4. Dashboard shows attendee count (polls every 3s)

## Environment

See `.env.example` for Supabase and AI API keys.
