import test from 'node:test';
import assert from 'node:assert/strict';
import {mailSettings} from '../server/mail-config.js';

test('Resend key configures encrypted SMTP without a second secret variable',()=>{
 const m=mailSettings({RESEND_API_KEY:'fictional-key',MAIL_FROM:'staging@example.invalid'});
 assert.equal(m.enabled,true);assert.equal(m.smtp.host,'smtp.resend.com');assert.equal(m.smtp.port,465);assert.equal(m.smtp.secure,true);assert.equal(m.smtp.auth.user,'resend');assert.equal(m.smtp.auth.pass,'fictional-key');assert.equal(m.smtp.logger,false);assert.equal(m.smtp.debug,false);
});
test('missing sender or credentials never creates a simulated working mail transport',()=>{
 for(const env of [{},{RESEND_API_KEY:'fictional-key'},{MAIL_FROM:'staging@example.invalid'},{SMTP_HOST:'smtp.resend.com',SMTP_USER:'resend',MAIL_FROM:'staging@example.invalid'}])assert.equal(mailSettings(env).enabled,false);
});
test('explicit SMTP configuration retains precedence and STARTTLS protections',()=>{
 const m=mailSettings({SMTP_HOST:'smtp.example.invalid',SMTP_PORT:'587',SMTP_USER:'operator',SMTP_PASSWORD:'fictional-smtp',SMTP_SECURE:'false',RESEND_API_KEY:'fictional-resend',MAIL_FROM:'staging@example.invalid'});
 assert.equal(m.enabled,true);assert.equal(m.smtp.auth.pass,'fictional-smtp');assert.equal(m.smtp.requireTLS,true);assert.equal(m.smtp.secure,false);
});
test('Resend key is never sent to another SMTP host or user',()=>{
 for(const override of [{SMTP_HOST:'smtp.example.invalid'},{SMTP_USER:'another-user'}]){const m=mailSettings({RESEND_API_KEY:'fictional-key',MAIL_FROM:'staging@example.invalid',...override});assert.equal(m.enabled,false);assert.equal(m.smtp.auth.pass,undefined);}
});
test('configuration rejects invalid ports and sender header injection',()=>{
 for(const port of ['0','65536','invalid'])assert.throws(()=>mailSettings({SMTP_PORT:port}));
 assert.throws(()=>mailSettings({MAIL_FROM:'sender@example.invalid\r\nBcc: other@example.invalid'}));
});
