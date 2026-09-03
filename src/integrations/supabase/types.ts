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
      ai_advice: {
        Row: {
          actionable: boolean
          advice_type: string
          analysis_period_end: string | null
          analysis_period_start: string | null
          confidence_level: string
          confidence_score: number
          created_at: string
          data_available: Json | null
          data_confidence_level: string
          data_confidence_score: number
          data_missing: Json | null
          decision_facts: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          evidence: Json | null
          execution_block_reason: string | null
          execution_block_reason_label: string | null
          execution_blockers: Json | null
          execution_eligibility: string
          expected_impact: string | null
          guardrail_evaluated_at: string | null
          guardrail_notes: string | null
          guardrail_version: string | null
          id: string
          is_test: boolean
          model_name: string
          model_provider: string
          outcome_measured_at: string | null
          outcome_snapshot: Json | null
          platform: string
          prompt_version: string
          proposed_action: string | null
          proposed_payload: Json | null
          reasoning: string | null
          rejection_notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string
          run_id: string | null
          status: string
          summary: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actionable?: boolean
          advice_type: string
          analysis_period_end?: string | null
          analysis_period_start?: string | null
          confidence_level?: string
          confidence_score?: number
          created_at?: string
          data_available?: Json | null
          data_confidence_level?: string
          data_confidence_score?: number
          data_missing?: Json | null
          decision_facts?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          evidence?: Json | null
          execution_block_reason?: string | null
          execution_block_reason_label?: string | null
          execution_blockers?: Json | null
          execution_eligibility?: string
          expected_impact?: string | null
          guardrail_evaluated_at?: string | null
          guardrail_notes?: string | null
          guardrail_version?: string | null
          id?: string
          is_test?: boolean
          model_name: string
          model_provider: string
          outcome_measured_at?: string | null
          outcome_snapshot?: Json | null
          platform?: string
          prompt_version: string
          proposed_action?: string | null
          proposed_payload?: Json | null
          reasoning?: string | null
          rejection_notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          run_id?: string | null
          status?: string
          summary: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          actionable?: boolean
          advice_type?: string
          analysis_period_end?: string | null
          analysis_period_start?: string | null
          confidence_level?: string
          confidence_score?: number
          created_at?: string
          data_available?: Json | null
          data_confidence_level?: string
          data_confidence_score?: number
          data_missing?: Json | null
          decision_facts?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          evidence?: Json | null
          execution_block_reason?: string | null
          execution_block_reason_label?: string | null
          execution_blockers?: Json | null
          execution_eligibility?: string
          expected_impact?: string | null
          guardrail_evaluated_at?: string | null
          guardrail_notes?: string | null
          guardrail_version?: string | null
          id?: string
          is_test?: boolean
          model_name?: string
          model_provider?: string
          outcome_measured_at?: string | null
          outcome_snapshot?: Json | null
          platform?: string
          prompt_version?: string
          proposed_action?: string | null
          proposed_payload?: Json | null
          reasoning?: string | null
          rejection_notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          run_id?: string | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_advice_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_advice_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_advice_audit: {
        Row: {
          action: string
          actor_id: string | null
          advice_id: string | null
          created_at: string
          detail: Json | null
          id: string
          run_id: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          advice_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          run_id?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          advice_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          run_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_advice_audit_advice_id_fkey"
            columns: ["advice_id"]
            isOneToOne: false
            referencedRelation: "ai_advice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_advice_audit_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_advice_audit_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analysis_runs: {
        Row: {
          advice_count: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          data_quality: Json | null
          error: string | null
          estimated_cost_usd: number | null
          id: string
          input_tokens: number | null
          is_test: boolean
          model_name: string
          model_provider: string
          output_tokens: number | null
          period_days: number
          period_end: string
          period_start: string
          platform: string
          prompt_version: string
          runtime_ms: number | null
          snapshot: Json | null
          status: string
          workspace_id: string
        }
        Insert: {
          advice_count?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          data_quality?: Json | null
          error?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          is_test?: boolean
          model_name: string
          model_provider: string
          output_tokens?: number | null
          period_days: number
          period_end: string
          period_start: string
          platform?: string
          prompt_version: string
          runtime_ms?: number | null
          snapshot?: Json | null
          status?: string
          workspace_id: string
        }
        Update: {
          advice_count?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          data_quality?: Json | null
          error?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          is_test?: boolean
          model_name?: string
          model_provider?: string
          output_tokens?: number | null
          period_days?: number
          period_end?: string
          period_start?: string
          platform?: string
          prompt_version?: string
          runtime_ms?: number | null
          snapshot?: Json | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analysis_settings: {
        Row: {
          auto_execute: boolean
          budget_change_max_pct: number
          created_at: string
          default_period_days: number
          enabled: boolean
          min_confidence: number
          model: string
          provider: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          auto_execute?: boolean
          budget_change_max_pct?: number
          created_at?: string
          default_period_days?: number
          enabled?: boolean
          min_confidence?: number
          model?: string
          provider?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          auto_execute?: boolean
          budget_change_max_pct?: number
          created_at?: string
          default_period_days?: number
          enabled?: boolean
          min_confidence?: number
          model?: string
          provider?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
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
      cro_evidence: {
        Row: {
          active: boolean
          applies_to: string[]
          audience: string
          context: string | null
          created_at: string
          created_by: string | null
          devices: string
          evidence_level: string
          funnel_type: string[]
          id: string
          limitations: string | null
          metric: string | null
          not_applicable_to: string[]
          principle: string
          published_at: string | null
          recommended_application: string | null
          source_name: string | null
          source_url: string | null
          tags: string[]
          topic: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          active?: boolean
          applies_to?: string[]
          audience?: string
          context?: string | null
          created_at?: string
          created_by?: string | null
          devices?: string
          evidence_level?: string
          funnel_type?: string[]
          id?: string
          limitations?: string | null
          metric?: string | null
          not_applicable_to?: string[]
          principle: string
          published_at?: string | null
          recommended_application?: string | null
          source_name?: string | null
          source_url?: string | null
          tags?: string[]
          topic: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          active?: boolean
          applies_to?: string[]
          audience?: string
          context?: string | null
          created_at?: string
          created_by?: string | null
          devices?: string
          evidence_level?: string
          funnel_type?: string[]
          id?: string
          limitations?: string | null
          metric?: string | null
          not_applicable_to?: string[]
          principle?: string
          published_at?: string | null
          recommended_application?: string | null
          source_name?: string | null
          source_url?: string | null
          tags?: string[]
          topic?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cro_evidence_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      google_ads_change_log: {
        Row: {
          advice_id: string | null
          ai_reasoning: string | null
          approved_at: string | null
          approved_by: string | null
          change_type: string
          created_at: string
          customer_id: string | null
          data_used: Json
          draft_id: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          executed_at: string | null
          google_error: string | null
          google_result: Json | null
          id: string
          new_value: Json | null
          old_value: Json | null
          proposal: Json
          source: string
          status: string
          workspace_id: string
        }
        Insert: {
          advice_id?: string | null
          ai_reasoning?: string | null
          approved_at?: string | null
          approved_by?: string | null
          change_type: string
          created_at?: string
          customer_id?: string | null
          data_used?: Json
          draft_id?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          executed_at?: string | null
          google_error?: string | null
          google_result?: Json | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          proposal?: Json
          source: string
          status?: string
          workspace_id: string
        }
        Update: {
          advice_id?: string | null
          ai_reasoning?: string | null
          approved_at?: string | null
          approved_by?: string | null
          change_type?: string
          created_at?: string
          customer_id?: string | null
          data_used?: Json
          draft_id?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          executed_at?: string | null
          google_error?: string | null
          google_result?: Json | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          proposal?: Json
          source?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_change_log_advice_id_fkey"
            columns: ["advice_id"]
            isOneToOne: false
            referencedRelation: "ai_advice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_ads_change_log_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "search_campaign_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_ads_change_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      landing_ai_decisions: {
        Row: {
          ab_test_recommended: boolean
          applicability: string | null
          confidence: number
          created_at: string
          decision: string
          decision_area: string
          decision_key: string | null
          downgrade_reason: string | null
          downgraded_from: string | null
          evidence_level: string
          evidence_refs: Json
          evidence_source: string
          id: string
          metric: string | null
          observed_result: string | null
          proposal_id: string | null
          reasoning_summary: string | null
          run_id: string | null
          sample_size: number | null
          sort_order: number
          workspace_id: string
        }
        Insert: {
          ab_test_recommended?: boolean
          applicability?: string | null
          confidence?: number
          created_at?: string
          decision: string
          decision_area: string
          decision_key?: string | null
          downgrade_reason?: string | null
          downgraded_from?: string | null
          evidence_level: string
          evidence_refs?: Json
          evidence_source: string
          id?: string
          metric?: string | null
          observed_result?: string | null
          proposal_id?: string | null
          reasoning_summary?: string | null
          run_id?: string | null
          sample_size?: number | null
          sort_order?: number
          workspace_id: string
        }
        Update: {
          ab_test_recommended?: boolean
          applicability?: string | null
          confidence?: number
          created_at?: string
          decision?: string
          decision_area?: string
          decision_key?: string | null
          downgrade_reason?: string | null
          downgraded_from?: string | null
          evidence_level?: string
          evidence_refs?: Json
          evidence_source?: string
          id?: string
          metric?: string | null
          observed_result?: string | null
          proposal_id?: string | null
          reasoning_summary?: string | null
          run_id?: string | null
          sample_size?: number | null
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_ai_decisions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "landing_ai_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_ai_decisions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "landing_ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_ai_decisions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_ai_experiments: {
        Row: {
          created_at: string
          expected_direction: string | null
          guardrail_metric: string | null
          hypothesis: string
          id: string
          landing_page_id: string | null
          min_data_confidence: number | null
          min_sample_size: number | null
          name: string
          primary_metric: string
          proposal_id: string
          proposed_change: Json
          status: string
          target_block: string | null
          variant_a: string | null
          variant_b: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expected_direction?: string | null
          guardrail_metric?: string | null
          hypothesis: string
          id?: string
          landing_page_id?: string | null
          min_data_confidence?: number | null
          min_sample_size?: number | null
          name: string
          primary_metric: string
          proposal_id: string
          proposed_change?: Json
          status?: string
          target_block?: string | null
          variant_a?: string | null
          variant_b?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          expected_direction?: string | null
          guardrail_metric?: string | null
          hypothesis?: string
          id?: string
          landing_page_id?: string | null
          min_data_confidence?: number | null
          min_sample_size?: number | null
          name?: string
          primary_metric?: string
          proposal_id?: string
          proposed_change?: Json
          status?: string
          target_block?: string | null
          variant_a?: string | null
          variant_b?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_ai_experiments_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_ai_experiments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "landing_ai_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_ai_experiments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_ai_proposals: {
        Row: {
          ai_confidence: number
          applied_at: string | null
          applied_by: string | null
          applied_page_id: string | null
          applied_version_id: string | null
          created_at: string
          creative_direction: Json | null
          creative_ready: boolean
          data_confidence: number
          data_confidence_reasons: Json
          form_plan: Json
          id: string
          industry_id: string | null
          landing_page_id: string | null
          missing_data: Json
          mode: string
          page_plan: Json
          performance_data_used: Json
          product_plan: Json
          quality_scores: Json | null
          rationale: Json
          run_id: string
          status: string
          strategy: Json
          title: string
          updated_at: string
          visual_direction: Json
          workspace_id: string
        }
        Insert: {
          ai_confidence?: number
          applied_at?: string | null
          applied_by?: string | null
          applied_page_id?: string | null
          applied_version_id?: string | null
          created_at?: string
          creative_direction?: Json | null
          creative_ready?: boolean
          data_confidence?: number
          data_confidence_reasons?: Json
          form_plan?: Json
          id?: string
          industry_id?: string | null
          landing_page_id?: string | null
          missing_data?: Json
          mode: string
          page_plan?: Json
          performance_data_used?: Json
          product_plan?: Json
          quality_scores?: Json | null
          rationale?: Json
          run_id: string
          status?: string
          strategy?: Json
          title: string
          updated_at?: string
          visual_direction?: Json
          workspace_id: string
        }
        Update: {
          ai_confidence?: number
          applied_at?: string | null
          applied_by?: string | null
          applied_page_id?: string | null
          applied_version_id?: string | null
          created_at?: string
          creative_direction?: Json | null
          creative_ready?: boolean
          data_confidence?: number
          data_confidence_reasons?: Json
          form_plan?: Json
          id?: string
          industry_id?: string | null
          landing_page_id?: string | null
          missing_data?: Json
          mode?: string
          page_plan?: Json
          performance_data_used?: Json
          product_plan?: Json
          quality_scores?: Json | null
          rationale?: Json
          run_id?: string
          status?: string
          strategy?: Json
          title?: string
          updated_at?: string
          visual_direction?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_ai_proposals_applied_page_id_fkey"
            columns: ["applied_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_ai_proposals_applied_version_id_fkey"
            columns: ["applied_version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_ai_proposals_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_ai_proposals_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_ai_proposals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "landing_ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_ai_proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_ai_runs: {
        Row: {
          brief: string | null
          completed_at: string | null
          created_at: string
          dataset: Json
          dataset_meta: Json
          error_message: string | null
          estimated_cost_usd: number | null
          fallback_reason: string | null
          goal: string | null
          id: string
          industry_id: string | null
          input_tokens: number | null
          landing_page_id: string | null
          mode: string
          model: string
          output_tokens: number | null
          prompt_version: string
          provider: string
          raw_output: string | null
          runtime_ms: number | null
          status: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          brief?: string | null
          completed_at?: string | null
          created_at?: string
          dataset?: Json
          dataset_meta?: Json
          error_message?: string | null
          estimated_cost_usd?: number | null
          fallback_reason?: string | null
          goal?: string | null
          id?: string
          industry_id?: string | null
          input_tokens?: number | null
          landing_page_id?: string | null
          mode: string
          model: string
          output_tokens?: number | null
          prompt_version: string
          provider: string
          raw_output?: string | null
          runtime_ms?: number | null
          status?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          brief?: string | null
          completed_at?: string | null
          created_at?: string
          dataset?: Json
          dataset_meta?: Json
          error_message?: string | null
          estimated_cost_usd?: number | null
          fallback_reason?: string | null
          goal?: string | null
          id?: string
          industry_id?: string | null
          input_tokens?: number | null
          landing_page_id?: string | null
          mode?: string
          model?: string
          output_tokens?: number | null
          prompt_version?: string
          provider?: string
          raw_output?: string | null
          runtime_ms?: number | null
          status?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_ai_runs_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_ai_runs_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_ai_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_assets: {
        Row: {
          active: boolean
          alt_text: string | null
          approval_status: string
          asset_type: string
          created_at: string
          created_by: string | null
          desktop_ok: boolean
          height: number | null
          id: string
          industry_id: string | null
          mime_type: string | null
          mobile_ok: boolean
          name: string
          product_id: string | null
          source: string
          storage_path: string | null
          tags: string[]
          updated_at: string
          url: string
          visual_brief_id: string | null
          width: number | null
          workspace_id: string
        }
        Insert: {
          active?: boolean
          alt_text?: string | null
          approval_status?: string
          asset_type?: string
          created_at?: string
          created_by?: string | null
          desktop_ok?: boolean
          height?: number | null
          id?: string
          industry_id?: string | null
          mime_type?: string | null
          mobile_ok?: boolean
          name: string
          product_id?: string | null
          source?: string
          storage_path?: string | null
          tags?: string[]
          updated_at?: string
          url: string
          visual_brief_id?: string | null
          width?: number | null
          workspace_id: string
        }
        Update: {
          active?: boolean
          alt_text?: string | null
          approval_status?: string
          asset_type?: string
          created_at?: string
          created_by?: string | null
          desktop_ok?: boolean
          height?: number | null
          id?: string
          industry_id?: string | null
          mime_type?: string | null
          mobile_ok?: boolean
          name?: string
          product_id?: string | null
          source?: string
          storage_path?: string | null
          tags?: string[]
          updated_at?: string
          url?: string
          visual_brief_id?: string | null
          width?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_assets_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "landing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_assets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_form_submissions: {
        Row: {
          created_at: string
          external_event_id: string
          id: string
          ip_hash: string | null
          is_test: boolean
          landing_page_id: string
          landing_page_version_id: string | null
          lead_id: string | null
          payload: Json
          reject_reason: string | null
          session_id: string | null
          status: string
          variant_key: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          external_event_id: string
          id?: string
          ip_hash?: string | null
          is_test?: boolean
          landing_page_id: string
          landing_page_version_id?: string | null
          lead_id?: string | null
          payload?: Json
          reject_reason?: string | null
          session_id?: string | null
          status?: string
          variant_key?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          external_event_id?: string
          id?: string
          ip_hash?: string | null
          is_test?: boolean
          landing_page_id?: string
          landing_page_version_id?: string | null
          lead_id?: string | null
          payload?: Json
          reject_reason?: string | null
          session_id?: string | null
          status?: string
          variant_key?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_form_submissions_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_form_submissions_landing_page_version_id_fkey"
            columns: ["landing_page_version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_form_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_form_submissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_global_content: {
        Row: {
          block_type: string
          content: Json
          created_at: string
          id: string
          key: string
          label: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          block_type: string
          content?: Json
          created_at?: string
          id?: string
          key: string
          label: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          block_type?: string
          content?: Json
          created_at?: string
          id?: string
          key?: string
          label?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_global_content_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_events: {
        Row: {
          attribution: Json
          created_at: string
          event_type: string
          id: string
          is_preview: boolean
          is_test: boolean
          landing_page_id: string
          landing_page_version_id: string | null
          meta: Json
          path: string | null
          session_id: string
          variant_key: string
          workspace_id: string
        }
        Insert: {
          attribution?: Json
          created_at?: string
          event_type: string
          id?: string
          is_preview?: boolean
          is_test?: boolean
          landing_page_id: string
          landing_page_version_id?: string | null
          meta?: Json
          path?: string | null
          session_id: string
          variant_key?: string
          workspace_id: string
        }
        Update: {
          attribution?: Json
          created_at?: string
          event_type?: string
          id?: string
          is_preview?: boolean
          is_test?: boolean
          landing_page_id?: string
          landing_page_version_id?: string | null
          meta?: Json
          path?: string | null
          session_id?: string
          variant_key?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_events_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_events_landing_page_version_id_fkey"
            columns: ["landing_page_version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_forms: {
        Row: {
          created_at: string
          fields: Json
          id: string
          intro: string | null
          landing_page_id: string
          submit_label: string
          success_body: string
          success_title: string
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          fields?: Json
          id?: string
          intro?: string | null
          landing_page_id: string
          submit_label?: string
          success_body?: string
          success_title?: string
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          fields?: Json
          id?: string
          intro?: string | null
          landing_page_id?: string
          submit_label?: string
          success_body?: string
          success_title?: string
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_forms_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_forms_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_products: {
        Row: {
          created_at: string
          id: string
          landing_page_id: string
          overrides: Json
          product_id: string
          sort_order: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          landing_page_id: string
          overrides?: Json
          product_id: string
          sort_order?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          landing_page_id?: string
          overrides?: Json
          product_id?: string
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_products_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "landing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_sections: {
        Row: {
          block_type: string
          content: Json
          created_at: string
          enabled: boolean
          global_key: string | null
          id: string
          landing_page_id: string
          sort_order: number
          updated_at: string
          use_global: boolean
          variant_key: string
          workspace_id: string
        }
        Insert: {
          block_type: string
          content?: Json
          created_at?: string
          enabled?: boolean
          global_key?: string | null
          id?: string
          landing_page_id: string
          sort_order?: number
          updated_at?: string
          use_global?: boolean
          variant_key?: string
          workspace_id: string
        }
        Update: {
          block_type?: string
          content?: Json
          created_at?: string
          enabled?: boolean
          global_key?: string | null
          id?: string
          landing_page_id?: string
          sort_order?: number
          updated_at?: string
          use_global?: boolean
          variant_key?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_sections_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_sections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_testimonials: {
        Row: {
          author: string
          company: string | null
          created_at: string
          enabled: boolean
          id: string
          image_url: string | null
          landing_page_id: string
          quote: string
          role_title: string | null
          sort_order: number
          workspace_id: string
        }
        Insert: {
          author: string
          company?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          landing_page_id: string
          quote: string
          role_title?: string | null
          sort_order?: number
          workspace_id: string
        }
        Update: {
          author?: string
          company?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          landing_page_id?: string
          quote?: string
          role_title?: string | null
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_testimonials_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_testimonials_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_variants: {
        Row: {
          active: boolean
          created_at: string
          id: string
          landing_page_id: string
          name: string
          variant_key: string
          weight: number
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          landing_page_id: string
          name?: string
          variant_key?: string
          weight?: number
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          landing_page_id?: string
          name?: string
          variant_key?: string
          weight?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_variants_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_variants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_versions: {
        Row: {
          created_at: string
          id: string
          landing_page_id: string
          note: string | null
          published_at: string
          published_by: string | null
          published_by_email: string | null
          snapshot: Json
          version_number: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          landing_page_id: string
          note?: string | null
          published_at?: string
          published_by?: string | null
          published_by_email?: string | null
          snapshot: Json
          version_number: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          landing_page_id?: string
          note?: string | null
          published_at?: string
          published_by?: string | null
          published_by_email?: string | null
          snapshot?: Json
          version_number?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_versions_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          active: boolean
          base_url: string | null
          canonical_url: string | null
          created_at: string
          current_version_id: string | null
          funnel_type: string
          id: string
          industry_id: string | null
          is_test: boolean
          name: string
          noindex: boolean
          notify_channel: string | null
          notify_email: string | null
          notify_target: string | null
          notify_test_email: boolean
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          preview_token: string
          published_at: string | null
          published_by: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          template_key: string
          theme: Json
          updated_at: string
          url: string | null
          user_id: string | null
          version_counter: number
          workspace_id: string | null
        }
        Insert: {
          active?: boolean
          base_url?: string | null
          canonical_url?: string | null
          created_at?: string
          current_version_id?: string | null
          funnel_type?: string
          id?: string
          industry_id?: string | null
          is_test?: boolean
          name: string
          noindex?: boolean
          notify_channel?: string | null
          notify_email?: string | null
          notify_target?: string | null
          notify_test_email?: boolean
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          preview_token?: string
          published_at?: string | null
          published_by?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          template_key?: string
          theme?: Json
          updated_at?: string
          url?: string | null
          user_id?: string | null
          version_counter?: number
          workspace_id?: string | null
        }
        Update: {
          active?: boolean
          base_url?: string | null
          canonical_url?: string | null
          created_at?: string
          current_version_id?: string | null
          funnel_type?: string
          id?: string
          industry_id?: string | null
          is_test?: boolean
          name?: string
          noindex?: boolean
          notify_channel?: string | null
          notify_email?: string | null
          notify_target?: string | null
          notify_test_email?: boolean
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          preview_token?: string
          published_at?: string | null
          published_by?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          template_key?: string
          theme?: Json
          updated_at?: string
          url?: string | null
          user_id?: string | null
          version_counter?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_product_images: {
        Row: {
          alt_text: string | null
          asset_id: string | null
          created_at: string
          id: string
          image_type: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
          workspace_id: string
        }
        Insert: {
          alt_text?: string | null
          asset_id?: string | null
          created_at?: string
          id?: string
          image_type?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
          workspace_id: string
        }
        Update: {
          alt_text?: string | null
          asset_id?: string | null
          created_at?: string
          id?: string
          image_type?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_product_images_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "landing_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "landing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_product_images_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_products: {
        Row: {
          active: boolean
          ai_suggestions: Json
          category: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          external_id: string | null
          external_source: string | null
          featured: boolean
          id: string
          image_alt: string | null
          image_url: string | null
          individually_shippable: boolean | null
          industries: string[]
          letterbox_friendly: boolean | null
          long_text: string | null
          min_quantity: number | null
          name: string
          notes: string | null
          occasions: string[]
          personalization_options: string[]
          price_from: number | null
          product_url: string | null
          short_text: string | null
          sku: string | null
          slug: string
          sort_order: number
          tags: string[]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          ai_suggestions?: Json
          category?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          external_id?: string | null
          external_source?: string | null
          featured?: boolean
          id?: string
          image_alt?: string | null
          image_url?: string | null
          individually_shippable?: boolean | null
          industries?: string[]
          letterbox_friendly?: boolean | null
          long_text?: string | null
          min_quantity?: number | null
          name: string
          notes?: string | null
          occasions?: string[]
          personalization_options?: string[]
          price_from?: number | null
          product_url?: string | null
          short_text?: string | null
          sku?: string | null
          slug: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          ai_suggestions?: Json
          category?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          external_id?: string | null
          external_source?: string | null
          featured?: boolean
          id?: string
          image_alt?: string | null
          image_url?: string | null
          individually_shippable?: boolean | null
          industries?: string[]
          letterbox_friendly?: boolean | null
          long_text?: string | null
          min_quantity?: number | null
          name?: string
          notes?: string | null
          occasions?: string[]
          personalization_options?: string[]
          price_from?: number | null
          product_url?: string | null
          short_text?: string | null
          sku?: string | null
          slug?: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_visual_briefs: {
        Row: {
          approval_status: string
          aspect_ratio: string | null
          asset_id: string | null
          asset_status: string
          background_treatment: string | null
          block_type: string | null
          brief_text: string | null
          composition: string | null
          created_at: string
          created_by: string | null
          desktop_position: string | null
          generation_status: string
          id: string
          landing_page_id: string | null
          mobile_position: string | null
          product_ids: string[]
          proposal_id: string | null
          purpose: string | null
          section_id: string | null
          title: string
          updated_at: string
          visual_type: string
          workspace_id: string
        }
        Insert: {
          approval_status?: string
          aspect_ratio?: string | null
          asset_id?: string | null
          asset_status?: string
          background_treatment?: string | null
          block_type?: string | null
          brief_text?: string | null
          composition?: string | null
          created_at?: string
          created_by?: string | null
          desktop_position?: string | null
          generation_status?: string
          id?: string
          landing_page_id?: string | null
          mobile_position?: string | null
          product_ids?: string[]
          proposal_id?: string | null
          purpose?: string | null
          section_id?: string | null
          title: string
          updated_at?: string
          visual_type?: string
          workspace_id: string
        }
        Update: {
          approval_status?: string
          aspect_ratio?: string | null
          asset_id?: string | null
          asset_status?: string
          background_treatment?: string | null
          block_type?: string | null
          brief_text?: string | null
          composition?: string | null
          created_at?: string
          created_by?: string | null
          desktop_position?: string | null
          generation_status?: string
          id?: string
          landing_page_id?: string | null
          mobile_position?: string | null
          product_ids?: string[]
          proposal_id?: string | null
          purpose?: string | null
          section_id?: string | null
          title?: string
          updated_at?: string
          visual_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_visual_briefs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "landing_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_visual_briefs_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_visual_briefs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "landing_ai_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_visual_briefs_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "landing_page_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_visual_briefs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          first_landing_at: string | null
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
          landing_page_slug: string | null
          landing_page_variant: string | null
          landing_page_version_id: string | null
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
          quote_details: Json
          raw: Json | null
          received_at: string
          referrer: string | null
          revenue: number | null
          search_term: string | null
          source: string | null
          status: string
          status_history: Json
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
          first_landing_at?: string | null
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
          landing_page_slug?: string | null
          landing_page_variant?: string | null
          landing_page_version_id?: string | null
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
          quote_details?: Json
          raw?: Json | null
          received_at?: string
          referrer?: string | null
          revenue?: number | null
          search_term?: string | null
          source?: string | null
          status?: string
          status_history?: Json
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
          first_landing_at?: string | null
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
          landing_page_slug?: string | null
          landing_page_variant?: string | null
          landing_page_version_id?: string | null
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
          quote_details?: Json
          raw?: Json | null
          received_at?: string
          referrer?: string | null
          revenue?: number | null
          search_term?: string | null
          source?: string | null
          status?: string
          status_history?: Json
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
      linkedin_icp_profiles: {
        Row: {
          ai_company_profile: string | null
          ai_decision_maker: string | null
          ai_rationale: string | null
          company_size: string | null
          created_at: string
          exclusions: string[]
          id: string
          industry: string | null
          job_titles: string[]
          keywords: string[]
          name: string
          occasion: string | null
          region: string | null
          search_urls: Json
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ai_company_profile?: string | null
          ai_decision_maker?: string | null
          ai_rationale?: string | null
          company_size?: string | null
          created_at?: string
          exclusions?: string[]
          id?: string
          industry?: string | null
          job_titles?: string[]
          keywords?: string[]
          name: string
          occasion?: string | null
          region?: string | null
          search_urls?: Json
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          ai_company_profile?: string | null
          ai_decision_maker?: string | null
          ai_rationale?: string | null
          company_size?: string | null
          created_at?: string
          exclusions?: string[]
          id?: string
          industry?: string | null
          job_titles?: string[]
          keywords?: string[]
          name?: string
          occasion?: string | null
          region?: string | null
          search_urls?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_icp_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_prospects: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string
          headline: string | null
          id: string
          invite_message: string | null
          invited_at: string | null
          job_title: string | null
          linkedin_url: string | null
          notes: string | null
          profile_id: string | null
          responded_at: string | null
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name: string
          headline?: string | null
          id?: string
          invite_message?: string | null
          invited_at?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          notes?: string | null
          profile_id?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string
          headline?: string | null
          id?: string
          invite_message?: string | null
          invited_at?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          notes?: string | null
          profile_id?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_prospects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "linkedin_icp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_prospects_workspace_id_fkey"
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
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          dedupe_key: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_test: boolean
          link_path: string | null
          meta: Json
          read_at: string | null
          read_by: string | null
          severity: string
          title: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_test?: boolean
          link_path?: string | null
          meta?: Json
          read_at?: string | null
          read_by?: string | null
          severity?: string
          title: string
          workspace_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_test?: boolean
          link_path?: string | null
          meta?: Json
          read_at?: string | null
          read_by?: string | null
          severity?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      search_campaign_drafts: {
        Row: {
          ai_confidence: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          created_in_google_at: string | null
          creation_error: string | null
          creation_plan: Json | null
          creation_result: Json | null
          creation_started_at: string | null
          data_confidence: number
          data_confidence_reasons: Json
          data_sources: Json
          dataset_meta: Json
          error: string | null
          estimated_cost_usd: number | null
          fallback_reason: string | null
          funnel: string
          google_campaign_id: string | null
          google_campaign_name: string | null
          google_customer_id: string | null
          google_resource_names: Json
          id: string
          industry_id: string | null
          industry_name: string | null
          input_tokens: number | null
          landing_page_id: string | null
          landing_page_name: string | null
          landing_page_url: string | null
          language: string
          locations: string[]
          missing_data: Json
          model: string
          original_proposal: Json
          output_tokens: number | null
          prompt_version: string
          proposal: Json
          provider: string
          reviewed_at: string | null
          runtime_ms: number | null
          status: string
          target_daily_budget: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_confidence?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          created_in_google_at?: string | null
          creation_error?: string | null
          creation_plan?: Json | null
          creation_result?: Json | null
          creation_started_at?: string | null
          data_confidence?: number
          data_confidence_reasons?: Json
          data_sources?: Json
          dataset_meta?: Json
          error?: string | null
          estimated_cost_usd?: number | null
          fallback_reason?: string | null
          funnel: string
          google_campaign_id?: string | null
          google_campaign_name?: string | null
          google_customer_id?: string | null
          google_resource_names?: Json
          id?: string
          industry_id?: string | null
          industry_name?: string | null
          input_tokens?: number | null
          landing_page_id?: string | null
          landing_page_name?: string | null
          landing_page_url?: string | null
          language?: string
          locations?: string[]
          missing_data?: Json
          model: string
          original_proposal?: Json
          output_tokens?: number | null
          prompt_version: string
          proposal?: Json
          provider: string
          reviewed_at?: string | null
          runtime_ms?: number | null
          status?: string
          target_daily_budget?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_confidence?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          created_in_google_at?: string | null
          creation_error?: string | null
          creation_plan?: Json | null
          creation_result?: Json | null
          creation_started_at?: string | null
          data_confidence?: number
          data_confidence_reasons?: Json
          data_sources?: Json
          dataset_meta?: Json
          error?: string | null
          estimated_cost_usd?: number | null
          fallback_reason?: string | null
          funnel?: string
          google_campaign_id?: string | null
          google_campaign_name?: string | null
          google_customer_id?: string | null
          google_resource_names?: Json
          id?: string
          industry_id?: string | null
          industry_name?: string | null
          input_tokens?: number | null
          landing_page_id?: string | null
          landing_page_name?: string | null
          landing_page_url?: string | null
          language?: string
          locations?: string[]
          missing_data?: Json
          model?: string
          original_proposal?: Json
          output_tokens?: number | null
          prompt_version?: string
          proposal?: Json
          provider?: string
          reviewed_at?: string | null
          runtime_ms?: number | null
          status?: string
          target_daily_budget?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_campaign_drafts_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_campaign_drafts_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_campaign_drafts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          notify_email: string | null
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
          notify_email?: string | null
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
          notify_email?: string | null
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
