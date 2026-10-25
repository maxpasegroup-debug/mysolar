import test from 'node:test';
import assert from 'node:assert/strict';
import {unitEnvironment} from './helpers/env.mjs';
unitEnvironment();const {mailFailureCode}=await import('../server/mail-queue.js');
test('mail diagnostics retain safe categories instead of SMTP credentials or private text',()=>{
 for(const [error,expected] of [[{code:'EAUTH'},'SMTP_AUTH_REJECTED'],[{responseCode:535},'SMTP_AUTH_REJECTED'],[{code:'ETIMEDOUT'},'SMTP_TIMEOUT'],[{code:'ECONNREFUSED'},'SMTP_CONNECTION_FAILED'],[{code:'EENVELOPE',command:'MAIL FROM'},'SMTP_SENDER_REJECTED'],[{code:'EENVELOPE',command:'RCPT TO'},'SMTP_RECIPIENT_REJECTED'],[{responseCode:451},'SMTP_TEMPORARY_REJECTION'],[{responseCode:550},'SMTP_PERMANENT_REJECTION'],[{message:'PRIVATE-ADDRESS-OTP-KEY'},'DELIVERY_FAILED']])assert.equal(mailFailureCode(error),expected);
 assert.equal(mailFailureCode({message:'PRIVATE-DECRYPTION-ERROR'},'decrypt'),'MAIL_PAYLOAD_UNREADABLE');
});
