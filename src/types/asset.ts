import { Timestamp } from "firebase-admin/firestore";
import { TextStructure } from "@/types/event";

export type AssetKind = "flyer" | "voiceover";
export type AssetStatus = "pending" | "processing" | "ready" | "failed";

export type Asset = {
  id: string;
  campaign_id: string;
  kind: AssetKind;
  status: AssetStatus;
  url: string | null;
  thumbnail_url?: string;
  error_message?: string;
  user_id: string;
  event_id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  content_text: TextStructure;
};