import {Router} from 'express';
import {requireUser,csrf} from '../auth/sessions.js';
import {limit} from '../auth/security.js';
import {withCompany} from '../tenancy/context.js';
import {withPlatform} from '../platform/routes.js';
import {HttpError,badInput} from '../errors.js';
import * as v from '../validation.js';
import {registerDomain,domainRecord,publicDomain,expectDomain,commandInput,replay,verifyDomain,changeDomain} from './service.js';
import {readOwnershipProof} from './proof.js';

function router(){const r=Router();r.use(requireUser);r.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));return r;}
export const companyDomains=router(),platformDomains=router();
function page(query){v.body(query,['page'],[]);const n=Number(query.page??1);if(!Number.isSafeInteger(n)||n<1||n>10000)throw badInput('Choose a valid page.');return n;}
async function directory(db,{companyId=null,n}){
 const rows=await db.query('SELECT * FROM company_domains WHERE ($1::uuid IS NULL OR company_id=$1) ORDER BY created_at DESC,id LIMIT 20 OFFSET $2',[companyId,(n-1)*20]);
 return {items:rows.rows.map(publicDomain),page:n,pageSize:20,providerConfigured:false,activationAvailable:false};
}
async function history(db,ctx,id){
 const domain=await domainRecord(db,ctx,id);
 const operations=(await db.query('SELECT id,action,status,last_error_code,attempts,created_at,updated_at FROM domain_operations WHERE domain_id=$1 AND company_id=$2 ORDER BY created_at DESC,id LIMIT 30',[id,ctx.companyId])).rows;
 return {domain:publicDomain(domain),operations,providerConfigured:false,activationAvailable:false};
}
async function rate(req,scope){
 await limit(req,'domain-'+scope,req.session.user_id,20,3600);
 if(req.session.active_company_id)await limit(req,'domain-company-'+scope,req.session.active_company_id,40,3600);
}
companyDomains.get('/',async(req,res)=>{const n=page(req.query);res.json(await withCompany(req,'domains.read',(db,ctx)=>directory(db,{companyId:ctx.companyId,n})));});
companyDomains.get('/:id',async(req,res)=>{v.body(req.query,[]);res.json(await withCompany(req,'domains.read',(db,ctx)=>history(db,ctx,v.uuid(req.params.id))));});
companyDomains.post('/',async(req,res)=>{await rate(req,'register');const result=await withCompany(req,'domains.manage',(db,ctx)=>registerDomain(db,ctx,req.body));res.status(result.replayed?200:201).json(result);});
companyDomains.post('/:id/actions',async(req,res)=>{
 v.body(req.body,['action','operationKey','revision','reason']);const {action,...rest}=req.body,input=commandInput(rest),id=v.uuid(req.params.id);await rate(req,'change');
 res.json(await withCompany(req,'domains.manage',(db,ctx)=>changeDomain(db,ctx,id,action,input)));
});

async function operatorContext(req,id,permission,work){return withPlatform(req,permission,async(db,operator)=>{
 const ref=(await db.query('SELECT company_id FROM company_domains WHERE id=$1',[v.uuid(id)])).rows[0];
 if(!ref)throw new HttpError(404,'DOMAIN_NOT_FOUND','Domain registration not found.');
 await db.query('SELECT id FROM companies WHERE id=$1 FOR UPDATE',[ref.company_id]);
 return work(db,{userId:operator.userId,companyId:ref.company_id,operator:true});
});}
platformDomains.get('/',async(req,res)=>{const n=page(req.query);res.json(await withPlatform(req,'platform.domains.read',db=>directory(db,{n})));});
platformDomains.get('/:id',async(req,res)=>{v.body(req.query,[]);res.json(await operatorContext(req,req.params.id,'platform.domains.read',(db,ctx)=>history(db,ctx,req.params.id)));});
platformDomains.post('/:id/actions',async(req,res)=>{
 v.body(req.body,['action','operationKey','revision','reason']);const {action,...rest}=req.body,input=commandInput(rest),id=v.uuid(req.params.id);await rate(req,'operator-change');
 res.json(await operatorContext(req,id,'platform.domains.manage',(db,ctx)=>changeDomain(db,ctx,id,action,input)));
});

// DNS is queried outside the mutation transaction. Authorization and revision are rechecked afterward.
async function verify(req,res,context){
 const input=commandInput(req.body),id=v.uuid(req.params.id);await rate(req,'verify');
 const prepared=await context(async(db,ctx)=>{
  const old=await replay(db,ctx,'verify',id,input);if(old)return {replayed:old};
  const domain=await domainRecord(db,ctx,id);expectDomain(domain,input);
  if(domain.status!=='pending'||new Date(domain.challenge_expires_at)<=new Date())throw new HttpError(409,'DOMAIN_CHANGED','Request a fresh pending ownership challenge.');
  return {hostname:domain.hostname,challengeHash:domain.challenge_hash};
 });
 let result=prepared.replayed;
 if(!result){const records=await readOwnershipProof(prepared.hostname);result=await context((db,ctx)=>verifyDomain(db,ctx,id,input,{records,challengeHash:prepared.challengeHash}));}
 res.status(result.operation.status==='failed'?400:200).json(result);
}
companyDomains.post('/:id/verify',async(req,res)=>verify(req,res,work=>withCompany(req,'domains.manage',work)));
platformDomains.post('/:id/verify',async(req,res)=>verify(req,res,work=>operatorContext(req,req.params.id,'platform.domains.manage',work)));
