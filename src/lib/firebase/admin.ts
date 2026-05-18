import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFileSync } from "fs";
import { isFirebaseConfigured } from "./config";

let adminApp: App | undefined;

/**
 * Server-only Firebase Admin (Dev 2).
 * Use in API routes when mock mode is off.
 */
export function getFirebaseAdmin() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }

  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length) {
    adminApp = existing[0];
    return adminApp;
  }

  let serviceAccount;

  // Try to get service account from JSON env var first
  const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonStr) {
    try {
      serviceAccount = JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON. " +
          "Use the full service-account JSON as a single minified line.",
      );
    }
  } else {
    // Try to read from file path
    const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (path) {
      try {
        serviceAccount = JSON.parse(readFileSync(path, "utf8"));
      } catch (err) {
        console.warn(`[Firebase Admin] Could not read service account from ${path}:`, err);
      }
    }
  }

  if (serviceAccount) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Firebase Admin has no service account in production. " +
        "Set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel (full JSON, one line) " +
        "or a valid FIREBASE_SERVICE_ACCOUNT_PATH for hosts that expose a file.",
    );
  } else {
    // Local dev: ADC or emulator-friendly init when no JSON/path (Firestore may still fail).
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  return adminApp;
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdmin());
}

export function getAdminDb() {
  return getFirestore(getFirebaseAdmin());
}

export function getAdminStorage() {
  return getStorage(getFirebaseAdmin());
}
