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
│   │   ├── api/                 # REST API (Firestore-backed)
│   │   └── e/[slug]/            # Public event landing pages
│   ├── components/
│   ├── lib/
│   │   ├── firebase/            # Client SDK + Admin
│   │   ├── firestore/           # Collection helpers, serializers, queries
│   │   └── api.ts
│   ├── services/ai/             # Gemini integration
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

All routes read from Firestore. Set `DEV_USER_ID` in `.env.local` so unauthenticated requests are treated as a single dev user during local development; remove it in production once Firebase Auth is wired into the client.

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
