# Firestore schema (Dev 2)

Collections mirror the TypeScript types in `src/types/campaign.ts`.

## `campaigns/{campaignId}`

| Field | Type | Notes |
|-------|------|-------|
| `user_id` | string | Firebase Auth UID |
| `title` | string | |
| `goal_prompt` | string | |
| `status` | string | `draft` \| `strategy_ready` \| `assets_ready` \| `published` |
| `strategy_json` | map \| null | Campaign strategy from Gemini |
| `event_id` | string \| null | Reference to `events` doc id |
| `created_at` | timestamp | |

## `events/{eventId}`

| Field | Type | Notes |
|-------|------|-------|
| `campaign_id` | string | |
| `slug` | string | Unique, used in `/e/[slug]` |
| `published` | boolean | |
| `landing` | map | `{ headline, subhead, body_md }` |
| `form_fields` | array | Form field definitions |
| `attendee_count` | number | Increment on registration |
| `created_at` | timestamp | |

## `assets/{assetId}`

| Field | Type | Notes |
|-------|------|-------|
| `campaign_id` | string | |
| `kind` | string | `flyer` \| `voiceover` |
| `status` | string | `pending` \| `processing` \| `ready` \| `failed` |
| `url` | string \| null | Storage download URL |
| `thumbnail_url` | string \| null | Optional |

## `attendees/{attendeeId}`

| Field | Type | Notes |
|-------|------|-------|
| `event_id` | string | |
| `name` | string | |
| `email` | string | |
| `created_at` | timestamp | |

## Storage paths

```
campaigns/{userId}/{campaignId}/flyer.png
campaigns/{userId}/{campaignId}/voiceover.mp3
```

Deploy rules from the repo root (after `firebase init`):

```bash
firebase deploy --only firestore:rules,storage
```
