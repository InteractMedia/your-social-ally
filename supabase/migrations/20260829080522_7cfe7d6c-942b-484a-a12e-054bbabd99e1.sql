alter table public.search_campaign_drafts
  add column if not exists google_customer_id text,
  add column if not exists google_campaign_id text,
  add column if not exists google_campaign_name text,
  add column if not exists google_resource_names jsonb not null default '{}'::jsonb,
  add column if not exists creation_plan jsonb,
  add column if not exists creation_result jsonb,
  add column if not exists creation_error text,
  add column if not exists creation_started_at timestamptz,
  add column if not exists created_in_google_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id);

create table if not exists public.google_ads_change_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source text not null,
  draft_id uuid references public.search_campaign_drafts(id) on delete set null,
  advice_id uuid references public.ai_advice(id) on delete set null,
  customer_id text,
  entity_type text,
  entity_id text,
  entity_name text,
  change_type text not null,
  proposal jsonb not null default '{}'::jsonb,
  data_used jsonb not null default '{}'::jsonb,
  ai_reasoning text,
  old_value jsonb,
  new_value jsonb,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  status text not null default 'pending',
  google_result jsonb,
  google_error text,
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.google_ads_change_log to authenticated;
grant all on public.google_ads_change_log to service_role;

alter table public.google_ads_change_log enable row level security;

drop policy if exists "members read change log" on public.google_ads_change_log;
create policy "members read change log"
on public.google_ads_change_log for select to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

drop policy if exists "members write change log" on public.google_ads_change_log;
create policy "members write change log"
on public.google_ads_change_log for insert to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()));

drop policy if exists "members update change log" on public.google_ads_change_log;
create policy "members update change log"
on public.google_ads_change_log for update to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()))
with check (public.is_workspace_member(workspace_id, auth.uid()));

create index if not exists google_ads_change_log_ws_idx
  on public.google_ads_change_log (workspace_id, created_at desc);