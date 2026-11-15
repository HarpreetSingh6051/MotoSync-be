-- Run after 010, as trusted migration owner. All changes roll back.
begin;
set local request.jwt.claim.role='service_role';
set local request.jwt.claims='{"role":"service_role"}';
do $test$
declare actor uuid; rider uuid; group_record jsonb; ride_record jsonb; message_record jsonb; alert_id uuid; flag_key text:='test_'||replace(gen_random_uuid()::text,'-','');
begin
 select id into actor from admin_users where role_id='super_admin'and status='active'limit 1;
 select id into rider from profiles where status='active'limit 1;
 if actor is null or rider is null then raise exception 'An administrator and a profile fixture are required';end if;
 update profiles set is_rider=true where id=rider;
 group_record:=admin_operate('club',jsonb_build_object('name','Test operations group','handle','test_'||replace(gen_random_uuid()::text,'-',''),'description','SQL smoke fixture','city','Test city','region','Global','privacy','invite_only','created_by',rider),actor);
 if not exists(select 1 from club_members where club_id=(group_record->>'id')::uuid and user_id=rider and role='admin')then raise exception 'Group owner membership missing';end if;
 ride_record:=admin_operate('ride',jsonb_build_object('title','SQL smoke ride','route_summary','Test route','description','','captain_id',rider,'club_id',group_record->>'id','start_time',now()+interval '1 day','meetup_label','Test point','distance_km',10,'max_riders',20,'visibility','group_only'),actor);
 if not exists(select 1 from ride_participants where ride_id=(ride_record->>'id')::uuid and user_id=rider)then raise exception 'Captain enrollment missing';end if;
 message_record:=admin_operate('announcement',jsonb_build_object('title','SQL announcement','body','Fixture message','audience','club','club_id',group_record->>'id','status','published','publish_at',now()),actor);
 if message_record->>'status'<>'published'then raise exception 'Announcement publish failed';end if;
 perform admin_operate('archive_announcement',jsonb_build_object('id',message_record->>'id'),actor);
 if not exists(select 1 from platform_announcements where id=(message_record->>'id')::uuid and status='draft')then raise exception 'Unpublish failed';end if;
 if not(admin_platform_analytics()?'countries')then raise exception 'Geographic analytics missing';end if;
 insert into app_feature_flags(key,name,description,category,service_status,is_enabled,maintenance_message)values(flag_key,'Test feature','Fixture','core','maintenance',false,'Maintenance test');
 select id into alert_id from admin_alerts where source='feature:'||flag_key;
 if alert_id is null then raise exception 'Maintenance did not generate an alert';end if;
 perform admin_operate('acknowledge_alert',jsonb_build_object('id',alert_id),actor);
 if not exists(select 1 from admin_alerts where id=alert_id and acknowledged_by=actor and acknowledged_at is not null)then raise exception 'Alert acknowledgement failed';end if;
 if has_table_privilege('anon','public.admin_alerts','SELECT')then raise exception 'Alerts are public';end if;
 if has_function_privilege('authenticated','public.admin_operate(text,jsonb,uuid)','EXECUTE')then raise exception 'Rider mutation access exists';end if;
end;
$test$;
rollback;
