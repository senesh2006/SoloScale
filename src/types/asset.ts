import type { Timestamp } from "firebase/firestore";

export type AssetKind = "flyer" | "voiceover";
export type AssetStatus = "pending" | "processing" | "ready" | "failed";

/** `assets/{assetId}` — Firestore document (no doc id in body). */
export type AssetDocument = {
  campaign_id: string;
  user_id: string;
  kind: AssetKind;
  status: AssetStatus;
  url: string | null;
  thumbnail_url: string | null;
  error_message: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

/** API / mock serialized asset. */
export type Asset = {
  id: string;
  campaign_id: string;
  kind: AssetKind;
  status: AssetStatus;
  url: string | null;
  thumbnail_url?: string;
  error_message?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  /** Legacy mock fields — not stored in Firestore. */
  label?: string;
  prompt?: string;
  voice_id?: string;
};

export type AssetWithId = Asset;
