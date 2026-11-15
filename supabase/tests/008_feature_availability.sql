-- Run after migration 008 using a trusted database session. All fixture writes roll back.
begin;
set local request.jwt.claim.role='service_role';
set local request.jwt.claims='{"role":"service_role"}';
do $$
declare actor uuid; saved jsonb; audit_before bigint; audit_after bigint;
begin
 select id into actor from public.profiles where role='super_admin' and status='active' limit 1;
 if actor is null then raise exception 'An active administrator is required';end if;
 select count(*) into audit_before from public.admin_audit_log where entity='flags' and entity_id='__admin_smoke_test';
 saved:=public.admin_save_config('flags','__admin_smoke_test','{"name":"Availability smoke test","service_status":"maintenance","is_enabled":false,"maintenance_message":"Back soon"}',actor);
 if saved->>'service_status'<>'maintenance' or (saved->>'is_enabled')::boolean then raise exception 'Maintenance state did not persist';end if;
 select count(*) into audit_after from public.admin_audit_log where entity='flags' and entity_id='__admin_smoke_test';
 if audit_after<>audit_before+1 then raise exception 'Audit event missing';end if;
 update public.app_feature_flags set is_enabled=true where key='__admin_smoke_test';
 if not exists(select 1 from public.app_feature_flags where key='__admin_smoke_test' and service_status='enabled') then raise exception 'Compatibility state sync failed';end if;
 if has_function_privilege('anon','public.admin_save_config(text,text,jsonb,uuid)','EXECUTE') then raise exception 'Anonymous config access exists';end if;
 if has_function_privilege('authenticated','public.admin_save_config(text,text,jsonb,uuid)','EXECUTE') then raise exception 'Rider config access exists';end if;
end $$;
rollback;
