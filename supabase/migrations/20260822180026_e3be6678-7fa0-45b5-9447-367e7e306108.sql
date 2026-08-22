-- ============ INDUSTRIES ============
CREATE TABLE public.industries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX industries_slug_unique ON public.industries (slug) WHERE user_id IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.industries TO authenticated;
GRANT ALL ON public.industries TO service_role;
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read industries" ON public.industries FOR SELECT TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "insert own industries" ON public.industries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "update industries" ON public.industries FOR UPDATE TO authenticated USING (user_id IS NULL OR auth.uid() = user_id) WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "delete own industries" ON public.industries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ LANDING PAGES ============
CREATE TABLE public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  url text,
  funnel_type text NOT NULL DEFAULT 'quote',
  industry_id uuid REFERENCES public.industries(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX landing_pages_slug_unique ON public.landing_pages (slug) WHERE user_id IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_pages TO authenticated;
GRANT ALL ON public.landing_pages TO service_role;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read landing pages" ON public.landing_pages FOR SELECT TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "insert landing pages" ON public.landing_pages FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "update landing pages" ON public.landing_pages FOR UPDATE TO authenticated USING (user_id IS NULL OR auth.uid() = user_id) WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "delete own landing pages" ON public.landing_pages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ LEADS ============
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz NOT NULL DEFAULT now(),

  lead_type text NOT NULL DEFAULT 'offerte',
  funnel_type text NOT NULL DEFAULT 'quote',
  status text NOT NULL DEFAULT 'quote_request',
  lead_quality text NOT NULL DEFAULT 'unknown',

  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  website text,
  company_domain text,
  company_size text,
  kvk_number text,
  notes text,

  industry_id uuid REFERENCES public.industries(id) ON DELETE SET NULL,
  industry_name text,

  source text,
  medium text,
  platform text,
  campaign_id text,
  campaign_name text,
  ad_group_id text,
  ad_group_name text,
  ad_id text,
  ad_name text,
  keyword text,
  search_term text,
  match_type text,
  landing_page text,
  landing_page_id uuid REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  landing_page_variant text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,

  gclid text,
  gbraid text,
  wbraid text,
  li_fat_id text,
  ttclid text,
  fbclid text,
  click_ids jsonb NOT NULL DEFAULT '{}'::jsonb,

  attribution_model text NOT NULL DEFAULT 'last_non_direct_click',
  first_touch jsonb,
  raw jsonb,

  became_customer boolean NOT NULL DEFAULT false,
  customer_date date,
  order_value numeric,
  revenue numeric,
  gross_margin numeric,
  expected_value numeric,
  lifetime_value numeric,
  first_order_date date,

  ingest_source text
);
CREATE INDEX leads_status_idx ON public.leads (status);
CREATE INDEX leads_funnel_idx ON public.leads (funnel_type);
CREATE INDEX leads_quality_idx ON public.leads (lead_quality);
CREATE INDEX leads_campaign_idx ON public.leads (campaign_id);
CREATE INDEX leads_industry_idx ON public.leads (industry_id);
CREATE INDEX leads_received_idx ON public.leads (received_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read leads" ON public.leads FOR SELECT TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "update leads" ON public.leads FOR UPDATE TO authenticated USING (user_id IS NULL OR auth.uid() = user_id) WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "delete leads" ON public.leads FOR DELETE TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);

-- ============ LEAD ACTIVITIES ============
CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label text,
  event_type text NOT NULL,
  description text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_activities_lead_idx ON public.lead_activities (lead_id, created_at DESC);
GRANT SELECT, INSERT ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read lead activities" ON public.lead_activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND (l.user_id IS NULL OR l.user_id = auth.uid())));
CREATE POLICY "insert lead activities" ON public.lead_activities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND (l.user_id IS NULL OR l.user_id = auth.uid())));

-- ============ LEAD CONVERSION EVENTS (offline conversions prep) ============
CREATE TABLE public.lead_conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversion_event text NOT NULL,
  conversion_timestamp timestamptz NOT NULL DEFAULT now(),
  value numeric,
  currency text DEFAULT 'EUR',
  platform text NOT NULL DEFAULT 'google_ads',
  uploaded_to_google boolean NOT NULL DEFAULT false,
  google_upload_timestamp timestamptz,
  google_upload_status text,
  google_upload_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_conversion_events_lead_idx ON public.lead_conversion_events (lead_id);
CREATE INDEX lead_conversion_events_pending_idx ON public.lead_conversion_events (uploaded_to_google);
GRANT SELECT, INSERT, UPDATE ON public.lead_conversion_events TO authenticated;
GRANT ALL ON public.lead_conversion_events TO service_role;
ALTER TABLE public.lead_conversion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read lead conversions" ON public.lead_conversion_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND (l.user_id IS NULL OR l.user_id = auth.uid())));
CREATE POLICY "insert lead conversions" ON public.lead_conversion_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND (l.user_id IS NULL OR l.user_id = auth.uid())));
CREATE POLICY "update lead conversions" ON public.lead_conversion_events FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND (l.user_id IS NULL OR l.user_id = auth.uid())))
  WITH CHECK (true);

-- ============ TRIGGERS ============
CREATE TRIGGER update_industries_updated_at BEFORE UPDATE ON public.industries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_landing_pages_updated_at BEFORE UPDATE ON public.landing_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED: branches (uitbreidbaar) ============
INSERT INTO public.industries (user_id, name, slug, sort_order) VALUES
  (NULL, 'Bouw', 'bouw', 10),
  (NULL, 'Zorg', 'zorg', 20),
  (NULL, 'Onderwijs', 'onderwijs', 30),
  (NULL, 'Makelaardij', 'makelaardij', 40),
  (NULL, 'Transport', 'transport', 50),
  (NULL, 'Installatie', 'installatie', 60),
  (NULL, 'Zakelijke dienstverlening', 'zakelijke-dienstverlening', 70),
  (NULL, 'Retail', 'retail', 80),
  (NULL, 'Horeca', 'horeca', 90),
  (NULL, 'Overig', 'overig', 999);

-- ============ SEED: landingspagina-structuur ============
INSERT INTO public.landing_pages (user_id, name, slug, url, funnel_type, industry_id)
SELECT NULL, v.name, v.slug, v.url, v.funnel_type, i.id
FROM (VALUES
  ('Algemene offerte', '/offerte', NULL::text, 'quote', NULL::text),
  ('Bouw offerte', '/offerte/bouw', NULL, 'quote', 'bouw'),
  ('Zorg offerte', '/offerte/zorg', NULL, 'quote', 'zorg'),
  ('Algemeen cadeauplatform', '/cadeauplatform', NULL, 'platform', NULL),
  ('Bouw cadeauplatform', '/cadeauplatform/bouw', NULL, 'platform', 'bouw')
) AS v(name, slug, url, funnel_type, industry_slug)
LEFT JOIN public.industries i ON i.slug = v.industry_slug AND i.user_id IS NULL;