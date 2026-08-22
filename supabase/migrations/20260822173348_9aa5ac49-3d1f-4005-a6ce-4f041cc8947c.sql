-- 1. Google Ads accounts (multi-account / MCC ready)
CREATE TABLE public.google_ads_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  descriptive_name TEXT,
  currency_code TEXT,
  time_zone TEXT,
  is_manager BOOLEAN NOT NULL DEFAULT false,
  manager_customer_id TEXT,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, customer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_ads_accounts TO authenticated;
GRANT ALL ON public.google_ads_accounts TO service_role;
ALTER TABLE public.google_ads_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own google ads accounts" ON public.google_ads_accounts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Conversion definitions (extensible: Google Ads actions + own B2B conversions)
CREATE TABLE public.conversion_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'internal',
  platform TEXT,
  external_id TEXT,
  funnel TEXT,
  stage_order INTEGER,
  usage TEXT,
  value_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX conversion_definitions_user_key ON public.conversion_definitions (COALESCE(user_id::text, 'global'), key);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversion_definitions TO authenticated;
GRANT ALL ON public.conversion_definitions TO service_role;
ALTER TABLE public.conversion_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read conversion definitions" ON public.conversion_definitions FOR SELECT TO authenticated
  USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "write own conversion definitions" ON public.conversion_definitions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own conversion definitions" ON public.conversion_definitions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own conversion definitions" ON public.conversion_definitions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. Conversion events (attribution-ready, no fabricated rows)
CREATE TABLE public.conversion_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  definition_key TEXT NOT NULL,
  funnel TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  value NUMERIC,
  currency TEXT,
  platform TEXT,
  customer_account TEXT,
  contact_email TEXT,
  company_name TEXT,
  industry TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  ad_group_id TEXT,
  ad_group_name TEXT,
  ad_id TEXT,
  keyword TEXT,
  match_type TEXT,
  search_term TEXT,
  landing_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  gclid TEXT,
  gbraid TEXT,
  wbraid TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX conversion_events_user_time ON public.conversion_events (user_id, occurred_at DESC);
CREATE INDEX conversion_events_definition ON public.conversion_events (definition_key);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversion_events TO authenticated;
GRANT ALL ON public.conversion_events TO service_role;
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversion events" ON public.conversion_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Funnel definitions (global seed, no measured data)
INSERT INTO public.conversion_definitions (user_id, key, label, source, funnel, stage_order, value_type) VALUES
  (NULL, 'platform_application', 'Platform aanmelding', 'internal', 'cadeauplatform', 1, 'none'),
  (NULL, 'platform_approved', 'Platform goedgekeurd', 'internal', 'cadeauplatform', 2, 'none'),
  (NULL, 'platform_activated', 'Platform geactiveerd', 'internal', 'cadeauplatform', 3, 'none'),
  (NULL, 'customer_won', 'Klant gewonnen', 'internal', 'cadeauplatform', 4, 'none'),
  (NULL, 'revenue', 'Omzet', 'internal', 'cadeauplatform', 5, 'currency'),
  (NULL, 'quote_request', 'Offerteaanvraag', 'internal', 'offerte', 1, 'none'),
  (NULL, 'qualified_lead', 'Gekwalificeerde lead', 'internal', 'offerte', 2, 'none'),
  (NULL, 'hot_lead', 'Hot lead', 'internal', 'offerte', 3, 'none'),
  (NULL, 'quote_customer_won', 'Klant gewonnen (offerte)', 'internal', 'offerte', 4, 'none'),
  (NULL, 'quote_revenue', 'Omzet (offerte)', 'internal', 'offerte', 5, 'currency');
