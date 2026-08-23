-- AI Ads Analyst (V1.4A): advice storage, analysis runs, settings and audit log.

CREATE TABLE public.ai_analysis_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  provider text NOT NULL DEFAULT 'anthropic',
  model text NOT NULL DEFAULT 'claude-sonnet-4-5',
  default_period_days integer NOT NULL DEFAULT 30 CHECK (default_period_days IN (7, 30, 90)),
  min_confidence integer NOT NULL DEFAULT 70 CHECK (min_confidence BETWEEN 0 AND 100),
  budget_change_max_pct integer NOT NULL DEFAULT 20 CHECK (budget_change_max_pct BETWEEN 1 AND 50),
  auto_execute boolean NOT NULL DEFAULT false CHECK (auto_execute = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis_settings TO authenticated;
GRANT ALL ON public.ai_analysis_settings TO service_role;
ALTER TABLE public.ai_analysis_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_settings_select" ON public.ai_analysis_settings
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ai_settings_insert" ON public.ai_analysis_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ai_settings_update" ON public.ai_analysis_settings
  FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.ai_analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'google_ads',
  customer_id text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_days integer NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  model_provider text NOT NULL,
  model_name text NOT NULL,
  prompt_version text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(10, 5),
  runtime_ms integer,
  advice_count integer NOT NULL DEFAULT 0,
  snapshot jsonb,
  data_quality jsonb,
  error text,
  is_test boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis_runs TO authenticated;
GRANT ALL ON public.ai_analysis_runs TO service_role;
ALTER TABLE public.ai_analysis_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_runs_select" ON public.ai_analysis_runs
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ai_runs_insert" ON public.ai_analysis_runs
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ai_runs_update" ON public.ai_analysis_runs
  FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ai_runs_delete" ON public.ai_analysis_runs
  FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX ai_runs_workspace_created_idx ON public.ai_analysis_runs (workspace_id, created_at DESC);

CREATE TABLE public.ai_advice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.ai_analysis_runs(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'google_ads',
  advice_type text NOT NULL,
  entity_type text,
  entity_id text,
  entity_name text,
  title text NOT NULL,
  summary text NOT NULL,
  reasoning text,
  proposed_action text,
  proposed_payload jsonb,
  expected_impact text,
  confidence_score integer NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  confidence_level text NOT NULL DEFAULT 'low' CHECK (confidence_level IN ('low', 'medium', 'high')),
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  evidence jsonb,
  data_available jsonb,
  data_missing jsonb,
  actionable boolean NOT NULL DEFAULT true,
  guardrail_notes text,
  analysis_period_start date,
  analysis_period_end date,
  model_provider text NOT NULL,
  model_name text NOT NULL,
  prompt_version text NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'approved', 'rejected', 'expired', 'executed', 'execution_failed')),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason text,
  rejection_notes text,
  outcome_measured_at timestamptz,
  outcome_snapshot jsonb,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_advice TO authenticated;
GRANT ALL ON public.ai_advice TO service_role;
ALTER TABLE public.ai_advice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_advice_select" ON public.ai_advice
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ai_advice_insert" ON public.ai_advice
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ai_advice_update" ON public.ai_advice
  FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ai_advice_delete" ON public.ai_advice
  FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX ai_advice_workspace_status_idx ON public.ai_advice (workspace_id, status, created_at DESC);
CREATE INDEX ai_advice_run_idx ON public.ai_advice (run_id);

CREATE TABLE public.ai_advice_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  advice_id uuid REFERENCES public.ai_advice(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.ai_analysis_runs(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_advice_audit TO authenticated;
GRANT ALL ON public.ai_advice_audit TO service_role;
ALTER TABLE public.ai_advice_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_audit_select" ON public.ai_advice_audit
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ai_audit_insert" ON public.ai_advice_audit
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX ai_audit_workspace_idx ON public.ai_advice_audit (workspace_id, created_at DESC);

CREATE TRIGGER update_ai_advice_updated_at BEFORE UPDATE ON public.ai_advice
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_settings_updated_at BEFORE UPDATE ON public.ai_analysis_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();