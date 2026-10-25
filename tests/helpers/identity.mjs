import {randomUUID} from 'node:crypto';
// Explicit disposable-database fixture only. Never called by application code.
export async function seedIdentity(db,{name,email,password,accountType='business'}){
 const {hashPassword}=await import('../../server/auth/security.js');const id=randomUUID();
 await db.query('INSERT INTO users(id,email,display_name,password_hash,account_type) VALUES($1,$2,$3,$4,$5)',[id,email,name,await hashPassword(password),accountType]);await db.query('INSERT INTO customer_profiles(user_id) VALUES($1)',[id]);return id;
}
export function mockSignupMail(t,nodemailer){const messages=[];t.mock.method(nodemailer,'createTransport',()=>({async sendMail(message){messages.push(message);return {accepted:[message.to]};}}));Object.assign(process.env,{SMTP_HOST:'127.0.0.1',SMTP_USER:'fictional',SMTP_PASSWORD:'fictional',MAIL_FROM:'fixture@example.invalid'});return messages;}
export async function verifiedRegister(client,body,db,messages){
 const request=await client.request('/auth/register','POST',body);if(request.status!==202)return request;
 const job=(await db.query('SELECT id FROM mail_jobs WHERE reference_hash=$1',[request.data.challenge])).rows[0];if(!job)throw Error('Signup did not queue an email');const {mailTick}=await import('../../server/mail-queue.js');
 for(let n=0;n<40;n++){await mailTick();const mail=messages.find(m=>m.messageId==='<'+job.id+'@mysolar.solutions>');if(mail){const otp=mail.text.match(/\b[0-9]{8}\b/)[0];return client.request('/auth/register/confirm','POST',{challenge:request.data.challenge,otp});}}
 throw Error('Mocked signup email was not processed');
}
