# SoloScale

AI-powered content and event SaaS — strategy, assets, and registration in one dashboard.

## Team ownership

| Area | Owner | Path |
|------|-------|------|
| AI (Gemini, image, TTS) | Dev 1 | `src/services/ai/` |
| Backend, Firebase, public events | Dev 2 | `src/app/api/`, `firebase/`, `src/lib/firebase/`, `src/app/e/` |
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
│   ├── lib/
│   │   ├── firebase/            # Client SDK + Admin (Dev 2)
│   │   ├── mock-store.ts
│   │   └── api.ts
│   ├── mocks/
│   ├── services/ai/             # Dev 1 stubs
│   └── types/
├── firebase/                    # Firestore + Storage security rules
└── docs/
    ├── api-samples/
    └── firestore-schema.md
```

## Setup (after clone)

```bash
cd soloscale
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Mock mode** is on by default (`NEXT_PUBLIC_USE_MOCKS=true`). APIs use an in-memory store — no Firebase or AI keys required for the hackathon demo.

## Firebase (Dev 2)

1. Create a project in [Firebase Console](https://console.firebase.google.com).
2. Enable **Authentication** (Email/Password) and **Firestore** + **Storage**.
3. Copy web app config into `.env.local` (`NEXT_PUBLIC_FIREBASE_*`).
4. Generate a service account key for server routes → set `FIREBASE_SERVICE_ACCOUNT_PATH`.
5. Deploy rules: `firebase deploy --only firestore:rules,storage`

See `docs/firestore-schema.md` for collection shapes.

## Demo flow

1. `/dashboard/campaigns/new` — submit goal → strategy generates (~1s)
2. Campaign detail — **Generate assets** → flyer + audio (~2s)
3. **Publish event** → visit `/e/{slug}` and register
4. Dashboard shows attendee count (polls every 3s)

## Environment

See `.env.example` for Firebase and AI API keys.
