import {randomUUID} from 'node:crypto';
import {config} from '../config.js';
import {HttpError,badInput} from '../errors.js';
import {eventHash} from './os-billing.js';
import {verifyWebhook} from './razorpay.js';
import {seal,unseal} from '../auth/sealed.js';

export const BILLING_EVENTS=Object.freeze(['subscription.authenticated','subscription.activated','subscription.charged','subscription.cancelled','subscription.completed','subscription.halted','subscription.pending','subscription.paused','subscription.resumed','subscription.updated']);
const eventSet=new Set(BILLING_EVENTS);
export function parseVerifiedWebhook({rawBody,signature,secret,eventId,mode,encrypt=seal}){
 if(!Buffer.isBuffer(rawBody)||!verifyWebhook(rawBody,signature,secret))throw new HttpError(400,'INVALID_WEBHOOK','Invalid webhook signature.');
 let event;try{event=JSON.parse(rawBody.toString('utf8'));}catch{throw badInput('Invalid webhook.');}
 if(!event||typeof event!=='object'||Array.isArray(event)||typeof event.event!=='string')throw badInput('Invalid webhook event.');
 if(!eventSet.has(event.event))return {ignored:true};
 if(!['test','live'].includes(mode))throw new HttpError(503,'BILLING_UNAVAILABLE','Billing webhook mode is unavailable.');
 if(typeof eventId!=='string'||! /^[A-Za-z0-9_-]{1,200}$/.test(eventId))throw badInput('Invalid webhook event reference.');
 const subscriptionId=event.payload?.subscription?.entity?.id;
 if(typeof subscriptionId!=='string'||!/^sub_[A-Za-z0-9]{1,100}$/.test(subscriptionId))throw badInput('Invalid subscription event.');
 if(event.event==='subscription.charged'&&!/^pay_[A-Za-z0-9]{1,100}$/.test(event.payload?.payment?.entity?.id||''))throw badInput('Invalid subscription payment event.');
 if(!config.dataEncryptionKey)throw new HttpError(503,'BILLING_INBOX_ENCRYPTION_UNAVAILABLE','Secure webhook storage is not configured. Please retry later.');
 const payloadHash=eventHash(rawBody),encryptedPayload=encrypt({rawBody:rawBody.toString('base64')});
 return {id:randomUUID(),mode,eventId,payloadHash,eventType:event.event,subscriptionId,encryptedPayload};
}
export async function acceptRazorpayWebhook({rawBody,signature,secret,eventId,mode,persist,encrypt=seal,logger=console.info,requestId=null}){
 const row=parseVerifiedWebhook({rawBody,signature,secret,eventId,mode,encrypt});if(row.ignored)return {ignored:true};
 if(typeof persist!=='function')throw new TypeError('A durable webhook persistence operation is required.');
 logger(JSON.stringify({event:'razorpay_webhook_received',requestId,inboxId:row.id,eventId:row.eventId,eventType:row.eventType,mode:row.mode}));
 const stored=await persist(row);return {...stored,eventType:row.eventType,eventId:row.eventId,mode:row.mode};
}
export async function insertWebhookInbox(db,row){
 const inserted=await db.query(`INSERT INTO razorpay_webhook_inbox(id,provider_mode,provider_event_id,payload_hash,event_type,provider_subscription_id,encrypted_payload)
 VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING id`,[row.id,row.mode,row.eventId,row.payloadHash,row.eventType,row.subscriptionId,row.encryptedPayload]);
 if(inserted.rowCount)return {accepted:true,id:inserted.rows[0].id};
 const old=(await db.query(`SELECT id,provider_event_id,payload_hash FROM razorpay_webhook_inbox
 WHERE provider_mode=$1 AND (provider_event_id=$2 OR payload_hash=$3)`,[row.mode,row.eventId,row.payloadHash])).rows;
 if(old.some(item=>item.provider_event_id===row.eventId&&item.payload_hash!==row.payloadHash))throw new HttpError(409,'WEBHOOK_EVENT_CONFLICT','Webhook event reference was reused with different content.');
 const exact=old.find(item=>item.payload_hash===row.payloadHash);if(exact)return {duplicate:true,id:exact.id};
 if(old.length)throw new HttpError(409,'WEBHOOK_EVENT_CONFLICT','Webhook event reference was reused with different content.');
 throw new HttpError(503,'WEBHOOK_DEDUPLICATION_UNAVAILABLE','Webhook was not accepted. Please retry.');
}
export function decodeWebhookPayload(ciphertext,expectedHash){
 const value=unseal(ciphertext);if(!value||typeof value.rawBody!=='string')throw new Error('WEBHOOK_PAYLOAD_INVALID');
 const rawBody=Buffer.from(value.rawBody,'base64');if(eventHash(rawBody)!==expectedHash)throw new Error('WEBHOOK_PAYLOAD_INTEGRITY_FAILED');
 let event;try{event=JSON.parse(rawBody.toString('utf8'));}catch{throw new Error('WEBHOOK_PAYLOAD_INVALID');}
 return {rawBody,event};
}
