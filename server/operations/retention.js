import * as c from './core.js';

export const retention=c.router();
const required=(value,name,max=500)=>c.plain(value,name,max,1);
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
function actualDate(value){const d=c.date(value);if(d>today())throw c.badInput('Use the actual date, not a future date.');return d;}
async function openTasks(db,s){if((await db.query("SELECT 1 FROM business_tasks WHERE company_id=$1 AND service_id=$2 AND status NOT IN ('completed','cancelled') LIMIT 1",[s.company_id,s.id])).rowCount)throw c.fail('Complete or cancel outstanding service tasks before proposing or closing a resolution.');}
export async function prepareResolution(db,ctx,s,d,status){
 if(s.status==='closed')throw c.fail('Reopen this closed request explicitly before changing its progress.');
 if(status==='closed')throw c.fail('Closure requires customer confirmation or a documented administrative exception.');
 if(s.status==='resolved')throw c.fail('Use the explicit reopen action to preserve the resolution history.');
 if(status==='resolved'&&s.status!=='resolved'){
  await openTasks(db,s);const summary=required(d.customerUpdate,'customer-visible resolution'),evidence=required(d.resolutionReference,'resolution evidence reference',200);
  await db.query('INSERT INTO service_resolutions(company_id,service_id,cycle,summary,evidence_reference,actor_id) VALUES($1,$2,$3,$4,$5,$6)',[ctx.companyId,s.id,s.resolution_cycle+1,summary,evidence,ctx.userId]);
  await db.query("UPDATE service_requests SET resolution_cycle=resolution_cycle+1,closure_basis='none' WHERE id=$1 AND company_id=$2",[s.id,ctx.companyId]);
  await c.event(db,ctx,'service',s.id,'resolution_proposed',summary,true,{cycle:s.resolution_cycle+1});
 }
}
export async function retentionDetails(db,s,{customer=false,page=1}={}){
 const params=[s.company_id,s.id],resolutions=(await db.query(`SELECT r.id,r.cycle,r.summary,r.created_at,${customer?'':'r.evidence_reference,'}f.accepted,f.rating,f.comment,f.created_at AS responded_at FROM service_resolutions r LEFT JOIN service_feedback f ON f.resolution_id=r.id AND f.company_id=r.company_id WHERE r.company_id=$1 AND r.service_id=$2 ORDER BY r.cycle DESC LIMIT 20`,params)).rows;
 const records=await c.paged(db,'id,kind,recorded_on,details,customer_visible,created_at','FROM service_retention_records',`company_id=$1 AND service_id=$2${customer?' AND customer_visible':''}`,{values:params,add(){throw new Error('Unexpected binding');}},page,'created_at DESC,id');
 const visits=(await db.query('SELECT c.reference,v.visit_date FROM contract_visits v JOIN service_contracts c ON c.id=v.contract_id AND c.company_id=v.company_id WHERE v.company_id=$1 AND v.service_id=$2 ORDER BY v.visit_date DESC LIMIT 20',params)).rows;const equipment=customer?undefined:(await db.query('SELECT id,brand,model,serial FROM equipment_assets WHERE company_id=$1 AND order_id=$2 ORDER BY created_at DESC,id LIMIT 100',[s.company_id,s.order_id])).rows;return {visits,equipment,closureBasis:s.closure_basis,cycle:s.resolution_cycle,escalation:{level:s.escalation_level,reason:customer?undefined:s.escalation_reason,due:s.escalation_due},resolutions,records,notice:'Staff-recorded work, supplied warranty decisions and logged communications are not independent verification or proof of external delivery. Only the linked customer can confirm a resolution.'};
}
async function shared(db,ctx,s,action,message){await c.event(db,ctx,'service',s.id,action,message,true);const contact=await c.relation(db,ctx,'contacts',s.contact_id);if(contact.user_id)await c.notify(db,ctx,'service',s.id,message,{customer:contact.user_id});}
export async function reopenService(db,ctx,s,reason){
 if(!['resolved','closed'].includes(s.status))throw c.fail('Only a resolved or closed request can be reopened.');
 const text=required(reason,'reason for reopening');if(s.assignee_id){try{await c.employee(db,ctx,s.assignee_id,['service.manage','service.assigned']);}catch(error){if(![400,403,409].includes(error.status))throw error;s.assignee_id=null;}}await db.query("UPDATE service_requests SET status=CASE WHEN $3::uuid IS NULL THEN 'triaged' ELSE 'in_progress' END,assignee_id=$3,closure_basis='none',revision=revision+1 WHERE id=$1 AND company_id=$2",[s.id,s.company_id,s.assignee_id]);
 await shared(db,ctx,s,'reopened',text);await c.notify(db,ctx,'service',s.id,'A service request was reopened.',{assignee:s.assignee_id});
 return {message:'Service request reopened. Previous resolutions and feedback remain in the history.'};
}
export async function customerResolution(db,user,s,d){
 const ctx={companyId:s.company_id,userId:user.id};return c.once(db,ctx,d.operationKey,'service.customer-response',{...d,userId:user.id,serviceId:s.id},async()=>{
  c.expect(s,d.revision);if(s.status!=='resolved')throw c.fail('This resolution is no longer awaiting confirmation. Refresh the request.');
  const r=(await db.query('SELECT id FROM service_resolutions WHERE company_id=$1 AND service_id=$2 AND cycle=$3',[s.company_id,s.id,s.resolution_cycle])).rows[0];
  if(!r||r.id!==c.v.uuid(d.resolutionId))throw c.fail('Review the current resolution before responding.');
  if(typeof d.accepted!=='boolean')throw c.badInput('Choose whether the problem is resolved.');
  const rating=d.rating===''||d.rating===null?null:Number(d.rating);if(rating!==null&&(!Number.isInteger(rating)||rating<1||rating>5))throw c.badInput('Choose a rating from 1 to 5.');
  const comment=c.paragraph(d.comment);if(!d.accepted&&!comment)throw c.badInput('Tell the team what still needs attention.');
  await db.query('INSERT INTO service_feedback(company_id,service_id,resolution_id,actor_id,accepted,rating,comment) VALUES($1,$2,$3,$4,$5,$6,$7)',[s.company_id,s.id,r.id,user.id,d.accepted,rating,comment]);
  if(d.accepted){await openTasks(db,s);await db.query("UPDATE service_requests SET status='closed',closure_basis='customer_confirmed',revision=revision+1 WHERE id=$1 AND company_id=$2",[s.id,s.company_id]);await shared(db,ctx,s,'customer_confirmed_resolution',comment||'The customer confirmed that the issue is resolved.');await c.notify(db,ctx,'service',s.id,'Customer confirmed the resolution.');return {message:'Thank you. Your confirmation and feedback are recorded; this request is now closed.'};}
  return reopenService(db,ctx,s,comment);
 });
}
retention.post('/service/:id/retention',async(req,res)=>{
 c.v.body(req.body,['operationKey','revision','action','reason','dueDate','level','recordedOn','customerVisible','details'],['operationKey','revision','action']);const d=req.body;
 res.json(await c.context(req,async(db,ctx)=>{const s=await c.record(db,ctx,'service',req.params.id,{lock:true});const action=c.v.choice(d.action,['reopen','escalate','clear_escalation','close_exception','communication','maintenance','warranty'],'service action');
  if(!['communication','maintenance'].includes(action))c.permit(ctx,'service.manage');else if(!c.has(ctx,'service.manage')&&!c.has(ctx,'service.assigned'))throw c.missing();
  return c.once(db,ctx,d.operationKey,'service.retention',{...d,userId:ctx.userId,serviceId:s.id},async()=>{c.expect(s,d.revision);
   if(action==='reopen')return reopenService(db,ctx,s,d.reason);
   if(action==='close_exception'){
    if(s.status!=='resolved')throw c.fail('Propose and share the actual resolution first.');await openTasks(db,s);
    const reason=c.plain(d.reason,'administrative closure reason',500,10);await db.query("UPDATE service_requests SET status='closed',closure_basis='administrative_exception',revision=revision+1 WHERE id=$1 AND company_id=$2",[s.id,ctx.companyId]);
    await c.event(db,ctx,'service',s.id,'administrative_closure_reason',reason);await shared(db,ctx,s,'administrative_closure','The company closed this request administratively. Customer confirmation was not received.');return {message:'Administrative closure recorded separately from customer confirmation.'};
   }
   if(action==='escalate'||action==='clear_escalation'){
    if(s.status==='closed')throw c.fail('Reopen the request before escalating.');const reason=required(d.reason,'escalation reason'),level=action==='clear_escalation'?0:Number(d.level),due=action==='clear_escalation'?null:c.date(d.dueDate);
    if(!Number.isInteger(level)||level<0||level>3||action==='escalate'&&level<1)throw c.badInput('Choose escalation level 1 to 3.');
    await db.query('UPDATE service_requests SET escalation_level=$1,escalation_reason=$2,escalation_due=$3,revision=revision+1 WHERE id=$4 AND company_id=$5',[level,reason,due,s.id,ctx.companyId]);await c.event(db,ctx,'service',s.id,action,reason,false,{previousLevel:s.escalation_level,level,due});await shared(db,ctx,s,action,level?'Your service request has been escalated for review.':'The escalation review has been completed.');await c.notify(db,ctx,'service',s.id,'Service escalation updated.',{assignee:s.assignee_id});return {message:'Escalation recorded. No response-time guarantee or external contact is implied.'};
   }
   if(typeof d.customerVisible!=='boolean')throw c.badInput('Choose whether to share this record.');const on=actualDate(d.recordedOn),x=d.details;let details;
   if(action==='communication'){
    c.v.body(x,['channel','direction','outcome','summary','reference']);const channel=c.v.choice(x.channel,['in_app','phone','email','whatsapp','site_visit'],'communication channel'),outcome=c.v.choice(x.outcome,['attempted','connected','received','prepared'],'communication outcome');
    if(outcome==='prepared'&&d.customerVisible)throw c.badInput('An unsent prepared message must remain private.');
    details={channel,direction:c.v.choice(x.direction,['inbound','outbound'],'communication direction'),outcome,summary:required(x.summary,'communication summary'),reference:c.plain(x.reference,'communication evidence',200),source:'staff_recorded_not_delivery_proof'};
   }else if(action==='maintenance'){
    if(['resolved','closed'].includes(s.status))throw c.fail('Reopen or create a service visit before recording more work.');c.v.body(x,['summary','reference','nextVisit']);details={summary:required(x.summary,'maintenance work performed'),reference:required(x.reference,'maintenance evidence',200),nextVisit:c.optionalDate(x.nextVisit)};
    if(details.nextVisit&&details.nextVisit<=on)throw c.badInput('The next suggested visit must follow the performed visit.');
   }else{
    c.v.body(x,['status','equipmentId','summary','reference','replacementSerial']);const status=c.v.choice(x.status,['claim_recorded','submitted','approved','rejected','replacement_recorded'],'warranty status');
    const equipmentId=c.v.uuid(x.equipmentId),asset=(await db.query('SELECT * FROM equipment_assets WHERE id=$1 AND company_id=$2 AND order_id=$3',[equipmentId,ctx.companyId,s.order_id])).rows[0];if(!asset)throw c.missing();
    const prior=(await db.query("SELECT details FROM service_retention_records WHERE company_id=$1 AND service_id=$2 AND kind='warranty' AND details->>'equipmentId'=$3 ORDER BY created_at DESC,id DESC LIMIT 1",[ctx.companyId,s.id,equipmentId])).rows[0]?.details;
    const allowed={none:['claim_recorded'],claim_recorded:['submitted'],submitted:['approved','rejected'],approved:['replacement_recorded'],rejected:['claim_recorded'],replacement_recorded:['claim_recorded']};if(!(allowed[prior?.status||'none']||[]).includes(status))throw c.fail('Record the warranty claim and supporting supplier decision in order.');
    const serial=c.plain(x.replacementSerial,'replacement serial',100);if(status==='replacement_recorded'&&(!serial||serial===asset.serial))throw c.badInput('Record the actual different replacement serial.');
    details={status,equipmentId,originalSerial:asset.serial,summary:required(x.summary,'supplied warranty record'),reference:required(x.reference,'supporting warranty evidence',200),replacementSerial:status==='replacement_recorded'?serial:'',source:'supplied_record_not_independently_verified'};
   }
   const id=c.randomUUID();await db.query('INSERT INTO service_retention_records(id,company_id,service_id,kind,recorded_on,details,customer_visible,actor_id,equipment_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,ctx.companyId,s.id,action,on,details,d.customerVisible,ctx.userId,details.equipmentId||null]);await db.query('UPDATE service_requests SET revision=revision+1 WHERE id=$1 AND company_id=$2',[s.id,ctx.companyId]);await c.event(db,ctx,'service',s.id,action+'_recorded',d.customerVisible?details.summary:'',d.customerVisible,{recordId:id});if(d.customerVisible){const contact=await c.relation(db,ctx,'contacts',s.contact_id);if(contact.user_id)await c.notify(db,ctx,'service',s.id,'A shared service record is available.',{customer:contact.user_id});}return {id,message:'Record saved. No external message, inventory movement, financial credit or warranty verification was performed.'};
  });
 }));
});
