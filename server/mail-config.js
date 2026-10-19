// Server-only configuration. Never return this object from an HTTP handler.
export function mailSettings(env=process.env){
 const resendHost='smtp.resend.com';
 const resend=Boolean(env.RESEND_API_KEY)&&(!env.SMTP_HOST||env.SMTP_HOST===resendHost)&&(!env.SMTP_USER||env.SMTP_USER==='resend');
 // Never forward a Resend credential to an unrelated configured SMTP host/user.
 const host=env.SMTP_HOST||(resend?resendHost:undefined);
 const user=env.SMTP_USER||(resend?'resend':undefined);
 const password=env.SMTP_PASSWORD||(resend?env.RESEND_API_KEY:undefined);
 const secure=env.SMTP_SECURE===undefined?resend:env.SMTP_SECURE==='true';
 const port=Number(env.SMTP_PORT??(resend?465:587));
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid SMTP_PORT');
 const from=env.MAIL_FROM||'';
 if(/[\r\n]/.test(from))throw Error('Invalid MAIL_FROM');
 return {enabled:Boolean(host&&user&&password&&from),from,smtp:{host,port,secure,requireTLS:!secure,auth:{user,pass:password},connectionTimeout:10000,socketTimeout:15000,greetingTimeout:10000,logger:false,debug:false}};
}
