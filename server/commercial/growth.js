import {HttpError} from '../errors.js';
// No fixed plan catalogue existed before this feature. `pro` is the single reserved
// commercial code; names, browser claims and pre-billing defaults never grant it.
export const PRO_CODE='pro';
export const PART_TIME_ROLE='part_time_sales';
export function eligiblePro(row,now=Date.now()) {
 return Boolean(row&&row.code===PRO_CODE&&row.company_status==='active'&&row.lifecycle==='active'&&['active','trial'].includes(row.status)&&Date.parse(row.start_at)<=now&&Date.parse(row.end_at)>now);
}
export async function growthAccess(db,companyId) {
 const row=(await db.query(`SELECT p.code,s.status,s.start_at,s.end_at,c.status AS company_status,c.lifecycle
 FROM companies c JOIN company_commercial_state x ON x.company_id=c.id
 JOIN company_subscriptions s ON s.id=x.current_subscription_id AND s.company_id=c.id
 JOIN commercial_plans p ON p.id=s.plan_id WHERE c.id=$1`,[companyId])).rows[0];
 return {enabled:eligiblePro(row),planCode:row?.code||null,priceLabel:'₹5,999 + GST/month',upgradePath:'/distributor/subscription',features:['B2B Partner Network','Part-Time Sales Executive Management']};
}
export async function requirePro(db,companyId) {
 const access=await growthAccess(db,companyId);
 if(!access.enabled)throw new HttpError(403,'PRO_REQUIRED','This growth feature requires a current PRO subscription. PRO is ₹5,999 + GST/month. Contact the platform administrator through Plan & access status. Existing authorized records are preserved.');
 return access;
}
export async function requireStaffEntitlement(db,companyId,role) {if(role===PART_TIME_ROLE)await requirePro(db,companyId);}
export function validateGrowthTerms(code,terms) {
 if(code===PRO_CODE&&(terms.pricePaise!=='599900'||terms.currency!=='INR'||terms.interval!=='monthly'||terms.taxMode!=='exclusive'))throw new HttpError(400,'PRO_TERMS_REQUIRED','New PRO terms must be INR 5,999 plus GST per month. Confirm the applicable tax rate before publication. Existing agreements retain their historical terms.');
}
