/** Centralized Firestore collection names. Mirrors `docs/firestore-schema.md`. */
export const COLLECTIONS = {
  users: "users",
  campaigns: "campaigns",
  events: "events",
  assets: "assets",
  attendees: "attendees",
  announcements: "announcements",
  form_responses: "form_responses",
  subscriptions: "subscriptions",
  payment_methods: "payment_methods",
  invoices: "invoices",
  payments: "payments",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
