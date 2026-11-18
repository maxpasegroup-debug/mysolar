import {Router} from 'express';
import {pool,audit} from './db/pool.js';
import {requireUser,csrf} from './auth/sessions.js';
import {withPlatform} from './platform/routes.js';
import * as v from './validation.js';
import {normalize} from './marketplace/validation.js';
import {HttpError} from './errors.js';
import {randomUUID} from 'node:crypto';
import '../src/india-geography.js';
export const postal=Router();
function reviewedRegion(state,district){
 const canonical=Object.keys(globalThis.IndiaGeography).find(s=>normalize(s)===normalize(state));
 const area=canonical&&globalThis.IndiaGeography[canonical].find(d=>normalize(d)===normalize(district));
 if(!area)throw new HttpError(400,'INVALID_REGION','Choose a valid Indian State and its District for the postal reference.');
 return {state:canonical,district:area};
}
postal.get('/public/locations/:pin/localities',async(req,res)=>{
 if(!/^[1-9]\d{5}$/.test(req.params.pin))throw new HttpError(400,'INVALID_PIN','Enter a six-digit Indian PIN.');
 v.body(req.query,['state','district'],['state','district']);
 const state=normalize(v.text(req.query.state,'State',100)),district=normalize(v.text(req.query.district,'District',100));
 const items=(await pool.query('SELECT l.id,l.name FROM postal_localities l JOIN postal_locations p ON p.pin=l.pin WHERE l.pin=$1 AND l.active AND p.active AND p.state_key=$2 AND p.district_key=$3 ORDER BY l.name,l.id LIMIT 500',[req.params.pin,state,district])).rows;
 res.json({items,notice:items.length?'Choose the reviewed installation locality.':'No reviewed locality is available for this State, District and PIN. Contact support; no wider coverage is inferred.'});
});
postal.post('/platform/localities/import',requireUser,csrf,async(req,res)=>{
 v.body(req.body,['rows','source','reason']);const source=v.text(req.body.source,'source reference',500,1),reason=v.text(req.body.reason,'review reason',300,10);
 if(!Array.isArray(req.body.rows)||!req.body.rows.length||req.body.rows.length>100)throw new HttpError(400,'IMPORT_LIMIT','Import 1 to 100 independently reviewed localities.');
 const rows=req.body.rows.map(row=>{v.body(row,['pin','name','active']);if(!/^[1-9]\d{5}$/.test(row.pin)||typeof row.active!=='boolean')throw new HttpError(400,'INVALID_LOCALITY','Provide a postal PIN, locality name and active status.');return {pin:row.pin,name:v.text(row.name,'locality',100,1),active:row.active};});
 if(new Set(rows.map(r=>r.pin+':'+normalize(r.name))).size!==rows.length)throw new HttpError(400,'DUPLICATE_LOCALITY','Remove duplicate normalized localities.');
 res.json(await withPlatform(req,'catalogue.manage',async(db,ctx)=>{
  for(const row of rows){if(!(await db.query('SELECT pin FROM postal_locations WHERE pin=$1 AND active FOR SHARE',[row.pin])).rowCount)throw new HttpError(400,'POSTAL_UNVERIFIED','Review this postal PIN before importing its localities.');
   await db.query('INSERT INTO postal_localities(id,pin,name,locality_key,source_reference,reviewed_by,active) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(pin,locality_key) DO UPDATE SET name=excluded.name,source_reference=excluded.source_reference,reviewed_by=excluded.reviewed_by,reviewed_at=now(),active=excluded.active',[randomUUID(),row.pin,row.name,normalize(row.name),source,ctx.userId,row.active]);}
  await audit(db,{actor:ctx.userId,action:'catalogue.localities_reviewed',metadata:{rows,source,reason}});return {imported:rows.length};
 }));
});
postal.get('/public/locations/:pin',async(req,res)=>{if(!/^[1-9]\d{5}$/.test(req.params.pin))throw new HttpError(400,'INVALID_PIN','Enter a six-digit Indian PIN.');const row=(await pool.query('SELECT pin,state,district,source_reference,reviewed_at FROM postal_locations WHERE pin=$1 AND active',[req.params.pin])).rows[0];res.json({location:row||null,notice:row?'Operator-reviewed location mapping. Service coverage still depends on each company.':'No reviewed mapping is available. Enter your state/district or search exact maintained PIN coverage; no distance is inferred.'});});
postal.post('/platform/locations/import',requireUser,csrf,async(req,res)=>{v.body(req.body,['rows','source','reason']);const source=v.text(req.body.source,'source reference',500),reason=v.text(req.body.reason,'review reason',300,10);if(!Array.isArray(req.body.rows)||!req.body.rows.length||req.body.rows.length>100)throw new HttpError(400,'IMPORT_LIMIT','Import between 1 and 100 reviewed PIN mappings at a time.');const rows=req.body.rows.map(row=>{v.body(row,['pin','state','district']);if(!/^[1-9]\d{5}$/.test(row.pin))throw new HttpError(400,'INVALID_PIN','Invalid PIN in import.');return {pin:row.pin,...reviewedRegion(v.text(row.state,'state'),v.text(row.district,'district'))};});if(new Set(rows.map(x=>x.pin)).size!==rows.length)throw new HttpError(400,'DUPLICATE_PIN','Review duplicate PIN entries.');res.json(await withPlatform(req,'catalogue.manage',async(db,ctx)=>{for(const row of rows)await db.query('INSERT INTO postal_locations(pin,state,district,state_key,district_key,source_reference,reviewed_by) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(pin) DO UPDATE SET state=excluded.state,district=excluded.district,state_key=excluded.state_key,district_key=excluded.district_key,source_reference=excluded.source_reference,reviewed_by=excluded.reviewed_by,reviewed_at=now(),active=true',[row.pin,row.state,row.district,normalize(row.state),normalize(row.district),source,ctx.userId]);await audit(db,{actor:ctx.userId,action:'catalogue.postal_mappings_reviewed',metadata:{count:rows.length,source,reason}});return {imported:rows.length,message:'Reviewed mappings saved. No provider distance or geolocation is claimed.'};}));});
