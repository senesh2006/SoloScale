# Firestore schema (Dev 2)

Collections mirror the TypeScript types in `src/types/campaign.ts`.

## `campaigns/{campaignId}`

| Field | Type | Notes |
|-------|------|-------|
| `createdAt` | timestamp | |
| `goal` | string | |
| `status` | string | `draft` / `strategy_ready` / `assets_ready` / `published` |
| `strategy` | string / null | Campaign strategy from Gemini |
| `title` | string | |
| `userId` | string | ID of Creator of campaign |

## `events/{eventId}`

| Field | Type | Notes |
|-------|------|-------|
| `campaign_id` | string | |
| `createdAt` | timestamp | |
| `description` | string | |
| `eventDate` | timestamp | |
| `formFields` | array | Form field definitions |
| `published` | boolean | |
| `slug` | string | Unique, used in `/e/[slug]` |
| `title` | string | |


## `assets/{assetId}`

| Field | Type | Notes |
|-------|------|-------|
| `assetType` | string | `flyer` / `voiceover` |
| `campaignId` | string | |
| `contentText` | string | |
| `createdAt` | timestamp | |
| `eventID` | string | |
| `fileUrl` | string / null | Storage download URL |
| `thumbnailUrl` | string / null | Optional |
| `title` | string | |

## `attendees/{attendeeId}`

| Field | Type | Notes |
|-------|------|-------|
| `email` | string | |
| `eventId` | string | |
| `fullName` | string | |
| `registeredAt` | timestamp | |

## `users/{userId}`
| Field | Type | Notes |
|-------|------|-------|
| `campaignId` | string | |
| `email` | string | |
| `password` | string | |
| `fullName` | string | |

## Storage paths

```
campaigns/{userId}/{campaignId}/flyer.png
campaigns/{userId}/{campaignId}/voiceover.mp3
```

Deploy rules from the repo root (after `firebase init`):

```bash
firebase deploy --only firestore:rules,storage
```
