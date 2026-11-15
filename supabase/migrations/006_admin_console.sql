-- Apply after 005. Management RPCs are callable only by the trusted backend.
begin;
create or replace function public.admin_update_profile(target_id uuid, changes jsonb, actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 update profiles set status=coalesce(changes->>'status',status), subscription_plan_id=coalesce(changes->>'subscription_plan_id',subscription_plan_id)
 where id=target_id returning to_jsonb(profiles.*) into result;
 if result is null then raise exception 'Profile not found'; end if;
 insert into admin_audit_log(actor_id,action,entity,entity_id,payload) values(actor_id,'update','profile',target_id::text,changes);
 return result;
end $$;
create or replace function public.admin_verify_club(target_id uuid, verified_value boolean, actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 update clubs set verified=verified_value where id=target_id returning to_jsonb(clubs.*) into result;
 if result is null then raise exception 'Club not found'; end if;
 insert into admin_audit_log(actor_id,action,entity,entity_id,payload) values(actor_id,'verify','club',target_id::text,jsonb_build_object('verified',verified_value));
 return result;
end $$;
create or replace function public.admin_registration_trend()
returns table(day date, registrations bigint) language sql security definer set search_path=public as $$
 select days::date, count(p.id) from generate_series(current_date-29,current_date,interval '1 day') days
 left join profiles p on p.created_at>=days and p.created_at<days+interval '1 day'
 group by days order by days;
$$;
create or replace function public.admin_plan_distribution()
returns table(name text, subscribers bigint) language sql security definer set search_path=public as $$
 select coalesce(s.name,'Unassigned'),count(*) from profiles p left join subscription_plans s on s.id=p.subscription_plan_id group by s.name;
$$;
revoke all on function public.admin_update_profile(uuid,jsonb,uuid), public.admin_verify_club(uuid,boolean,uuid), public.admin_registration_trend(), public.admin_plan_distribution() from public,anon,authenticated;
grant execute on function public.admin_update_profile(uuid,jsonb,uuid), public.admin_verify_club(uuid,boolean,uuid), public.admin_registration_trend(), public.admin_plan_distribution() to service_role;
-- Free launch: no billing collection is introduced by this migration.
update public.subscription_plans set price_inr=0,price_usd=0;

create or replace function public.admin_save_plan(plan_data jsonb, actor_id uuid, is_new boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if is_new then
 insert into subscription_plans(id,name,tagline,audience,billing_interval,price_inr,price_usd,is_active,is_popular,sort_order,features)
 values(plan_data->>'id',plan_data->>'name',plan_data->>'tagline',plan_data->>'audience',plan_data->>'billing_interval',0,0,(plan_data->>'is_active')::boolean,(plan_data->>'is_popular')::boolean,(plan_data->>'sort_order')::integer,plan_data->'features') returning to_jsonb(subscription_plans.*) into result;
 else
 update subscription_plans set name=plan_data->>'name',tagline=plan_data->>'tagline',audience=plan_data->>'audience',billing_interval=plan_data->>'billing_interval',price_inr=0,price_usd=0,is_active=(plan_data->>'is_active')::boolean,is_popular=(plan_data->>'is_popular')::boolean,sort_order=(plan_data->>'sort_order')::integer,features=plan_data->'features' where id=plan_data->>'id' returning to_jsonb(subscription_plans.*) into result;
 end if;
 if result is null then raise exception 'Plan not found'; end if;
 insert into admin_audit_log(actor_id,action,entity,entity_id,payload) values(actor_id,'save','plan',plan_data->>'id',plan_data);
 return result;
end $$;
revoke all on function public.admin_save_plan(jsonb,uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_save_plan(jsonb,uuid,boolean) to service_role;

commit;
