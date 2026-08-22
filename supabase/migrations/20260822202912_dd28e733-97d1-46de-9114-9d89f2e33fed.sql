CREATE TABLE public.poor_lead_reasons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  requires_notes boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX poor_lead_reasons_key_global_idx ON public.poor_lead_reasons (key) WHERE user_id IS NULL;
CREATE UNIQUE INDEX poor_lead_reasons_key_user_idx ON public.poor_lead_reasons (user_id, key) WHERE user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.poor_lead_reasons TO authenticated;
GRANT ALL ON public.poor_lead_reasons TO service_role;

ALTER TABLE public.poor_lead_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read poor lead reasons" ON public.poor_lead_reasons FOR SELECT TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "insert own poor lead reasons" ON public.poor_lead_reasons FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own poor lead reasons" ON public.poor_lead_reasons FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own poor lead reasons" ON public.poor_lead_reasons FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_poor_lead_reasons_updated_at BEFORE UPDATE ON public.poor_lead_reasons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.poor_lead_reasons (key, label, sort_order, requires_notes) VALUES
  ('consumer', 'Particulier', 10, false),
  ('not_serious_business', 'Geen serieus bedrijf', 20, false),
  ('volume_too_small', 'Te klein volume', 30, false),
  ('wrong_request', 'Verkeerde aanvraag / verkeerde behoefte', 40, false),
  ('spam', 'Spam', 50, false),
  ('outside_target_group', 'Buiten doelgroep', 60, false),
  ('duplicate', 'Dubbele aanvraag', 70, false),
  ('unreachable', 'Geen reactie / onbereikbaar', 80, false),
  ('other', 'Anders', 999, true);

ALTER TABLE public.leads
  ADD COLUMN poor_reason_id uuid REFERENCES public.poor_lead_reasons(id) ON DELETE SET NULL,
  ADD COLUMN poor_reason text,
  ADD COLUMN poor_reason_label text,
  ADD COLUMN poor_reason_notes text,
  ADD COLUMN poor_marked_at timestamptz;

CREATE INDEX leads_poor_reason_idx ON public.leads (poor_reason) WHERE poor_reason IS NOT NULL;