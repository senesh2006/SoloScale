import { Timestamp } from "firebase/firestore";
import { Payment } from "@/types/billing";
export type Attendee = {
    id: string;
    event_ids: string[];
    email: string;
    name: string;
    ticket_code: string;
    created_at: Timestamp;
    payments: Payment[];
  };