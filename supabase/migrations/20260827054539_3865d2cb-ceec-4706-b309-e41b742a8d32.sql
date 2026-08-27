-- Offerte Conversion Architecture V1: generieke offerte-events + deduplicatie.

-- 1. Interne eventnamen naar de generieke offerte-structuur.
UPDATE public.lead_conversion_events e
SET conversion_event = 'quote_qualified'
WHERE conversion_event = 'qualified_lead';

UPDATE public.lead_conversion_events e
SET conversion_event = CASE
  WHEN l.funnel_type = 'platform' THEN 'platform_first_order'
  ELSE 'quote_won'
END
FROM public.leads l
WHERE l.id = e.lead_id AND e.conversion_event = 'customer_won';

UPDATE public.lead_conversion_events
SET conversion_event = 'quote_won'
WHERE conversion_event = 'customer_won';

UPDATE public.google_conversion_mappings
SET internal_event_name = 'quote_qualified'
WHERE internal_event_name = 'qualified_lead';

UPDATE public.google_conversion_mappings
SET internal_event_name = 'quote_won'
WHERE internal_event_name = 'customer_won';

UPDATE public.conversion_definitions SET key = 'quote_qualified', label = 'Offerte - Qualified'
WHERE key = 'qualified_lead';
UPDATE public.conversion_definitions SET key = 'quote_won', label = 'Offerte - Klant'
WHERE key = 'quote_customer_won';
UPDATE public.conversion_definitions SET label = 'Offerte - Aanvraag' WHERE key = 'quote_request';

-- 2. Deduplicatie: maximaal één conversie-event per lead per conversietype.
--    Behoud het oudste event (of het al verzonden event) en verwijder de rest.
DELETE FROM public.lead_conversion_events x
USING public.lead_conversion_events y
WHERE x.lead_id = y.lead_id
  AND x.conversion_event = y.conversion_event
  AND x.id <> y.id
  AND (
    (x.google_upload_status IN ('pending','not_eligible','disabled','failed')
     AND y.google_upload_status IN ('uploaded','submitted','processing'))
    OR (
      COALESCE(x.google_upload_status,'pending') = COALESCE(y.google_upload_status,'pending')
      AND x.created_at > y.created_at
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS lead_conversion_events_unique_per_type
  ON public.lead_conversion_events (lead_id, conversion_event);