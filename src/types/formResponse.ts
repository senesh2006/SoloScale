import type { Timestamp } from "firebase/firestore";
import type { FormFieldType } from "@/types/shared";

/**
 * Value an attendee submits for a single form field.
 * Shape depends on the field's `type`:
 *   - text/textarea/email/phone/url/select  → string
 *   - number                                → number
 *   - date                                  → ISO 8601 string
 *   - checkbox                              → boolean
 *   - multi-select (future)                 → string[]
 */
export type FormResponseValue = string | number | boolean | string[] | null;

/**
 * Snapshot of one answer. We snapshot `label` and `type` alongside `value`
 * so the response stays readable even if the event's form_fields change later.
 */
export type FormResponseAnswer = {
  field_id: string;
  label: string;
  type: FormFieldType;
  value: FormResponseValue;
};

/** `form_responses/{responseId}` — Firestore document. */
export type FormResponseDocument = {
  event_id: string;
  campaign_id: string;
  attendee_id: string;
  user_id: string | null;
  email: string;
  name: string;
  answers: FormResponseAnswer[];
  /** Snapshot of the form_fields version this response answered, if you bump it. */
  form_version: number;
  submitted_at: Timestamp;
  updated_at: Timestamp;
};

export type FormResponseDocumentWithId = FormResponseDocument & { id: string };

/** API / mock serialized shape (ISO timestamps). */
export type FormResponse = {
  id: string;
  event_id: string;
  campaign_id: string;
  attendee_id: string;
  user_id?: string | null;
  email: string;
  name: string;
  answers: FormResponseAnswer[];
  form_version?: number;
  submitted_at: string;
  updated_at?: string;
};

/** Input shape for `POST /api/events/:id/responses` (or similar). */
export type FormResponseInput = {
  event_id: string;
  attendee_id: string;
  email: string;
  name: string;
  answers: FormResponseAnswer[];
};
