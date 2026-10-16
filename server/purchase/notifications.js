import { Router } from 'express';
import { requireUser,csrf } from '../auth/sessions.js';
import { withCompany } from '../tenancy/context.js';
import { Bindings,paged } from '../marketplace/service.js';
import * as v from '../validation.js';
import { filters } from './validation.js';
import { withCustomer,notFound,active } from './service.js';
function router(company){const r=Router();r.use(requireUser);const context=(req,work)=>company?withCompany(req,'leads.read',(db,ctx)=>{active(ctx);return work(db,ctx.userId,ctx.companyId);}):withCustomer(req,'customer.enquiries.own',(db,user)=>work(db,user.id,null));
 r.get('/notifications',async(req,res)=>{const q=filters(req.query);res.json(await context(req,async(db,user,companyId)=>{const b=new Bindings();const where=`n.user_id=${b.add(user)} AND n.company_id IS NOT DISTINCT FROM ${b.add(companyId)}::uuid`;return {...await paged(db,'n.id,n.enquiry_id,n.version_id,n.message,n.read_at,n.created_at','FROM workflow_notifications n',where,b,q.page,'n.created_at DESC,n.id'),unread:(await db.query('SELECT count(*)::int AS count FROM workflow_notifications WHERE user_id=$1 AND company_id IS NOT DISTINCT FROM $2::uuid AND read_at IS NULL',[user,companyId])).rows[0].count};}));});
 r.post('/notifications/:id/read',csrf,async(req,res)=>{const id=v.uuid(req.params.id);v.body(req.body,[]);res.json(await context(req,async(db,user,companyId)=>{const result=await db.query('UPDATE workflow_notifications SET read_at=coalesce(read_at,now()) WHERE id=$1 AND user_id=$2 AND company_id IS NOT DISTINCT FROM $3::uuid RETURNING id',[id,user,companyId]);if(!result.rowCount)throw notFound();return {message:'Notification marked as read.'};}));});return r;}
export const customerNotifications=router(false),companyNotifications=router(true);
