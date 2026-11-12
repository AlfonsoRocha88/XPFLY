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
      achievement_unlocks: {
        Row: { achievement_id: string; claimed_at: string; coins: number; id: number; tier: number; user_id: string }
        Insert: { achievement_id: string; claimed_at?: string; coins?: number; id?: never; tier: number; user_id: string }
        Update: { achievement_id?: string; claimed_at?: string; coins?: number; id?: never; tier?: number; user_id?: string }
        Relationships: []
      }
      clan_activity: {
        Row: {
          clan_id: string
          created_at: string
          data: Json
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          clan_id: string
          created_at?: string
          data?: Json
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          clan_id?: string
          created_at?: string
          data?: Json
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clan_join_requests: {
        Row: {
          clan_id: string
          id: string
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          clan_id: string
          id?: string
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          clan_id?: string
          id?: string
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_join_requests_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_members: {
        Row: {
          clan_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          clan_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          clan_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_members_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_messages: {
        Row: {
          clan_id: string
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      clan_weekly_contributions: {
        Row: {
          clan_id: string
          count: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          clan_id: string
          count?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          clan_id?: string
          count?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_weekly_contributions_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clans: {
        Row: {
          color: string
          created_at: string
          description: string | null
          emblem_config: Json
          id: string
          join_type: string
          leader_id: string
          level: number
          max_members: number
          member_count: number
          name: string
          tag: string
          updated_at: string
          weekly_goal: number
          weekly_progress: number
          weekly_reset_at: string
          xp: number
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          emblem_config?: Json
          id?: string
          join_type?: string
          leader_id: string
          level?: number
          max_members?: number
          member_count?: number
          name: string
          tag: string
          updated_at?: string
          weekly_goal?: number
          weekly_progress?: number
          weekly_reset_at?: string
          xp?: number
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          emblem_config?: Json
          id?: string
          join_type?: string
          leader_id?: string
          level?: number
          max_members?: number
          member_count?: number
          name?: string
          tag?: string
          updated_at?: string
          weekly_goal?: number
          weekly_progress?: number
          weekly_reset_at?: string
          xp?: number
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          created_at: string
          day: string
          id: number
          sleep_minutes: number | null
          slept_at: string | null
          updated_at: string
          user_id: string
          woke_at: string | null
        }
        Insert: {
          created_at?: string
          day: string
          id?: never
          sleep_minutes?: number | null
          slept_at?: string | null
          updated_at?: string
          user_id?: string
          woke_at?: string | null
        }
        Update: {
          created_at?: string
          day?: string
          id?: never
          sleep_minutes?: number | null
          slept_at?: string | null
          updated_at?: string
          user_id?: string
          woke_at?: string | null
        }
        Relationships: []
      }
      focus_settings: {
        Row: {
          focus_until: string | null
          lock_until_dailies: boolean
          pause_until: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          focus_until?: string | null
          lock_until_dailies?: boolean
          pause_until?: string | null
          token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          focus_until?: string | null
          lock_until_dailies?: boolean
          pause_until?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      league_changes: {
        Row: {
          created_at: string
          direction: string
          from_league_id: string | null
          id: string
          to_league_id: string
          trophies: number
          user_id: string
        }
        Insert: {
          created_at?: string
          direction?: string
          from_league_id?: string | null
          id?: string
          to_league_id: string
          trophies: number
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          from_league_id?: string | null
          id?: string
          to_league_id?: string
          trophies?: number
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parties: {
        Row: {
          created_at: string
          id: string
          leader_id: string
          max_members: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          leader_id: string
          max_members?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          leader_id?: string
          max_members?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      party_members: {
        Row: {
          id: string
          joined_at: string
          party_id: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          party_id: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          party_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_members_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_config: Json
          avatar_url: string | null
          bg_animations: boolean
          coins: number
          created_at: string
          current_class: string | null
          current_class_tier: number
          current_league_id: string
          daily_completed_at: string | null
          daily_streak: number
          daily_trophy_loss: number
          daily_trophy_loss_date: string | null
          demo_sequence: Json | null
          display_name: string | null
          equipped_frame: string | null
          equipped_title: string | null
          friend_code: string | null
          highest_trophies: number
          id: string
          last_mission_completed_at: string | null
          level: number
          missions_completed_total: number
          mode: string
          pyro_age_band: string | null
          pyro_areas: string[]
          pyro_enemies: string[]
          pyro_gender: string | null
          pyro_goal: string | null
          pyro_last_decay_date: string | null
          pyro_onboarding_completed: boolean
          pyro_peak_time: string | null
          pyro_power_level: number
          pyro_time_cap: string | null
          stat_points_available: number
          stat_points_spent: number
          stats: Json
          streak_freeze_max: number
          streak_freezes: number
          theme: string
          timezone: string
          title_progress: Json
          trophies: number
          unlocked_frames: string[]
          unlocked_outfits: string[]
          unlocked_titles: string[]
          unopened_chests: number
          updated_at: string
          user_id: string
          username: string | null
          wallpaper: string | null
          xp: number
        }
        Insert: {
          avatar_config?: Json
          avatar_url?: string | null
          bg_animations?: boolean
          coins?: number
          created_at?: string
          current_class?: string | null
          current_class_tier?: number
          current_league_id?: string
          daily_completed_at?: string | null
          daily_streak?: number
          daily_trophy_loss?: number
          daily_trophy_loss_date?: string | null
          demo_sequence?: Json | null
          display_name?: string | null
          equipped_frame?: string | null
          equipped_title?: string | null
          friend_code?: string | null
          highest_trophies?: number
          id?: string
          last_mission_completed_at?: string | null
          level?: number
          missions_completed_total?: number
          mode?: string
          pyro_age_band?: string | null
          pyro_areas?: string[]
          pyro_enemies?: string[]
          pyro_gender?: string | null
          pyro_goal?: string | null
          pyro_last_decay_date?: string | null
          pyro_onboarding_completed?: boolean
          pyro_peak_time?: string | null
          pyro_power_level?: number
          pyro_time_cap?: string | null
          stat_points_available?: number
          stat_points_spent?: number
          stats?: Json
          streak_freeze_max?: number
          streak_freezes?: number
          theme?: string
          timezone?: string
          title_progress?: Json
          trophies?: number
          unlocked_frames?: string[]
          unlocked_outfits?: string[]
          unlocked_titles?: string[]
          unopened_chests?: number
          updated_at?: string
          user_id: string
          username?: string | null
          wallpaper?: string | null
          xp?: number
        }
        Update: {
          avatar_config?: Json
          avatar_url?: string | null
          bg_animations?: boolean
          coins?: number
          created_at?: string
          current_class?: string | null
          current_class_tier?: number
          current_league_id?: string
          daily_completed_at?: string | null
          daily_streak?: number
          daily_trophy_loss?: number
          daily_trophy_loss_date?: string | null
          demo_sequence?: Json | null
          display_name?: string | null
          equipped_frame?: string | null
          equipped_title?: string | null
          friend_code?: string | null
          highest_trophies?: number
          id?: string
          last_mission_completed_at?: string | null
          level?: number
          missions_completed_total?: number
          mode?: string
          pyro_age_band?: string | null
          pyro_areas?: string[]
          pyro_enemies?: string[]
          pyro_gender?: string | null
          pyro_goal?: string | null
          pyro_last_decay_date?: string | null
          pyro_onboarding_completed?: boolean
          pyro_peak_time?: string | null
          pyro_power_level?: number
          pyro_time_cap?: string | null
          stat_points_available?: number
          stat_points_spent?: number
          stats?: Json
          streak_freeze_max?: number
          streak_freezes?: number
          theme?: string
          timezone?: string
          title_progress?: Json
          trophies?: number
          unlocked_frames?: string[]
          unlocked_outfits?: string[]
          unlocked_titles?: string[]
          unopened_chests?: number
          updated_at?: string
          user_id?: string
          username?: string | null
          wallpaper?: string | null
          xp?: number
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          daily_days: number[]
          description: string | null
          due_date: string | null
          end_time: string | null
          id: string
          is_daily: boolean
          parent_task_id: string | null
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_unit: string | null
          reminders: number[]
          start_time: string | null
          status: Database["public"]["Enums"]["task_status"]
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          xp_awarded: boolean
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          daily_days?: number[]
          description?: string | null
          due_date?: string | null
          end_time?: string | null
          id?: string
          is_daily?: boolean
          parent_task_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_unit?: string | null
          reminders?: number[]
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          xp_awarded?: boolean
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          daily_days?: number[]
          description?: string | null
          due_date?: string | null
          end_time?: string | null
          id?: string
          is_daily?: boolean
          parent_task_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_unit?: string | null
          reminders?: number[]
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          xp_awarded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _notify_dispatch: {
        Args: {
          event_name: string
          extra?: Json
          row_uuid: string
          target_user: string
        }
        Returns: undefined
      }
      calculate_level: { Args: { total_xp: number }; Returns: number }
      find_profile_preview: {
        Args: { _query: string }
        Returns: {
          avatar_config: Json
          avatar_url: string
          display_name: string
          friend_code: string
          level: number
          trophies: number
          user_id: string
          username: string
        }[]
      }
      generate_friend_code: { Args: never; Returns: string }
      get_global_trophy_rank: { Args: { _user_id: string }; Returns: number }
      get_my_achievement_metrics: { Args: never; Returns: Json }
      get_my_activity: {
        Args: { p_from: string; p_to: string }
        Returns: {
          awarded_at: string
          day: string
          is_daily: boolean
          priority: string
          task_id: string
          title: string
          xp: number
        }[]
      }
      get_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_config: Json
          avatar_url: string
          current_league_id: string
          display_name: string
          equipped_title: string
          highest_trophies: number
          level: number
          trophies: number
          user_id: string
          username: string
          xp: number
        }[]
      }
      get_profiles_public: {
        Args: { _user_ids: string[] }
        Returns: {
          avatar_config: Json
          avatar_url: string
          current_class: string
          current_class_tier: number
          current_league_id: string
          daily_streak: number
          display_name: string
          equipped_title: string
          friend_code: string
          highest_trophies: number
          level: number
          stats: Json
          trophies: number
          unlocked_outfits: string[]
          unlocked_titles: string[]
          user_id: string
          username: string
          wallpaper: string
          xp: number
        }[]
      }
      is_clan_member: {
        Args: { _clan_id: string; _user_id: string }
        Returns: boolean
      }
      is_party_leader: {
        Args: { _party_id: string; _user_id: string }
        Returns: boolean
      }
      is_party_member: {
        Args: { _party_id: string; _user_id: string }
        Returns: boolean
      }
      reset_weekly_clan_progress: {
        Args: { _clan_id: string }
        Returns: undefined
      }
      xp_for_level: { Args: { lvl: number }; Returns: number }
    }
    Enums: {
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "done"
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
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "done"],
    },
  },
} as const
