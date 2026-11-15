-- Run as trusted migration owner after 011. Fixtures and mutations roll back.
begin;
set local request.jwt.claim.role='service_role';
do $test$
declare captain uuid; rider uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); group_id uuid:=gen_random_uuid(); test_ride uuid:=gen_random_uuid(); response jsonb;
begin
 select id into captain from profiles limit 1;
 if captain is null then raise exception 'A profile fixture is required';end if;
 update profiles set is_rider=true,status='active'where id=captain;
 insert into auth.users(id,email)values(rider,'rider_test_'||rider||'@example.invalid'),(outsider,'other_test_'||outsider||'@example.invalid');
 insert into profiles(id,handle,full_name,role,status,is_rider)values(rider,'rt_'||left(replace(rider::text,'-',''),16),'Test rider','rider','active',true),(outsider,'rt_'||left(replace(outsider::text,'-',''),16),'Other rider','rider','active',true)on conflict(id)do update set is_rider=true,status='active';
 insert into app_feature_flags(key,name,service_status)values('clubs','Groups','enabled'),('rides','Rides','enabled'),('chat','Chat','enabled')on conflict(key)do update set service_status='enabled';
 insert into clubs(id,name,handle,city,region,privacy,created_by)values(group_id,'SQL test group','test_'||replace(group_id::text,'-',''),'Test','Global','public',captain);
 perform rider_operate('join_club',group_id,null,rider);
 perform rider_operate('join_club',group_id,null,rider);
 if(select count(*)from club_members where club_id=group_id and user_id=rider)<>1 then raise exception 'Join must be idempotent';end if;
 if not exists(select 1 from club_members where club_id=group_id and user_id=rider and role='member')then raise exception 'Member role missing';end if;
 response:=rider_operate('message',group_id,'Hello pack',rider);
 if response->>'sender_id'<>rider::text then raise exception 'Sender identity mismatch';end if;
 begin
  perform rider_operate('message',group_id,'Unauthorized',outsider);
  raise exception 'FAILED non-member message accepted';
 exception when raise_exception then if SQLERRM like 'FAILED%'then raise;end if;end;
 insert into rides(id,title,route_summary,captain_id,club_id,start_time,max_riders,visibility,status)values(test_ride,'Capacity test','Test route',captain,group_id,now()+interval '1 day',2,'group_only','upcoming');
 insert into ride_participants(ride_id,user_id,formation_role,rsvp_status)values(test_ride,captain,'Road Captain','going');
 perform rider_operate('join_ride',test_ride,null,rider);
 perform rider_operate('join_ride',test_ride,null,rider);
 perform rider_operate('join_club',group_id,null,outsider);
 begin
  perform rider_operate('join_ride',test_ride,null,outsider);
  raise exception 'FAILED ride capacity exceeded';
 exception when raise_exception then if SQLERRM like 'FAILED%'then raise;end if;end;
 perform rider_operate('leave_ride',test_ride,null,rider);
 if exists(select 1 from ride_participants p where p.ride_id=test_ride and p.user_id=rider)then raise exception 'RSVP not removed';end if;
 perform rider_operate('leave_club',group_id,null,rider);
 update app_feature_flags set service_status='maintenance'where key='clubs';
 begin
  perform rider_operate('join_club',group_id,null,rider);
  raise exception 'FAILED maintenance bypassed';
 exception when raise_exception then if SQLERRM like 'FAILED%'then raise;end if;end;
 if has_table_privilege('authenticated','public.club_members','INSERT')then raise exception 'Direct member writes bypass API';end if;
 if has_function_privilege('authenticated','public.rider_operate(text,uuid,text,uuid)','EXECUTE')then raise exception 'Rider can impersonate another actor';end if;
end;
$test$;
rollback;
