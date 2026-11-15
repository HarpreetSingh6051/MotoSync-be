-- Authenticated rider actions: identity comes from the API's verified JWT.
begin;
insert into public.app_feature_flags(key,name,description,category,service_status,is_enabled)
values ('chat','Group chat','Rider group messaging','core','enabled',true),('splits','Ride expenses','Read recorded ride expenses','core','enabled',true)
on conflict(key)do nothing;
create or replace function public.rider_operate(operation text,target_id uuid,message_body text,actor_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $fn$
declare c clubs; r rides; result jsonb; feature_key text;
begin
 if not exists(select 1 from profiles where id=actor_id and is_rider and status='active') then raise exception 'An active rider account is required';end if;
 feature_key:=case when operation='message' then 'chat' when operation in('join_club','leave_club') then 'clubs' else 'rides' end;
 if exists(select 1 from app_feature_flags where key=feature_key and service_status<>'enabled')then raise exception 'This feature is unavailable';end if;
 if operation in('join_club','leave_club','message')then
  select * into c from clubs where id=target_id for update;
  if not found then raise exception 'Group not found';end if;
  if operation='join_club' then
   if c.privacy<>'public' and not exists(select 1 from club_members where club_id=target_id and user_id=actor_id)then raise exception 'This group requires an invitation';end if;
   insert into club_members(club_id,user_id,role)values(target_id,actor_id,'member')on conflict do nothing;
  elsif operation='leave_club' then
   if c.created_by=actor_id then raise exception 'Ask an administrator to transfer ownership before leaving';end if;
   delete from club_members where club_id=target_id and user_id=actor_id;
  else
   if not exists(select 1 from club_members where club_id=target_id and user_id=actor_id)then raise exception 'Join this group before sending a message';end if;
   if message_body is null or char_length(btrim(message_body))not between 1 and 2000 then raise exception 'Message must contain 1 to 2000 characters';end if;
   insert into chat_messages(club_id,sender_id,message_text,kind)values(target_id,actor_id,btrim(message_body),'text')returning to_jsonb(chat_messages.*)into result;
   return result;
  end if;
 elsif operation in('join_ride','leave_ride') then
  select * into r from rides where id=target_id for update;
  if not found then raise exception 'Ride not found';end if;
  if operation='join_ride' then
   if r.status<>'upcoming' or r.start_time<=now()then raise exception 'This ride is no longer accepting RSVPs';end if;
   if r.visibility<>'public' and r.captain_id<>actor_id and not exists(select 1 from club_members where club_id=r.club_id and user_id=actor_id)then raise exception 'Join the group before joining its ride';end if;
   if not exists(select 1 from ride_participants where ride_id=target_id and user_id=actor_id and rsvp_status='going')and (select count(*)from ride_participants where ride_id=target_id and rsvp_status='going')>=r.max_riders then raise exception 'This ride is full';end if;
   insert into ride_participants(ride_id,user_id,rsvp_status,formation_role)values(target_id,actor_id,'going','Pack Member')on conflict(ride_id,user_id)do update set rsvp_status='going',updated_at=now();
  else
   if r.captain_id=actor_id then raise exception 'The captain cannot leave their own ride';end if;
   delete from ride_participants where ride_id=target_id and user_id=actor_id;
  end if;
 else raise exception 'Unknown rider operation';end if;
 return jsonb_build_object('ok',true);
end;
$fn$;
revoke all on function public.rider_operate(text,uuid,text,uuid)from public,anon,authenticated;
grant execute on function public.rider_operate(text,uuid,text,uuid)to service_role;
-- Prevent direct client writes from bypassing capacity, role and feature checks.
revoke insert,update,delete on public.club_members,public.ride_participants,public.chat_messages from anon,authenticated;
grant select,insert,update,delete on public.club_members,public.ride_participants,public.chat_messages to service_role;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('011', 'rider_operations', ARRAY['011_rider_operations.sql'])
on conflict (version) do nothing;
commit;
