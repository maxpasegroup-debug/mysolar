import test from 'node:test';
import assert from 'node:assert/strict';
import {probeAvailability,fallbackNotifier} from '../server/monitor-probes.js';
test('monitor probes use only fixed public paths and never read response bodies',async()=>{
 const calls=[];const result=await probeAvailability('https://monitor.example.invalid',{fetchImpl:async(url,options)=>{calls.push({url:String(url),options});return {status:url.pathname==='/healthz'?200:503,get body(){assert.fail('No body access');}};}});
 assert.deepEqual(result,{health:200,ready:503});assert.deepEqual(calls.map(x=>x.url),['https://monitor.example.invalid/healthz','https://monitor.example.invalid/readyz']);assert.ok(calls.every(x=>x.options.redirect==='error'&&x.options.signal instanceof AbortSignal));
});
test('monitor timeout/network failures are unavailable and unsafe origins are rejected',async()=>{
 assert.deepEqual(await probeAvailability('https://monitor.example.invalid',{fetchImpl:async()=>{throw Error('Private network detail');}}),{health:null,ready:null});
 for(const origin of ['https://user:password@monitor.example.invalid','file:///private','https://monitor.example.invalid/private','https://monitor.example.invalid/?token=x'])await assert.rejects(probeAvailability(origin));
});
test('database-independent fallback is rate limited, including delivery failures',async()=>{
 let time=0,sends=0;const notify=fallbackNotifier({now:()=>time,cooldownMs:100,send:async()=>{sends++;if(sends===1)throw Error('Secret provider response');}});
 assert.deepEqual(await notify(),{state:'send_failed'});assert.deepEqual(await notify(),{state:'cooldown'});assert.equal(sends,1);time=100;assert.deepEqual(await notify(),{state:'smtp_accepted'});assert.equal(sends,2);
});
