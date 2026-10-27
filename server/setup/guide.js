import {config} from '../config.js';

export const choiceDefaults=Object.freeze({offers_mode:'undecided',team_mode:'undecided',opening_mode:'undecided',communications_reviewed:false});
// Counts only, restricted to modules the current employee may read. No financial
// balances, provider credentials or unrelated company records enter this response.
export async function setupGuide(db,ctx,data){
 const choices=(await db.query('SELECT offers_mode,team_mode,opening_mode,communications_reviewed,updated_at FROM company_setup_choices WHERE company_id=$1',[ctx.companyId])).rows[0]||{...choiceDefaults};
 const can=p=>ctx.permissions.includes(p);
 const count=async(table,permission,where='')=>can(permission)?(await db.query(`SELECT count(*)::int AS n FROM ${table} WHERE company_id=$1 ${where}`,[ctx.companyId])).rows[0].n:null;
 const counts={offers:await count('distributor_offers','offers.read'),publishedOffers:await count('distributor_offers','offers.read',"AND published AND status='approved'"),employees:await count('company_memberships','members.read',"AND role_id<>'owner' AND status='active'"),invitations:await count('company_invitations','members.read',"AND status='pending' AND expires_at>now()"),coverage:await count('company_service_areas','company.setup.read'),customers:await count('company_contacts','customers.read'),inventory:await count('inventory_items','inventory.read'),invoices:await count('customer_invoices','finance.read'),imports:await count('import_batches','customers.manage',"AND status='completed'")};
 const saved=data.onboarding;
 const step=(id,title,state,detail,url)=>({id,title,state,detail,url});
 const steps=[
  step('company','Company details',saved.profile_saved_at?'saved':'todo','Save your legal details and choose the workspace that fits your business.','/distributor/setup?step=profile'),
  step('identity','Public identity',saved.brand_saved_at?'saved':'todo','Save the public name, contact and brand details. Saving does not publish your business.','/distributor/setup?step=brand'),
  step('coverage','Services & coverage',saved.business_saved_at&&counts.coverage>0?'saved':'todo','Choose genuine services and service areas. Your registered address is not automatically your service area.','/distributor/setup?step=business'),
  step('offers','Catalogue & your offers',counts.offers>0?'saved':choices.offers_mode==='not_needed'?'not_needed':choices.offers_mode==='later'?'later':'todo','Use existing master products and your own offers. A draft offer is not publicly available.','/distributor/offers'),
  step('team','Team access',counts.employees>0?'saved':counts.invitations>0?'pending':choices.team_mode==='solo'?'not_needed':choices.team_mode==='later'?'later':'todo','Choose supported roles and invite employees. An invitation is not an accepted membership.','/distributor/team'),
  step('opening','Opening records',choices.opening_mode==='start_fresh'?'not_needed':choices.opening_mode==='reviewed'?'reviewed':choices.opening_mode==='later'?'later':'todo','Review customers, stock and finance separately. This acknowledgement creates no opening balance or transaction.','/distributor/setup?step=guide'),
  step('communications','Communication settings',choices.communications_reviewed?'reviewed':'todo','Review public contact details, invitation delivery and approved reminders. Reviewing does not enable or send messages.','/distributor/setup?step=guide')
 ];
 return {choices,counts,steps,completed:steps.filter(s=>['saved','not_needed','reviewed'].includes(s.state)).length,total:steps.length,canManage:can('company.onboarding.manage')&&data.company.lifecycle!=='suspended',communications:{emailConfigured:config.mailEnabled&&Boolean(config.dataEncryptionKey),invitationMode:config.invitationDelivery,deliveryVerified:false,whatsappAutomated:false,smsAutomated:false},notice:'Progress reflects saved records and owner-reviewed choices. It does not activate the company, publish a listing, verify email delivery or prove payment.'};
}
