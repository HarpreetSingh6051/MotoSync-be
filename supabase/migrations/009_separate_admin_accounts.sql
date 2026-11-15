-- Run after migration 008. Staff access is independent of rider profiles.
begin;
set local request.jwt.claim.role = 'service_role';
set local request.jwt.claims = '{"role":"service_role"}';

create table if not exists public.admin_roles (
 id text primary key check (id ~ '^[a-z0-9_]{3,40}$'),
 name text not null,
 permissions text[] not null default ARRAY['read']::text[],
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint admin_roles_valid_permissions check (
  permissions <@ ARRAY['read','write','manage_admins']::text[]
  and permissions @> ARRAY['read']::text[]
 )
);
insert into public.admin_roles(id,name,permissions) values
 ('super_admin','Super administrator',ARRAY['read','write','manage_admins']),
 ('operator','Platform operator',ARRAY['read','write']),
 ('viewer','Read-only administrator',ARRAY['read'])
on conflict(id) do nothing;

create table if not exists public.admin_users (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null unique,
 full_name text not null,
 handle text unique,
 role_id text not null references public.admin_roles(id),
 status text not null default 'active' check(status in ('active','suspended')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists admin_users_role_idx on public.admin_users(role_id,status);
alter table public.profiles add column if not exists is_rider boolean not null default true;
insert into public.admin_users(id,email,full_name,handle,role_id,status,created_at)
select p.id,u.email,p.full_name,p.handle,'super_admin',
 case when p.status='active' then 'active' else 'suspended' end,p.created_at
from public.profiles p join auth.users u on u.id=p.id
where p.role='super_admin' on conflict(id) do nothing;
-- Retain profile shells for historical foreign keys; omit them from rider lists.
update public.profiles set is_rider=false where role='super_admin';
alter table public.admin_audit_log drop constraint if exists admin_audit_log_actor_id_fkey;
alter table public.admin_audit_log add constraint admin_audit_log_actor_id_fkey
 foreign key(actor_id) references auth.users(id) on delete set null;

create or replace function public.is_super_admin(_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $fn$
 select exists(select 1 from public.admin_users
 where id=_user_id and role_id='super_admin' and status='active');
$fn$;
update public.profiles set role='rider' where role='super_admin';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
 check(role in ('rider','road_captain','club_admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $fn$
begin
 if new.raw_app_meta_data->>'account_type'='admin' then return new; end if;
 insert into public.profiles(id,handle,full_name,avatar_url,city,primary_bike)
 values(new.id,
 coalesce(nullif(regexp_replace(lower(coalesce(new.raw_user_meta_data->>'user_name','')),'[^a-z0-9_]','','g'),''),'rider_'||substr(new.id::text,1,8)),
 coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name','New Rider'),
 new.raw_user_meta_data->>'avatar_url',coalesce(new.raw_user_meta_data->>'city',''),
 coalesce(new.raw_user_meta_data->>'primary_bike','')) on conflict(id) do nothing;
 return new;
end;
$fn$;
alter table public.admin_users enable row level security;
alter table public.admin_roles enable row level security;
revoke all on public.admin_users,public.admin_roles from anon,authenticated;
grant select,insert,update,delete on public.admin_users,public.admin_roles to service_role;

create or replace function public.admin_save_account(account_id uuid,changes jsonb,actor_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $fn$
declare result jsonb; current_row public.admin_users; target_email text;
begin
 perform pg_advisory_xact_lock(hashtext('motosync_admin_accounts'));
 if not public.is_super_admin(actor_id) then raise exception 'Super administrator required'; end if;
 select * into current_row from public.admin_users where id=account_id;
 if account_id=actor_id and
 ((changes ? 'role_id' and changes->>'role_id'<>'super_admin') or
  (changes ? 'status' and changes->>'status'<>'active')) then
  raise exception 'Cannot remove your own administrator access';
 end if;
 select email into target_email from auth.users where id=account_id;
 if target_email is null then raise exception 'Auth identity not found'; end if;
 insert into public.admin_users(id,email,full_name,role_id,status)
 values(account_id,target_email,coalesce(changes->>'full_name',current_row.full_name),
 coalesce(changes->>'role_id',current_row.role_id),coalesce(changes->>'status',current_row.status,'active'))
 on conflict(id) do update set full_name=excluded.full_name,role_id=excluded.role_id,
 status=excluded.status,updated_at=now() returning to_jsonb(admin_users.*) into result;
 insert into public.admin_audit_log(actor_id,action,entity,entity_id,payload)
 values(actor_id,'save','admin_user',account_id::text,changes);
 return result;
end;
$fn$;
create or replace function public.admin_save_role(role_key text,changes jsonb,actor_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $fn$
declare result jsonb;
begin
 if not public.is_super_admin(actor_id) then raise exception 'Super administrator required'; end if;
 if role_key='super_admin' then raise exception 'The super administrator role is protected'; end if;
 if (changes->'permissions') ? 'manage_admins' then
  raise exception 'Only the protected super administrator role may manage administrators';
 end if;
 insert into public.admin_roles(id,name,permissions)
 values(role_key,changes->>'name',ARRAY(select jsonb_array_elements_text(changes->'permissions')))
 on conflict(id) do update set name=excluded.name,permissions=excluded.permissions,updated_at=now()
 returning to_jsonb(admin_roles.*) into result;
 insert into public.admin_audit_log(actor_id,action,entity,entity_id,payload)
 values(actor_id,'save','admin_role',role_key,changes);
 return result;
end;
$fn$;
revoke all on function public.admin_save_account(uuid,jsonb,uuid),public.admin_save_role(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.admin_save_account(uuid,jsonb,uuid),public.admin_save_role(text,jsonb,uuid) to service_role;

create or replace function public.admin_registration_trend()
returns table(day date,registrations bigint) language sql security invoker set search_path=public as $fn$
 select d::date,count(p.id) from generate_series(current_date-29,current_date,interval '1 day') d
 left join public.profiles p on p.is_rider and p.created_at>=d and p.created_at<d+interval '1 day'
 group by d order by d;
$fn$;
create or replace function public.admin_plan_distribution()
returns table(name text,subscribers bigint) language sql security invoker set search_path=public as $fn$
 select coalesce(s.name,'Unassigned'),count(*) from public.profiles p
 left join public.subscription_plans s on s.id=p.subscription_plan_id where p.is_rider group by s.name;
$fn$;
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path=public as $fn$
begin
 if auth.role()='service_role' or public.is_super_admin(auth.uid()) then return new; end if;
 if new.role is distinct from old.role or new.status is distinct from old.status
 or new.subscription_plan_id is distinct from old.subscription_plan_id
 or new.is_pro is distinct from old.is_pro
 or new.selected_exhaust_sound is distinct from old.selected_exhaust_sound
 or new.is_rider is distinct from old.is_rider then
  raise exception 'Only an administrator can change protected rider attributes';
 end if;
 return new;
end;
$fn$;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
 using(is_rider or id=(select auth.uid()) or public.is_super_admin());
commit;
