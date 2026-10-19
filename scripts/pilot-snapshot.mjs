// Operator-only, read-only evidence collection. No .env loading, writes or migrations.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import pg from 'pg';
import {migrationManifest} from '../server/db/migrations.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>value?.[key]!==undefined).map(key=>[key,value[key]]));
function fields(value,allowed){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw new Error('Invalid evidence fields');}
function instant(value){if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error('Complete dates with timezone are required');const [year,month,date]=value.slice(0,10).split('-').map(Number);if(year<2000||year>2200||Number(value.slice(11,13))>23||new Date(Date.UTC(year,month-1,date)).toISOString().slice(0,10)!==value.slice(0,10))throw new Error('Invalid calendar date');return new Date(value).toISOString();}
export function validateCohort(input,now=Date.now()){
 fields(input,['version','approval','window','companyIds','customerIds','participantIds']);fields(input.approval,['reference','approvedAt']);fields(input.window,['start','end']);
 if(input.version!==1||typeof input.approval.reference!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{2,99}$/.test(input.approval.reference))throw new Error('An explicit operator approval reference is required');
 const approvedAt=instant(input.approval.approvedAt),start=instant(input.window.start),end=instant(input.window.end);
 if(Date.parse(approvedAt)>Date.parse(start)||Date.parse(approvedAt)>now||Date.parse(end)<=Date.parse(start)||Date.parse(end)>now||Date.parse(end)-Date.parse(start)>90*86400000)throw new Error('Use a completed window of at most 90 days, beginning after approval');
 for(const [key,minimum,maximum] of [['companyIds',1,10],['customerIds',1,50],['participantIds',1,100]]){const list=input[key];if(!Array.isArray(list)||list.length<minimum||list.length>maximum||list.some(id=>typeof id!=='string'||!uuid.test(id))||new Set(list.map(id=>id.toLowerCase())).size!==list.length)throw new Error('Use distinct approved UUIDs within the pilot limits');}
 if(input.customerIds.some(id=>!input.participantIds.map(x=>x.toLowerCase()).includes(id.toLowerCase())))throw new Error('Every customer must be an approved participant');
 return {...input,approval:{reference:input.approval.reference,approvedAt},window:{start,end},companyIds:input.companyIds.map(x=>x.toLowerCase()),customerIds:input.customerIds.map(x=>x.toLowerCase()),participantIds:input.participantIds.map(x=>x.toLowerCase())};
}
export async function collectSnapshot(db,input){
 const cohort=validateCohort(input);await db.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
  if((await db.query('SHOW transaction_read_only')).rows[0].transaction_read_only!=='on')throw new Error('Read-only transaction required');
  const expected=await migrationManifest(),history=(await db.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows;
  const missing=expected.filter(item=>!history.some(row=>row.name===item.name&&row.checksum===item.checksum)).map(item=>item.name),extra=history.filter(row=>!expected.some(item=>item.name===row.name)).map(row=>row.name);
  if(missing.length||extra.length)throw new Error('Database migration history does not match this checkout');
  const companies=(await db.query('SELECT id,lifecycle,status FROM companies WHERE id=ANY($1::uuid[]) ORDER BY id',[cohort.companyIds])).rows;
  if(companies.length!==cohort.companyIds.length)throw new Error('An approved company was not found');
  if((await db.query('SELECT count(*)::int AS count FROM users WHERE id=ANY($1::uuid[])',[cohort.participantIds])).rows[0].count!==cohort.participantIds.length)throw new Error('An approved participant was not found');
  const settings=(await db.query('SELECT id,data,effective_at FROM commercial_settings_versions WHERE effective_at<=now() ORDER BY effective_at DESC,id DESC LIMIT 1')).rows[0];
  const plans=(await db.query('SELECT p.code,p.status,v.version,v.terms FROM commercial_plans p LEFT JOIN commercial_plan_versions v ON v.id=p.current_version_id AND v.plan_id=p.id ORDER BY p.code LIMIT 101')).rows;
  const result={format:'MY SOLAR pilot snapshot v1',generatedAt:new Date().toISOString(),approvalReference:cohort.approval.reference,window:cohort.window,readOnly:true,migrations:{matched:true,count:history.length},settings:settings?{version:settings.id,effectiveAt:settings.effective_at,mode:settings.data.mode,setupFee:pick(settings.data.setupFee,['amountPaise','currency','taxMode','taxRate','enabled','required']),features:settings.data.features,limits:settings.data.limits}:null,plans:plans.slice(0,100).map(row=>({code:row.code,status:row.status,version:row.version,terms:pick(row.terms,['name','pricePaise','currency','taxMode','taxRate','interval','trialDays','effectiveFrom','effectiveTo','features','limits'])})),plansTruncated:plans.length>100,companies:[],limitations:['Database evidence only; this does not verify the deployed web release, actual inbox receipt or unaided usability.','Recorded activity days do not establish logins, unassisted task completion, customer satisfaction or willingness to pay.','Plan configuration and administrative activation do not establish paid SaaS revenue. Distributor collections are not MY SOLAR subscription revenue.','Provider bills, support/onboarding labour, FX, actual SaaS receipts and commercial margin require separate approved records. No exact operating cost is inferred.']};
  for(const company of companies){
   const id=company.id,values=[id,cohort.window.start,cohort.window.end,cohort.customerIds];
   const access=(await db.query('SELECT commercial_policy($1::uuid) AS policy',[id])).rows[0].policy;
   const agreement=(await db.query('SELECT s.id,p.code,s.status,s.start_at,s.end_at,s.activation_source,s.terms,s.setup_terms FROM company_commercial_state x JOIN company_subscriptions s ON s.id=x.current_subscription_id AND s.company_id=x.company_id JOIN commercial_plans p ON p.id=s.plan_id WHERE x.company_id=$1',[id])).rows[0];
   const enquiries=(await db.query('SELECT count(DISTINCT e.id)::int AS count FROM customer_enquiries e JOIN enquiry_recipients r ON r.enquiry_id=e.id WHERE r.company_id=$1 AND e.created_at>=$2 AND e.created_at<$3 AND e.customer_id=ANY($4::uuid[])',values)).rows[0].count;
   const quotations=(await db.query("SELECT count(*)::int AS count FROM quotation_versions q JOIN customer_enquiries e ON e.id=q.enquiry_id WHERE q.company_id=$1 AND q.sent_at>=$2 AND q.sent_at<$3 AND q.status<>'draft' AND e.customer_id=ANY($4::uuid[])",values)).rows[0].count;
   const records={};for(const [kind,table] of [['orders','business_orders'],['installations','installation_projects'],['service','service_requests']])records[kind]=(await db.query(`SELECT r.status,count(*)::int AS count FROM ${table} r JOIN company_contacts c ON c.id=r.contact_id AND c.company_id=r.company_id WHERE r.company_id=$1 AND r.created_at>=$2 AND r.created_at<$3 AND c.user_id=ANY($4::uuid[]) GROUP BY r.status ORDER BY r.status`,values)).rows;
   const activity=(await db.query("SELECT count(*)::int AS events,count(DISTINCT (created_at AT TIME ZONE 'Asia/Kolkata')::date)::int AS days FROM (SELECT created_at FROM operations_events WHERE company_id=$1 AND created_at>=$2 AND created_at<$3 AND actor_id=ANY($4::uuid[]) UNION ALL SELECT created_at FROM enquiry_events WHERE company_id=$1 AND created_at>=$2 AND created_at<$3 AND actor_id=ANY($4::uuid[])) observed",[id,cohort.window.start,cohort.window.end,cohort.participantIds])).rows[0];
   const usage=(await db.query('SELECT count(*)::int AS "recordedRequests",count(input_tokens)::int AS "inputUsageKnown",count(output_tokens)::int AS "outputUsageKnown",sum(input_tokens)::text AS "inputTokens",sum(output_tokens)::text AS "outputTokens" FROM sia_requests WHERE company_id=$1 AND created_at>=$2 AND created_at<$3',[id,cohort.window.start,cohort.window.end])).rows[0];
   const jobs=(await db.query('SELECT status,count(*)::int AS count FROM automation_jobs WHERE company_id=$1 AND created_at>=$2 AND created_at<$3 GROUP BY status ORDER BY status',[id,cohort.window.start,cohort.window.end])).rows;
   result.companies.push({id,lifecycle:company.lifecycle,status:company.status,access:pick(access,['mode','status','recordedStatus','writable','features','limits','startAt','endAt']),agreement:agreement?{...pick(agreement,['id','code','status','start_at','end_at','activation_source']),terms:pick(agreement.terms,['name','pricePaise','currency','taxMode','taxRate','interval','trialDays','features','limits']),setup:pick(agreement.setup_terms,['amountPaise','currency','taxMode','taxRate','enabled','required'])}:null,enquiries,issuedQuotationVersions:quotations,records,recordedActivity:activity,siaRecordedUsage:usage,reminderJobs:jobs});
  }
  result.worker=(await db.query("SELECT last_started_at,last_finished_at,last_status FROM automation_worker_state WHERE worker='reminders'")).rows[0]||null;
  result.databaseBytes=(await db.query('SELECT pg_database_size(current_database())::text AS bytes')).rows[0].bytes;
  await db.query('COMMIT');return result;
 }catch(error){await db.query('ROLLBACK');throw error;}
}
export function connectionOptions(env,local){
 const url=new URL(env.DATABASE_URL||'');if(!['postgres:','postgresql:'].includes(url.protocol)||[...url.searchParams.keys()].some(key=>/^ssl/i.test(key))||!['disable','require'].includes(env.DATABASE_SSL||'disable'))throw new Error('Invalid explicit PostgreSQL configuration');
 if(local&&(!['127.0.0.1','localhost','::1'].includes(url.hostname.replace(/[\[\]]/g,''))||!/^\/mysolar_test_[a-z0-9_]+$/.test(decodeURIComponent(url.pathname))))throw new Error('Local evidence requires a designated loopback test database');
 return {connectionString:url.href,ssl:env.DATABASE_SSL==='require'?{rejectUnauthorized:true}:false,application_name:'mysolar-pilot-readonly',statement_timeout:5000,connectionTimeoutMillis:5000};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let db;try{
  const args=process.argv.slice(2),local=args.includes('--local-test'),approved=args.includes('--confirm-read-only-production');
  if(args.length!==2||local===approved)throw new Error('Use: node scripts/pilot-snapshot.mjs <private-cohort.json> --local-test OR --confirm-read-only-production');
  const path=args.find(value=>!value.startsWith('--')),raw=await readFile(path);if(raw.length>65536)throw new Error('Cohort input too large');const cohort=validateCohort(JSON.parse(raw.toString('utf8')));
  db=new pg.Client(connectionOptions(process.env,local));await db.connect();console.log(JSON.stringify(await collectSnapshot(db,cohort),null,2));
 }catch{console.error('Pilot snapshot blocked or failed. Check explicit approval, cohort UUIDs, completed dates, database access and migration status. No business changes were made. No credentials are printed.');process.exitCode=1;}finally{if(db)try{await db.end();}catch{}}
}
