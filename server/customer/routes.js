import { Router } from 'express';
import { transaction, audit } from '../db/pool.js';
import { requireUser, csrf, lockedUser } from '../auth/sessions.js';
import { permissionsFor } from '../permissions.js';
import { HttpError } from '../errors.js';
import * as v from '../validation.js';
export const customer=Router();
customer.use(requireUser);
async function ownProfile(req,work) {
  return transaction(async db=>{
    const user=await lockedUser(db,req);
    if(!(await permissionsFor(db,'customer')).includes('customer.profile'))throw new HttpError(403,'PERMISSION_DENIED','Customer profile access is unavailable.');
    return work(db,user);
  });
}
customer.get('/profile',async(req,res)=>res.json(await ownProfile(req,async(db,user)=>{
  const result=await db.query('SELECT phone,city,preferred_language FROM customer_profiles WHERE user_id=$1',[user.id]);
  return {profile:{name:user.display_name,email:user.email,...result.rows[0]}};
})));
customer.patch('/profile',csrf,async(req,res)=>{
  const input=v.body(req.body,['name','phone','city','language']);
  const name=v.text(input.name,'name'),phone=v.phone(input.phone),city=v.text(input.city,'city',100,0),language=v.choice(input.language,['en','ml','ta'],'language');
  res.json(await ownProfile(req,async(db,user)=>{
    await db.query('UPDATE users SET display_name=$1,updated_at=now() WHERE id=$2',[name,user.id]);
    await db.query('UPDATE customer_profiles SET phone=$1,city=$2,preferred_language=$3,updated_at=now() WHERE user_id=$4',[phone,city,language,user.id]);
    await audit(db,{actor:user.id,action:'customer.profile_updated',target:user.id});
    return {message:'Profile saved.'};
  }));
});
customer.get('/modules/:module',async(req,res)=>{
  const permissions={enquiries:'customer.enquiries.own',quotations:'customer.quotations.own',orders:'customer.orders.own',installation:'customer.installation.own'};
  const permission=permissions[req.params.module];
  if(!permission)throw new HttpError(404,'NOT_FOUND','Module not found.');
  res.json(await ownProfile(req,async(db,user)=>{
    if(!(await permissionsFor(db,'customer')).includes(permission))throw new HttpError(403,'PERMISSION_DENIED','Customer access is unavailable.');
    // Future repositories must filter by user.id, never a request userId.
    return {module:req.params.module,scope:'own',enabled:false,message:'Customer records will be implemented in a later phase.'};
  }));
});
