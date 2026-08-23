
-- V1.6 AI Landing Page Strategist & Designer -----------------------------

CREATE TABLE public.landing_ai_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  mode TEXT NOT NULL CHECK (mode IN ('create','optimize')),
  landing_page_id UUID REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  industry_id UUID REFERENCES public.industries(id) ON DELETE SET NULL,
  goal TEXT,
  brief TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  fallback_reason TEXT,
  error_message TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost_usd NUMERIC(10,5),
  runtime_ms INTEGER,
  dataset JSONB NOT NULL DEFAULT '{}'::jsonb,
  dataset_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE public.landing_ai_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.landing_ai_runs(id) ON DELETE CASCADE,
  landing_page_id UUID REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  industry_id UUID REFERENCES public.industries(id) ON DELETE SET NULL,
  mode TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','applied','rejected')),
  strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  page_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  form_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  product_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  rationale JSONB NOT NULL DEFAULT '[]'::jsonb,
  visual_direction JSONB NOT NULL DEFAULT '{}'::jsonb,
  missing_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_confidence INTEGER NOT NULL DEFAULT 0,
  data_confidence INTEGER NOT NULL DEFAULT 0,
  data_confidence_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  performance_data_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  applied_page_id UUID REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  applied_version_id UUID REFERENCES public.landing_page_versions(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ,
  applied_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.landing_ai_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.landing_ai_proposals(id) ON DELETE CASCADE,
  landing_page_id UUID REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  primary_metric TEXT NOT NULL,
  proposed_change JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_block TEXT,
  expected_direction TEXT CHECK (expected_direction IN ('positief','neutraal','onbekend')),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','accepted','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX landing_ai_runs_ws_idx ON public.landing_ai_runs(workspace_id, created_at DESC);
CREATE INDEX landing_ai_proposals_ws_idx ON public.landing_ai_proposals(workspace_id, created_at DESC);
CREATE INDEX landing_ai_proposals_page_idx ON public.landing_ai_proposals(landing_page_id);
CREATE INDEX landing_ai_experiments_proposal_idx ON public.landing_ai_experiments(proposal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_ai_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_ai_proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_ai_experiments TO authenticated;
GRANT ALL ON public.landing_ai_runs TO service_role;
GRANT ALL ON public.landing_ai_proposals TO service_role;
GRANT ALL ON public.landing_ai_experiments TO service_role;

ALTER TABLE public.landing_ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_ai_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_ai_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY landing_ai_runs_select ON public.landing_ai_runs FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY landing_ai_runs_update ON public.landing_ai_runs FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY landing_ai_runs_delete ON public.landing_ai_runs FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY landing_ai_proposals_select ON public.landing_ai_proposals FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY landing_ai_proposals_update ON public.landing_ai_proposals FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY landing_ai_proposals_delete ON public.landing_ai_proposals FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY landing_ai_experiments_select ON public.landing_ai_experiments FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY landing_ai_experiments_update ON public.landing_ai_experiments FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY landing_ai_experiments_delete ON public.landing_ai_experiments FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER landing_ai_proposals_updated_at BEFORE UPDATE ON public.landing_ai_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
