-- 1. Workspaces
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
GRANT SELECT ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_ingest_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Ingest key',
  token_prefix text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_ingest_keys TO authenticated;
GRANT ALL ON public.workspace_ingest_keys TO service_role;
ALTER TABLE public.workspace_ingest_keys ENABLE ROW LEVEL SECURITY;

-- 2. Membership helpers (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = _workspace_id AND m.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = _workspace_id AND m.user_id = _user_id AND m.role = 'owner'
  )
$$;

-- 3. Policies for the workspace tables
CREATE POLICY "read own workspaces" ON public.workspaces
  FOR SELECT TO authenticated USING (public.is_workspace_member(id, auth.uid()));
CREATE POLICY "create workspaces" ON public.workspaces
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "owners update workspaces" ON public.workspaces
  FOR UPDATE TO authenticated USING (public.is_workspace_owner(id, auth.uid()))
  WITH CHECK (public.is_workspace_owner(id, auth.uid()));

CREATE POLICY "read workspace members" ON public.workspace_members
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "read workspace ingest keys" ON public.workspace_ingest_keys
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "owners create ingest keys" ON public.workspace_ingest_keys
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()));
CREATE POLICY "owners update ingest keys" ON public.workspace_ingest_keys
  FOR UPDATE TO authenticated USING (public.is_workspace_owner(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()));
CREATE POLICY "owners delete ingest keys" ON public.workspace_ingest_keys
  FOR DELETE TO authenticated USING (public.is_workspace_owner(workspace_id, auth.uid()));

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workspace_members_updated_at BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workspace_ingest_keys_updated_at BEFORE UPDATE ON public.workspace_ingest_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Leads get a mandatory workspace owner
ALTER TABLE public.leads ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

DO $$
DECLARE ws uuid;
BEGIN
  INSERT INTO public.workspaces (name, slug, is_default, created_by)
  VALUES ('SocialCockpit', 'socialcockpit', true,
          (SELECT id FROM auth.users ORDER BY created_at LIMIT 1))
  RETURNING id INTO ws;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  SELECT ws, id, 'owner' FROM auth.users
  ON CONFLICT DO NOTHING;

  UPDATE public.leads SET workspace_id = ws WHERE workspace_id IS NULL;
END $$;

ALTER TABLE public.leads ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX leads_workspace_id_idx ON public.leads (workspace_id);

-- 5. Replace ownerless lead policies with workspace-scoped ones
DROP POLICY IF EXISTS "read leads" ON public.leads;
DROP POLICY IF EXISTS "insert leads" ON public.leads;
DROP POLICY IF EXISTS "update leads" ON public.leads;
DROP POLICY IF EXISTS "delete leads" ON public.leads;

CREATE POLICY "read workspace leads" ON public.leads
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "insert workspace leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "update workspace leads" ON public.leads
  FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "delete workspace leads" ON public.leads
  FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "read lead activities" ON public.lead_activities;
DROP POLICY IF EXISTS "insert lead activities" ON public.lead_activities;
CREATE POLICY "read workspace lead activities" ON public.lead_activities
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_activities.lead_id AND public.is_workspace_member(l.workspace_id, auth.uid())
  ));
CREATE POLICY "insert workspace lead activities" ON public.lead_activities
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_activities.lead_id AND public.is_workspace_member(l.workspace_id, auth.uid())
  ));

DROP POLICY IF EXISTS "read lead conversions" ON public.lead_conversion_events;
DROP POLICY IF EXISTS "insert lead conversions" ON public.lead_conversion_events;
DROP POLICY IF EXISTS "update lead conversions" ON public.lead_conversion_events;
CREATE POLICY "read workspace lead conversions" ON public.lead_conversion_events
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_conversion_events.lead_id AND public.is_workspace_member(l.workspace_id, auth.uid())
  ));
CREATE POLICY "insert workspace lead conversions" ON public.lead_conversion_events
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_conversion_events.lead_id AND public.is_workspace_member(l.workspace_id, auth.uid())
  ));
CREATE POLICY "update workspace lead conversions" ON public.lead_conversion_events
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_conversion_events.lead_id AND public.is_workspace_member(l.workspace_id, auth.uid())
  )) WITH CHECK (true);