CREATE TABLE public.linkedin_icp_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  industry text,
  company_size text,
  region text,
  occasion text,
  job_titles text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  exclusions text[] NOT NULL DEFAULT '{}',
  ai_company_profile text,
  ai_decision_maker text,
  ai_rationale text,
  search_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_icp_profiles TO authenticated;
GRANT ALL ON public.linkedin_icp_profiles TO service_role;
ALTER TABLE public.linkedin_icp_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "icp_select" ON public.linkedin_icp_profiles FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "icp_insert" ON public.linkedin_icp_profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "icp_update" ON public.linkedin_icp_profiles FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "icp_delete" ON public.linkedin_icp_profiles FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER update_linkedin_icp_profiles_updated_at BEFORE UPDATE ON public.linkedin_icp_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.linkedin_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.linkedin_icp_profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  headline text,
  company_name text,
  job_title text,
  linkedin_url text,
  status text NOT NULL DEFAULT 'suggested',
  invite_message text,
  invited_at timestamptz,
  responded_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT linkedin_prospects_status_check CHECK (status IN ('suggested','invited','accepted','declined','no_response'))
);

CREATE INDEX linkedin_prospects_workspace_idx ON public.linkedin_prospects (workspace_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_prospects TO authenticated;
GRANT ALL ON public.linkedin_prospects TO service_role;
ALTER TABLE public.linkedin_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospects_select" ON public.linkedin_prospects FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "prospects_insert" ON public.linkedin_prospects FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "prospects_update" ON public.linkedin_prospects FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "prospects_delete" ON public.linkedin_prospects FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER update_linkedin_prospects_updated_at BEFORE UPDATE ON public.linkedin_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();