ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS external_source text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_order_id text;

CREATE UNIQUE INDEX IF NOT EXISTS leads_workspace_external_unique
  ON public.leads (workspace_id, external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.lead_external_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  external_source text NOT NULL,
  external_event_id text NOT NULL,
  event_type text NOT NULL,
  status text,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_external_events_unique
  ON public.lead_external_events (workspace_id, external_source, external_event_id);

GRANT SELECT ON public.lead_external_events TO authenticated;
GRANT ALL ON public.lead_external_events TO service_role;

ALTER TABLE public.lead_external_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view external events"
  ON public.lead_external_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));