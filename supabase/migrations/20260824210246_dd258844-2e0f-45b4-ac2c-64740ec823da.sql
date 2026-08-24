alter table public.landing_ai_proposals
  add column if not exists creative_direction jsonb,
  add column if not exists quality_scores jsonb,
  add column if not exists creative_ready boolean not null default false;