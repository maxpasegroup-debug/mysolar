import {createHmac,timingSafeEqual} from 'node:crypto';
import {HttpError} from '../errors.js';
export function billingConfiguration(env=process.env){
 const mode=env.RAZORPAY_BILLING_MODE||'disabled',key=env.RAZORPAY_KEY_ID||'',secret=env.RAZORPAY_KEY_SECRET||'',webhook=env.RAZORPAY_WEBHOOK_SECRET||'';
 const valid=['test','live'].includes(mode)&&key.startsWith(`rzp_${mode}_`)&&Boolean(secret)&&webhook.length>=32&&(mode!=='live'||env.RAZORPAY_LIVE_ENABLED==='true')&&(mode!=='test'||env.NODE_ENV!=='production');
 return {mode,available:valid,key,secret,webhook};
}
export function providerId(value,kind){if(typeof value!=='string'||!new RegExp('^'+kind+'_[A-Za-z0-9]{1,100}$').test(value))throw new HttpError(502,'BILLING_RESPONSE_INVALID','The payment provider returned an unexpected response. No access change was confirmed.');return value;}
export function renewalAmount(terms){
 const taxKnown=typeof terms.taxRate==='string'&&/^\d{1,3}(?:\.\d{1,2})?$/.test(terms.taxRate)&&Number(terms.taxRate)<=100&&(terms.taxMode!=='exempt'||Number(terms.taxRate)===0);
 if(terms.currency!=='INR'||!['inclusive','exempt'].includes(terms.taxMode)||!taxKnown||!/^\d{1,12}$/.test(terms.pricePaise)||BigInt(terms.pricePaise)<=0n||terms.interval!=='monthly'||![0,7].includes(terms.trialDays))throw new HttpError(409,'PLAN_NOT_BILLABLE','Use a published monthly INR plan with a positive final price and explicit included/exempt tax treatment and rate. Payment does not start another trial.');
 return Number(terms.pricePaise);
}
export function verifyWebhook(raw,signature,secret){
 if(!Buffer.isBuffer(raw)||raw.length>262144||typeof signature!=='string'||! /^[a-f0-9]{64}$/i.test(signature)||!secret)return false;
 return timingSafeEqual(createHmac('sha256',secret).update(raw).digest(),Buffer.from(signature,'hex'));
}
export function safeCheckout(url){let u;try{u=new URL(url);}catch{throw new HttpError(502,'BILLING_RESPONSE_INVALID','No valid mandate link was confirmed.');}if(u.origin!=='https://rzp.io'||u.username||u.password||u.hash)throw new HttpError(502,'BILLING_RESPONSE_INVALID','No valid mandate link was confirmed.');return u.href;}
export function razorpayClient({settings=billingConfiguration(),fetcher=fetch}={}){
 return {settings,async request(method,path,data){
  if(!settings.available)throw new HttpError(503,'BILLING_UNAVAILABLE','Razorpay subscriptions are not configured and enabled. No mandate or charge was created.');
  if(!/^(?:plans\/plan_[A-Za-z0-9]+|subscriptions(?:\/sub_[A-Za-z0-9]+(?:\/cancel)?)?|payments\/pay_[A-Za-z0-9]+|invoices\/inv_[A-Za-z0-9]+)$/.test(path))throw new Error('Unsupported provider operation');
  let response;try{response=await fetcher('https://api.razorpay.com/v1/'+path,{method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:'Basic '+Buffer.from(settings.key+':'+settings.secret).toString('base64'),'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});}catch{throw new HttpError(503,method==='POST'?'BILLING_RESULT_UNKNOWN':'BILLING_PROVIDER_UNAVAILABLE','Provider confirmation is unavailable. Do not retry a mandate creation until its status has been reconciled.');}
  if(!response.ok)throw new HttpError(502,method==='POST'?'BILLING_RESULT_UNKNOWN':'BILLING_PROVIDER_REJECTED','The payment provider did not confirm this operation. No application payment success is recorded.');
  const text=await response.text();if(Buffer.byteLength(text)>262144)throw new HttpError(502,'BILLING_RESPONSE_INVALID','Payment provider response could not be validated.');try{return JSON.parse(text);}catch{throw new HttpError(502,'BILLING_RESPONSE_INVALID','Payment provider response could not be validated.');}
 }};
}
