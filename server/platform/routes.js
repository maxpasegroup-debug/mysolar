import { Router } from 'express';
import { transaction,audit } from '../db/pool.js';
import { requireUser,csrf,lockedUser } from '../auth/sessions.js';
import { permissionsFor } from '../permissions.js';
import { expectRevision,setupData,reviewEvent,assertReady } from '../setup/service.js';
import * as v from '../validation.js';
import * as input from '../setup/validation.js';
import { HttpError,badInput } from '../errors.js';
import { policy,requireFeature } from '../commercial/policy.js';
export const platform=Router();
platform.use(requireUser);
platform.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));
export async function withPlatform(req,permission,work){
  return transaction(async db=>{
    const user=await lockedUser(db,req);
    const grant=await db.query('SELECT role_id FROM platform_admin_grants WHERE user_id=$1 FOR SHARE',[user.id]);
    if(!grant.rowCount)throw new HttpError(403,'PLATFORM_ACCESS_DENIED','Platform operator privileges are required.');
    const permissions=await permissionsFor(db,grant.rows[0].role_id);
    if(!permissions.includes(permission))throw new HttpError(403,'PERMISSION_DENIED','This platform action is not allowed.');
    return work(db,{userId:user.id,permissions});
  });
}
platform.get('/companies',async(req,res)=>{
  v.body(req.query,['search','lifecycle','marketplace','queue','page'],[]);
  const search=req.query.search===undefined?'':v.text(req.query.search,'search',100,0);
  const lifecycle=req.query.lifecycle? v.choice(req.query.lifecycle,['draft','onboarding','pending_review','active','suspended'],'lifecycle'):null;
  const market=req.query.marketplace?v.choice(req.query.marketplace,['not_requested','pending','approved','rejected','withdrawn'],'marketplace state'):null;
  const queue=req.query.queue?v.choice(req.query.queue,['onboarding','marketplace'],'review queue'):null;
  const page=req.query.page===undefined?1:Number(req.query.page);if(!Number.isSafeInteger(page)||page<1||page>10000)throw badInput();
  res.json(await withPlatform(req,'platform.companies.read',async(db)=>{
    const filter=`WHERE ($1='' OR c.name ILIKE '%'||$1||'%' OR c.city ILIKE '%'||$1||'%') AND ($2::text IS NULL OR c.lifecycle=$2) AND ($3::text IS NULL OR c.marketplace_status=$3) AND ($4::text IS NULL OR ($4='onboarding' AND c.lifecycle='pending_review') OR ($4='marketplace' AND c.marketplace_status='pending'))`;
    const params=[search,lifecycle,market,queue];
    const rows=await db.query(`SELECT c.id,c.name,c.city,c.lifecycle,c.marketplace_status,c.storefront_published,c.revision,c.created_at FROM companies c ${filter} ORDER BY c.created_at DESC,c.id LIMIT 20 OFFSET $5`,[...params,(page-1)*20]);
    const total=await db.query(`SELECT count(*)::int AS total FROM companies c ${filter}`,params);
    return {companies:rows.rows,total:total.rows[0].total,page,pageSize:20};
  }));
});
platform.get('/companies/:id',async(req,res)=>{
  const id=v.uuid(req.params.id);
  res.json(await withPlatform(req,'platform.companies.read',async(db,ctx)=>{
    await db.query('SELECT id FROM companies WHERE id=$1 FOR SHARE',[id]);
    const data=await setupData(db,id,{team:true});
    const activity=await db.query(`SELECT a.id,a.action,a.metadata,a.created_at,u.display_name AS operator FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.company_id=$1 AND ($2::boolean OR a.action NOT LIKE 'commercial.%') ORDER BY a.id DESC LIMIT 50`,[id,ctx.permissions.includes('platform.commercial.read')]);
    return {...data,activity:activity.rows,permissions:ctx.permissions};
  }));
});
const actions={approve:'platform.onboarding.review',reject:'platform.onboarding.review',suspend:'platform.lifecycle.manage',reactivate:'platform.lifecycle.manage',approve_marketplace:'platform.marketplace.review',reject_marketplace:'platform.marketplace.review',publish:'platform.marketplace.review',unpublish:'platform.marketplace.review'};
platform.post('/companies/:id/actions',async(req,res)=>{
  const id=v.uuid(req.params.id);v.body(req.body,['action','revision','reason']);
  const action=v.choice(req.body.action,Object.keys(actions),'review action'),revision=input.revision(req.body.revision);
  const required=['reject','suspend','reject_marketplace'].includes(action);
  const reason=input.plain(req.body.reason,'review reason',500,required?10:0);
  res.json(await withPlatform(req,actions[action],async(db,ctx)=>{
    const found=await db.query('SELECT * FROM companies WHERE id=$1 FOR UPDATE',[id]);if(!found.rowCount)throw new HttpError(404,'NOT_FOUND','Company not found.');
    const c=found.rows[0];expectRevision(c,revision);
    if(action==='publish')requireFeature(await policy(db,id),'storefront');
    if(['approve','reactivate','approve_marketplace','publish'].includes(action)){
      const affiliated=await db.query("SELECT id FROM company_memberships WHERE company_id=$1 AND user_id=$2 AND status<>'removed'",[id,ctx.userId]);
      if(c.created_by===ctx.userId||affiliated.rowCount)throw new HttpError(403,'INDEPENDENT_REVIEW_REQUIRED','A different authorized platform operator must approve or reactivate a company you belong to.');
    }
    let lifecycle=c.lifecycle,market=c.marketplace_status,published=c.storefront_published,suspendedFrom=c.suspended_from;
    let kind='lifecycle',previous=c.lifecycle,next;
    const invalid=()=>new HttpError(409,'INVALID_TRANSITION','This review action is not permitted from the current company state.');
    if(action==='approve'){
      if(c.lifecycle!=='pending_review')throw invalid();
      assertReady(await setupData(db,id));
      lifecycle='active';
    }else if(action==='reject'){if(c.lifecycle!=='pending_review')throw invalid();lifecycle='onboarding';published=false;}
    else if(action==='suspend'){if(c.lifecycle==='suspended')throw invalid();suspendedFrom=c.lifecycle;lifecycle='suspended';published=false;}
    else if(action==='reactivate'){if(c.lifecycle!=='suspended'||!c.suspended_from)throw invalid();lifecycle=c.suspended_from;suspendedFrom=null;published=false;}
    else {
      kind='marketplace';previous=c.marketplace_status;
      if(action==='approve_marketplace'){
        if(c.lifecycle!=='active'||c.marketplace_status!=='pending')throw invalid();
        const data=await setupData(db,id);
        assertReady(data);if(!data.business.marketplace_requested)throw new HttpError(409,'SETUP_INCOMPLETE','A marketplace inclusion request is required.');
        market='approved';published=false;
      }else if(action==='reject_marketplace'){if(c.marketplace_status!=='pending')throw invalid();market='rejected';published=false;}
      else if(action==='publish'){if(c.lifecycle!=='active'||c.marketplace_status!=='approved'||published)throw invalid();published=true;previous='unpublished';next='published';}
      else if(action==='unpublish'){if(!published)throw invalid();published=false;previous='published';next='unpublished';}
    }
    next ||= kind==='lifecycle'?lifecycle:market;
    await db.query('UPDATE companies SET lifecycle=$1,status=$2,suspended_from=$3,marketplace_status=$4,storefront_published=$5,revision=revision+1,updated_at=now() WHERE id=$6',[lifecycle,lifecycle==='suspended'?'suspended':'active',suspendedFrom,market,published,id]);
    await reviewEvent(db,{company:id,actor:ctx.userId,kind,previous,next,reason,revision:revision+1});
    return {message:'Administrative decision saved.',revision:revision+1};
  }));
});
platform.get('/settings',async(req,res)=>res.json(await withPlatform(req,'platform.settings.read',async(db)=>({settings:(await db.query('SELECT proposed_setup_fee_paise,gst_note,proposed_subscription_paise,proposed_trial_days,future_limits,billing_enabled,revision,updated_at FROM platform_settings WHERE id=true')).rows[0]}))));
platform.patch('/settings',async(req,res)=>{await withPlatform(req,'platform.settings.manage',async()=>{throw new HttpError(409,'COMMERCIAL_SETTINGS_MOVED','Use the versioned commercial console. Legacy proposed settings are retained as history and no longer control access.');});});
