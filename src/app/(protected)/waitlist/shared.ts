export type WaitlistMember = {
  id: string;
  full_name: string;
  channel: "whatsapp" | "sms" | "email";
  address: string;
  priority: number;
  active: boolean; // Deprecated: Will be removed in future migration
  notes: string | null;
  last_notified_at: string | null;
  current_assignment?: BroadcastAssignment | null;
};

export type BroadcastAssignment = {
  broadcast_id: string;
  broadcast_start: string;
  broadcast_status: "draft" | "open" | "claimed" | "booked" | "expired" | "cancelled";
  broadcast_duration: number;
  assigned_at: string;
};

export type Broadcast = {
  id: string;
  start_at: string;
  duration_minutes: number;
  status: "draft" | "open" | "claimed" | "booked" | "expired" | "cancelled";
  notes: string | null;
  wave_number: number;
  expires_at: string | null;
  claim_window_minutes: number;
  created_at: string;
  assigned_count: number;
  notified_count: number;
  pending_count: number;
  winner_name: string | null;
  winner_id: string | null;
};

export type BroadcastPatient = {
  id: string;
  full_name: string;
  channel: "whatsapp" | "sms" | "email";
  address: string;
  priority: number;
  assigned_at: string;
  notified_at: string | null;
  claim_status: "pending" | "won" | "lost" | "expired" | "cancelled" | null;
  wave_number: number | null;
};

export type BroadcastDetail = Broadcast & {
  patients: BroadcastPatient[];
};

export type WaitlistActionState =
  | { status: "idle" }
  | { status: "success"; message: string; member?: WaitlistMember }
  | { status: "error"; message: string };

export type BroadcastActionState =
  | { status: "idle" }
  | { status: "success"; message: string; broadcast?: Broadcast }
  | { status: "error"; message: string }
  | { status: "warning"; message: string };

export function initialWaitlistState(): WaitlistActionState {
  return { status: "idle" };
}

export function initialBroadcastState(): BroadcastActionState {
  return { status: "idle" };
}
