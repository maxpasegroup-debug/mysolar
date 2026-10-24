import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export const installationRoot='/companies/current/operations';
const ok=r=>{assert.equal(r.status,200,JSON.stringify(r.data));return r.data;};
export async function recordSurvey(a,id){const r=await a.request('/companies/current/projects/'+id+'/surveys','POST',{operationKey:randomUUID(),assessedOn:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}),roofType:'[TEST] recorded roof',usableArea:'[TEST] measured area',shading:'[TEST] shading observation',roofCondition:'[TEST] recorded roof inspection',electricalNotes:'[TEST] recorded electrical observations'});assert.equal(r.status,201,JSON.stringify(r.data));return r.data.id;}
export const installationRead=async(a,id)=>ok(await a.request(installationRoot+'/record/projects/'+id));
export async function prepareInstallation(a,id,{mode='external',approve=true,allChecks=true}={}){
 let data=await installationRead(a,id);const survey=data.installation.survey?.id||await recordSurvey(a,id),day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});data=await installationRead(a,id);
 ok(await a.request(installationRoot+'/projects/'+id+'/installation/control','POST',{operationKey:randomUUID(),revision:data.record.revision,reviewedSurveyId:survey,surveyReference:'[TEST] reviewed survey reference',windowStart:day,windowEnd:day,scheduleReference:'[TEST] actual agreed schedule',materialsMode:mode,materialsReference:mode==='stock'?'':'[TEST] documented external/customer-supplied scope',reason:'[TEST] explicit scope and survey review'}));
 data=await installationRead(a,id);for(const check of data.installation.checks.filter(c=>(c.outcome!=='pass'||!c.evidence_reference)&&(allChecks||['safety','technical'].includes(c.category)))){const current=await installationRead(a,id);ok(await a.request(installationRoot+'/projects/'+id+'/installation/checks/'+check.id,'POST',{operationKey:randomUUID(),revision:current.record.revision,outcome:'pass',evidenceReference:'[TEST] recorded inspection '+check.code,notes:'[TEST] actual recorded observations'}));}
 if(approve){data=await installationRead(a,id);ok(await a.request(installationRoot+'/projects/'+id+'/installation/approve','POST',{operationKey:randomUUID(),revision:data.record.revision,fingerprint:data.installation.fingerprint,confirm:true,reason:'[TEST] reviewed current installation records'}));}
 return installationRead(a,id);
}
