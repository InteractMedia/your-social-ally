alter table public.landing_products
  add column if not exists sku text,
  add column if not exists category text,
  add column if not exists long_text text,
  add column if not exists min_quantity integer,
  add column if not exists occasions text[] not null default '{}',
  add column if not exists industries text[] not null default '{}',
  add column if not exists tags text[] not null default '{}',
  add column if not exists letterbox_friendly boolean,
  add column if not exists individually_shippable boolean,
  add column if not exists featured boolean not null default false,
  add column if not exists product_url text,
  add column if not exists notes text,
  add column if not exists ai_suggestions jsonb not null default '{}'::jsonb;

create table if not exists public.landing_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  storage_path text,
  url text not null,
  asset_type text not null default 'product_cutout',
  alt_text text,
  product_id uuid references public.landing_products(id) on delete set null,
  industry_id uuid references public.industries(id) on delete set null,
  tags text[] not null default '{}',
  desktop_ok boolean not null default true,
  mobile_ok boolean not null default true,
  source text not null default 'upload',
  approval_status text not null default 'approved',
  active boolean not null default true,
  width integer,
  height integer,
  mime_type text,
  visual_brief_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landing_assets_type_check check (asset_type in (
    'product_cutout','product_group','personalized_product','product_lifestyle',
    'business_context','industry_context','personalization_example','customer_logo',
    'testimonial','illustration','decorative')),
  constraint landing_assets_source_check check (source in ('upload','ai','external')),
  constraint landing_assets_approval_check check (approval_status in ('pending','approved','rejected'))
);

create index if not exists landing_assets_ws_idx on public.landing_assets(workspace_id, asset_type);

grant select, insert, update, delete on public.landing_assets to authenticated;
grant all on public.landing_assets to service_role;
alter table public.landing_assets enable row level security;
create policy "members manage landing assets" on public.landing_assets
  for all to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()))
  with check (public.is_workspace_member(workspace_id, auth.uid()));

create table if not exists public.landing_product_images (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.landing_products(id) on delete cascade,
  asset_id uuid references public.landing_assets(id) on delete set null,
  url text not null,
  alt_text text,
  image_type text not null default 'product_cutout',
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint landing_product_images_type_check check (image_type in (
    'product_cutout','product_lifestyle','personalized_product','detail','packaging'))
);

create index if not exists landing_product_images_product_idx on public.landing_product_images(product_id, sort_order);

grant select, insert, update, delete on public.landing_product_images to authenticated;
grant all on public.landing_product_images to service_role;
alter table public.landing_product_images enable row level security;
create policy "members manage product images" on public.landing_product_images
  for all to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()))
  with check (public.is_workspace_member(workspace_id, auth.uid()));

create table if not exists public.landing_visual_briefs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  landing_page_id uuid references public.landing_pages(id) on delete cascade,
  section_id uuid references public.landing_page_sections(id) on delete set null,
  block_type text,
  proposal_id uuid references public.landing_ai_proposals(id) on delete set null,
  title text not null,
  visual_type text not null default 'product_group',
  purpose text,
  composition text,
  desktop_position text,
  mobile_position text,
  aspect_ratio text,
  background_treatment text,
  product_ids uuid[] not null default '{}',
  brief_text text,
  asset_status text not null default 'missing',
  asset_id uuid references public.landing_assets(id) on delete set null,
  generation_status text not null default 'not_started',
  approval_status text not null default 'pending',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landing_visual_briefs_asset_status_check check (asset_status in ('missing','existing','generated')),
  constraint landing_visual_briefs_generation_check check (generation_status in ('not_started','queued','generating','generated','failed')),
  constraint landing_visual_briefs_approval_check check (approval_status in ('pending','approved','rejected'))
);

create index if not exists landing_visual_briefs_page_idx on public.landing_visual_briefs(landing_page_id);

grant select, insert, update, delete on public.landing_visual_briefs to authenticated;
grant all on public.landing_visual_briefs to service_role;
alter table public.landing_visual_briefs enable row level security;
create policy "members manage visual briefs" on public.landing_visual_briefs
  for all to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()))
  with check (public.is_workspace_member(workspace_id, auth.uid()));

create policy "landing assets member read" on storage.objects
  for select to authenticated using (
    bucket_id = 'landing-assets'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "landing assets member insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'landing-assets'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "landing assets member update" on storage.objects
  for update to authenticated using (
    bucket_id = 'landing-assets'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "landing assets member delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'landing-assets'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );