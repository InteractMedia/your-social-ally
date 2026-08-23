CREATE POLICY landing_ai_runs_insert ON public.landing_ai_runs FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY landing_ai_proposals_insert ON public.landing_ai_proposals FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY landing_ai_experiments_insert ON public.landing_ai_experiments FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_ai_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_ai_proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_ai_experiments TO authenticated;
GRANT ALL ON public.landing_ai_runs TO service_role;
GRANT ALL ON public.landing_ai_proposals TO service_role;
GRANT ALL ON public.landing_ai_experiments TO service_role;