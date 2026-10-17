import {config} from '../config.js';
import {mailTransport} from '../mail.js';
import {HttpError} from '../errors.js';
import * as v from '../validation.js';

export function deliveryChoice(value) {
 const delivery=v.choice(value??'share',['share','email'],'invitation delivery');
 if(delivery==='email'&&!mailTransport)throw new HttpError(503,'INVITATIONS_UNAVAILABLE','Automatic email is not configured. Choose a private link and share it through WhatsApp or your email app.');
 return delivery;
}
export function invitationUrl(token,kind='employee') {
 return `${config.origin}/#/invitation?kind=${kind}&token=${encodeURIComponent(token)}`;
}
export async function deliverInvitation({delivery,email,companyName,companyId,contactId,url,kind='employee'}) {
 if(delivery==='email')await mailTransport.sendMail({from:config.mailFrom,to:email,subject:`Your MY Solar Solutions ${kind==='customer'?'customer':'team'} invitation`,text:`${companyName} has invited you to MY Solar Solutions. Sign in or create your own account using ${email}, then accept this private invitation within 48 hours:\n\n${url}\n\nChoose your own password. If you did not expect this invitation, ignore it.`});
 return {message:delivery==='email'?'The email service accepted the invitation. Delivery is not guaranteed.':'Private invitation created. Share it only with the named recipient. No message has been sent.',...(delivery==='share'?{shareUrl:url,recipient:email,companyName,companyId,kind,...(contactId?{contactId}:{})}:{})};
}
