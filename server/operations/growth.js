import * as c from './core.js';
export const growth=c.router();
growth.post('/leads/:id/attribution',async(req,res)=>{
 c.v.body(req.body,['revision','channel','campaign','referrerId','reason']);const d=req.body;
 res.json(await c.context(req,async(db,ctx)=>{c.permit(ctx,'crm.manage');const lead=await c.record(db,ctx,'leads',req.params.id,{lock:true,write:true});c.expect(lead,d.revision);
 const channel=c.v.choice(d.channel,['walk_in','referral','marketplace','website','campaign','phone','other'],'lead source'),referrer=c.optionalId(d.referrerId);if(referrer)await c.relation(db,ctx,'contacts',referrer);
 if(channel==='marketplace'&&!lead.enquiry_id)throw c.fail('Only a lead linked to a real marketplace enquiry can claim that source.');
 const previous=(await db.query('SELECT source_channel,campaign,referrer_contact_id FROM lead_growth_records WHERE lead_id=$1 AND company_id=$2',[lead.id,ctx.companyId])).rows[0]||null;
 await db.query('INSERT INTO lead_growth_records(lead_id,company_id,source_channel,campaign,referrer_contact_id,updated_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(lead_id,company_id) DO UPDATE SET source_channel=excluded.source_channel,campaign=excluded.campaign,referrer_contact_id=excluded.referrer_contact_id,updated_by=excluded.updated_by,updated_at=now()',[lead.id,ctx.companyId,channel,c.plain(d.campaign,'campaign or referral context',150),referrer,ctx.userId]);await db.query('UPDATE crm_leads SET revision=revision+1 WHERE id=$1 AND company_id=$2',[lead.id,ctx.companyId]);
 await c.event(db,ctx,'leads',lead.id,'source_attribution_reviewed',c.plain(d.reason,'attribution review reason',300,10),false,{previous,channel,referrer});return {message:'Lead source recorded with history. No referral reward, advertisement, message delivery or customer consent is implied.'};
 }));
});
growth.post('/leads/:id/response',async(req,res)=>{
 c.v.body(req.body,['revision','reference','notes']);const d=req.body;
 res.json(await c.context(req,async(db,ctx)=>{c.permit(ctx,'crm.manage');const lead=await c.record(db,ctx,'leads',req.params.id,{lock:true,write:true});c.expect(lead,d.revision);const reference=c.plain(d.reference,'actual response reference',200,10),notes=c.plain(d.notes,'actual response explanation',500,10);
 await db.query('INSERT INTO lead_growth_records(lead_id,company_id,first_response_at,last_response_at,response_reference,updated_by) VALUES($1,$2,now(),now(),$3,$4) ON CONFLICT(lead_id,company_id) DO UPDATE SET first_response_at=coalesce(lead_growth_records.first_response_at,now()),last_response_at=now(),response_reference=excluded.response_reference,updated_by=excluded.updated_by,updated_at=now()',[lead.id,ctx.companyId,reference,ctx.userId]);await db.query('UPDATE crm_leads SET revision=revision+1 WHERE id=$1 AND company_id=$2',[lead.id,ctx.companyId]);await c.event(db,ctx,'leads',lead.id,'actual_response_recorded',notes,false,{reference});return {message:'Staff-entered response recorded at the current time. MY SOLAR did not send a message or verify its receipt.'};
 }));
});
