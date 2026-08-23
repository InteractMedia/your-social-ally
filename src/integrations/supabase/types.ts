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
      conversion_definitions: {
        Row: {
          created_at: string
          external_id: string | null
          funnel: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          platform: string | null
          source: string
          stage_order: number | null
          updated_at: string
          usage: string | null
          user_id: string | null
          value_type: string | null
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          funnel?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          platform?: string | null
          source?: string
          stage_order?: number | null
          updated_at?: string
          usage?: string | null
          user_id?: string | null
          value_type?: string | null
        }
        Update: {
          created_at?: string
          external_id?: string | null
          funnel?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          platform?: string | null
          source?: string
          stage_order?: number | null
          updated_at?: string
          usage?: string | null
          user_id?: string | null
          value_type?: string | null
        }
        Relationships: []
      }
      conversion_events: {
        Row: {
          ad_group_id: string | null
          ad_group_name: string | null
          ad_id: string | null
          campaign_id: string | null
          campaign_name: string | null
          company_name: string | null
          contact_email: string | null
          created_at: string
          currency: string | null
          customer_account: string | null
          definition_key: string
          funnel: string | null
          gbraid: string | null
          gclid: string | null
          id: string
          industry: string | null
          keyword: string | null
          landing_page: string | null
          match_type: string | null
          occurred_at: string
          platform: string | null
          raw: Json | null
          search_term: string | null
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          value: number | null
          wbraid: string | null
        }
        Insert: {
          ad_group_id?: string | null
          ad_group_name?: string | null
          ad_id?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          company_name?: string | null
          contact_email?: string | null
          created_at?: string
          currency?: string | null
          customer_account?: string | null
          definition_key: string
          funnel?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          industry?: string | null
          keyword?: string | null
          landing_page?: string | null
          match_type?: string | null
          occurred_at?: string
          platform?: string | null
          raw?: Json | null
          search_term?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
          wbraid?: string | null
        }
        Update: {
          ad_group_id?: string | null
          ad_group_name?: string | null
          ad_id?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          company_name?: string | null
          contact_email?: string | null
          created_at?: string
          currency?: string | null
          customer_account?: string | null
          definition_key?: string
          funnel?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          industry?: string | null
          keyword?: string | null
          landing_page?: string | null
          match_type?: string | null
          occurred_at?: string
          platform?: string | null
          raw?: Json | null
          search_term?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
          wbraid?: string | null
        }
        Relationships: []
      }
      google_ads_accounts: {
        Row: {
          created_at: string
          currency_code: string | null
          customer_id: string
          descriptive_name: string | null
          id: string
          is_manager: boolean
          is_selected: boolean
          last_synced_at: string | null
          manager_customer_id: string | null
          time_zone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency_code?: string | null
          customer_id: string
          descriptive_name?: string | null
          id?: string
          is_manager?: boolean
          is_selected?: boolean
          last_synced_at?: string | null
          manager_customer_id?: string | null
          time_zone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency_code?: string | null
          customer_id?: string
          descriptive_name?: string | null
          id?: string
          is_manager?: boolean
          is_selected?: boolean
          last_synced_at?: string | null
          manager_customer_id?: string | null
          time_zone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_conversion_mappings: {
        Row: {
          created_at: string
          currency: string
          enabled: boolean
          fixed_value: number | null
          google_conversion_action_id: string | null
          google_conversion_action_name: string | null
          id: string
          internal_event_name: string
          primary_signal: boolean
          updated_at: string
          upload_value: boolean
          value_source: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          enabled?: boolean
          fixed_value?: number | null
          google_conversion_action_id?: string | null
          google_conversion_action_name?: string | null
          id?: string
          internal_event_name: string
          primary_signal?: boolean
          updated_at?: string
          upload_value?: boolean
          value_source?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          enabled?: boolean
          fixed_value?: number | null
          google_conversion_action_id?: string | null
          google_conversion_action_name?: string | null
          id?: string
          internal_event_name?: string
          primary_signal?: boolean
          updated_at?: string
          upload_value?: boolean
          value_source?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_conversion_mappings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      google_conversion_upload_log: {
        Row: {
          api_response: Json | null
          approved_by: string | null
          approved_by_email: string | null
          click_identifier_type: string | null
          conversion_event_id: string | null
          conversion_time: string | null
          created_at: string
          currency: string | null
          customer_id: string | null
          diagnostics: Json | null
          error_code: string | null
          error_message: string | null
          google_conversion_action_id: string | null
          google_conversion_action_name: string | null
          google_request_id: string | null
          google_transaction_id: string | null
          id: string
          internal_event_name: string
          lead_id: string | null
          mode: string
          processing_status: string | null
          result: string
          upload_method: string | null
          value: number | null
          workspace_id: string
        }
        Insert: {
          api_response?: Json | null
          approved_by?: string | null
          approved_by_email?: string | null
          click_identifier_type?: string | null
          conversion_event_id?: string | null
          conversion_time?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          diagnostics?: Json | null
          error_code?: string | null
          error_message?: string | null
          google_conversion_action_id?: string | null
          google_conversion_action_name?: string | null
          google_request_id?: string | null
          google_transaction_id?: string | null
          id?: string
          internal_event_name: string
          lead_id?: string | null
          mode?: string
          processing_status?: string | null
          result: string
          upload_method?: string | null
          value?: number | null
          workspace_id: string
        }
        Update: {
          api_response?: Json | null
          approved_by?: string | null
          approved_by_email?: string | null
          click_identifier_type?: string | null
          conversion_event_id?: string | null
          conversion_time?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          diagnostics?: Json | null
          error_code?: string | null
          error_message?: string | null
          google_conversion_action_id?: string | null
          google_conversion_action_name?: string | null
          google_request_id?: string | null
          google_transaction_id?: string | null
          id?: string
          internal_event_name?: string
          lead_id?: string | null
          mode?: string
          processing_status?: string | null
          result?: string
          upload_method?: string | null
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_conversion_upload_log_conversion_event_id_fkey"
            columns: ["conversion_event_id"]
            isOneToOne: false
            referencedRelation: "lead_conversion_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_conversion_upload_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_conversion_upload_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      industries: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          active: boolean
          created_at: string
          funnel_type: string
          id: string
          industry_id: string | null
          name: string
          slug: string
          updated_at: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          funnel_type?: string
          id?: string
          industry_id?: string | null
          name: string
          slug: string
          updated_at?: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          funnel_type?: string
          id?: string
          industry_id?: string | null
          name?: string
          slug?: string
          updated_at?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          lead_id: string
          meta: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          lead_id: string
          meta?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          lead_id?: string
          meta?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_conversion_events: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          click_identifier_type: string | null
          conversion_event: string
          conversion_timestamp: string
          created_at: string
          currency: string | null
          google_conversion_action_id: string | null
          google_conversion_action_name: string | null
          google_conversion_currency: string | null
          google_conversion_value: number | null
          google_diagnostics: Json | null
          google_next_retry_at: string | null
          google_processing_checked_at: string | null
          google_processing_status: string | null
          google_request_id: string | null
          google_request_reference: string | null
          google_transaction_id: string | null
          google_upload_attempts: number
          google_upload_error: string | null
          google_upload_method: string | null
          google_upload_reason: string | null
          google_upload_status: string | null
          google_upload_timestamp: string | null
          id: string
          lead_id: string
          platform: string
          updated_at: string
          uploaded_to_google: boolean
          value: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          click_identifier_type?: string | null
          conversion_event: string
          conversion_timestamp?: string
          created_at?: string
          currency?: string | null
          google_conversion_action_id?: string | null
          google_conversion_action_name?: string | null
          google_conversion_currency?: string | null
          google_conversion_value?: number | null
          google_diagnostics?: Json | null
          google_next_retry_at?: string | null
          google_processing_checked_at?: string | null
          google_processing_status?: string | null
          google_request_id?: string | null
          google_request_reference?: string | null
          google_transaction_id?: string | null
          google_upload_attempts?: number
          google_upload_error?: string | null
          google_upload_method?: string | null
          google_upload_reason?: string | null
          google_upload_status?: string | null
          google_upload_timestamp?: string | null
          id?: string
          lead_id: string
          platform?: string
          updated_at?: string
          uploaded_to_google?: boolean
          value?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          click_identifier_type?: string | null
          conversion_event?: string
          conversion_timestamp?: string
          created_at?: string
          currency?: string | null
          google_conversion_action_id?: string | null
          google_conversion_action_name?: string | null
          google_conversion_currency?: string | null
          google_conversion_value?: number | null
          google_diagnostics?: Json | null
          google_next_retry_at?: string | null
          google_processing_checked_at?: string | null
          google_processing_status?: string | null
          google_request_id?: string | null
          google_request_reference?: string | null
          google_transaction_id?: string | null
          google_upload_attempts?: number
          google_upload_error?: string | null
          google_upload_method?: string | null
          google_upload_reason?: string | null
          google_upload_status?: string | null
          google_upload_timestamp?: string | null
          id?: string
          lead_id?: string
          platform?: string
          updated_at?: string
          uploaded_to_google?: boolean
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_conversion_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_external_events: {
        Row: {
          created_at: string
          event_type: string
          external_event_id: string
          external_source: string
          id: string
          lead_id: string | null
          payload: Json | null
          status: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          external_event_id: string
          external_source: string
          id?: string
          lead_id?: string | null
          payload?: Json | null
          status?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          external_event_id?: string
          external_source?: string
          id?: string
          lead_id?: string | null
          payload?: Json | null
          status?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_external_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_external_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ad_group_id: string | null
          ad_group_name: string | null
          ad_id: string | null
          ad_name: string | null
          attribution_model: string
          became_customer: boolean
          campaign_id: string | null
          campaign_name: string | null
          click_ids: Json
          company_domain: string | null
          company_name: string
          company_size: string | null
          contact_name: string | null
          created_at: string
          customer_date: string | null
          email: string | null
          expected_value: number | null
          external_id: string | null
          external_order_id: string | null
          external_source: string | null
          fbclid: string | null
          first_order_date: string | null
          first_touch: Json | null
          funnel_type: string
          gbraid: string | null
          gclid: string | null
          gross_margin: number | null
          id: string
          industry_id: string | null
          industry_name: string | null
          ingest_source: string | null
          is_test: boolean
          keyword: string | null
          kvk_number: string | null
          landing_page: string | null
          landing_page_id: string | null
          landing_page_variant: string | null
          lead_quality: string
          lead_type: string
          li_fat_id: string | null
          lifetime_value: number | null
          match_type: string | null
          medium: string | null
          notes: string | null
          order_value: number | null
          phone: string | null
          platform: string | null
          poor_marked_at: string | null
          poor_reason: string | null
          poor_reason_id: string | null
          poor_reason_label: string | null
          poor_reason_notes: string | null
          raw: Json | null
          received_at: string
          referrer: string | null
          revenue: number | null
          search_term: string | null
          source: string | null
          status: string
          ttclid: string | null
          updated_at: string
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          wbraid: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          ad_group_id?: string | null
          ad_group_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          attribution_model?: string
          became_customer?: boolean
          campaign_id?: string | null
          campaign_name?: string | null
          click_ids?: Json
          company_domain?: string | null
          company_name: string
          company_size?: string | null
          contact_name?: string | null
          created_at?: string
          customer_date?: string | null
          email?: string | null
          expected_value?: number | null
          external_id?: string | null
          external_order_id?: string | null
          external_source?: string | null
          fbclid?: string | null
          first_order_date?: string | null
          first_touch?: Json | null
          funnel_type?: string
          gbraid?: string | null
          gclid?: string | null
          gross_margin?: number | null
          id?: string
          industry_id?: string | null
          industry_name?: string | null
          ingest_source?: string | null
          is_test?: boolean
          keyword?: string | null
          kvk_number?: string | null
          landing_page?: string | null
          landing_page_id?: string | null
          landing_page_variant?: string | null
          lead_quality?: string
          lead_type?: string
          li_fat_id?: string | null
          lifetime_value?: number | null
          match_type?: string | null
          medium?: string | null
          notes?: string | null
          order_value?: number | null
          phone?: string | null
          platform?: string | null
          poor_marked_at?: string | null
          poor_reason?: string | null
          poor_reason_id?: string | null
          poor_reason_label?: string | null
          poor_reason_notes?: string | null
          raw?: Json | null
          received_at?: string
          referrer?: string | null
          revenue?: number | null
          search_term?: string | null
          source?: string | null
          status?: string
          ttclid?: string | null
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          wbraid?: string | null
          website?: string | null
          workspace_id: string
        }
        Update: {
          ad_group_id?: string | null
          ad_group_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          attribution_model?: string
          became_customer?: boolean
          campaign_id?: string | null
          campaign_name?: string | null
          click_ids?: Json
          company_domain?: string | null
          company_name?: string
          company_size?: string | null
          contact_name?: string | null
          created_at?: string
          customer_date?: string | null
          email?: string | null
          expected_value?: number | null
          external_id?: string | null
          external_order_id?: string | null
          external_source?: string | null
          fbclid?: string | null
          first_order_date?: string | null
          first_touch?: Json | null
          funnel_type?: string
          gbraid?: string | null
          gclid?: string | null
          gross_margin?: number | null
          id?: string
          industry_id?: string | null
          industry_name?: string | null
          ingest_source?: string | null
          is_test?: boolean
          keyword?: string | null
          kvk_number?: string | null
          landing_page?: string | null
          landing_page_id?: string | null
          landing_page_variant?: string | null
          lead_quality?: string
          lead_type?: string
          li_fat_id?: string | null
          lifetime_value?: number | null
          match_type?: string | null
          medium?: string | null
          notes?: string | null
          order_value?: number | null
          phone?: string | null
          platform?: string | null
          poor_marked_at?: string | null
          poor_reason?: string | null
          poor_reason_id?: string | null
          poor_reason_label?: string | null
          poor_reason_notes?: string | null
          raw?: Json | null
          received_at?: string
          referrer?: string | null
          revenue?: number | null
          search_term?: string | null
          source?: string | null
          status?: string
          ttclid?: string | null
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          wbraid?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_poor_reason_id_fkey"
            columns: ["poor_reason_id"]
            isOneToOne: false
            referencedRelation: "poor_lead_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_connections: {
        Row: {
          app_id: string
          created_at: string
          granted_scopes: string[] | null
          id: string
          ig_business_id: string | null
          ig_username: string | null
          missing_scopes: string[] | null
          page_access_token: string
          page_id: string
          page_name: string | null
          scopes: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          granted_scopes?: string[] | null
          id?: string
          ig_business_id?: string | null
          ig_username?: string | null
          missing_scopes?: string[] | null
          page_access_token: string
          page_id: string
          page_name?: string | null
          scopes?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          granted_scopes?: string[] | null
          id?: string
          ig_business_id?: string | null
          ig_username?: string | null
          missing_scopes?: string[] | null
          page_access_token?: string
          page_id?: string
          page_name?: string | null
          scopes?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      poor_lead_reasons: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          label: string
          requires_notes: boolean
          sort_order: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          label: string
          requires_notes?: boolean
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          label?: string
          requires_notes?: boolean
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      workspace_ingest_keys: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          label: string
          last_used_at: string | null
          token_hash: string
          token_prefix: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          last_used_at?: string | null
          token_hash: string
          token_prefix: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          last_used_at?: string | null
          token_hash?: string
          token_prefix?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ingest_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
          offline_conversion_currency: string
          offline_conversion_mode: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name: string
          offline_conversion_currency?: string
          offline_conversion_mode?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          offline_conversion_currency?: string
          offline_conversion_mode?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
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
    Enums: {},
  },
} as const
