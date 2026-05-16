import type { FormField, FormFieldType } from "@/types/shared";
import type {
  FormResponseAnswer,
  FormResponseValue,
} from "@/types/formResponse";

/**
 * Coerce a raw value (typically a string from an `<input>`) into the typed
 * shape the matching `FormFieldType` expects. We intentionally never throw —
 * if a value can't be parsed we fall back to `null` / `""` rather than
 * blocking the registration on a bad client value.
 */
export function coerceFieldValue(
  type: FormFieldType,
  raw: unknown,
): FormResponseValue {
  if (raw === null || raw === undefined) {
    return type === "checkbox" ? false : type === "number" ? null : "";
  }

  switch (type) {
    case "checkbox":
      if (typeof raw === "boolean") return raw;
      if (typeof raw === "string") {
        const lower = raw.toLowerCase();
        return lower === "true" || lower === "on" || lower === "1";
      }
      return Boolean(raw);

    case "number": {
      if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
      if (typeof raw === "string" && raw.trim() !== "") {
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    }

    case "date": {
      if (raw instanceof Date) return raw.toISOString();
      const s = String(raw).trim();
      if (!s) return "";
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? s : d.toISOString();
    }

    default:
      // text, textarea, email, phone, url, select
      return String(raw);
  }
}

/**
 * Build a `FormResponseAnswer[]` from the event's form_fields and a map of
 * { field_id → raw value } the client submitted. Only fields that exist on
 * the event are included; unknown ids in the input are dropped (we trust the
 * server's form schema, not the client's).
 *
 * `label` and `type` are snapshotted from the live event so historical
 * responses stay readable even if the form is later edited.
 */
export function buildAnswersFromFieldValues(
  fields: FormField[],
  values: Record<string, unknown>,
): FormResponseAnswer[] {
  return fields.map((f) => ({
    field_id: f.id,
    label: f.label,
    type: f.type,
    value: coerceFieldValue(f.type, values[f.id]),
  }));
}

/**
 * Validate / normalize a client-supplied `answers` array against the event's
 * form_fields. Authoritative `label` and `type` come from `fields`, not the
 * client — defends against tampering and keeps responses self-describing.
 */
export function normalizeAnswers(
  fields: FormField[],
  answers: unknown,
): FormResponseAnswer[] {
  if (!Array.isArray(answers)) return [];
  const byId = new Map<string, FormField>(fields.map((f) => [f.id, f]));
  const out: FormResponseAnswer[] = [];
  for (const raw of answers) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as { field_id?: unknown; value?: unknown };
    if (typeof r.field_id !== "string") continue;
    const field = byId.get(r.field_id);
    if (!field) continue;
    out.push({
      field_id: field.id,
      label: field.label,
      type: field.type,
      value: coerceFieldValue(field.type, r.value),
    });
  }
  return out;
}

/**
 * Flatten typed answers into a `Record<field_id, string>` cache suitable for
 * `attendees.metadata` (which is intentionally string-only for cheap filters).
 */
export function answersToMetadata(
  answers: FormResponseAnswer[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of answers) {
    out[a.field_id] = stringifyValue(a.value);
  }
  return out;
}

function stringifyValue(v: FormResponseValue): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}
