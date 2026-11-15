-- Default MotoSync application administrator. Apply after 006_admin_console.sql.
-- Run as the database migration owner, never through a public RPC.
-- Existing administrators keep their password, status and metadata on replay.
begin;
set local search_path = public, extensions, pg_catalog;
-- The profile privilege trigger permits trusted service-role migration writes.
set local request.jwt.claim.role = 'service_role';
set local request.jwt.claims = '{"role":"service_role"}';

DO $bootstrap$
declare
  admin_id uuid;
  bootstrap_email constant text := 'admin@motosync.com';
  profile_role text;
begin
  -- Serialize replays against the same database.
  perform pg_advisory_xact_lock(hashtext('motosync_default_admin'));
  select id into admin_id from auth.users where lower(email) = bootstrap_email;

  if admin_id is not null then
    select role into profile_role from public.profiles where id = admin_id;
    if profile_role is distinct from 'super_admin' then
      raise exception 'Bootstrap email already belongs to an account without the super_admin role. Resolve this conflict explicitly before retrying.';
    end if;
    -- Never restore a known default password or reactivate a disabled account.
    return;
  end if;

  admin_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current, email_change,
    reauthentication_token, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', admin_id,
    'authenticated', 'authenticated', bootstrap_email,
    crypt('password', gen_salt('bf', 10)),
    now(), '', '', '', '', '', '',
    '{"provider":"email","providers":["email"],"motosync_bootstrap":true}'::jsonb,
    '{"full_name":"MotoSync Administrator"}'::jsonb,
    false, now(), now()
  );

  -- Supabase email/password accounts need a corresponding email identity.
  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, created_at, updated_at
  ) values (
    gen_random_uuid(), admin_id, admin_id::text, 'email',
    jsonb_build_object('sub', admin_id::text, 'email', bootstrap_email,
                       'email_verified', true, 'phone_verified', false),
    now(), now()
  );

  -- Migration 002 normally creates the profile via the auth insert trigger.
  -- Also handle databases where that trigger has not been installed.
  insert into public.profiles (id, handle, full_name, role, status)
  values (admin_id, 'admin_' || substr(replace(admin_id::text, '-', ''), 1, 16),
          'MotoSync Administrator', 'super_admin', 'active')
  on conflict (id) do update set role = 'super_admin', status = 'active';

  insert into public.admin_audit_log (actor_id, action, entity, entity_id, payload)
  values (admin_id, 'bootstrap', 'profile', admin_id::text,
          jsonb_build_object('email', bootstrap_email, 'role', 'super_admin'));
end
$bootstrap$;
commit;
