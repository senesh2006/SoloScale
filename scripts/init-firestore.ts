/**
 * Creates Firestore collections by writing a bootstrap document to each.
 * Loads Firebase config from `.env.local` (see `.env.example`).
 *
 * Usage: npm run firestore:init
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const BOOTSTRAP_ID = "_bootstrap";

const COLLECTIONS = [
  "users",
  "campaigns",
  "events",
  "assets",
  "attendees",
  "announcements",
  "form_responses",
  "subscriptions",
  "payment_methods",
  "invoices",
  "payments",
] as const;

function initAdmin() {
  const existing = getApps();
  if (existing.length) return existing[0]!;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing in .env.local",
    );
  }

  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountPath && existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(
      readFileSync(serviceAccountPath, "utf8"),
    ) as Record<string, string>;
    return initializeApp({
      credential: cert(serviceAccount),
      projectId,
      storageBucket,
    });
  }

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson) as Record<
      string,
      string
    >;
    return initializeApp({
      credential: cert(serviceAccount),
      projectId,
      storageBucket,
    });
  }

  return initializeApp({ projectId, storageBucket });
}

async function main() {
  const app = initAdmin();
  const db = getFirestore(app);
  const now = FieldValue.serverTimestamp();

  console.log(`Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`Initializing ${COLLECTIONS.length} collections…\n`);

  for (const name of COLLECTIONS) {
    const ref = db.collection(name).doc(BOOTSTRAP_ID);
    await ref.set(
      {
        _bootstrap: true,
        note: "Safe to delete — exists only to create the collection in the console.",
        schema_version: 1,
        initialized_at: now,
      },
      { merge: true },
    );
    console.log(`  ✓ ${name}/${BOOTSTRAP_ID}`);
  }

  console.log("\nDone. Collections are visible in the Firebase console.");
  console.log(
    "Remove bootstrap docs when you add real data, or keep them as placeholders.",
  );
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\nFailed to initialize Firestore:", message);
  console.error(`
Credentials required. Add one of these to .env.local:

  FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/serviceAccount.json

  # or inline JSON (single line):
  FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

Download a service account key from Firebase Console → Project settings → Service accounts.
`);
  process.exit(1);
});
