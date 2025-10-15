export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      practices: {
        Row: {
          claim_window_minutes: number;
          confirmation_template: string;
          created_at: string;
          default_duration_minutes: number;
          id: string;
          invite_template: string;
          name: string;
          recipients_per_wave: number;
          resend_cooldown_minutes: number;
          taken_template: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          claim_window_minutes?: number;
          confirmation_template?: string;
          created_at?: string;
          default_duration_minutes?: number;
          id?: string;
          invite_template?: string;
          name: string;
          recipients_per_wave?: number;
          resend_cooldown_minutes?: number;
          taken_template?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          claim_window_minutes?: number;
          confirmation_template?: string;
          created_at?: string;
          default_duration_minutes?: number;
          id?: string;
          invite_template?: string;
          name?: string;
          recipients_per_wave?: number;
          resend_cooldown_minutes?: number;
          taken_template?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          practice_id: string;
          role: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          practice_id: string;
          role?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          practice_id?: string;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_practice_id_fkey";
            columns: ["practice_id"];
            referencedRelation: "practices";
            referencedColumns: ["id"];
          }
        ];
      };
      waitlist_members: {
        Row: {
          active: boolean;
          address: string;
          channel: "whatsapp" | "sms" | "email";
          created_at: string;
          full_name: string;
          id: string;
          last_notified_at: string | null;
          notes: string | null;
          practice_id: string;
          priority: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          address: string;
          channel: "whatsapp" | "sms" | "email";
          created_at?: string;
          full_name: string;
          id?: string;
          last_notified_at?: string | null;
          notes?: string | null;
          practice_id: string;
          priority?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          address?: string;
          channel?: "whatsapp" | "sms" | "email";
          created_at?: string;
          full_name?: string;
          id?: string;
          last_notified_at?: string | null;
          notes?: string | null;
          practice_id?: string;
          priority?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "waitlist_members_practice_id_fkey";
            columns: ["practice_id"];
            referencedRelation: "practices";
            referencedColumns: ["id"];
          }
        ];
      };
      slots: {
        Row: {
          claimed_at: string | null;
          claimed_claim_id: string | null;
          claim_window_minutes: number;
          created_at: string;
          duration_minutes: number;
          expires_at: string;
          id: string;
          notes: string | null;
          practice_id: string;
          released_by: string | null;
          start_at: string;
          status: "open" | "claimed" | "booked" | "expired";
          updated_at: string;
          wave_number: number;
        };
        Insert: {
          claimed_at?: string | null;
          claimed_claim_id?: string | null;
          claim_window_minutes: number;
          created_at?: string;
          duration_minutes: number;
          expires_at: string;
          id?: string;
          notes?: string | null;
          practice_id: string;
          released_by?: string | null;
          start_at: string;
          status?: "open" | "claimed" | "booked" | "expired";
          updated_at?: string;
          wave_number?: number;
        };
        Update: {
          claimed_at?: string | null;
          claimed_claim_id?: string | null;
          claim_window_minutes?: number;
          created_at?: string;
          duration_minutes?: number;
          expires_at?: string;
          id?: string;
          notes?: string | null;
          practice_id?: string;
          released_by?: string | null;
          start_at?: string;
          status?: "open" | "claimed" | "booked" | "expired";
          updated_at?: string;
          wave_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "slots_practice_id_fkey";
            columns: ["practice_id"];
            referencedRelation: "practices";
            referencedColumns: ["id"];
          }
        ];
      };
      claims: {
        Row: {
          created_at: string;
          id: string;
          notified_at: string;
          practice_id: string;
          response_body: string | null;
          response_received_at: string | null;
          slot_id: string;
          status: "pending" | "won" | "lost" | "expired" | "cancelled";
          updated_at: string;
          waitlist_member_id: string;
          wave_number: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notified_at?: string;
          practice_id: string;
          response_body?: string | null;
          response_received_at?: string | null;
          slot_id: string;
          status?: "pending" | "won" | "lost" | "expired" | "cancelled";
          updated_at?: string;
          waitlist_member_id: string;
          wave_number: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          notified_at?: string;
          practice_id?: string;
          response_body?: string | null;
          response_received_at?: string | null;
          slot_id?: string;
          status?: "pending" | "won" | "lost" | "expired" | "cancelled";
          updated_at?: string;
          waitlist_member_id?: string;
          wave_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "claims_practice_id_fkey";
            columns: ["practice_id"];
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claims_slot_id_fkey";
            columns: ["slot_id"];
            referencedRelation: "slots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claims_waitlist_member_id_fkey";
            columns: ["waitlist_member_id"];
            referencedRelation: "waitlist_members";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          attempt: number;
          body: string;
          channel: "whatsapp" | "sms" | "email";
          claim_id: string | null;
          created_at: string;
          direction: "outbound" | "inbound";
          error: string | null;
          external_message_id: string | null;
          id: string;
          metadata: Json | null;
          practice_id: string;
          sent_at: string | null;
          slot_id: string | null;
          status: "queued" | "sent" | "failed" | "received";
          template_key: string | null;
          updated_at: string;
          waitlist_member_id: string | null;
        };
        Insert: {
          attempt?: number;
          body: string;
          channel: "whatsapp" | "sms" | "email";
          claim_id?: string | null;
          created_at?: string;
          direction: "outbound" | "inbound";
          error?: string | null;
          external_message_id?: string | null;
          id?: string;
          metadata?: Json | null;
          practice_id: string;
          sent_at?: string | null;
          slot_id?: string | null;
          status?: "queued" | "sent" | "failed" | "received";
          template_key?: string | null;
          updated_at?: string;
          waitlist_member_id?: string | null;
        };
        Update: {
          attempt?: number;
          body?: string;
          channel?: "whatsapp" | "sms" | "email";
          claim_id?: string | null;
          created_at?: string;
          direction?: "outbound" | "inbound";
          error?: string | null;
          external_message_id?: string | null;
          id?: string;
          metadata?: Json | null;
          practice_id?: string;
          sent_at?: string | null;
          slot_id?: string | null;
          status?: "queued" | "sent" | "failed" | "received";
          template_key?: string | null;
          updated_at?: string;
          waitlist_member_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_practice_id_fkey";
            columns: ["practice_id"];
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_slot_id_fkey";
            columns: ["slot_id"];
            referencedRelation: "slots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_claim_id_fkey";
            columns: ["claim_id"];
            referencedRelation: "claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_waitlist_member_id_fkey";
            columns: ["waitlist_member_id"];
            referencedRelation: "waitlist_members";
            referencedColumns: ["id"];
          }
        ];
      };
      webhook_events: {
        Row: {
          headers: Json | null;
          id: string;
          payload: Json;
          practice_id: string | null;
          provider: string;
          received_at: string;
        };
        Insert: {
          headers?: Json | null;
          id?: string;
          payload: Json;
          practice_id?: string | null;
          provider: string;
          received_at?: string;
        };
        Update: {
          headers?: Json | null;
          id?: string;
          payload?: Json;
          practice_id?: string | null;
          provider?: string;
          received_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_events_practice_id_fkey";
            columns: ["practice_id"];
            referencedRelation: "practices";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      attempt_claim: {
        Args: {
          _practice_id: string;
          _slot_id: string;
          _claim_id: string;
          _response: string | null;
        };
        Returns: {
          claim_id: string;
          won: boolean;
        }[];
      };
      release_slot: {
        Args: {
          _practice_id: string;
          _start_at: string;
          _duration_minutes: number;
          _notes: string | null;
          _claim_window_minutes: number;
          _wave_size: number;
          _released_by: string | null;
          _timezone: string;
        };
        Returns: {
          slot_id: string;
          claim_id: string;
          waitlist_member_id: string;
          wave_number: number;
        }[];
      };
      expire_open_slots: {
        Args: never;
        Returns: Database["public"]["Tables"]["slots"]["Row"][];
      };
      current_practice_id: {
        Args: never;
        Returns: string | null;
      };
    };
    Enums: {
      contact_channel: "whatsapp" | "sms" | "email";
      slot_status: "open" | "claimed" | "booked" | "expired";
      claim_status: "pending" | "won" | "lost" | "expired" | "cancelled";
      message_direction: "outbound" | "inbound";
      message_status: "queued" | "sent" | "failed" | "received";
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
