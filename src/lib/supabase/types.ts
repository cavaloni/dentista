export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
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
        Relationships: [
          {
            foreignKeyName: "booking_notifications_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          company_id: string
          created_at: string
          id: string
          removed_at: string | null
          slot_id: string
          updated_at: string
          waitlist_member_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          removed_at?: string | null
          slot_id: string
          updated_at?: string
          waitlist_member_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          removed_at?: string | null
          slot_id?: string
          updated_at?: string
          waitlist_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_assignments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_assignments_waitlist_member_id_fkey"
            columns: ["waitlist_member_id"]
            isOneToOne: false
            referencedRelation: "waitlist_members"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_waitlist_member_id_fkey"
            columns: ["waitlist_member_id"]
            isOneToOne: false
            referencedRelation: "waitlist_members"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          auto_confirm_bookings: boolean
          claim_window_minutes: number
          confirmation_template: string
          created_at: string
          default_duration_minutes: number
          demo_mode: boolean | null
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
          demo_mode?: boolean | null
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
          demo_mode?: boolean | null
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
        Relationships: [
          {
            foreignKeyName: "messages_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_waitlist_member_id_fkey"
            columns: ["waitlist_member_id"]
            isOneToOne: false
            referencedRelation: "waitlist_members"
            referencedColumns: ["id"]
          },
        ]
      }
      practices: {
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
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "slots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "waitlist_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_members_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "webhook_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
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
      cancel_slot: {
        Args: { _company_id: string; _slot_id: string }
        Returns: {
          claim_id: string
        }[]
      }
      cleanup_old_booking_notifications: { Args: never; Returns: undefined }
      current_company_id: { Args: never; Returns: string }
      current_practice_id: { Args: never; Returns: string }
      expire_open_slots: {
        Args: never
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "slots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      expire_open_slots_for_company: {
        Args: { _company_id: string }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "slots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_company_by_slug: { Args: { _slug: string }; Returns: string }
      get_patient_active_assignment: {
        Args: { patient_id: string }
        Returns: {
          assigned_at: string
          broadcast_duration: number
          broadcast_id: string
          broadcast_start: string
          broadcast_status: Database["public"]["Enums"]["slot_status"]
        }[]
      }
      release_slot: {
        Args: {
          _claim_window_minutes: number
          _company_id: string
          _duration_minutes: number
          _notes: string
          _released_by: string
          _start_at: string
          _timezone: string
          _wave_size: number
        }
        Returns: {
          claim_id: string
          slot_id: string
          waitlist_member_id: string
          wave_number: number
        }[]
      }
    }
    Enums: {
      claim_status: "pending" | "won" | "lost" | "expired" | "cancelled"
      contact_channel: "whatsapp" | "sms" | "email"
      message_direction: "outbound" | "inbound"
      message_status: "queued" | "sent" | "failed" | "received"
      slot_status:
        | "draft"
        | "open"
        | "claimed"
        | "booked"
        | "expired"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
    : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      claim_status: ["pending", "won", "lost", "expired", "cancelled"],
      contact_channel: ["whatsapp", "sms", "email"],
      message_direction: ["outbound", "inbound"],
      message_status: ["queued", "sent", "failed", "received"],
      slot_status: [
        "draft",
        "open",
        "claimed",
        "booked",
        "expired",
        "cancelled",
      ],
    },
  },
} as const
