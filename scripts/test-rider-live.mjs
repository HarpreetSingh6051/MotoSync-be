// Explicit opt-in: creates a private group/ride, two group announcements and
// a temporary second rider. Deletes those fixtures; keeps E2E_RIDER_EMAIL.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import {createClient} from '@supabase/supabase-js';
if(!process.argv.includes('--allow-fixtures'))throw Error('Pass --allow-fixtures to authorize temporary private test records.');
const env={...dotenv.parse(fs.readFileSync('.env')),...dotenv.parse(fs.readFileSync('.env.local')),...process.env};
for(const name of ['E2E_ADMIN_EMAIL','E2E_ADMIN_PASSWORD','E2E_RIDER_EMAIL','E2E_RIDER_PASSWORD'])if(!env[name])throw Error(`Set ${name}`);
const base=env.E2E_API_BASE||'http://localhost:4000/api/v1';
const db=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const sessions=[];let group,second;
async function api(path,token,body,method=body?'POST':'GET',expected=200){
 const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 const data=await res.json().catch(()=>null);
 assert.equal(res.status,expected,`${method} ${path}: HTTP ${res.status}, expected ${expected}`);
 return data;
}
async function login(email,password){const s=await api('/auth/v1/token?grant_type=password',null,{email,password},'POST',200);sessions.push(s.access_token);return s;}
try{
 const admin=await login(env.E2E_ADMIN_EMAIL,env.E2E_ADMIN_PASSWORD),rider=await login(env.E2E_RIDER_EMAIL,env.E2E_RIDER_PASSWORD);
 const token=rider.access_token,at=admin.access_token;
 assert.equal((await api('/rider/me',token)).id,rider.user.id);
 await api('/admin/dashboard',token,undefined,'GET',403);
 console.log('PASS rider login, profile and admin isolation');
 const password=crypto.randomBytes(24).toString('base64url');
 const other=await db.auth.admin.createUser({email:`temporary.qa.${Date.now()}@example.invalid`,password,email_confirm:true,user_metadata:{full_name:'Temporary MotoSync QA'}});
 if(other.error)throw other.error;second=other.data.user.id;
 const outsider=await login(other.data.user.email,password);
 group=await api('/admin/clubs',at,{name:'Private QA fixture',handle:'qa_'+Date.now(),description:'Temporary automated test',city:'Test',region:'Global',privacy:'invite_only',created_by:rider.user.id},'POST',201);
 const memberships=await api('/rider/feed/memberships',token);
 assert.ok(memberships.some(m=>m.club_id===group.id));
 const scoped=createClient(env.SUPABASE_URL,env.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const direct=await scoped.from('club_members').insert({club_id:group.id,user_id:rider.user.id,role:'admin'});
 assert.equal(direct.error?.code,'42501','Direct client writes must not bypass the API');
 assert.ok(!(await api('/rider/feed/clubs',outsider.access_token)).some(c=>c.id===group.id));
 await api('/rider/actions',outsider.access_token,{operation:'join_club',target_id:group.id},'POST',400);
 const ride=await api('/admin/rides',at,{title:'Private QA ride',route_summary:'Temporary fixture',description:'Test only',captain_id:rider.user.id,club_id:group.id,start_time:new Date(Date.now()+86400000).toISOString(),meetup_label:'Test point',distance_km:10,max_riders:2,visibility:'group_only'},'POST',201);
 assert.ok((await api('/rider/feed/my-rides',token)).some(r=>r.ride_id===ride.id));
 assert.ok(!(await api('/rider/feed/rides',outsider.access_token)).some(r=>r.id===ride.id));
 await api('/rider/actions',outsider.access_token,{operation:'join_ride',target_id:ride.id},'POST',400);
 const membership=await db.from('club_members').insert({club_id:group.id,user_id:second,role:'member'});if(membership.error)throw membership.error;
 await api('/rider/actions',outsider.access_token,{operation:'join_ride',target_id:ride.id},'POST',201);
 await api('/rider/actions',outsider.access_token,{operation:'join_ride',target_id:ride.id},'POST',201);
 await api('/rider/actions',outsider.access_token,{operation:'leave_ride',target_id:ride.id},'POST',201);
 console.log('PASS private groups/rides, owner enrollment, membership checks and idempotent RSVP/cancellation');
 await api('/rider/actions',token,{operation:'message',target_id:group.id,message:'Private self-test message'},'POST',201);
 assert.ok((await api(`/rider/clubs/${group.id}/messages`,token)).some(m=>m.message_text==='Private self-test message'));
 await api('/rider/actions',outsider.access_token,{operation:'leave_club',target_id:group.id},'POST',201);
 assert.equal((await api(`/rider/clubs/${group.id}/messages`,outsider.access_token)).length,0);
 console.log('PASS persisted chat and non-member message isolation');
 const announcement=await api('/admin/announcements',at,{title:'Private QA announcement',body:'Test audience visibility',audience:'club',club_id:group.id,status:'published',publish_at:new Date(Date.now()-1000).toISOString()},'POST',201);
 assert.ok((await api('/rider/feed/announcements',token)).some(a=>a.id===announcement.id));
 assert.ok(!(await api('/rider/feed/announcements',outsider.access_token)).some(a=>a.id===announcement.id));
 await api(`/admin/announcements/${announcement.id}/archive`,at,{},'PUT',200);
 assert.ok(!(await api('/rider/feed/announcements',token)).some(a=>a.id===announcement.id));
 await api('/rider/feed/expenses',token);
 await api('/admin/reports?dataset=summary',at);
 await api('/rider/actions',token,{operation:'join_club',target_id:group.id,actor_id:second},'POST',400);
 console.log('PASS announcement publish/audience/unpublish, expenses, reports and actor-spoof rejection');
}finally{
 const failures=[];
 if(group){const result=await db.from('clubs').delete().eq('id',group.id);if(result.error)failures.push('private group '+group.id);}
 if(second){const result=await db.auth.admin.deleteUser(second);if(result.error)failures.push('temporary rider '+second);}
 for(const token of sessions){try{await api('/auth/v1/logout?scope=local',token,{},'POST',204)}catch{/* Session expiry is not a fixture leak. */}}
 if(failures.length)throw Error('Fixture cleanup needs attention: '+failures.join(', '));
 console.log('PASS temporary fixtures removed; requested test rider retained');
}
