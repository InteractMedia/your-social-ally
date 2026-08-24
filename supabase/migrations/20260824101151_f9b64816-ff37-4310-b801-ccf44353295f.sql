ALTER TABLE public.cro_evidence
  ADD COLUMN IF NOT EXISTS not_applicable_to text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'both' CHECK (audience IN ('b2b','b2c','both')),
  ADD COLUMN IF NOT EXISTS devices text NOT NULL DEFAULT 'both' CHECK (devices IN ('desktop','mobile','both')),
  ADD COLUMN IF NOT EXISTS funnel_type text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.cro_evidence.not_applicable_to IS 'Contexten waarin dit principe NIET automatisch toepasbaar is (bijv. checkout-onderzoek niet op B2B-offerteformulier).';
COMMENT ON COLUMN public.cro_evidence.audience IS 'b2b | b2c | both';
COMMENT ON COLUMN public.cro_evidence.devices IS 'desktop | mobile | both';
COMMENT ON COLUMN public.cro_evidence.funnel_type IS 'Bijv. lead_gen, quote_request, ecommerce_checkout, saas_signup.';