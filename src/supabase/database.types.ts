export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_access_log: {
        Row: {
          admin_id: string
          at: string
          id: number
          subject_id: string | null
          what: string
        }
        Insert: {
          admin_id: string
          at?: string
          id?: never
          subject_id?: string | null
          what: string
        }
        Update: {
          admin_id?: string
          at?: string
          id?: never
          subject_id?: string | null
          what?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          added_at: string
          added_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          role?: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      anonymous_sessions: {
        Row: {
          birth_city: string
          birth_country: string
          birth_date: string | null
          birth_place: Json | null
          birth_time: string | null
          claimed_at: string | null
          clinical_additional_notes: string | null
          clinical_ideation_6m: string | null
          clinical_in_treatment: boolean | null
          clinical_prefer_not_to_say: string[]
          clinical_psychiatric_medication: boolean | null
          country: string
          created_at: string
          expires_at: string
          grammatical_gender: string
          id: string
          legal_birth_name: string
          locale: string
          natal_chart: Json | null
          openness_to_modalities: string[]
          presenting_need_slugs: string[]
          presenting_need_text: string
          soul_map_id: string | null
          step: number
          user_id: string
        }
        Insert: {
          birth_city?: string
          birth_country?: string
          birth_date?: string | null
          birth_place?: Json | null
          birth_time?: string | null
          claimed_at?: string | null
          clinical_additional_notes?: string | null
          clinical_ideation_6m?: string | null
          clinical_in_treatment?: boolean | null
          clinical_prefer_not_to_say?: string[]
          clinical_psychiatric_medication?: boolean | null
          country?: string
          created_at?: string
          expires_at?: string
          grammatical_gender?: string
          id?: string
          legal_birth_name?: string
          locale?: string
          natal_chart?: Json | null
          openness_to_modalities?: string[]
          presenting_need_slugs?: string[]
          presenting_need_text?: string
          soul_map_id?: string | null
          step?: number
          user_id: string
        }
        Update: {
          birth_city?: string
          birth_country?: string
          birth_date?: string | null
          birth_place?: Json | null
          birth_time?: string | null
          claimed_at?: string | null
          clinical_additional_notes?: string | null
          clinical_ideation_6m?: string | null
          clinical_in_treatment?: boolean | null
          clinical_prefer_not_to_say?: string[]
          clinical_psychiatric_medication?: boolean | null
          country?: string
          created_at?: string
          expires_at?: string
          grammatical_gender?: string
          id?: string
          legal_birth_name?: string
          locale?: string
          natal_chart?: Json | null
          openness_to_modalities?: string[]
          presenting_need_slugs?: string[]
          presenting_need_text?: string
          soul_map_id?: string | null
          step?: number
          user_id?: string
        }
        Relationships: []
      }
      bed_tracks: {
        Row: {
          frequency_hz: number | null
          id: string
          is_active: boolean
          license: string | null
          name: string
          suits: string
          synthesis: Json
        }
        Insert: {
          frequency_hz?: number | null
          id: string
          is_active?: boolean
          license?: string | null
          name: string
          suits: string
          synthesis: Json
        }
        Update: {
          frequency_hz?: number | null
          id?: string
          is_active?: boolean
          license?: string | null
          name?: string
          suits?: string
          synthesis?: Json
        }
        Relationships: []
      }
      chart_comparisons: {
        Row: {
          created_at: string
          friendship_id: string
          id: string
          mode: string
          prompt_version: string
          result: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          friendship_id: string
          id?: string
          mode: string
          prompt_version: string
          result: Json
          user_id: string
        }
        Update: {
          created_at?: string
          friendship_id?: string
          id?: string
          mode?: string
          prompt_version?: string
          result?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_comparisons_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_point_readings: {
        Row: {
          chart_calculated_at: string
          created_at: string
          prompt_version: string
          readings: Json
          user_id: string
        }
        Insert: {
          chart_calculated_at: string
          created_at?: string
          prompt_version: string
          readings: Json
          user_id: string
        }
        Update: {
          chart_calculated_at?: string
          created_at?: string
          prompt_version?: string
          readings?: Json
          user_id?: string
        }
        Relationships: []
      }
      claude_api_calls: {
        Row: {
          cache_read_tokens: number | null
          cache_write_tokens: number | null
          charged: boolean
          created_at: string
          error_kind: string | null
          id: string
          input_tokens: number | null
          latency_ms: number
          mode: string
          model: string
          outcome: string
          output_tokens: number | null
          prompt_version: string
          purpose: string
          user_id: string | null
        }
        Insert: {
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          charged?: boolean
          created_at?: string
          error_kind?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number
          mode: string
          model: string
          outcome: string
          output_tokens?: number | null
          prompt_version: string
          purpose: string
          user_id?: string | null
        }
        Update: {
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          charged?: boolean
          created_at?: string
          error_kind?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number
          mode?: string
          model?: string
          outcome?: string
          output_tokens?: number | null
          prompt_version?: string
          purpose?: string
          user_id?: string | null
        }
        Relationships: []
      }
      client_errors: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          path: string | null
          release: string | null
          stack: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          path?: string | null
          release?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          path?: string | null
          release?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          birth_city: string
          birth_country: string
          birth_date: string | null
          birth_place: Json | null
          birth_time: string | null
          claimed_session_id: string | null
          clinical_additional_notes: string | null
          clinical_ideation_6m: string | null
          clinical_in_treatment: boolean | null
          clinical_prefer_not_to_say: string[]
          clinical_psychiatric_medication: boolean | null
          country: string
          created_at: string
          email: string | null
          grammatical_gender: string
          id: string
          legal_birth_name: string
          locale: string
          natal_chart: Json | null
          openness_to_modalities: string[]
          presenting_need_slugs: string[]
          presenting_need_text: string
          soul_map_id: string | null
          user_id: string
        }
        Insert: {
          birth_city?: string
          birth_country?: string
          birth_date?: string | null
          birth_place?: Json | null
          birth_time?: string | null
          claimed_session_id?: string | null
          clinical_additional_notes?: string | null
          clinical_ideation_6m?: string | null
          clinical_in_treatment?: boolean | null
          clinical_prefer_not_to_say?: string[]
          clinical_psychiatric_medication?: boolean | null
          country?: string
          created_at?: string
          email?: string | null
          grammatical_gender?: string
          id?: string
          legal_birth_name?: string
          locale?: string
          natal_chart?: Json | null
          openness_to_modalities?: string[]
          presenting_need_slugs?: string[]
          presenting_need_text?: string
          soul_map_id?: string | null
          user_id: string
        }
        Update: {
          birth_city?: string
          birth_country?: string
          birth_date?: string | null
          birth_place?: Json | null
          birth_time?: string | null
          claimed_session_id?: string | null
          clinical_additional_notes?: string | null
          clinical_ideation_6m?: string | null
          clinical_in_treatment?: boolean | null
          clinical_prefer_not_to_say?: string[]
          clinical_psychiatric_medication?: boolean | null
          country?: string
          created_at?: string
          email?: string | null
          grammatical_gender?: string
          id?: string
          legal_birth_name?: string
          locale?: string
          natal_chart?: Json | null
          openness_to_modalities?: string[]
          presenting_need_slugs?: string[]
          presenting_need_text?: string
          soul_map_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          memory_processed_at: string | null
          synthesis_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          memory_processed_at?: string | null
          synthesis_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          memory_processed_at?: string | null
          synthesis_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_synthesis_id_fkey"
            columns: ["synthesis_id"]
            isOneToOne: false
            referencedRelation: "soul_map_syntheses"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_events: {
        Row: {
          admin_notified_at: string | null
          category: string
          created_at: string
          excerpt: string
          false_positive: boolean | null
          from_clinical_answer: boolean
          id: string
          layer: string
          matched: string[]
          severity: string
          source_surface: string
          user_id: string
        }
        Insert: {
          admin_notified_at?: string | null
          category: string
          created_at?: string
          excerpt?: string
          false_positive?: boolean | null
          from_clinical_answer?: boolean
          id?: string
          layer?: string
          matched?: string[]
          severity: string
          source_surface: string
          user_id: string
        }
        Update: {
          admin_notified_at?: string | null
          category?: string
          created_at?: string
          excerpt?: string
          false_positive?: boolean | null
          from_clinical_answer?: boolean
          id?: string
          layer?: string
          matched?: string[]
          severity?: string
          source_surface?: string
          user_id?: string
        }
        Relationships: []
      }
      crisis_resources: {
        Row: {
          contact: string
          country: string
          id: string
          is_active: boolean
          name: string
          note: string | null
          priority: number
          type: string
          verified_at: string | null
        }
        Insert: {
          contact: string
          country: string
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          priority?: number
          type: string
          verified_at?: string | null
        }
        Update: {
          contact?: string
          country?: string
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          priority?: number
          type?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      daily_insights: {
        Row: {
          chart_calculated_at: string
          created_at: string
          insight_date: string
          personal_day: number
          sky: Json
          tips: Json | null
          user_id: string
        }
        Insert: {
          chart_calculated_at: string
          created_at?: string
          insight_date: string
          personal_day: number
          sky: Json
          tips?: Json | null
          user_id: string
        }
        Update: {
          chart_calculated_at?: string
          created_at?: string
          insight_date?: string
          personal_day?: number
          sky?: Json
          tips?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      feedback_messages: {
        Row: {
          admin_id: string | null
          author: string
          body: string
          created_at: string
          crisis_flagged: boolean
          id: string
          read_at: string | null
          screen: string | null
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          author: string
          body: string
          created_at?: string
          crisis_flagged?: boolean
          id?: string
          read_at?: string | null
          screen?: string | null
          user_id: string
        }
        Update: {
          admin_id?: string | null
          author?: string
          body?: string
          created_at?: string
          crisis_flagged?: boolean
          id?: string
          read_at?: string | null
          screen?: string | null
          user_id?: string
        }
        Relationships: []
      }
      friend_invites: {
        Row: {
          created_at: string
          inviter_id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          inviter_id: string
          revoked_at?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          inviter_id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          ended_by: string | null
          id: string
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["friendship_status"]
        }
        Insert: {
          addressee_id: string
          created_at?: string
          ended_by?: string | null
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["friendship_status"]
        }
        Update: {
          addressee_id?: string
          created_at?: string
          ended_by?: string | null
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["friendship_status"]
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          campaign: string | null
          dedupe_key: string
          detail: string | null
          id: number
          occurred_at: string
          source: string | null
          step: string
          user_id: string
        }
        Insert: {
          campaign?: string | null
          dedupe_key: string
          detail?: string | null
          id?: never
          occurred_at?: string
          source?: string | null
          step: string
          user_id: string
        }
        Update: {
          campaign?: string | null
          dedupe_key?: string
          detail?: string | null
          id?: never
          occurred_at?: string
          source?: string | null
          step?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          body: string
          created_at: string
          crisis_flagged: boolean
          entry_date: string
          id: string
          memory_processed_at: string | null
          modality_slug: string | null
          mood: number | null
          practice_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          crisis_flagged?: boolean
          entry_date: string
          id?: string
          memory_processed_at?: string | null
          modality_slug?: string | null
          mood?: number | null
          practice_id?: string | null
          source?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          crisis_flagged?: boolean
          entry_date?: string
          id?: string
          memory_processed_at?: string | null
          modality_slug?: string | null
          mood?: number | null
          practice_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "routine_practices"
            referencedColumns: ["id"]
          },
        ]
      }
      match_reactions: {
        Row: {
          modality_slug: string
          reacted_at: string
          reaction: string
          user_id: string
        }
        Insert: {
          modality_slug: string
          reacted_at?: string
          reaction: string
          user_id: string
        }
        Update: {
          modality_slug?: string
          reacted_at?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_reactions_modality_slug_fkey"
            columns: ["modality_slug"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["slug"]
          },
        ]
      }
      meditations: {
        Row: {
          audio_url: string | null
          created_at: string
          estimated_minutes: number
          id: string
          intent: string
          mode: string
          prompt_version: string
          requested_minutes: number
          script: Json
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          estimated_minutes: number
          id?: string
          intent: string
          mode: string
          prompt_version: string
          requested_minutes: number
          script: Json
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          estimated_minutes?: number
          id?: string
          intent?: string
          mode?: string
          prompt_version?: string
          requested_minutes?: number
          script?: Json
          user_id?: string
        }
        Relationships: []
      }
      memory_item_sources: {
        Row: {
          checkin_id: string | null
          conversation_id: string | null
          created_at: string
          id: string
          journal_entry_id: string | null
          memory_item_id: string
          user_id: string
        }
        Insert: {
          checkin_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          memory_item_id: string
          user_id: string
        }
        Update: {
          checkin_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          memory_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_item_sources_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "recommendation_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_item_sources_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_item_sources_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_item_sources_memory_item_id_fkey"
            columns: ["memory_item_id"]
            isOneToOne: false
            referencedRelation: "memory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_items: {
        Row: {
          category: string
          content: string
          created_at: string
          edited_by_user: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          edited_by_user?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          edited_by_user?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          conversation_id: string
          counted: boolean
          created_at: string
          id: string
          linked_modality_slugs: string[]
          role: string
          text: string
          type: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          counted?: boolean
          created_at?: string
          id?: string
          linked_modality_slugs?: string[]
          role: string
          text: string
          type?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          counted?: boolean
          created_at?: string
          id?: string
          linked_modality_slugs?: string[]
          role?: string
          text?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      modalities: {
        Row: {
          contraindications: string[]
          evidence_level: string
          extra: Json
          family: string
          intensity: number
          is_active: boolean
          name_en: string
          name_es: string
          requires_clinical_support: boolean
          short_description: string
          slug: string
          typical_format: string
          typical_horizon: string
          what_happens: string
          works_well_for: string[]
        }
        Insert: {
          contraindications?: string[]
          evidence_level: string
          extra?: Json
          family: string
          intensity: number
          is_active?: boolean
          name_en: string
          name_es: string
          requires_clinical_support?: boolean
          short_description: string
          slug: string
          typical_format: string
          typical_horizon: string
          what_happens: string
          works_well_for?: string[]
        }
        Update: {
          contraindications?: string[]
          evidence_level?: string
          extra?: Json
          family?: string
          intensity?: number
          is_active?: boolean
          name_en?: string
          name_es?: string
          requires_clinical_support?: boolean
          short_description?: string
          slug?: string
          typical_format?: string
          typical_horizon?: string
          what_happens?: string
          works_well_for?: string[]
        }
        Relationships: []
      }
      modality_matches: {
        Row: {
          created_at: string
          id: string
          is_current: boolean
          prompt_version: string
          result: Json
          strategy: string
          synthesis_id: string
          used_fallback: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_current?: boolean
          prompt_version: string
          result: Json
          strategy: string
          synthesis_id: string
          used_fallback?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_current?: boolean
          prompt_version?: string
          result?: Json
          strategy?: string
          synthesis_id?: string
          used_fallback?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modality_matches_synthesis_id_fkey"
            columns: ["synthesis_id"]
            isOneToOne: false
            referencedRelation: "soul_map_syntheses"
            referencedColumns: ["id"]
          },
        ]
      }
      model_prices: {
        Row: {
          cache_read: number
          cache_write: number
          input: number
          model: string
          output: number
        }
        Insert: {
          cache_read: number
          cache_write: number
          input: number
          model: string
          output: number
        }
        Update: {
          cache_read?: number
          cache_write?: number
          input?: number
          model?: string
          output?: number
        }
        Relationships: []
      }
      natal_chart_calls: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      natal_charts: {
        Row: {
          calculated_at: string
          chart: Json
          has_birth_time: boolean
          house_system: string
          provider: string
          user_id: string
        }
        Insert: {
          calculated_at?: string
          chart: Json
          has_birth_time: boolean
          house_system?: string
          provider?: string
          user_id: string
        }
        Update: {
          calculated_at?: string
          chart?: Json
          has_birth_time?: boolean
          house_system?: string
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          event_type: string
          id: string
          received_at: string
          user_id: string | null
        }
        Insert: {
          event_type: string
          id: string
          received_at?: string
          user_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          received_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      plan_caps: {
        Row: {
          monthly_usd: number
          tier: string
        }
        Insert: {
          monthly_usd: number
          tier: string
        }
        Update: {
          monthly_usd?: number
          tier?: string
        }
        Relationships: []
      }
      plan_quotas: {
        Row: {
          feature: string
          initial: number | null
          monthly: number | null
          tier: string
        }
        Insert: {
          feature: string
          initial?: number | null
          monthly?: number | null
          tier: string
        }
        Update: {
          feature?: string
          initial?: number | null
          monthly?: number | null
          tier?: string
        }
        Relationships: []
      }
      preferences: {
        Row: {
          bed_volume: number
          locale: string
          memory_consent_at: string | null
          user_id: string
          voice_volume: number
        }
        Insert: {
          bed_volume?: number
          locale?: string
          memory_consent_at?: string | null
          user_id: string
          voice_volume?: number
        }
        Update: {
          bed_volume?: number
          locale?: string
          memory_consent_at?: string | null
          user_id?: string
          voice_volume?: number
        }
        Relationships: []
      }
      recommendation_checkins: {
        Row: {
          checked_on: string
          comment: string | null
          id: string
          memory_processed_at: string | null
          practice_title: string
          rating: number | null
          user_id: string
        }
        Insert: {
          checked_on: string
          comment?: string | null
          id?: string
          memory_processed_at?: string | null
          practice_title: string
          rating?: number | null
          user_id: string
        }
        Update: {
          checked_on?: string
          comment?: string | null
          id?: string
          memory_processed_at?: string | null
          practice_title?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      routine_change_proposals: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          prompt_version: string
          proposal: Json
          responded_at: string | null
          status: string
          trigger: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          prompt_version: string
          proposal: Json
          responded_at?: string | null
          status?: string
          trigger: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          prompt_version?: string
          proposal?: Json
          responded_at?: string | null
          status?: string
          trigger?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_change_proposals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "modality_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_practices: {
        Row: {
          body: string
          cadence: string
          connects_modality: string | null
          connects_soul_map: boolean
          created_at: string
          id: string
          invitation: string
          is_active: boolean
          match_id: string | null
          origin: string
          prompt_version: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          cadence: string
          connects_modality?: string | null
          connects_soul_map?: boolean
          created_at?: string
          id?: string
          invitation: string
          is_active?: boolean
          match_id?: string | null
          origin?: string
          prompt_version?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          cadence?: string
          connects_modality?: string | null
          connects_soul_map?: boolean
          created_at?: string
          id?: string
          invitation?: string
          is_active?: boolean
          match_id?: string | null
          origin?: string
          prompt_version?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_practices_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "modality_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      sky_days: {
        Row: {
          created_at: string
          day: string
          points: Json
          provider: string
        }
        Insert: {
          created_at?: string
          day: string
          points: Json
          provider?: string
        }
        Update: {
          created_at?: string
          day?: string
          points?: Json
          provider?: string
        }
        Relationships: []
      }
      soul_map_syntheses: {
        Row: {
          created_at: string
          id: string
          is_current: boolean
          latency_ms: number
          mode: string
          model: string | null
          numerology: Json | null
          prompt_version: string
          synthesis: Json
          trigger: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_current?: boolean
          latency_ms?: number
          mode: string
          model?: string | null
          numerology?: Json | null
          prompt_version: string
          synthesis: Json
          trigger?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_current?: boolean
          latency_ms?: number
          mode?: string
          model?: string | null
          numerology?: Json | null
          prompt_version?: string
          synthesis?: Json
          trigger?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          activated_at: string | null
          ends_at: string | null
          granted_by: string | null
          provider: string | null
          provider_subscription_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          ends_at?: string | null
          granted_by?: string | null
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          ends_at?: string | null
          granted_by?: string | null
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      system_audit_log: {
        Row: {
          event: string
          id: string
          occurred_at: string
          user_id: string | null
        }
        Insert: {
          event: string
          id?: string
          occurred_at?: string
          user_id?: string | null
        }
        Update: {
          event?: string
          id?: string
          occurred_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tech_expenses: {
        Row: {
          amount_usd: number | null
          frequency: string
          id: string
          notes: string
          paid_by: string
          plan: string
          purpose: string
          service: string
          since: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_usd?: number | null
          frequency?: string
          id?: string
          notes?: string
          paid_by?: string
          plan?: string
          purpose?: string
          service: string
          since?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_usd?: number | null
          frequency?: string
          id?: string
          notes?: string
          paid_by?: string
          plan?: string
          purpose?: string
          service?: string
          since?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      topics: {
        Row: {
          name_en: string
          name_es: string
          slug: string
        }
        Insert: {
          name_en: string
          name_es: string
          slug: string
        }
        Update: {
          name_en?: string
          name_es?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_friend_invite: { Args: { p_token: string }; Returns: string }
      admin_ai_spend: {
        Args: { p_days?: number }
        Returns: {
          calls: number
          cost_usd: number
          day: string
          failed: number
          purpose: string
        }[]
      }
      admin_call_cost: {
        Args: { c: Database["public"]["Tables"]["claude_api_calls"]["Row"] }
        Returns: number
      }
      admin_crisis_counts: {
        Args: { p_days?: number }
        Returns: {
          alerts: number
          day: string
          not_their_case: number
          severity: string
          surface: string
        }[]
      }
      admin_crisis_list: {
        Args: { p_days?: number }
        Returns: {
          at: string
          category: string
          email: string
          excerpt: string
          from_clinical: boolean
          has_account: boolean
          id: string
          matched: string[]
          name: string
          not_their_case: boolean
          severity: string
          surface: string
          user_id: string
        }[]
      }
      admin_daily: {
        Args: { p_days?: number }
        Returns: {
          accounts: number
          day: string
          opened: number
          started: number
        }[]
      }
      admin_expense_delete: { Args: { p_id: string }; Returns: undefined }
      admin_expense_save: { Args: { p: Json; p_id: string }; Returns: string }
      admin_expenses: {
        Args: never
        Returns: {
          amount_usd: number | null
          frequency: string
          id: string
          notes: string
          paid_by: string
          plan: string
          purpose: string
          service: string
          since: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tech_expenses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_feedback_inbox: {
        Args: { p_limit?: number }
        Returns: {
          crisis: boolean
          email: string
          last_at: string
          last_author: string
          last_body: string
          name: string
          unread: number
          user_id: string
        }[]
      }
      admin_feedback_reply: {
        Args: { p_body: string; p_user: string }
        Returns: string
      }
      admin_feedback_thread: {
        Args: { p_user: string }
        Returns: {
          author: string
          body: string
          created_at: string
          crisis_flagged: boolean
          id: string
          screen: string
        }[]
      }
      admin_funnel: {
        Args: { p_from: string; p_to: string }
        Returns: {
          people: number
          step: string
        }[]
      }
      admin_funnel_detail: {
        Args: { p_from: string; p_step: string; p_to: string }
        Returns: {
          detail: string
          people: number
        }[]
      }
      admin_grant_premium: {
        Args: { p_email: string; p_months?: number }
        Returns: string
      }
      admin_overview: {
        Args: never
        Returns: {
          accounts: number
          accounts_7d: number
          active_7d: number
          ai_spend_month: number
          anonymous: number
          crisis_alerts_7d: number
          premium_gifted: number
          premium_paying: number
        }[]
      }
      admin_people: {
        Args: { p_limit?: number; p_query?: string }
        Returns: {
          country: string
          created_at: string
          email: string
          last_opened: string
          name: string
          plan: string
          user_id: string
        }[]
      }
      admin_person: { Args: { p_user: string }; Returns: Json }
      admin_person_content: {
        Args: { p_kind: string; p_limit?: number; p_user: string }
        Returns: Json
      }
      admin_plan: { Args: { p_user: string }; Returns: string }
      admin_require: {
        Args: { p_log?: boolean; p_subject?: string; p_what: string }
        Returns: undefined
      }
      admin_revoke_premium: { Args: { p_user: string }; Returns: undefined }
      admin_whoami: {
        Args: never
        Returns: {
          role: string
        }[]
      }
      caller_has_account: { Args: never; Returns: boolean }
      deployment_token_totals: {
        Args: { since: string }
        Returns: {
          cache_read_tokens: number
          cache_write_tokens: number
          input_tokens: number
          model: string
          output_tokens: number
        }[]
      }
      end_friendship: { Args: { p_friendship: string }; Returns: undefined }
      feedback_mark_read: { Args: never; Returns: undefined }
      first_name_of: { Args: { p_user: string }; Returns: string }
      funnel_dedupe_key: {
        Args: { p_detail: string; p_step: string }
        Returns: string
      }
      i_am_premium: { Args: never; Returns: boolean }
      invite_preview: {
        Args: { p_token: string }
        Returns: {
          already_friends: boolean
          inviter_first_name: string
          own_link: boolean
          valid: boolean
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      my_friends: {
        Args: never
        Returns: {
          first_name: string
          friend_id: string
          friendship_id: string
          since: string
        }[]
      }
      my_invite_token: { Args: never; Returns: string }
      my_quota: { Args: { p_feature: string }; Returns: Json }
      plan_tier: { Args: { p_user: string }; Returns: string }
      quota_parts: {
        Args: { p_feature: string; p_now?: string; p_user: string }
        Returns: Json
      }
      quota_remaining: {
        Args: { p_feature: string; p_now?: string; p_user: string }
        Returns: number
      }
      record_step: {
        Args: {
          p_campaign?: string
          p_detail?: string
          p_source?: string
          p_step: string
          p_user: string
        }
        Returns: undefined
      }
      renew_invite_token: { Args: never; Returns: string }
      reserve_chat_turn: {
        Args: {
          p_limit: number
          p_model: string
          p_prompt_version: string
          p_since: string
          p_user: string
        }
        Returns: string
      }
      reserve_model_call: {
        Args: {
          p_limit: number
          p_model: string
          p_prompt_version: string
          p_purpose: string
          p_since: string
          p_user: string
        }
        Returns: string
      }
      reserve_plan_chat_turn: {
        Args: { p_model: string; p_prompt_version: string; p_user: string }
        Returns: string
      }
      track_step: {
        Args: {
          p_campaign?: string
          p_detail?: string
          p_source?: string
          p_step: string
        }
        Returns: undefined
      }
      user_token_totals: {
        Args: { p_user: string; since: string }
        Returns: {
          cache_read_tokens: number
          cache_write_tokens: number
          input_tokens: number
          model: string
          output_tokens: number
        }[]
      }
    }
    Enums: {
      friendship_status: "pending" | "accepted" | "declined" | "removed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      friendship_status: ["pending", "accepted", "declined", "removed"],
    },
  },
} as const

