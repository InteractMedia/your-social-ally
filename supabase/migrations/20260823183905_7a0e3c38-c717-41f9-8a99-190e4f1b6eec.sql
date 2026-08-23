-- 1. landing_pages: from simple registry to full page configuration
ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS template_key text NOT NULL DEFAULT 'zoet-b2b-v1',
  ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS base_url text,
  ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS current_version_id uuid,
  ADD COLUMN IF NOT EXISTS version_counter integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_token text NOT NULL DEFAULT replace(gen_random_uuid()::text,'-',''),
  ADD COLUMN IF NOT EXISTS notify_channel text,
  ADD COLUMN IF NOT EXISTS notify_target text,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

UPDATE public.landing_pages lp
SET workspace_id = (SELECT id FROM public.workspaces ORDER BY is_default DESC, created_at ASC LIMIT 1)
WHERE lp.workspace_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS landing_pages_ws_funnel_slug_key
  ON public.landing_pages (workspace_id, funnel_type, slug);

DROP POLICY IF EXISTS "read landing pages" ON public.landing_pages;
DROP POLICY IF EXISTS "insert landing pages" ON public.landing_pages;
DROP POLICY IF EXISTS "update landing pages" ON public.landing_pages;
DROP POLICY IF EXISTS "delete own landing pages" ON public.landing_pages;
CREATE POLICY "read workspace landing pages" ON public.landing_pages FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "insert workspace landing pages" ON public.landing_pages FOR INSERT TO authenticated
  WITH CHECK (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "update workspace landing pages" ON public.landing_pages FOR UPDATE TO authenticated
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "delete workspace landing pages" ON public.landing_pages FOR DELETE TO authenticated
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()));

-- 2. sections
CREATE TABLE IF NOT EXISTS public.landing_page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  landing_page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  use_global boolean NOT NULL DEFAULT false,
  global_key text,
  variant_key text NOT NULL DEFAULT 'A',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_sections TO authenticated;
GRANT ALL ON public.landing_page_sections TO service_role;
ALTER TABLE public.landing_page_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage sections" ON public.landing_page_sections FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE INDEX IF NOT EXISTS landing_page_sections_page_idx ON public.landing_page_sections (landing_page_id, sort_order);

-- 3. reusable product library
CREATE TABLE IF NOT EXISTS public.landing_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  image_url text,
  image_alt text,
  short_text text,
  price_from numeric(12,2),
  personalization_options text[] NOT NULL DEFAULT '{}',
  cta_label text,
  cta_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  external_source text,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_products TO authenticated;
GRANT ALL ON public.landing_products TO service_role;
ALTER TABLE public.landing_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage products" ON public.landing_products FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE UNIQUE INDEX IF NOT EXISTS landing_products_ws_slug_key ON public.landing_products (workspace_id, slug);

CREATE TABLE IF NOT EXISTS public.landing_page_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  landing_page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.landing_products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 100,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_products TO authenticated;
GRANT ALL ON public.landing_page_products TO service_role;
ALTER TABLE public.landing_page_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage page products" ON public.landing_page_products FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE UNIQUE INDEX IF NOT EXISTS landing_page_products_key ON public.landing_page_products (landing_page_id, product_id);

-- 4. testimonials
CREATE TABLE IF NOT EXISTS public.landing_page_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  landing_page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  author text NOT NULL,
  role_title text,
  company text,
  quote text NOT NULL,
  image_url text,
  sort_order integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_testimonials TO authenticated;
GRANT ALL ON public.landing_page_testimonials TO service_role;
ALTER TABLE public.landing_page_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage testimonials" ON public.landing_page_testimonials FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- 5. form configuration
CREATE TABLE IF NOT EXISTS public.landing_page_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  landing_page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  title text,
  intro text,
  submit_label text NOT NULL DEFAULT 'Offerte aanvragen',
  success_title text NOT NULL DEFAULT 'Bedankt voor je aanvraag',
  success_body text NOT NULL DEFAULT 'We nemen zo snel mogelijk contact met je op.',
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_forms TO authenticated;
GRANT ALL ON public.landing_page_forms TO service_role;
ALTER TABLE public.landing_page_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage forms" ON public.landing_page_forms FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE UNIQUE INDEX IF NOT EXISTS landing_page_forms_page_key ON public.landing_page_forms (landing_page_id);

