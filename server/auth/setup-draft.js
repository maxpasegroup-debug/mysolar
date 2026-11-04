import {Router} from 'express';
import {transaction,audit} from '../db/pool.js';
import {csrf,requireUser,lockedUser} from './sessions.js';
import {seal,unseal} from './sealed.js';
import {config} from '../config.js';
import {limit} from './security.js';
import {setupCatalogue} from '../setup/sia-plan.js';
import * as v from '../validation.js';
import {badInput,HttpError} from '../errors.js';
export const setupDraft=Router();setupDraft.use(requireUser);setupDraft.use((req,res,next)=>req.method==='GET'?next():csrf(req,res,next));
const names=['operationKey','name','email','website','emergencyContact','whatsapp','countryCode','state','district','districtOther','city','pin','businessPreset','otherProducts'];
export async function completePrivateDraft(db,userId,operationKey){
 if(!operationKey)return;const row=(await db.query("SELECT metadata FROM audit_events WHERE actor_user_id=$1 AND action='onboarding.private_draft' ORDER BY id DESC LIMIT 1",[userId])).rows[0];
 if(row?.metadata.sealed&&unseal(row.metadata.sealed).fields.operationKey===operationKey)await audit(db,{actor:userId,action:'onboarding.private_draft',metadata:{sealed:null,completedOperationKey:operationKey}});
}
function validate(d){v.body(d,['fields','step','products','team']);v.body(d.fields,names,[]);if(!Number.isInteger(d.step)||d.step<0||d.step>2||!Array.isArray(d.products)||d.products.length>30||!Array.isArray(d.team)||d.team.length>30)throw badInput();for(const [key,value] of Object.entries(d.fields))v.text(value,key,key==='otherProducts'?500:500,0);if(d.fields.operationKey)v.uuid(d.fields.operationKey);if(d.products.some(p=>!setupCatalogue.products.some(([id])=>id===p)))throw badInput();const roles=setupCatalogue.departments.flatMap(d=>d.roles.map(([id])=>id));for(const row of d.team){v.body(row,['role','count']);if(!roles.includes(row.role)||!Number.isInteger(row.count)||row.count<0||row.count>500)throw badInput();}return d;}
async function context(db,req){const user=await lockedUser(db,req);if(user.account_type!=='business')throw new HttpError(403,'BUSINESS_ACCOUNT_REQUIRED','Use a separate business account for company setup.');if(!config.dataEncryptionKey)throw new HttpError(503,'DRAFT_UNAVAILABLE','Private setup drafts are not configured.');const row=(await db.query("SELECT id,metadata FROM audit_events WHERE actor_user_id=$1 AND action='onboarding.private_draft' ORDER BY id DESC LIMIT 1",[user.id])).rows[0];return {user,row,revision:row?.id||null};}
setupDraft.get('/',async(req,res)=>res.json(await transaction(async db=>{const {row,revision}=await context(db,req);return {catalogue:setupCatalogue,revision,draft:row?.metadata.sealed?unseal(row.metadata.sealed):null,notice:'Private setup drafts are encrypted. Saved draft history follows audit retention; no automatic deletion schedule is configured.'};})));
setupDraft.put('/',async(req,res)=>{
 v.body(req.body,['revision','draft']);if(req.body.revision!==null&&!/^\d{1,20}$/.test(req.body.revision))throw badInput();const draft=validate(req.body.draft);await limit(req,'private-setup-draft',req.session.user_id,30,3600);
 res.json(await transaction(async db=>{const {user,revision}=await context(db,req);if(req.body.revision!==revision)throw new HttpError(409,'DRAFT_CHANGED','Your saved setup changed in another tab. Reload before replacing it.');await audit(db,{actor:user.id,action:'onboarding.private_draft',metadata:{sealed:seal(draft)}});const row=(await db.query("SELECT id FROM audit_events WHERE actor_user_id=$1 AND action='onboarding.private_draft' ORDER BY id DESC LIMIT 1",[user.id])).rows[0];return {revision:row.id,message:'Private draft saved. No company or subscription was created.'};}));
});
