CREATE TABLE public.search_campaign_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id),
  funnel text not null,
  landing_page_id uuid references public.landing_pages(id) on delete set null,
  landing_page_name text,
  landing_page_url text,
  industry_id uuid references public.industries(id) on delete set null,
  industry_name text,
  locations text[] not null default '{}',
  language text not null default 'nl',
  target_daily_budget numeric,
  status text not null default 'AI_CONCEPT',
  provider text not null,
  model text not null,
  prompt_version text not null,
  fallback_reason text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric,
  runtime_ms integer,
  ai_confidence integer not null default 0,
  data_confidence integer not null default 0,
  data_confidence_reasons jsonb not null default '[]'::jsonb,
  data_sources jsonb not null default '[]'::jsonb,
  missing_data jsonb not null default '[]'::jsonb,
  proposal jsonb not null default '{}'::jsonb,
  original_proposal jsonb not null default '{}'::jsonb,
  dataset_meta jsonb not null default '{}'::jsonb,
  error text,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_campaign_drafts TO authenticated;
GRANT ALL ON public.search_campaign_drafts TO service_role;

ALTER TABLE public.search_campaign_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read search campaign drafts"
ON public.search_campaign_drafts FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members insert search campaign drafts"
ON public.search_campaign_drafts FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members update search campaign drafts"
ON public.search_campaign_drafts FOR UPDATE TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members delete search campaign drafts"
ON public.search_campaign_drafts FOR DELETE TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER set_search_campaign_drafts_updated_at
BEFORE UPDATE ON public.search_campaign_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX search_campaign_drafts_workspace_idx
ON public.search_campaign_drafts (workspace_id, created_at DESC);