-- 6. version history
CREATE TABLE IF NOT EXISTS public.landing_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  landing_page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  note text,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid,
  published_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_versions TO authenticated;
GRANT ALL ON public.landing_page_versions TO service_role;
ALTER TABLE public.landing_page_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage versions" ON public.landing_page_versions FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE UNIQUE INDEX IF NOT EXISTS landing_page_versions_key ON public.landing_page_versions (landing_page_id, version_number);

-- 7. A/B variants (structure only, no optimizer)
CREATE TABLE IF NOT EXISTS public.landing_page_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  landing_page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  variant_key text NOT NULL DEFAULT 'A',
  name text NOT NULL DEFAULT 'Variant A',
  weight integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_variants TO authenticated;
GRANT ALL ON public.landing_page_variants TO service_role;
ALTER TABLE public.landing_page_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage variants" ON public.landing_page_variants FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE UNIQUE INDEX IF NOT EXISTS landing_page_variants_key ON public.landing_page_variants (landing_page_id, variant_key);

-- 8. global reusable content
CREATE TABLE IF NOT EXISTS public.landing_global_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  block_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_global_content TO authenticated;
GRANT ALL ON public.landing_global_content TO service_role;
ALTER TABLE public.landing_global_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage global content" ON public.landing_global_content FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE UNIQUE INDEX IF NOT EXISTS landing_global_content_key ON public.landing_global_content (workspace_id, key);

-- 9. first-party analytics events
CREATE TABLE IF NOT EXISTS public.landing_page_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  landing_page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  landing_page_version_id uuid REFERENCES public.landing_page_versions(id) ON DELETE SET NULL,
  variant_key text NOT NULL DEFAULT 'A',
  session_id text NOT NULL,
  event_type text NOT NULL,
  path text,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_preview boolean NOT NULL DEFAULT false,
  is_test boolean NOT NULL DEFAULT false,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_events TO authenticated;
GRANT ALL ON public.landing_page_events TO service_role;
ALTER TABLE public.landing_page_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read events" ON public.landing_page_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members delete events" ON public.landing_page_events FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE INDEX IF NOT EXISTS landing_page_events_page_idx ON public.landing_page_events (landing_page_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS landing_page_events_session_type_key
  ON public.landing_page_events (landing_page_id, session_id, event_type)
  WHERE event_type IN ('page_view','form_started','form_submitted','thank_you');

-- 10. form submission log (idempotency + spam protection)
CREATE TABLE IF NOT EXISTS public.landing_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  landing_page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  landing_page_version_id uuid REFERENCES public.landing_page_versions(id) ON DELETE SET NULL,
  variant_key text NOT NULL DEFAULT 'A',
  session_id text,
  external_event_id text NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'accepted',
  reject_reason text,
  ip_hash text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_form_submissions TO authenticated;
GRANT ALL ON public.landing_form_submissions TO service_role;
ALTER TABLE public.landing_form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read submissions" ON public.landing_form_submissions FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members delete submissions" ON public.landing_form_submissions FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE UNIQUE INDEX IF NOT EXISTS landing_form_submissions_event_key
  ON public.landing_form_submissions (workspace_id, external_event_id);
CREATE INDEX IF NOT EXISTS landing_form_submissions_ip_idx
  ON public.landing_form_submissions (ip_hash, created_at);

-- 11. leads: link to the exact page version + attribution timestamps
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS landing_page_version_id uuid,
  ADD COLUMN IF NOT EXISTS landing_page_slug text,
  ADD COLUMN IF NOT EXISTS first_landing_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quote_details jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TRIGGER landing_page_sections_updated_at BEFORE UPDATE ON public.landing_page_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER landing_products_updated_at BEFORE UPDATE ON public.landing_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER landing_page_forms_updated_at BEFORE UPDATE ON public.landing_page_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER landing_global_content_updated_at BEFORE UPDATE ON public.landing_global_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();