-- Feature availability and transactional configuration management.
begin;
alter table public.app_feature_flags add column if not exists service_status text;
alter table public.app_feature_flags add column if not exists maintenance_message text not null default '';
update public.app_feature_flags set service_status=case when is_enabled then 'enabled' else 'disabled' end where service_status is null;
alter table public.app_feature_flags alter column service_status set default 'enabled', alter column service_status set not null;
alter table public.app_feature_flags drop constraint if exists flags_service_status_check;
alter table public.app_feature_flags add constraint flags_service_status_check check(service_status in ('enabled','disabled','maintenance'));
create or replace function public.sync_feature_availability() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='UPDATE' and new.service_status is not distinct from old.service_status and new.is_enabled is distinct from old.is_enabled then
  new.service_status:=case when new.is_enabled then 'enabled' else 'disabled' end;
 else new.is_enabled:=(new.service_status='enabled'); end if;
 return new;
end $$;
drop trigger if exists flags_availability_sync on public.app_feature_flags;
create trigger flags_availability_sync before insert or update on public.app_feature_flags for each row execute function public.sync_feature_availability();
insert into public.app_feature_flags(key,name,description,category,service_status,is_enabled)
values ('rides','Ride planning','Ride catalogue and planning','core','enabled',true),('clubs','Groups and clubs','Community groups','core','enabled',true),('sounds','Sound library','Rider sound catalogue','core','enabled',true),('campaigns','Campaigns','Sponsored offers','monetization','disabled',false)
on conflict(key) do nothing;
create or replace function public.admin_save_config(resource_name text,resource_id text,changes jsonb,actor_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare target_table text; key_column text; allowed text[]; field text; columns_sql text; result jsonb;
begin
 case resource_name
 when 'flags' then target_table:='app_feature_flags';key_column:='key';allowed:=array['name','description','category','is_enabled','access_level','rollout_percentage','service_status','maintenance_message'];
 when 'sounds' then target_table:='exhaust_sounds';key_column:='id';allowed:=array['name','brand','engine_configuration','decibels','audio_url','synth_preset','is_pro_only','is_active','sort_order'];
 when 'campaigns' then target_table:='sponsored_campaigns';key_column:='id';allowed:=array['sponsor_name','title','perk_offer','region','cta_url','cpm_rate_usd','is_active'];
 else raise exception 'Unknown resource';end case;
 for field in select jsonb_object_keys(changes) loop
  if not field=any(allowed) then raise exception 'Unsupported field';end if;
 end loop;
 select string_agg(format('%I',k),',') into columns_sql from jsonb_object_keys(changes||jsonb_build_object(key_column,resource_id)) k;
 execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) on conflict (%I) do update set (%s) = (select %s from jsonb_populate_record(null::public.%I,$1)) returning to_jsonb(%I.*)',target_table,columns_sql,columns_sql,target_table,key_column,columns_sql,columns_sql,target_table,target_table)
 using changes||jsonb_build_object(key_column,resource_id) into result;
 insert into admin_audit_log(actor_id,action,entity,entity_id,payload)values(actor_id,'configure',resource_name,resource_id,changes);
 return result;
end $$;
revoke all on function public.admin_save_config(text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.admin_save_config(text,text,jsonb,uuid) to service_role;
grant select,insert,update on public.app_feature_flags,public.exhaust_sounds,public.sponsored_campaigns to service_role;
grant select on public.app_feature_flags to anon,authenticated;
commit;
