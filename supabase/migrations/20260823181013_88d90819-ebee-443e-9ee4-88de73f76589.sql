ALTER TABLE public.ai_advice
  ADD COLUMN IF NOT EXISTS data_confidence_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_confidence_level text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS execution_eligibility text NOT NULL DEFAULT 'REVIEW_ONLY',
  ADD COLUMN IF NOT EXISTS execution_block_reason text,
  ADD COLUMN IF NOT EXISTS execution_block_reason_label text,
  ADD COLUMN IF NOT EXISTS execution_blockers jsonb,
  ADD COLUMN IF NOT EXISTS guardrail_version text,
  ADD COLUMN IF NOT EXISTS decision_facts jsonb,
  ADD COLUMN IF NOT EXISTS guardrail_evaluated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_advice_execution_eligibility_check') THEN
    ALTER TABLE public.ai_advice
      ADD CONSTRAINT ai_advice_execution_eligibility_check
      CHECK (execution_eligibility IN ('ALLOWED','REVIEW_ONLY','BLOCKED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_advice_data_confidence_level_check') THEN
    ALTER TABLE public.ai_advice
      ADD CONSTRAINT ai_advice_data_confidence_level_check
      CHECK (data_confidence_level IN ('low','medium','high'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ai_advice_execution_eligibility_idx
  ON public.ai_advice (workspace_id, execution_eligibility);