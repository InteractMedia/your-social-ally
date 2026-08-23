ALTER TABLE public.lead_conversion_events
  ADD COLUMN IF NOT EXISTS google_request_id text,
  ADD COLUMN IF NOT EXISTS google_transaction_id text,
  ADD COLUMN IF NOT EXISTS google_processing_status text,
  ADD COLUMN IF NOT EXISTS google_processing_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_upload_method text,
  ADD COLUMN IF NOT EXISTS google_diagnostics jsonb;

ALTER TABLE public.google_conversion_upload_log
  ADD COLUMN IF NOT EXISTS google_request_id text,
  ADD COLUMN IF NOT EXISTS google_transaction_id text,
  ADD COLUMN IF NOT EXISTS processing_status text,
  ADD COLUMN IF NOT EXISTS upload_method text,
  ADD COLUMN IF NOT EXISTS diagnostics jsonb;

CREATE INDEX IF NOT EXISTS lead_conversion_events_request_id_idx
  ON public.lead_conversion_events (google_request_id)
  WHERE google_request_id IS NOT NULL;