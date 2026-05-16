import type { Timestamp } from "firebase/firestore";
import type { PlanId } from "@/types/billing";

/** `users/{uid}` — uid matches Firebase Auth. */
export type User = {
  email: string;
  name: string;
  avatar_url: string | null;
  plan_id: PlanId;
  subscription_id: string | null;
  default_payment_method_id: string | null;
  stripe_customer_id: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type UserWithId = User & { id: string };
