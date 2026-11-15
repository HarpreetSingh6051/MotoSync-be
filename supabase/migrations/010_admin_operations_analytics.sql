-- Admin operations, geographic aggregates, announcements, and operational alerts.
begin;
alter table public.profiles add column if not exists country_region text generated always as (coalesce(nullif(btrim(country),''),'Unknown')) stored;
alter table public.profiles add column if not exists city_region text generated always as (coalesce(nullif(btrim(city),''),'Unknown')) stored;
create index if not exists rider_country_region_idx on public.profiles(country_region,city_region) where is_rider;
create table if not exists public.platform_announcements (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 1 and 140),
 body text not null check(char_length(body) between 1 and 5000),
 audience text not null check(audience in ('all_riders','all_groups','club')),
 club_id uuid references public.clubs(id) on delete cascade,
 status text not null default 'draft' check(status in ('draft','published')),
 publish_at timestamptz not null default now(), expires_at timestamptz,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 check((audience='club')=(club_id is not null)), check(expires_at is null or expires_at>publish_at)
);
create index if not exists announcements_feed_idx on public.platform_announcements(status,publish_at);
create table if not exists public.admin_alerts (
 id uuid primary key default gen_random_uuid(), title text not null, message text not null,
 severity text not null check(severity in ('info','warning','critical')), source text not null,
 acknowledged_at timestamptz, acknowledged_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create index if not exists admin_alerts_open_idx on public.admin_alerts(created_at desc)where acknowledged_at is null;
alter table public.platform_announcements enable row level security;
alter table public.admin_alerts enable row level security;
revoke all on public.platform_announcements,public.admin_alerts from anon,authenticated;
grant select on public.platform_announcements to authenticated;
grant select,insert,update,delete on public.platform_announcements,public.admin_alerts to service_role;
drop policy if exists announcements_rider_feed on public.platform_announcements;
create policy announcements_rider_feed on public.platform_announcements for select to authenticated
 using(status='published' and publish_at<=now() and(expires_at is null or expires_at>now())
 and exists(select 1 from public.profiles where id=(select auth.uid())and is_rider and status='active')
 and(audience='all_riders' or(audience='all_groups'and exists(select 1 from public.club_members where user_id=(select auth.uid())))
 or(audience='club'and exists(select 1 from public.club_members where user_id=(select auth.uid())and club_id=platform_announcements.club_id))));

create or replace function public.admin_platform_analytics()returns jsonb language sql security invoker set search_path=public as $fn$
 select jsonb_build_object(
 'registrations',coalesce((select jsonb_agg(x)from public.admin_registration_trend()x),'[]'::jsonb),
 'countries',coalesce((select jsonb_agg(x)from(select coalesce(nullif(trim(country),''),'Unknown')country,count(*)riders from profiles where is_rider group by 1 order by 2 desc)x),'[]'::jsonb),
 'cities',coalesce((select jsonb_agg(x)from(select coalesce(nullif(trim(city),''),'Unknown')city,coalesce(nullif(trim(country),''),'Unknown')country,count(*)riders from profiles where is_rider group by 1,2 order by 3 desc)x),'[]'::jsonb),
 'ride_status',coalesce((select jsonb_agg(x)from(select status,count(*)rides from rides group by status)x),'[]'::jsonb),
 'ride_trend',coalesce((select jsonb_agg(x)from(select d::date as day,count(r.id)rides from generate_series(current_date-29,current_date,interval '1 day')d left join rides r on r.created_at>=d and r.created_at<d+interval '1 day'group by d order by d)x),'[]'::jsonb),
 'totals',jsonb_build_object('riders',(select count(*)from profiles where is_rider),'clubs',(select count(*)from clubs),'rides',(select count(*)from rides),'memberships',(select count(*)from club_members),'subscriptions',(select count(*)from subscriptions),'active_subscriptions',(select count(*)from subscriptions where status='active'),'announcements',(select count(*)from platform_announcements),'open_alerts',(select count(*)from admin_alerts where acknowledged_at is null)));
$fn$;
create or replace function public.admin_operate(operation text,entry jsonb,actor_id uuid)returns jsonb language plpgsql security invoker set search_path=public as $fn$
declare result jsonb; target uuid; captain uuid;
begin
 case operation
 when 'club' then
  captain:=(entry->>'created_by')::uuid;
  if not exists(select 1 from profiles where id=captain and is_rider and status='active')then raise exception 'Choose an active rider as group owner';end if;
  insert into clubs(name,handle,description,city,region,privacy,created_by)
  values(entry->>'name',entry->>'handle',entry->>'description',entry->>'city',entry->>'region',entry->>'privacy',captain)
  returning to_jsonb(clubs.*),id into result,target;
  insert into club_members(club_id,user_id,role)values(target,captain,'admin');
 when 'ride' then
  captain:=(entry->>'captain_id')::uuid;
  if (entry->>'start_time')::timestamptz<=now()then raise exception 'Ride must start in the future';end if;
  if not exists(select 1 from profiles where id=captain and is_rider and status='active')then raise exception 'Choose an active rider as captain';end if;
  if nullif(entry->>'club_id','') is not null and not exists(select 1 from club_members where club_id=(entry->>'club_id')::uuid and user_id=captain)then raise exception 'Captain must belong to the selected group';end if;
  insert into rides(title,route_summary,description,captain_id,club_id,start_time,meetup_label,distance_km,distance_label,max_riders,visibility,status)
  values(entry->>'title',entry->>'route_summary',entry->>'description',captain,nullif(entry->>'club_id','')::uuid,(entry->>'start_time')::timestamptz,entry->>'meetup_label',(entry->>'distance_km')::numeric,(entry->>'distance_km')||' km',(entry->>'max_riders')::integer,entry->>'visibility','upcoming')returning to_jsonb(rides.*),id into result,target;
  insert into ride_participants(ride_id,user_id,formation_role,rsvp_status)values(target,captain,'Road Captain','going');
 when 'announcement' then
  insert into platform_announcements(title,body,audience,club_id,status,publish_at,expires_at,created_by)
  values(entry->>'title',entry->>'body',entry->>'audience',nullif(entry->>'club_id','')::uuid,entry->>'status',(entry->>'publish_at')::timestamptz,nullif(entry->>'expires_at','')::timestamptz,actor_id)returning to_jsonb(platform_announcements.*),id into result,target;
 when 'archive_announcement' then
  target:=(entry->>'id')::uuid;
  update platform_announcements set status='draft'where id=target returning to_jsonb(platform_announcements.*)into result;
  if result is null then raise exception 'Announcement not found';end if;
 when 'acknowledge_alert' then
  target:=(entry->>'id')::uuid;
  update admin_alerts set acknowledged_at=coalesce(acknowledged_at,now()),acknowledged_by=coalesce(acknowledged_by,actor_id)where id=target returning to_jsonb(admin_alerts.*)into result;
  if result is null then raise exception 'Alert not found';end if;
 else raise exception 'Unsupported operation';end case;
 insert into admin_audit_log(actor_id,action,entity,entity_id,payload)values(actor_id,'operate',operation,target::text,entry);
 return result;
end;
$fn$;
create or replace function public.capture_maintenance_alert()returns trigger language plpgsql security definer set search_path=public as $fn$
begin
 if new.service_status='maintenance' and (TG_OP='INSERT' or old.service_status is distinct from new.service_status)then
 insert into admin_alerts(title,message,severity,source)values(new.name||' is in maintenance',coalesce(nullif(new.maintenance_message,''),'A feature was placed into maintenance.'),'warning','feature:'||new.key);
 end if;return new;
end;
$fn$;
drop trigger if exists feature_maintenance_alert on public.app_feature_flags;
create trigger feature_maintenance_alert after insert or update on public.app_feature_flags for each row execute function public.capture_maintenance_alert();
revoke all on function public.admin_platform_analytics(),public.admin_operate(text,jsonb,uuid),public.capture_maintenance_alert()from public,anon,authenticated;
grant execute on function public.admin_platform_analytics(),public.admin_operate(text,jsonb,uuid)to service_role;
commit;
