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
      attachments: {
        Row: {
          bucket: string
          business_id: string | null
          bytes: number
          citizen_request_id: string | null
          created_at: string
          eco_route_id: string | null
          height: number | null
          id: string
          mime: string
          owner_id: string | null
          path: string
          status: string
          tourism_place_id: string | null
          traffic_report_id: string | null
          width: number | null
        }
        Insert: {
          bucket: string
          business_id?: string | null
          bytes: number
          citizen_request_id?: string | null
          created_at?: string
          eco_route_id?: string | null
          height?: number | null
          id?: string
          mime: string
          owner_id?: string | null
          path: string
          status?: string
          tourism_place_id?: string | null
          traffic_report_id?: string | null
          width?: number | null
        }
        Update: {
          bucket?: string
          business_id?: string | null
          bytes?: number
          citizen_request_id?: string | null
          created_at?: string
          eco_route_id?: string | null
          height?: number | null
          id?: string
          mime?: string
          owner_id?: string | null
          path?: string
          status?: string
          tourism_place_id?: string | null
          traffic_report_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_citizen_request_id_fkey"
            columns: ["citizen_request_id"]
            isOneToOne: false
            referencedRelation: "citizen_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_eco_route_id_fkey"
            columns: ["eco_route_id"]
            isOneToOne: false
            referencedRelation: "eco_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_tourism_place_id_fkey"
            columns: ["tourism_place_id"]
            isOneToOne: false
            referencedRelation: "tourism_places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_traffic_report_id_fkey"
            columns: ["traffic_report_id"]
            isOneToOne: false
            referencedRelation: "traffic_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_declared: unknown
          ip_observed: unknown
          municipality_id: string | null
          province_id: string | null
          result: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_declared?: unknown
          ip_observed?: unknown
          municipality_id?: string | null
          province_id?: string | null
          result?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_declared?: unknown
          ip_observed?: unknown
          municipality_id?: string | null
          province_id?: string | null
          result?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          active: boolean
          icon: string
          id: string
          name: string
          slug: string
          sort: number
          translations: Json
        }
        Insert: {
          active?: boolean
          icon?: string
          id?: string
          name: string
          slug: string
          sort?: number
          translations?: Json
        }
        Update: {
          active?: boolean
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort?: number
          translations?: Json
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          business_id: string
          closes: string
          opens: string
          weekday: number
        }
        Insert: {
          business_id: string
          closes: string
          opens: string
          weekday: number
        }
        Update: {
          business_id?: string
          closes?: string
          opens?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          member_role: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          member_role?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          member_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          category_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          email: string | null
          geom: unknown
          google_place_id: string | null
          id: string
          idempotency_key: string | null
          municipality_id: string
          name: string
          phone: string | null
          province_id: string
          search_vector: unknown
          slug: string
          status: string
          status_reason: string | null
          translations: Json
          updated_at: string
          version: number
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          category_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          geom: unknown
          google_place_id?: string | null
          id?: string
          idempotency_key?: string | null
          municipality_id: string
          name: string
          phone?: string | null
          province_id: string
          search_vector?: unknown
          slug: string
          status?: string
          status_reason?: string | null
          translations?: Json
          updated_at?: string
          version?: number
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          category_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          geom?: unknown
          google_place_id?: string | null
          id?: string
          idempotency_key?: string | null
          municipality_id?: string
          name?: string
          phone?: string | null
          province_id?: string
          search_vector?: unknown
          slug?: string
          status?: string
          status_reason?: string | null
          translations?: Json
          updated_at?: string
          version?: number
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_municipality_id_province_id_fkey"
            columns: ["municipality_id", "province_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id", "province_id"]
          },
          {
            foreignKeyName: "businesses_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      citizen_requests: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          geom: unknown
          id: string
          idempotency_key: string | null
          is_public: boolean
          kind: string
          municipality_id: string
          province_id: string
          rejection_reason: string | null
          requester_id: string | null
          resolution_note: string | null
          status: string
          support_count: number
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          description: string
          geom?: unknown
          id?: string
          idempotency_key?: string | null
          is_public?: boolean
          kind: string
          municipality_id: string
          province_id: string
          rejection_reason?: string | null
          requester_id?: string | null
          resolution_note?: string | null
          status?: string
          support_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          geom?: unknown
          id?: string
          idempotency_key?: string | null
          is_public?: boolean
          kind?: string
          municipality_id?: string
          province_id?: string
          rejection_reason?: string | null
          requester_id?: string | null
          resolution_note?: string | null
          status?: string
          support_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "citizen_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citizen_requests_category_kind_fkey"
            columns: ["category", "kind"]
            isOneToOne: false
            referencedRelation: "request_categories"
            referencedColumns: ["code", "kind"]
          },
          {
            foreignKeyName: "citizen_requests_municipality_id_province_id_fkey"
            columns: ["municipality_id", "province_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id", "province_id"]
          },
          {
            foreignKeyName: "citizen_requests_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citizen_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_routes: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          difficulty: string
          distance_km: number | null
          duration_min: number
          geom: unknown
          geom_simplified: unknown
          id: string
          kind: string
          municipality_id: string
          municipality_ids: string[]
          name: string
          proposed_by: string | null
          province_id: string
          reviewed_by: string | null
          search_vector: unknown
          services: Json
          slug: string
          start_point: unknown
          status: string
          status_reason: string | null
          translations: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          difficulty: string
          distance_km?: number | null
          duration_min: number
          geom: unknown
          geom_simplified?: unknown
          id?: string
          kind: string
          municipality_id: string
          municipality_ids?: string[]
          name: string
          proposed_by?: string | null
          province_id: string
          reviewed_by?: string | null
          search_vector?: unknown
          services?: Json
          slug: string
          start_point?: unknown
          status?: string
          status_reason?: string | null
          translations?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          difficulty?: string
          distance_km?: number | null
          duration_min?: number
          geom?: unknown
          geom_simplified?: unknown
          id?: string
          kind?: string
          municipality_id?: string
          municipality_ids?: string[]
          name?: string
          proposed_by?: string | null
          province_id?: string
          reviewed_by?: string | null
          search_vector?: unknown
          services?: Json
          slug?: string
          start_point?: unknown
          status?: string
          status_reason?: string | null
          translations?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "eco_routes_municipality_id_province_id_fkey"
            columns: ["municipality_id", "province_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id", "province_id"]
          },
          {
            foreignKeyName: "eco_routes_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_routes_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_routes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_daily: {
        Row: {
          count: number
          day: string
          entity_id: string
          entity_type: string
          metric: string
        }
        Insert: {
          count?: number
          day: string
          entity_id: string
          entity_type: string
          metric: string
        }
        Update: {
          count?: number
          day?: string
          entity_id?: string
          entity_type?: string
          metric?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          config: Json
          enabled: boolean
          id: number
          key: string
          municipality_id: string | null
          province_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          enabled?: boolean
          id?: never
          key: string
          municipality_id?: string | null
          province_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          enabled?: boolean
          id?: never
          key?: string
          municipality_id?: string | null
          province_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_municipality_id_province_id_fkey"
            columns: ["municipality_id", "province_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id", "province_id"]
          },
          {
            foreignKeyName: "feature_flags_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          from_status: string | null
          id: number
          moderator_id: string | null
          reason: string | null
          to_status: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          from_status?: string | null
          id?: never
          moderator_id?: string | null
          reason?: string | null
          to_status?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          from_status?: string | null
          id?: never
          moderator_id?: string | null
          reason?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          code: string
          created_at: string
          geom: unknown
          geom_simplified: unknown
          id: string
          name: string
          province_id: string
        }
        Insert: {
          code: string
          created_at?: string
          geom: unknown
          geom_simplified?: unknown
          id?: string
          name: string
          province_id: string
        }
        Update: {
          code?: string
          created_at?: string
          geom?: unknown
          geom_simplified?: unknown
          id?: string
          name?: string
          province_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipalities_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          municipalities: string[]
          push_enabled: boolean
          topics: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          municipalities?: string[]
          push_enabled?: boolean
          topics?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          municipalities?: string[]
          push_enabled?: boolean
          topics?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          payload: Json
          push_status: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          push_status?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          push_status?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          home_municipality_id: string | null
          id: string
          locale: string
          location_consent: boolean
          reputation: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          home_municipality_id?: string | null
          id: string
          locale?: string
          location_consent?: boolean
          reputation?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          home_municipality_id?: string | null
          id?: string
          locale?: string
          location_consent?: boolean
          reputation?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_home_municipality_id_fkey"
            columns: ["home_municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          valid_from: string
          valid_until: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provinces: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_success_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_success_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_success_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_runs: {
        Row: {
          attempts: number
          error: string | null
          finished_at: string | null
          id: string
          period_end: string
          period_start: string
          province_id: string
          requested_by: string | null
          started_at: string
          status: string
          storage_path: string | null
          trigger: string
          version: number
        }
        Insert: {
          attempts?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          period_end: string
          period_start: string
          province_id: string
          requested_by?: string | null
          started_at?: string
          status?: string
          storage_path?: string | null
          trigger: string
          version: number
        }
        Update: {
          attempts?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          province_id?: string
          requested_by?: string | null
          started_at?: string
          status?: string
          storage_path?: string | null
          trigger?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_runs_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_categories: {
        Row: {
          active: boolean
          code: string
          icon: string
          kind: string
          name: string
          sort: number
        }
        Insert: {
          active?: boolean
          code: string
          icon: string
          kind: string
          name: string
          sort?: number
        }
        Update: {
          active?: boolean
          code?: string
          icon?: string
          kind?: string
          name?: string
          sort?: number
        }
        Relationships: []
      }
      request_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: number
          note: string | null
          request_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          note?: string | null
          request_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          note?: string | null
          request_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "citizen_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_votes: {
        Row: {
          created_at: string
          request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          request_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_votes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "citizen_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tourism_places: {
        Row: {
          accessibility: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          geom: unknown
          id: string
          kind: string
          municipality_id: string
          name: string
          opening_info: string | null
          proposed_by: string | null
          province_id: string
          reviewed_by: string | null
          search_vector: unknown
          services: Json
          slug: string
          status: string
          status_reason: string | null
          translations: Json
          updated_at: string
          version: number
        }
        Insert: {
          accessibility?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          geom: unknown
          id?: string
          kind: string
          municipality_id: string
          name: string
          opening_info?: string | null
          proposed_by?: string | null
          province_id: string
          reviewed_by?: string | null
          search_vector?: unknown
          services?: Json
          slug: string
          status?: string
          status_reason?: string | null
          translations?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          accessibility?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          geom?: unknown
          id?: string
          kind?: string
          municipality_id?: string
          name?: string
          opening_info?: string | null
          proposed_by?: string | null
          province_id?: string
          reviewed_by?: string | null
          search_vector?: unknown
          services?: Json
          slug?: string
          status?: string
          status_reason?: string | null
          translations?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tourism_places_municipality_id_province_id_fkey"
            columns: ["municipality_id", "province_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id", "province_id"]
          },
          {
            foreignKeyName: "tourism_places_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tourism_places_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tourism_places_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_report_types: {
        Row: {
          active: boolean
          code: string
          default_severity: number
          default_ttl: string
          icon: string
          name: string
          sort: number
        }
        Insert: {
          active?: boolean
          code: string
          default_severity: number
          default_ttl: string
          icon: string
          name: string
          sort?: number
        }
        Update: {
          active?: boolean
          code?: string
          default_severity?: number
          default_ttl?: string
          icon?: string
          name?: string
          sort?: number
        }
        Relationships: []
      }
      traffic_reports: {
        Row: {
          created_at: string
          description: string | null
          escalated_request_id: string | null
          expires_at: string
          geom: unknown
          id: string
          idempotency_key: string | null
          municipality_id: string | null
          province_id: string
          reporter_id: string | null
          severity: number
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          escalated_request_id?: string | null
          expires_at: string
          geom: unknown
          id?: string
          idempotency_key?: string | null
          municipality_id?: string | null
          province_id: string
          reporter_id?: string | null
          severity: number
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          escalated_request_id?: string | null
          expires_at?: string
          geom?: unknown
          id?: string
          idempotency_key?: string | null
          municipality_id?: string | null
          province_id?: string
          reporter_id?: string | null
          severity?: number
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_reports_escalated_request_id_fkey"
            columns: ["escalated_request_id"]
            isOneToOne: false
            referencedRelation: "citizen_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_reports_municipality_id_province_id_fkey"
            columns: ["municipality_id", "province_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id", "province_id"]
          },
          {
            foreignKeyName: "traffic_reports_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_reports_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "traffic_report_types"
            referencedColumns: ["code"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: number
          municipality_id: string | null
          province_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: never
          municipality_id?: string | null
          province_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: never
          municipality_id?: string | null
          province_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_municipality_id_province_id_fkey"
            columns: ["municipality_id", "province_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id", "province_id"]
          },
          {
            foreignKeyName: "user_roles_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_kpi_snapshots: {
        Row: {
          created_at: string
          id: number
          metrics: Json
          municipality_id: string | null
          period_start: string
          report_run_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          metrics: Json
          municipality_id?: string | null
          period_start: string
          report_run_id: string
        }
        Update: {
          created_at?: string
          id?: never
          metrics?: Json
          municipality_id?: string | null
          period_start?: string
          report_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_kpi_snapshots_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_kpi_snapshots_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_request: {
        Args: { p_assignee: string; p_id: string }
        Returns: Json
      }
      assign_role: {
        Args: { p_municipality_id: string; p_role: string; p_user_id: string }
        Returns: Json
      }
      authorize_report_download: { Args: { p_run_id: string }; Returns: Json }
      change_request_status: {
        Args: {
          p_expected_status: string
          p_id: string
          p_note?: string
          p_to: string
        }
        Returns: Json
      }
      create_citizen_request: {
        Args: {
          p_category: string
          p_description: string
          p_idempotency_key: string
          p_kind: string
          p_lat?: number
          p_lng?: number
          p_municipality_id?: string
          p_title: string
        }
        Returns: Json
      }
      create_promotion: {
        Args: {
          p_business_id: string
          p_description?: string
          p_title: string
          p_valid_from: string
          p_valid_until: string
        }
        Returns: Json
      }
      create_traffic_report: {
        Args: {
          p_description?: string
          p_idempotency_key: string
          p_lat: number
          p_lng: number
          p_severity?: number
          p_type: string
        }
        Returns: Json
      }
      escalate_traffic_report: {
        Args: { p_category?: string; p_id: string }
        Returns: Json
      }
      kpi_summary: {
        Args: { p_from: string; p_municipality_id?: string; p_to: string }
        Returns: Json
      }
      map_aggregates: { Args: never; Returns: Json }
      map_features: {
        Args: {
          p_layers?: string[]
          p_limit?: number
          p_max_lat: number
          p_max_lng: number
          p_min_lat: number
          p_min_lng: number
        }
        Returns: Json
      }
      moderate_traffic_report: {
        Args: {
          p_expected_status: string
          p_id: string
          p_note?: string
          p_to: string
        }
        Returns: Json
      }
      my_activity: { Args: never; Returns: Json }
      propose_place: {
        Args: {
          p_description?: string
          p_kind: string
          p_lat: number
          p_lng: number
          p_name: string
        }
        Returns: Json
      }
      propose_route: {
        Args: {
          p_description?: string
          p_difficulty: string
          p_duration_min: number
          p_geojson: Json
          p_kind: string
          p_name: string
        }
        Returns: Json
      }
      register_attachment: {
        Args: { p_entity: string; p_entity_id: string; p_path: string }
        Returns: Json
      }
      register_push_device: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent?: string
        }
        Returns: Json
      }
      request_assignees: {
        Args: { p_ids: string[] }
        Returns: {
          assignee_id: string
          assignee_name: string
          request_id: string
        }[]
      }
      request_weekly_report: { Args: { p_period_start: string }; Returns: Json }
      review_content: {
        Args: {
          p_entity: string
          p_expected_status: string
          p_id: string
          p_reason?: string
          p_to: string
        }
        Returns: Json
      }
      revoke_role: {
        Args: { p_municipality_id: string; p_role: string; p_user_id: string }
        Returns: Json
      }
      search_all: {
        Args: { p_limit?: number; p_q: string }
        Returns: {
          entity: string
          id: string
          municipality_id: string
          name: string
          rank: number
        }[]
      }
      set_business_hours: {
        Args: { p_business_id: string; p_hours: Json }
        Returns: Json
      }
      set_request_public: {
        Args: { p_id: string; p_public: boolean }
        Returns: Json
      }
      staff_directory: {
        Args: { p_municipality_id: string }
        Returns: {
          display_name: string
          provincial: boolean
          role: string
          user_id: string
        }[]
      }
      submit_business: {
        Args: {
          p_address?: string
          p_category_slug: string
          p_description?: string
          p_email?: string
          p_idempotency_key: string
          p_lat: number
          p_lng: number
          p_name: string
          p_phone?: string
          p_website?: string
          p_whatsapp?: string
        }
        Returns: Json
      }
      toggle_request_vote: { Args: { p_request_id: string }; Returns: Json }
      track_engagement: {
        Args: { p_entity_id: string; p_entity_type: string; p_metric: string }
        Returns: undefined
      }
      unregister_push_device: { Args: { p_endpoint: string }; Returns: Json }
      update_business: {
        Args: { p_changes: Json; p_id: string; p_version: number }
        Returns: Json
      }
      update_place: {
        Args: { p_changes: Json; p_id: string; p_version: number }
        Returns: Json
      }
      update_route: {
        Args: { p_changes: Json; p_id: string; p_version: number }
        Returns: Json
      }
      weekly_report_begin: {
        Args: { p_manual?: boolean; p_period_start?: string }
        Returns: Json
      }
      weekly_report_finish: {
        Args: {
          p_error?: string
          p_ok: boolean
          p_run_id: string
          p_storage_path?: string
        }
        Returns: Json
      }
      worker_attachment_info: { Args: { p_id: string }; Returns: Json }
      worker_attachment_processed: {
        Args: {
          p_bytes?: number
          p_error?: string
          p_final_path?: string
          p_height?: number
          p_id: string
          p_ok: boolean
          p_width?: number
        }
        Returns: Json
      }
      worker_attachment_published: { Args: { p_id: string }; Returns: Json }
      worker_claim_jobs: {
        Args: { p_limit?: number; p_lock_seconds?: number }
        Returns: Json
      }
      worker_finish_job: {
        Args: { p_error?: string; p_id: number; p_ok: boolean }
        Returns: undefined
      }
      worker_notify_moderators: {
        Args: { p_entity: string; p_id: string }
        Returns: number
      }
      worker_push_payload: {
        Args: { p_notification_id: string }
        Returns: Json
      }
      worker_push_result: {
        Args: {
          p_gone_endpoints?: string[]
          p_notification_id: string
          p_ok_endpoints?: string[]
          p_sent: boolean
        }
        Returns: undefined
      }
      worker_queue_health: { Args: never; Returns: Json }
      worker_report_run: { Args: { p_run_id: string }; Returns: Json }
      worker_run_fanout_alert: {
        Args: { p_traffic_report_id: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
