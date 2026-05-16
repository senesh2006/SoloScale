import type { Firestore } from "firebase-admin/firestore";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // base-32, no 0/1/I/O

function generate(): string {
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `TKT-${out.slice(0, 4)}-${out.slice(4)}`;
}

/**
 * Generates a globally unique ticket code by checking the `attendees` collection
 * and retrying on collision (32^8 ≈ 1 trillion combinations — collisions are rare).
 */
export async function generateUniqueTicketCode(
  db: Firestore,
  maxAttempts = 5,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generate();
    const dup = await db
      .collection("attendees")
      .where("ticket_code", "==", code)
      .limit(1)
      .get();
    if (dup.empty) return code;
  }
  throw new Error("Could not generate a unique ticket code after retries");
}
