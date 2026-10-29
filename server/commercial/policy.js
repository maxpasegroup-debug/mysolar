import {osGate} from './os-access.js';
import { HttpError } from '../errors.js';
import {requirePro,PART_TIME_ROLE} from './growth.js';
export const features=Object.freeze({storefront:'Public storefront',catalogue:'Catalogue and offers',crm:'CRM and enquiries',quotations:'Quotations',orders:'Orders',team:'Team members',inventory:'Inventory and procurement',projects:'Projects and field work',finance:'Finance records',service:'Customer service',white_label:'White-label customization',sia_ceo:'SIA Virtual CEO',custom_domain:'Future custom-domain capability'});
export const limitNames=Object.freeze({team:'Active members + pending invitations',publishedOffers:'Published offers',siaDaily:'Daily external SIA attempts',siaMonthly:'Monthly external SIA attempts'});
export const policy=async(db,companyId)=>(await db.query('SELECT commercial_policy($1::uuid) AS policy',[companyId])).rows[0].policy;
export function enabled(p,feature){return p?.writable===true&&p.features?.[feature]===true;}
export function requireFeature(p,feature){if(!enabled(p,feature))throw new HttpError(403,'ENTITLEMENT_REQUIRED',`${features[feature]||'This action'} is not enabled for new actions under the current access policy. Existing authorized records remain readable. Contact the platform administrator.`);}
export async function teamCapacity(db,companyId,excludeInvitation=null){const p=await policy(db,companyId);requireFeature(p,'team');const limit=p.limits.team;if(limit===null||limit===undefined)return;const r=(await db.query("SELECT (SELECT count(*) FROM company_memberships WHERE company_id=$1 AND status='active')+(SELECT count(*) FROM company_invitations WHERE company_id=$1 AND status='pending' AND expires_at>now() AND ($2::uuid IS NULL OR id<>$2)) AS used",[companyId,excludeInvitation])).rows[0];if(Number(r.used)>=limit)throw new HttpError(409,'PLAN_LIMIT_REACHED','The team allowance is full, including active members and pending invitations. Revoke an unused invitation, suspend an unneeded membership or contact the administrator.');}
const groups={funding:'finance',finance:'finance',contacts:'crm',leads:'crm',orders:'orders',inventory:'inventory',stock:'inventory',reservations:'inventory',suppliers:'inventory',purchases:'inventory',receipts:'inventory',projects:'projects',tasks:'projects',invoices:'finance',collections:'finance',bills:'finance',service:'service'};
// Called inside withCompany, after permission checks and the existing company lock.
export async function guard(db,ctx,req,permission){if(await osGate(db,ctx,req))return;if(['GET','HEAD'].includes(req.method))return;const path=req.originalUrl.split('?')[0].replace(/\/{2,}/g,'/').replace(/^\/api\/companies\/current\/?/,'');
 if(ctx.role===PART_TIME_ROLE)await requirePro(db,ctx.companyId);
 if(path==='partners'||path.startsWith('partners/')){if(!['suspended','revoked','declined'].includes(req.body?.status))await requirePro(db,ctx.companyId);return;}
 if(path.startsWith('subscription'))return;
 // Disabling a hostname must remain possible after entitlement expiry. Never infer billing from it.
 if(path.startsWith('domains/')&&['suspend','remove'].includes(req.body?.action))return;
 if(path==='sia/messages'||path==='sia/history')return; // Read assistance / history deletion; external execution has its own budget guard.
 if(path.startsWith('sia/proposals/')&&req.body?.decision==='reject')return;
 if(path==='controls/profiles'&&req.body?.active===false)return; // Owners can revoke profile access after subscription expiry.
 if(path.includes('/revoke')||permission==='members.manage'&&['suspended','removed'].includes(req.body?.status)||path.includes('offers/')&&['unpublish','deactivate'].includes(req.body?.action)||path==='marketplace-request'&&req.body?.requested===false)return;
 let required=[];
 if(path.startsWith('operations/')){const parts=path.split('/'),kind=parts[1]==='record'?parts[2]:parts[1];if(groups[kind])required=[groups[kind]];else if(kind!=='notifications')throw new HttpError(403,'ENTITLEMENT_UNMAPPED','This action requires commercial-policy configuration. Existing records remain readable.');}
 else if(path.startsWith('sia/proposals'))required=['sia_ceo','crm'];
 else if(path.startsWith('controls/'))required=[path==='controls/policy'?'crm':'team'];
 else if(path.startsWith('offers'))required=['catalogue'];
 else if(path.includes('quotations'))required=['quotations'];
 else if(path.startsWith('enquiries'))required=[path.endsWith('/quotations')?'quotations':'crm'];
 else if(path==='domains'||path.startsWith('domains/'))required=['custom_domain'];
 else if(path.startsWith('members')||path.startsWith('invitations'))required=['team'];
 else if(path==='branding')required=['white_label'];
 else if(path===''&&permission==='company.manage'){const old=(await db.query('SELECT storefront_description FROM companies WHERE id=$1',[ctx.companyId])).rows[0];if(old&&req.body.description!==old.storefront_description)required=['white_label'];}
 else if(path==='service-areas'||path==='marketplace-request')required=['storefront'];
 if(!required.length)return;const p=await policy(db,ctx.companyId);for(const feature of required)requireFeature(p,feature);
 if(path.startsWith('offers/')&&req.body?.action==='publish'){requireFeature(p,'storefront');const max=p.limits.publishedOffers;if(max!==null&&max!==undefined){const old=(await db.query('SELECT published FROM distributor_offers WHERE id=$1 AND company_id=$2',[req.params.id,ctx.companyId])).rows[0];const used=(await db.query('SELECT count(*)::int AS count FROM distributor_offers WHERE company_id=$1 AND published',[ctx.companyId])).rows[0].count;if(!old?.published&&used>=max)throw new HttpError(409,'PLAN_LIMIT_REACHED','The published-offer allowance is full. Unpublish an offer or contact the administrator.');}}
}
export async function usage(db,companyId){const row=(await db.query("SELECT (SELECT count(*) FROM company_memberships WHERE company_id=$1 AND status='active')::int AS members,(SELECT count(*) FROM company_invitations WHERE company_id=$1 AND status='pending' AND expires_at>now())::int AS invitations,(SELECT count(*) FROM distributor_offers WHERE company_id=$1 AND published)::int AS offers",[companyId])).rows[0];const counters=(await db.query("SELECT period,requests FROM commercial_usage WHERE scope_key=$1 AND metric='sia_external_attempts' AND ((period='day' AND period_start=(now() AT TIME ZONE 'UTC')::date) OR (period='month' AND period_start=date_trunc('month',now() AT TIME ZONE 'UTC')::date))",['company:'+companyId])).rows;return {team:row.members+row.invitations,activeMembers:row.members,pendingInvitations:row.invitations,publishedOffers:row.offers,siaDaily:counters.find(x=>x.period==='day')?.requests||0,siaMonthly:counters.find(x=>x.period==='month')?.requests||0,usageSince:'Commercial daily/monthly counters begin with migration 008; earlier attempts are not reconstructed. UTC periods. No cost or payment is inferred.'};}
export async function reserveSia(db,ctx){const company=ctx.companyId||null,p=await policy(db,company);if(company?!enabled(p,'sia_ceo'):p.customerAssistantEnabled!==true)return false;const limits=company?p.limits:{siaDaily:p.customerSiaDaily,siaMonthly:p.customerSiaMonthly},scope=company?'company:'+company:'customer:'+ctx.userId;
 for(const [period,cap] of [['day',limits.siaDaily],['month',limits.siaMonthly]]){const r=await db.query("INSERT INTO commercial_usage(scope_key,metric,period,period_start,requests) VALUES($1,'sia_external_attempts',$2,CASE WHEN $2='day' THEN (now() AT TIME ZONE 'UTC')::date ELSE date_trunc('month',now() AT TIME ZONE 'UTC')::date END,1) ON CONFLICT(scope_key,metric,period,period_start) DO UPDATE SET requests=commercial_usage.requests+1 WHERE $3::int IS NULL OR commercial_usage.requests<$3 RETURNING requests",[scope,period,cap??null]);if(cap===0||!r.rowCount)return false;}
 return true;
}
