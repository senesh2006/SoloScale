import type { Timestamp } from "firebase/firestore";

export type AnnouncementChannel = "email" | "in_app";

/** `announcements/{announcementId}` — Firestore document. */
export type AnnouncementDocument = {
  event_id: string;
  subject: string;
  body: string;
  channel: AnnouncementChannel;
  recipient_count: number;
  sent_at: Timestamp;
  scheduled_for: Timestamp | null;
  created_by: string;
};

export type AnnouncementDocumentWithId = AnnouncementDocument & { id: string };

/** API / mock serialized shape. */
export type Announcement = {
  id: string;
  event_id: string;
  subject: string;
  body: string;
  sent_at: string;
  recipient_count: number;
  channel?: AnnouncementChannel;
  scheduled_for?: string | null;
  created_by?: string;
};
