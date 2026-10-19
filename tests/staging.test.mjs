import test from 'node:test';
import assert from 'node:assert/strict';
import {stagingSettings,stagingBoundary,stagingMailGuard} from '../server/staging.js';
const env={STAGING_MODE:'true',NODE_ENV:'production',APP_ORIGIN:'https://fictional-staging.up.railway.app',STAGING_ACCESS_USER:'rehearsal',STAGING_ACCESS_PASSWORD:'x'.repeat(96),STAGING_EMAIL_RECIPIENTS:'approved@example.invalid'};
test('staging requires HTTPS production security, private access and approved mail recipients',()=>{
 assert.equal(stagingSettings({}).enabled,false);
 for(const override of [{NODE_ENV:'development'},{APP_ORIGIN:'https://mysolar.solutions'},{STAGING_ACCESS_PASSWORD:''},{STAGING_EMAIL_RECIPIENTS:'bad address'}])assert.throws(()=>stagingSettings({...env,...override}));
});
test('staging denies anonymous app access but retains narrow health probes and throttles failures',()=>{
 const boundary=stagingBoundary(stagingSettings(env));
 const call=(path,authorization,method='GET')=>{let next=false;const r={headers:{},set(k,v){this.headers[k]=v;return this;},status(n){this.code=n;return this;},type(){return this;},send(){return this;}};boundary({path,method,ip:'fixture',get:()=>authorization},r,()=>{next=true;});return {...r,next};};
 assert.equal(call('/').code,401);assert.equal(call('/readyz').next,true);assert.equal(call('/readyz',undefined,'POST').code,401);
 assert.equal(call('/', 'Basic '+Buffer.from(env.STAGING_ACCESS_USER+':'+env.STAGING_ACCESS_PASSWORD).toString('base64')).next,true);
 for(let n=0;n<10;n++)assert.equal(call('/api/auth/session').code,401);
 assert.equal(call('/api/auth/session').code,429);
});
test('staging transport blocks unapproved and hidden recipients before any delivery',async()=>{
 const delivered=[];const mail=stagingMailGuard(stagingSettings(env),{sendMail:async m=>{delivered.push(m);return {accepted:[m.to]};}});
 for(const message of [{to:'other@example.invalid'},{to:'approved@example.invalid',bcc:'other@example.invalid'},{to:['approved@example.invalid']},{to:'approved@example.invalid',envelope:{to:'other@example.invalid'}}])await assert.rejects(()=>mail.sendMail(message));
 assert.equal(delivered.length,0);await mail.sendMail({to:'approved@example.invalid',text:'Fictional fixture'});assert.equal(delivered.length,1);
 const blocked=stagingMailGuard(stagingSettings({...env,STAGING_EMAIL_RECIPIENTS:''}),{sendMail:async()=>assert.fail('must not send')});await assert.rejects(()=>blocked.sendMail({to:'approved@example.invalid'}));
});
