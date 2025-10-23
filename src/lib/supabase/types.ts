export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      booking_notifications: {
        Row: {
          claim_id: string
          company_id: string
          created_at: string
          id: string
        }
        Insert: {
          claim_id: string
          company_id: string
          created_at?: string
          id?: string
        }
        Update: {
          claim_id?: string
          company_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notified_at: string
          practice_id: string | null
          response_body: string | null
          response_received_at: string | null
          slot_id: string
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
          waitlist_member_id: string
          wave_number: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notified_at?: string
          practice_id?: string | null
          response_body?: string | null
          response_received_at?: string | null
          slot_id: string
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          waitlist_member_id: string
          wave_number: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notified_at?: string
          practice_id?: string | null
          response_body?: string | null
          response_received_at?: string | null
          slot_id?: string
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          waitlist_member_id?: string
          wave_number?: number
        }
        Relationships: []
      }
      companies: {
        Row: {
          auto_confirm_bookings: boolean
          claim_window_minutes: number
          confirmation_template: string
          created_at: string
          default_duration_minutes: number
          enable_browser_notifications: boolean
          enable_sound_notifications: boolean
          id: string
          invite_template: string
          name: string
          recipients_per_wave: number
          resend_cooldown_minutes: number
          slug: string
          taken_template: string
          timezone: string
          updated_at: string
        }
        Insert: {
          auto_confirm_bookings?: boolean
          claim_window_minutes?: number
          confirmation_template?: string
          created_at?: string
          default_duration_minutes?: number
          enable_browser_notifications?: boolean
          enable_sound_notifications?: boolean
          id?: string
          invite_template?: string
          name: string
          recipients_per_wave?: number
          resend_cooldown_minutes?: number
          slug: string
          taken_template?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          auto_confirm_bookings?: boolean
          claim_window_minutes?: number
          confirmation_template?: string
          created_at?: string
          default_duration_minutes?: number
          enable_browser_notifications?: boolean
          enable_sound_notifications?: boolean
          id?: string
          invite_template?: string
          name?: string
          recipients_per_wave?: number
          resend_cooldown_minutes?: number
          slug?: string
          taken_template?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string
          practice_id: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          practice_id?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          practice_id?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      slots: {
        Row: {
          claim_window_minutes: number
          claimed_at: string | null
          claimed_claim_id: string | null
          company_id: string
          created_at: string
          duration_minutes: number
          expires_at: string
          id: string
          notes: string | null
          practice_id: string | null
          released_by: string | null
          start_at: string
          status: Database["public"]["Enums"]["slot_status"]
          updated_at: string
          wave_number: number
        }
        Insert: {
          claim_window_minutes: number
          claimed_at?: string | null
          claimed_claim_id?: string | null
          company_id: string
          created_at?: string
          duration_minutes: number
          expires_at: string
          id?: string
          notes?: string | null
          practice_id?: string | null
          released_by?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
          wave_number?: number
        }
        Update: {
          claim_window_minutes?: number
          claimed_at?: string | null
          claimed_claim_id?: string | null
          company_id?: string
          created_at?: string
          duration_minutes?: number
          expires_at?: string
          id?: string
          notes?: string | null
          practice_id?: string | null
          released_by?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
          wave_number?: number
        }
        Relationships: []
      }
      waitlist_members: {
        Row: {
          active: boolean
          address: string
          channel: Database["public"]["Enums"]["contact_channel"]
          company_id: string
          created_at: string
          full_name: string
          id: string
          last_notified_at: string | null
          notes: string | null
          practice_id: string | null
          priority: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          address: string
          channel: Database["public"]["Enums"]["contact_channel"]
          company_id: string
          created_at?: string
          full_name: string
          id?: string
          last_notified_at?: string | null
          notes?: string | null
          practice_id?: string | null
          priority?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          channel?: Database["public"]["Enums"]["contact_channel"]
          company_id?: string
          created_at?: string
          full_name?: string
          id?: string
          last_notified_at?: string | null
          notes?: string | null
          practice_id?: string | null
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attempt: number
          body: string
          channel: Database["public"]["Enums"]["contact_channel"]
          claim_id: string | null
          company_id: string
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          error: string | null
          external_message_id: string | null
          id: string
          metadata: Json | null
          practice_id: string | null
          sent_at: string | null
          slot_id: string | null
          status: Database["public"]["Enums"]["message_status"]
          template_key: string | null
          updated_at: string
          waitlist_member_id: string | null
        }
        Insert: {
          attempt?: number
          body: string
          channel: Database["public"]["Enums"]["contact_channel"]
          claim_id?: string | null
          company_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          error?: string | null
          external_message_id?: string | null
          id?: string
          metadata?: Json | null
          practice_id?: string | null
          sent_at?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          template_key?: string | null
          updated_at?: string
          waitlist_member_id?: string | null
        }
        Update: {
          attempt?: number
          body?: string
          channel?: Database["public"]["Enums"]["contact_channel"]
          claim_id?: string | null
          company_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          error?: string | null
          external_message_id?: string | null
          id?: string
          metadata?: Json | null
          practice_id?: string | null
          sent_at?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          template_key?: string | null
          updated_at?: string
          waitlist_member_id?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          company_id: string | null
          headers: Json | null
          id: string
          payload: Json
          practice_id: string | null
          provider: string
          received_at: string
        }
        Insert: {
          company_id?: string | null
          headers?: Json | null
          id?: string
          payload: Json
          practice_id?: string | null
          provider: string
          received_at?: string
        }
        Update: {
          company_id?: string | null
          headers?: Json | null
          id?: string
          payload?: Json
          practice_id?: string | null
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attempt_claim: {
        Args: {
          _claim_id: string
          _company_id: string
          _response: string
          _slot_id: string
        }
        Returns: {
          claim_id: string
          won: boolean
        }[]
      }
      cleanup_old_booking_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      current_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      claim_status: "pending" | "won" | "lost" | "expired" | "cancelled"
      contact_channel: "whatsapp" | "sms" | "email"
      message_direction: "outbound" | "inbound"
      message_status: "queued" | "sent" | "failed" | "received"
      slot_status: "open" | "claimed" | "booked" | "expired" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]
