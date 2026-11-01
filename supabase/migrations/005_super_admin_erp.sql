-- =====================================================================
-- Kixup — 005 Super Admin ERP, shared platform config & live sync
-- Run AFTER 004_storage.sql.
--
-- This migration is intentionally self-contained and idempotent:
--   * new tables + seeds use IF NOT EXISTS / ON CONFLICT DO NOTHING
--   * realtime publication changes swallow duplicate_object
--   * policies are dropped before being recreated
--
-- Security model:
--   * anyone (anon + authenticated) can read active plans, flags,
--     sounds and campaigns — the rider app needs them before login
--   * only a profile with role = 'super_admin' can write
--   * a trigger stops riders from self-promoting role/status/PRO/plan
--   * the service_role key is never used in the browser
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Subscription plans
-- ---------------------------------------------------------------------
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  tagline text not null default '',
  badge_type text not null default 'none'
    check (badge_type in ('none', 'silver_visor', 'golden_helmet', 'club_shield')),
  audience text not null default 'rider'
    check (audience in ('rider', 'club')),
  price_inr integer not null default 0 check (price_inr >= 0),
  price_usd numeric(10, 2) not null default 0 check (price_usd >= 0),
  billing_interval text not null default 'monthly'
    check (billing_interval in ('monthly', 'annual', 'lifetime')),
  is_popular boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  features jsonb not null default '[]'::jsonb
    check (jsonb_typeof(features) = 'array'),
  limits jsonb not null default '{}'::jsonb
    check (jsonb_typeof(limits) = 'object'),
  subscribers_count integer not null default 0 check (subscribers_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Feature flags
-- ---------------------------------------------------------------------
create table if not exists public.app_feature_flags (
  key text primary key,
  name text not null,
  description text not null default '',
  category text not null default 'core'
    check (category in ('core', 'ai', 'monetization', 'experimental', 'safety')),
  is_enabled boolean not null default true,
  access_level text not null default 'all'
    check (access_level in ('all', 'pro_only', 'club_admins', 'beta_testers')),
  rollout_percentage integer not null default 100
    check (rollout_percentage between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Exhaust sound vault
-- ---------------------------------------------------------------------
create table if not exists public.exhaust_sounds (
  id text primary key,
  name text not null,
  brand text not null default '',
  engine_configuration text not null default '',
  decibels integer not null default 98 check (decibels between 40 and 140),
  audio_url text,
  synth_preset text not null default 'harley_vtwin'
    check (synth_preset in ('harley_vtwin', 'bullet_thump', 'ninja_inline4', 'ducati_v4', 'triumph_triple')),
  is_pro_only boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Sponsored campaigns
-- ---------------------------------------------------------------------
create table if not exists public.sponsored_campaigns (
  id text primary key,
  sponsor_name text not null,
  title text not null,
  perk_offer text not null default '',
  region text not null default 'All'
    check (region in ('India', 'Global', 'All')),
  cta_url text,
  cpm_rate_usd numeric(10, 2) not null default 0 check (cpm_rate_usd >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Admin audit log
-- ---------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. Profile columns for the ERP
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'rider',
  add column if not exists status text not null default 'active',
  add column if not exists subscription_plan_id text,
  add column if not exists selected_exhaust_sound text,
  add column if not exists phone text,
  add column if not exists last_active_at timestamptz default now();

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('rider', 'road_captain', 'club_admin', 'super_admin'));

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'suspended', 'banned'));

-- ---------------------------------------------------------------------
-- 7. Seeds
-- ---------------------------------------------------------------------
insert into public.subscription_plans
  (id, name, tagline, badge_type, audience, price_inr, price_usd, billing_interval,
   is_popular, is_active, sort_order, features, limits, subscribers_count)
values
  (
    'plan_free', 'Free Rider', 'Join the pack. Learn the roads.', 'none', 'rider',
    0, 0, 'monthly', false, true, 0,
    '["Join public rides and club lounges","Pack chat, pings and live radar preview","2 AI receipt scans every month","1080p reels with the Kixup watermark"]'::jsonb,
    '{"aiScansPerMonth":2,"reelQuality":"1080p","watermark":true,"offlineGpx":false,"familyLinks":false}'::jsonb,
    0
  ),
  (
    'plan_silver', 'Silver Visor', 'A sharper view of every Sunday run.', 'silver_visor', 'rider',
    99, 1.99, 'monthly', false, true, 1,
    '["Everything in Free Rider","10 AI receipt scans every month","Watermark-free 1080p reels","Family tracking web links"]'::jsonb,
    '{"aiScansPerMonth":10,"reelQuality":"1080p","watermark":false,"offlineGpx":false,"familyLinks":true}'::jsonb,
    126
  ),
  (
    'plan_pro', 'Road Captain PRO', 'Lead the pack with the full toolkit.', 'golden_helmet', 'rider',
    199, 4.99, 'monthly', true, true, 2,
    '["Unlimited AI receipt scans and tank splits","4K watermark-free reel exports","Offline mountain GPX downloads","Pack spread / fall-behind alerts","Family tracking web links","Helmet intercom bridge","Biker SOS beacon"]'::jsonb,
    '{"aiScansPerMonth":1000000,"reelQuality":"4K","watermark":false,"offlineGpx":true,"familyLinks":true}'::jsonb,
    412
  ),
  (
    'plan_pro_annual', 'Road Captain PRO Annual', 'Twelve months of pack tools, one tank of fuel saved.', 'golden_helmet', 'rider',
    1499, 39.99, 'annual', true, true, 3,
    '["Everything in Road Captain PRO","Two months free vs monthly","Priority Sunday route packs","Founder badge in the rider directory"]'::jsonb,
    '{"aiScansPerMonth":1000000,"reelQuality":"4K","watermark":false,"offlineGpx":true,"familyLinks":true}'::jsonb,
    188
  ),
  (
    'plan_club', 'Club Shield', 'Run the whole club, not just the ride.', 'club_shield', 'club',
    4999, 59, 'monthly', false, true, 4,
    '["Club lounge, roster and role management","Unlimited group-only rides and polls","Club analytics and ride exports","Co-branded sponsor placements","Priority support for road captains"]'::jsonb,
    '{"aiScansPerMonth":1000000,"reelQuality":"4K","watermark":false,"offlineGpx":true,"familyLinks":true}'::jsonb,
    24
  )
on conflict (id) do nothing;

insert into public.app_feature_flags
  (key, name, description, category, is_enabled, access_level, rollout_percentage)
values
  ('sponsored_pitstop_ads', 'Sponsored pitstop ads', 'Partner perk cards in the feed, targeted by region.', 'monetization', true, 'all', 100),
  ('live_helmet_intercom', 'Live helmet intercom', 'PRO WebRTC voice bridge for Cardo, Sena and AirPods.', 'core', true, 'pro_only', 100),
  ('ai_reel_studio_4k', 'Reel Studio 4K', '4K export and watermark removal for AI reel cuts.', 'ai', true, 'pro_only', 100),
  ('sweep_gap_radar_alert', 'Sweep gap radar alert', 'Instant fall-behind warning when the tail drops over 2 km.', 'safety', true, 'pro_only', 100),
  ('ai_receipt_ocr', 'AI receipt OCR', 'Gemini vision scans dhaba bills and splits them by roster.', 'ai', true, 'pro_only', 100),
  ('ignition_splash_sound', 'Ignition splash + startup sound', 'First-launch ignition sequence with selectable exhaust notes.', 'core', true, 'all', 100),
  ('biker_sos_beacon', 'Biker SOS beacon', 'One-tap emergency broadcast with the last known pack position.', 'safety', true, 'pro_only', 100),
  ('near_me_radar', 'Near-me radar', 'Device geolocation for the 400 km nearby ride radius.', 'core', true, 'all', 100),
  ('club_shield_badge', 'Club Shield badge', 'Club-tier shield badge and club analytics surface.', 'experimental', true, 'club_admins', 100),
  ('offline_gpx_download', 'Offline GPX downloads', 'Download route files before losing signal in the passes.', 'core', true, 'pro_only', 100)
on conflict (key) do nothing;

insert into public.exhaust_sounds
  (id, name, brand, engine_configuration, decibels, synth_preset, is_pro_only, is_active, sort_order)
values
  ('harley_vtwin', 'Fat Bob 114', 'Harley-Davidson', '45 degree V-Twin', 98, 'harley_vtwin', false, true, 0),
  ('bullet_thump', 'Bullet 350', 'Royal Enfield', 'Single cylinder', 92, 'bullet_thump', false, true, 1),
  ('ninja_inline4', 'Ninja ZX-6R', 'Kawasaki', 'Inline-4', 104, 'ninja_inline4', true, true, 2),
  ('ducati_v4', 'Panigale V4', 'Ducati', 'Desmosedici V4', 106, 'ducati_v4', true, true, 3),
  ('triumph_triple', 'Speed Triple 1200', 'Triumph', 'Inline-3', 100, 'triumph_triple', true, true, 4)
on conflict (id) do nothing;

insert into public.sponsored_campaigns
  (id, sponsor_name, title, perk_offer, region, cpm_rate_usd, impressions, clicks, is_active)
values
  ('camp_highway_king', 'Highway King Dhaba', '15% off for 5+ riders', 'Show your live pack radar at the counter on NH-44, Karnal. Free chai refills for the sweep.', 'India', 4.50, 18400, 612, true),
  ('camp_gearup', 'GearUp Helmets', '500 INR off a new visor', 'Pack members get 500 INR off anti-fog visors at GearUp Ludhiana and Chandigarh.', 'India', 3.20, 9120, 284, true),
  ('camp_revzilla', 'RevZilla', '10% off touring tyres', 'Global pack perk: 10% off Michelin Road 6 and Metzeler Tourance with code KIXUP10.', 'Global', 6.80, 12760, 431, true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 8. Profile defaults + foreign keys
-- ---------------------------------------------------------------------
update public.profiles
set subscription_plan_id = 'plan_free'
where subscription_plan_id is null;

update public.profiles
set selected_exhaust_sound = 'harley_vtwin'
where selected_exhaust_sound is null;

alter table public.profiles alter column subscription_plan_id set default 'plan_free';
alter table public.profiles alter column selected_exhaust_sound set default 'harley_vtwin';

alter table public.profiles drop constraint if exists profiles_subscription_plan_fk;
alter table public.profiles
  add constraint profiles_subscription_plan_fk
  foreign key (subscription_plan_id) references public.subscription_plans (id)
  on delete set null;

alter table public.profiles drop constraint if exists profiles_exhaust_sound_fk;
alter table public.profiles
  add constraint profiles_exhaust_sound_fk
  foreign key (selected_exhaust_sound) references public.exhaust_sounds (id)
  on delete set null;

-- ---------------------------------------------------------------------
-- 9. Super-admin helper + privilege guard
-- ---------------------------------------------------------------------
create or replace function public.is_super_admin(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = _user_id
      and role = 'super_admin'
      and status = 'active'
  );
$$;

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role / server-side jobs may change anything.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_super_admin(auth.uid()) then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.subscription_plan_id is distinct from old.subscription_plan_id
     or new.is_pro is distinct from old.is_pro
     or new.selected_exhaust_sound is distinct from old.selected_exhaust_sound then
    raise exception 'Only a super admin can change role, status, plan, PRO or startup sound';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------
-- 10. updated_at triggers
-- ---------------------------------------------------------------------
drop trigger if exists subscription_plans_touch on public.subscription_plans;
create trigger subscription_plans_touch before update on public.subscription_plans
  for each row execute function public.touch_updated_at();

drop trigger if exists app_feature_flags_touch on public.app_feature_flags;
create trigger app_feature_flags_touch before update on public.app_feature_flags
  for each row execute function public.touch_updated_at();

drop trigger if exists exhaust_sounds_touch on public.exhaust_sounds;
create trigger exhaust_sounds_touch before update on public.exhaust_sounds
  for each row execute function public.touch_updated_at();

drop trigger if exists sponsored_campaigns_touch on public.sponsored_campaigns;
create trigger sponsored_campaigns_touch before update on public.sponsored_campaigns
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 11. Row level security
-- ---------------------------------------------------------------------
alter table public.subscription_plans enable row level security;
alter table public.app_feature_flags enable row level security;
alter table public.exhaust_sounds enable row level security;
alter table public.sponsored_campaigns enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists plans_select on public.subscription_plans;
create policy plans_select on public.subscription_plans
  for select to anon, authenticated
  using (is_active or public.is_super_admin());

drop policy if exists plans_write on public.subscription_plans;
create policy plans_write on public.subscription_plans
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists flags_select on public.app_feature_flags;
create policy flags_select on public.app_feature_flags
  for select to anon, authenticated
  using (true);

drop policy if exists flags_write on public.app_feature_flags;
create policy flags_write on public.app_feature_flags
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists sounds_select on public.exhaust_sounds;
create policy sounds_select on public.exhaust_sounds
  for select to anon, authenticated
  using (is_active or public.is_super_admin());

drop policy if exists sounds_write on public.exhaust_sounds;
create policy sounds_write on public.exhaust_sounds
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists campaigns_select on public.sponsored_campaigns;
create policy campaigns_select on public.sponsored_campaigns
  for select to anon, authenticated
  using (is_active or public.is_super_admin());

drop policy if exists campaigns_write on public.sponsored_campaigns;
create policy campaigns_write on public.sponsored_campaigns
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists audit_select on public.admin_audit_log;
create policy audit_select on public.admin_audit_log
  for select to authenticated
  using (public.is_super_admin());

drop policy if exists audit_insert on public.admin_audit_log;
create policy audit_insert on public.admin_audit_log
  for insert to authenticated
  with check (public.is_super_admin());

-- Super admins can update any profile. The trigger still protects
-- privileged columns from riders updating their own row.
drop policy if exists profiles_update_super_admin on public.profiles;
create policy profiles_update_super_admin on public.profiles
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------
-- 12. Realtime publication
-- ---------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.subscription_plans;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.app_feature_flags;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.exhaust_sounds;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.sponsored_campaigns;
  exception when duplicate_object then null;
  end;
end $$;

alter table public.subscription_plans replica identity full;
alter table public.app_feature_flags replica identity full;
alter table public.exhaust_sounds replica identity full;
alter table public.sponsored_campaigns replica identity full;

-- ---------------------------------------------------------------------
-- 13. Indexes + grants
-- ---------------------------------------------------------------------
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_plan_idx on public.profiles (subscription_plan_id);
create index if not exists plans_active_sort_idx on public.subscription_plans (is_active, sort_order);
create index if not exists flags_category_idx on public.app_feature_flags (category);
create index if not exists sounds_active_sort_idx on public.exhaust_sounds (is_active, sort_order);
create index if not exists campaigns_active_region_idx on public.sponsored_campaigns (is_active, region);
create index if not exists audit_created_idx on public.admin_audit_log (created_at desc);

grant execute on function public.is_super_admin(uuid) to anon, authenticated;

-- =====================================================================
-- BOOTSTRAP (run once in the Supabase SQL editor after creating your user)
--
--   update public.profiles
--   set role = 'super_admin'
--   where id = '<your-auth-user-uuid>';
--
-- Then open /#/admin, request a magic link with that email, and the ERP
-- will be able to write through RLS.
-- =====================================================================
