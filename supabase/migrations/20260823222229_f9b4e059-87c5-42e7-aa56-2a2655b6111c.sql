-- ============================================================
-- V1.6C — Evidence-Based CRO Intelligence Layer
-- ============================================================

-- 1) Central CRO knowledge base. workspace_id NULL = shared/global library.
CREATE TABLE public.cro_evidence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  principle text NOT NULL,
  topic text NOT NULL,
  applies_to text[] NOT NULL DEFAULT '{}',
  source_name text,
  source_url text,
  published_at date,
  evidence_level text NOT NULL DEFAULT 'MODERATE',
  context text,
  limitations text,
  recommended_application text,
  metric text,
  tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cro_evidence_level_check
    CHECK (evidence_level IN ('STRONG','MODERATE','WEAK','HYPOTHESIS'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cro_evidence TO authenticated;
GRANT ALL ON public.cro_evidence TO service_role;

ALTER TABLE public.cro_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cro_evidence_select" ON public.cro_evidence
  FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "cro_evidence_insert" ON public.cro_evidence
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "cro_evidence_update" ON public.cro_evidence
  FOR UPDATE TO authenticated
  USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "cro_evidence_delete" ON public.cro_evidence
  FOR DELETE TO authenticated
  USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER update_cro_evidence_updated_at
  BEFORE UPDATE ON public.cro_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX cro_evidence_topic_idx ON public.cro_evidence (topic);
CREATE INDEX cro_evidence_workspace_idx ON public.cro_evidence (workspace_id);

-- 2) Evidence per AI design decision.
CREATE TABLE public.landing_ai_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.landing_ai_runs(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES public.landing_ai_proposals(id) ON DELETE CASCADE,
  decision_area text NOT NULL,
  decision text NOT NULL,
  evidence_source text NOT NULL,
  evidence_level text NOT NULL,
  sample_size integer,
  metric text,
  observed_result text,
  applicability text,
  confidence integer NOT NULL DEFAULT 50,
  reasoning_summary text,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ab_test_recommended boolean NOT NULL DEFAULT false,
  downgraded_from text,
  downgrade_reason text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT landing_ai_decisions_source_check
    CHECK (evidence_source IN ('own_performance_data','similar_own_data','external_evidence','ai_hypothesis')),
  CONSTRAINT landing_ai_decisions_level_check
    CHECK (evidence_level IN ('STRONG','MODERATE','WEAK','HYPOTHESIS')),
  CONSTRAINT landing_ai_decisions_confidence_check
    CHECK (confidence BETWEEN 0 AND 100)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_ai_decisions TO authenticated;
GRANT ALL ON public.landing_ai_decisions TO service_role;

ALTER TABLE public.landing_ai_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landing_ai_decisions_select" ON public.landing_ai_decisions
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "landing_ai_decisions_insert" ON public.landing_ai_decisions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "landing_ai_decisions_update" ON public.landing_ai_decisions
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "landing_ai_decisions_delete" ON public.landing_ai_decisions
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX landing_ai_decisions_proposal_idx ON public.landing_ai_decisions (proposal_id);

-- 3) Experiments: explicit A/B contract + minimum data before calling a winner.
ALTER TABLE public.landing_ai_experiments
  ADD COLUMN IF NOT EXISTS variant_a text,
  ADD COLUMN IF NOT EXISTS variant_b text,
  ADD COLUMN IF NOT EXISTS guardrail_metric text,
  ADD COLUMN IF NOT EXISTS min_sample_size integer,
  ADD COLUMN IF NOT EXISTS min_data_confidence integer;

-- 4) Shared starter set of well-documented CRO/UX principles (global library).
INSERT INTO public.cro_evidence
  (workspace_id, principle, topic, applies_to, source_name, source_url, published_at,
   evidence_level, context, limitations, recommended_application, metric, tags)
VALUES
  (NULL,
   'Message match tussen advertentie/zoekintentie en de kop van de landingspagina verhoogt de conversieratio; een mismatch verhoogt de bounce.',
   'message_match', ARRAY['hero','headline','ads_traffic'],
   'Nielsen Norman Group — Landing Page Design', 'https://www.nngroup.com/articles/landing-page-design/', NULL,
   'MODERATE',
   'Geldt vooral voor betaald verkeer waarbij de bezoeker met een concrete zoekopdracht binnenkomt.',
   'Effectgrootte varieert sterk per markt; niet getest op ZoetBezorgen.',
   'Neem de dominante zoekintentie (keyword/zoekterm/PMax-categorie) letterlijk terug in de H1 en subkop.',
   'cta_rate', ARRAY['hero','ads']),
  (NULL,
   'Elk extra formulierveld verhoogt de frictie; alleen velden opnemen die de vervolgstap echt nodig heeft.',
   'form_length', ARRAY['form'],
   'Baymard Institute — Checkout & Form Usability Research', 'https://baymard.com/blog/checkout-flow-average-form-fields', NULL,
   'STRONG',
   'Uitgebreid usability-onderzoek op formulieren en checkouts: te veel of onduidelijke velden zijn een structurele afhaakreden.',
   'Minder velden verhoogt volume, maar kan leadkwaliteit verlagen. Voor B2B kan een kwalificerend veld juist waardevol zijn.',
   'Houd het formulier kort en zet kwalificerende velden op optioneel, tenzij eigen data aantoont dat een verplicht veld de leadkwaliteit verhoogt.',
   'form_submission_rate', ARRAY['form','friction']),
  (NULL,
   'Eén duidelijke primaire actie per pagina presteert beter dan meerdere concurrerende acties.',
   'single_cta', ARRAY['cta','page_structure'],
   'Nielsen Norman Group — Call-to-Action Buttons', 'https://www.nngroup.com/articles/ctas-primary-secondary/', NULL,
   'MODERATE',
   'Concurrerende CTA''s met gelijke visuele nadruk maken de keuze zwaarder en verlagen de actiebereidheid.',
   'Een secundaire, visueel ondergeschikte actie (bijv. brochure) kan aanvullend werken.',
   'Alle primaire CTA''s op de pagina vragen dezelfde actie; secundaire acties visueel ondergeschikt maken.',
   'cta_rate', ARRAY['cta']),
  (NULL,
   'Social proof (referenties, klantlogo''s, concrete cases) verlaagt waargenomen risico bij zakelijke aankopen.',
   'social_proof', ARRAY['testimonials','trust','cta'],
   'Baymard Institute / algemene B2B-onderzoeksliteratuur', NULL, NULL,
   'MODERATE',
   'B2B-inkopers nemen beslissingen namens hun organisatie; risicoreductie weegt zwaar.',
   'Alleen effectief met echte, herkenbare proof. Vage claims kunnen vertrouwen juist schaden.',
   'Plaats bewijs in de buurt van elke CTA-zone; gebruik uitsluitend bestaande, aantoonbare referenties.',
   'lead_rate', ARRAY['trust','testimonials']),
  (NULL,
   'Trage laadtijd en zware pagina''s verlagen conversie meetbaar, vooral op mobiel.',
   'performance', ARRAY['page_structure','media'],
   'Google — Core Web Vitals / Think with Google', 'https://web.dev/vitals/', NULL,
   'STRONG',
   'Breed gemeten over veel sites en sectoren: elke extra seconde laadtijd kost conversie.',
   'Effect is afhankelijk van de startsituatie; een al snelle pagina wint minder.',
   'Beperk het aantal zware visuals boven de fold en houd de hero licht.',
   'cta_rate', ARRAY['mobile','media']),
  (NULL,
   'Concrete, specifieke waardeproposities converteren beter dan generieke claims.',
   'value_proposition', ARRAY['hero','headline','copy'],
   'MarketingExperiments / conversion-optimalisatieliteratuur', NULL, NULL,
   'WEAK',
   'Veel gerapporteerde cases, maar zelden goed gecontroleerde publieke experimenten.',
   'Wordt vaak als "best practice" gepresenteerd zonder repliceerbaar bewijs; behandelen als richting, niet als bewijs.',
   'Maak de belofte concreet (levering, minimum afname, personalisatie) in plaats van "de beste zakelijke geschenken".',
   'cta_rate', ARRAY['copy','hero']),
  (NULL,
   'Prijs- en voorwaardetransparantie (vanaf-prijs, minimale afname, levertijd) vermindert afhakers en niet-passende aanvragen.',
   'transparency', ARRAY['products','form','copy'],
   'Baymard Institute — Cost & Delivery Transparency', 'https://baymard.com/blog/hidden-costs', NULL,
   'MODERATE',
   'Onduidelijkheid over kosten en voorwaarden is een van de meest gerapporteerde afhaakredenen.',
   'Meer transparantie kan het aantal leads verlagen terwijl de leadkwaliteit stijgt — beoordeel op omzet, niet op volume.',
   'Toon vanaf-prijzen en minimale afname bij producten; verwacht een lager maar beter gekwalificeerd leadvolume.',
   'revenue', ARRAY['products','quality']),
  (NULL,
   'Mobiele bezoekers zien eerst een korte propositie en één actie; lange introteksten boven de fold kosten conversie.',
   'mobile_first', ARRAY['hero','page_structure','mobile'],
   'Nielsen Norman Group — Mobile UX', 'https://www.nngroup.com/articles/mobile-content/', NULL,
   'MODERATE',
   'Beperkt schermoppervlak dwingt tot strikte prioritering van boodschap en actie.',
   'Voor B2B-desktopverkeer kan meer context boven de fold juist helpen.',
   'Bepaal per sectie expliciet de mobiele volgorde: propositie, bewijs, CTA.',
   'cta_rate', ARRAY['mobile']);