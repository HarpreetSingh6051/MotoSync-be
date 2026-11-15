import fs from 'node:fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
const env={...dotenv.parse(fs.readFileSync('.env','utf8')),...(fs.existsSync('.env.local')?dotenv.parse(fs.readFileSync('.env.local','utf8')):{}),...process.env};
const secret=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
if(!secret){console.error('BLOCKED: Set SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in backend environment. No credentials were printed.');process.exit(1)}
const db=createClient(env.SUPABASE_URL,secret,{auth:{persistSession:false,autoRefreshToken:false}});
let failures=0;
for(const [table,columns] of Object.entries({admin_users:'id,email,full_name,role_id,status',admin_roles:'id,name,permissions',profiles:'id,role,status,is_rider,subscription_plan_id,created_at,country_region,city_region',clubs:'id,name,verified',club_members:'club_id,user_id,role',rides:'id,title,start_time',subscriptions:'id,user_id,status',subscription_plans:'id,name,features,is_active',app_feature_flags:'key,service_status,maintenance_message',exhaust_sounds:'id,name,is_active',sponsored_campaigns:'id,title,is_active',admin_audit_log:'id,actor_id,action',platform_announcements:'id,title,audience,status,publish_at',admin_alerts:'id,severity,acknowledged_at'})){
 const {error}=await db.from(table).select(columns).limit(1);if(error){failures++;console.error(`FAIL ${table}: ${error.code}`)}else console.log(`PASS ${table}`);
}
for(const name of ['admin_registration_trend','admin_plan_distribution','admin_platform_analytics']){const {error}=await db.rpc(name);if(error){failures++;console.error(`FAIL ${name}: ${error.code}`)}else console.log(`PASS ${name}`)}
process.exitCode=failures?1:0;
