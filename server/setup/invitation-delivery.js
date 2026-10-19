import {transaction} from '../db/pool.js';
import {digest} from '../auth/security.js';
import {enqueueMail} from '../mail-queue.js';
import {config} from '../config.js';
import {mailTransport} from '../mail.js';
import {HttpError} from '../errors.js';
import * as v from '../validation.js';

export function deliveryChoice(value) {
 const delivery=v.choice(value??'share',['share','email'],'invitation delivery');
 if(delivery==='email'&&(!mailTransport||!config.dataEncryptionKey))throw new HttpError(503,'INVITATIONS_UNAVAILABLE','Automatic email is not configured. Choose a private link and share it through WhatsApp or your email app.');
 return delivery;
}
export function invitationUrl(token,kind='employee') {
 return `${config.origin}/#/invitation?kind=${kind}&token=${encodeURIComponent(token)}`;
}
export async function deliverInvitation({delivery,email,companyName,companyId,contactId,url,kind='employee'}) {
 if(delivery==='email')await transaction(db=>enqueueMail(db,{kind:kind==='customer'?'customer':'employee',companyId,email,referenceHash:digest(new URLSearchParams(new URL(url).hash.split('?')[1]).get('token')),expiresAt:new Date(Date.now()+48*3600000),subject:`Your MY Solar Solutions ${kind==='customer'?'customer':'team'} invitation`,text:`${companyName} has invited you to MY Solar Solutions. Sign in or create your own account using ${email}, then accept this private invitation within 48 hours:\n\n${url}\n\nChoose your own password. If you did not expect this invitation, ignore it.`}));
 return {message:delivery==='email'?'Invitation email queued. A running mail worker is required; delivery is not confirmed.':'Private invitation created. Share it only with the named recipient. No message has been sent.',...(delivery==='share'?{shareUrl:url,recipient:email,companyName,companyId,kind,...(contactId?{contactId}:{})}:{})};
}
