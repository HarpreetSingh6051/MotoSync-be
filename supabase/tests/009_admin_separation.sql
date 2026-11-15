-- After migration 009. No fixture changes persist.
begin;
set local request.jwt.claim.role='service_role';
set local request.jwt.claims='{"role":"service_role"}';
do $$
declare actor uuid; result jsonb;
begin
 select id into actor from public.admin_users where role_id='super_admin' and status='active' limit 1;
 if actor is null then raise exception 'Administrator migration did not preserve login access';end if;
 if exists(select 1 from public.profiles where role='super_admin')then raise exception 'Rider role still grants admin semantics';end if;
 if exists(select 1 from public.profiles p join public.admin_users a on a.id=p.id where p.is_rider)then raise exception 'Legacy admins were not separated from rider listings';end if;
 if has_table_privilege('anon','public.admin_users','SELECT')or has_table_privilege('authenticated','public.admin_users','UPDATE')then raise exception 'Staff table exposed to rider clients';end if;
 begin
  perform public.admin_save_account(actor,'{"status":"suspended"}',actor);
  raise exception 'Self-suspension unexpectedly succeeded';
 exception when others then
  if SQLERRM<>'Cannot remove your own administrator access' then raise;end if;
 end;
 result:=public.admin_save_role('test_viewer','{"name":"Test viewer","permissions":["read"]}',actor);
 if result->>'id'<>'test_viewer' then raise exception 'Role save failed';end if;
end $$;
rollback;
