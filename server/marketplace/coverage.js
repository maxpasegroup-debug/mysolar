import {badInput} from '../errors.js';
import {normalize} from './validation.js';
import '../../src/india-geography.js';

// Bind declarations only during an explicit owner save. Never backfill legacy rows.
export async function reviewedCoverage(db,areas){
 const result=[];
 for(const area of areas){
  const a={...area,localityReferenceId:null};
  if(!a.state)throw badInput('Choose a State for every coverage declaration.');
  const state=Object.keys(globalThis.IndiaGeography).find(s=>normalize(s)===normalize(a.state));
  if(!state||a.scope!=='state'&&!globalThis.IndiaGeography[state].some(d=>normalize(d)===normalize(a.district)))throw badInput('Choose a valid State and its District.');
  if(a.scope==='state'&&(a.district||a.pin||a.locality)||a.scope==='district'&&(!a.district||a.pin||a.locality)||a.scope==='pin'&&(!a.district||!a.pin||a.locality)||a.scope==='locality'&&(!a.district||!a.pin||!a.locality))throw badInput('Use only the location fields for the chosen scope. Named locality needs State, District, PIN and locality; Exact PIN must not contain a locality restriction.');
  if(['pin','locality'].includes(a.scope)){
   const postal=(await db.query('SELECT state_key,district_key FROM postal_locations WHERE pin=$1 AND active FOR SHARE',[a.pin])).rows[0];
   if(!postal||postal.state_key!==normalize(a.state)||postal.district_key!==normalize(a.district))throw badInput('This State, District and PIN combination has no reviewed postal reference.');
  }
  if(a.scope==='locality'){
   const row=(await db.query('SELECT id,name FROM postal_localities WHERE pin=$1 AND locality_key=$2 AND active FOR SHARE',[a.pin,normalize(a.locality)])).rows[0];
   if(!row)throw badInput('Choose an independently reviewed locality for this postal PIN.');
   a.localityReferenceId=row.id;a.locality=row.name;
  }
  result.push(a);
 }
 return result;
}
