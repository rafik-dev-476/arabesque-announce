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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string
          button_label: string | null
          button_url: string | null
          buttons: Json
          color: string
          created_at: string
          created_by: string | null
          default_channel_id: string | null
          footer_text: string | null
          id: string
          image_url: string | null
          last_published_at: string | null
          name: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          button_label?: string | null
          button_url?: string | null
          buttons?: Json
          color?: string
          created_at?: string
          created_by?: string | null
          default_channel_id?: string | null
          footer_text?: string | null
          id?: string
          image_url?: string | null
          last_published_at?: string | null
          name: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string
          button_label?: string | null
          button_url?: string | null
          buttons?: Json
          color?: string
          created_at?: string
          created_by?: string | null
          default_channel_id?: string | null
          footer_text?: string | null
          id?: string
          image_url?: string | null
          last_published_at?: string | null
          name?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_config: {
        Row: {
          bot_token: string | null
          id: string
          updated_at: string
        }
        Insert: {
          bot_token?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          bot_token?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      guild_settings: {
        Row: {
          created_at: string
          guild_id: string | null
          id: string
          log_channel_id: string | null
          staff_role_id: string | null
          terms_text: string
          ticket_category_id: string | null
          transcript_channel_id: string | null
          updated_at: string
          welcome_text: string
        }
        Insert: {
          created_at?: string
          guild_id?: string | null
          id?: string
          log_channel_id?: string | null
          staff_role_id?: string | null
          terms_text?: string
          ticket_category_id?: string | null
          transcript_channel_id?: string | null
          updated_at?: string
          welcome_text?: string
        }
        Update: {
          created_at?: string
          guild_id?: string | null
          id?: string
          log_channel_id?: string | null
          staff_role_id?: string | null
          terms_text?: string
          ticket_category_id?: string | null
          transcript_channel_id?: string | null
          updated_at?: string
          welcome_text?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          author_discord_id: string | null
          author_username: string | null
          content: string
          id: string
          sent_at: string
          ticket_id: string
        }
        Insert: {
          author_discord_id?: string | null
          author_username?: string | null
          content?: string
          id?: string
          sent_at?: string
          ticket_id: string
        }
        Update: {
          author_discord_id?: string | null
          author_username?: string | null
          content?: string
          id?: string
          sent_at?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_panels: {
        Row: {
          banner_url: string | null
          button_emoji: string | null
          button_label: string
          category_id: string | null
          channel_id: string | null
          color: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_active: boolean
          message_id: string | null
          name: string
          staff_role_id: string | null
          terms_text: string
          title: string
          topics: Json
          updated_at: string
          welcome_text: string
        }
        Insert: {
          banner_url?: string | null
          button_emoji?: string | null
          button_label?: string
          category_id?: string | null
          channel_id?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          message_id?: string | null
          name: string
          staff_role_id?: string | null
          terms_text?: string
          title?: string
          topics?: Json
          updated_at?: string
          welcome_text?: string
        }
        Update: {
          banner_url?: string | null
          button_emoji?: string | null
          button_label?: string
          category_id?: string | null
          channel_id?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          message_id?: string | null
          name?: string
          staff_role_id?: string | null
          terms_text?: string
          title?: string
          topics?: Json
          updated_at?: string
          welcome_text?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          channel_id: string | null
          claimed_at: string | null
          claimed_by_discord_id: string | null
          claimed_by_username: string | null
          close_reason: string | null
          closed_at: string | null
          closed_by_username: string | null
          created_at: string
          guild_id: string | null
          id: string
          number: number
          opener_discord_id: string | null
          opener_username: string | null
          panel_id: string | null
          status: string
          subject: string | null
          topic: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          channel_id?: string | null
          claimed_at?: string | null
          claimed_by_discord_id?: string | null
          claimed_by_username?: string | null
          close_reason?: string | null
          closed_at?: string | null
          closed_by_username?: string | null
          created_at?: string
          guild_id?: string | null
          id?: string
          number?: number
          opener_discord_id?: string | null
          opener_username?: string | null
          panel_id?: string | null
          status?: string
          subject?: string | null
          topic?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          channel_id?: string | null
          claimed_at?: string | null
          claimed_by_discord_id?: string | null
          claimed_by_username?: string | null
          close_reason?: string | null
          closed_at?: string | null
          closed_by_username?: string | null
          created_at?: string
          guild_id?: string | null
          id?: string
          number?: number
          opener_discord_id?: string | null
          opener_username?: string | null
          panel_id?: string | null
          status?: string
          subject?: string | null
          topic?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "ticket_panels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_ownership: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff"],
    },
  },
} as const
