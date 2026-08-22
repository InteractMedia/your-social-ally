-- 1. Test flag on leads (hard server-side protection against test uploads)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- 2. Workspace-level upload settings
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS offline_conversion_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS offline_conversion_currency text NOT NULL DEFAULT 'EUR';
ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_offline_mode_check;
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_offline_mode_check
  CHECK (offline_conversion_mode IN ('manual', 'automatic'));

-- 3. Upload bookkeeping on the existing conversion events table
ALTER TABLE public.lead_conversion_events
  ADD COLUMN IF NOT EXISTS google_upload_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_upload_reason text,
  ADD COLUMN IF NOT EXISTS google_conversion_action_id text,
  ADD COLUMN IF NOT EXISTS google_conversion_action_name text,
  ADD COLUMN IF NOT EXISTS google_conversion_value numeric,
  ADD COLUMN IF NOT EXISTS google_conversion_currency text,
  ADD COLUMN IF NOT EXISTS google_request_reference text,
  ADD COLUMN IF NOT EXISTS google_next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS click_identifier_type text,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.lead_conversion_events ALTER COLUMN google_upload_status SET DEFAULT 'pending';
UPDATE public.lead_conversion_events SET google_upload_status = 'pending' WHERE google_upload_status IS NULL;

DROP TRIGGER IF EXISTS update_lead_conversion_events_updated_at ON public.lead_conversion_events;
CREATE TRIGGER update_lead_conversion_events_updated_at
  BEFORE UPDATE ON public.lead_conversion_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS lead_conversion_events_status_idx
  ON public.lead_conversion_events (google_upload_status, conversion_timestamp DESC);

-- 4. Configurable mapping internal event -> Google Ads conversion action
CREATE TABLE IF NOT EXISTS public.google_conversion_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  internal_event_name text NOT NULL,
  google_conversion_action_id text,
  google_conversion_action_name text,
  enabled boolean NOT NULL DEFAULT false,
  upload_value boolean NOT NULL DEFAULT false,
  value_source text NOT NULL DEFAULT 'none',
  fixed_value numeric,
  currency text NOT NULL DEFAULT 'EUR',
  primary_signal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_conversion_mappings_value_source_check
    CHECK (value_source IN ('none', 'fixed', 'dynamic'))
);
CREATE UNIQUE INDEX IF NOT EXISTS google_conversion_mappings_unique
  ON public.google_conversion_mappings (workspace_id, internal_event_name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_conversion_mappings TO authenticated;
GRANT ALL ON public.google_conversion_mappings TO service_role;
ALTER TABLE public.google_conversion_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read workspace conversion mappings" ON public.google_conversion_mappings
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "insert workspace conversion mappings" ON public.google_conversion_mappings
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "update workspace conversion mappings" ON public.google_conversion_mappings
  FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "delete workspace conversion mappings" ON public.google_conversion_mappings
  FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP TRIGGER IF EXISTS update_google_conversion_mappings_updated_at ON public.google_conversion_mappings;
CREATE TRIGGER update_google_conversion_mappings_updated_at
  BEFORE UPDATE ON public.google_conversion_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Audit log of every upload attempt / approval
CREATE TABLE IF NOT EXISTS public.google_conversion_upload_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  conversion_event_id uuid REFERENCES public.lead_conversion_events(id) ON DELETE SET NULL,
  internal_event_name text NOT NULL,
  google_conversion_action_id text,
  google_conversion_action_name text,
  customer_id text,
  click_identifier_type text,
  value numeric,
  currency text,
  conversion_time text,
  mode text NOT NULL DEFAULT 'manual',
  result text NOT NULL,
  error_code text,
  error_message text,
  api_response jsonb,
  approved_by uuid REFERENCES auth.users(id),
  approved_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS google_conversion_upload_log_ws_idx
  ON public.google_conversion_upload_log (workspace_id, created_at DESC);

GRANT SELECT ON public.google_conversion_upload_log TO authenticated;
GRANT ALL ON public.google_conversion_upload_log TO service_role;
ALTER TABLE public.google_conversion_upload_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read workspace upload log" ON public.google_conversion_upload_log
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));