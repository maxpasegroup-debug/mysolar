import {setupData} from './service.js';
import {setupGuide} from './guide.js';
import {policy} from '../commercial/policy.js';
import {domainProvider} from '../domains/provider.js';
import {config} from '../config.js';
export async function deliveryReadiness(db,ctx){
 const data=await setupData(db,ctx.companyId),guide=await setupGuide(db,ctx,data),access=await policy(db,ctx.companyId);
 const published=Boolean((await db.query('SELECT 1 FROM marketplace_vendors WHERE id=$1',[ctx.companyId])).rowCount);
 const domains=ctx.permissions.includes('domains.read')?(await db.query('SELECT hostname,status,certificate_status FROM company_domains WHERE company_id=$1 ORDER BY created_at DESC LIMIT 20',[ctx.companyId])).rows:[];
 const subscription=ctx.permissions.includes('subscription.read')?(await db.query("SELECT p.code,s.terms->>'name' AS name,s.status,s.start_at,s.end_at FROM company_commercial_state x JOIN company_subscriptions s ON s.id=x.current_subscription_id AND s.company_id=x.company_id JOIN commercial_plans p ON p.id=s.plan_id WHERE x.company_id=$1",[ctx.companyId])).rows[0]||null:null;
 return {company:data.company,setup:{completed:guide.completed,total:guide.total},access:{mode:access.mode,status:access.status,writable:access.writable,subscription},publicProfile:{published,url:published?config.origin+'/#/storefront?company='+ctx.companyId:null},domains,domainProviderConfigured:domainProvider.configured===true,
  support:{phone:'+918136906653',consultation:'/distributor/white-label'},decision:'External release and pilot acceptance required',
  gates:[{label:'Essential setup reviewed',state:guide.completed===guide.total?'recorded':'incomplete'},{label:'Company activation',state:data.company.lifecycle==='active'?'active':data.company.lifecycle},{label:'Configured operational access',state:access.writable?'enabled':'restricted'},{label:'Public marketplace listing',state:published?'published':'unpublished'},{label:'Actual email and recovery delivery',state:'requires inbox acceptance evidence'},{label:'Representative business pilot',state:'requires real-owner and employee acceptance'},{label:'Tax and statutory treatment',state:'requires qualified professional review'},{label:'Custom domain delivery',state:domainProvider.configured?'requires verified ownership, TLS and separate activation approval':'provider integration unavailable; no DNS or TLS provisioning performed'},{label:'Production release and recovery',state:'requires separately approved migration, deployment and recovery evidence'}],
  notice:'This company checklist is not production release approval, tax certification, evidence of payment or successful domain delivery. Plan names do not grant permissions; configured entitlements and current roles remain authoritative.'};
}
