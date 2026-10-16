import express from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { HttpError, errorHandler } from './errors.js';
import { sameOrigin, limit } from './auth/security.js';
import { sessionMiddleware, requireUser } from './auth/sessions.js';
import { auth } from './auth/routes.js';
import { companies, platformAudit } from './tenancy/routes.js';
import { customer } from './customer/routes.js';
import { setup } from './setup/routes.js';
import { invitations } from './setup/invitations.js';
import { platform } from './platform/routes.js';
import { discovery } from './marketplace/public.js';
import { listings } from './marketplace/company.js';
import { catalogueAdmin } from './marketplace/admin.js';
import { purchaseCustomer } from './purchase/customer.js';
import { purchaseCompany } from './purchase/company.js';
import { customerNotifications,companyNotifications } from './purchase/notifications.js';
import { operations } from './operations/read.js';
import { crm } from './operations/crm.js';
import { orders } from './operations/orders.js';
import { warehouse } from './operations/stock.js';
import { delivery } from './operations/delivery.js';
import { finance } from './operations/finance.js';
import { customerOperations } from './operations/customer.js';
import { notificationRoutes } from './operations/notifications.js';
import { customerExperience } from './customer/experience.js';
import { siaRoutes } from './sia/routes.js';
import { commercial,ownerCommercial } from './commercial/routes.js';
const app=express();
app.disable('x-powered-by');
app.set('trust proxy',config.proxyHops);
app.use(helmet({
  strictTransportSecurity:config.production?undefined:false,
  contentSecurityPolicy:{directives:{
    defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:','blob:',...[...new Set([...config.logoHosts,...config.productImageHosts])].map(host=>`https://${host}`)],
    connectSrc:["'self'"],workerSrc:["'self'"],manifestSrc:["'self'"],objectSrc:["'none'"],baseUri:["'none'"],formAction:["'self'"],frameAncestors:["'none'"],
    upgradeInsecureRequests:config.production?[]:null
  }},referrerPolicy:{policy:'no-referrer'}
}));
app.use((req,res,next)=>{req.requestId=randomUUID();res.set('X-Request-ID',req.requestId);next();});
app.use('/api',async(req,res,next)=>{
  res.set('Cache-Control','no-store');
  if(req.get('sec-fetch-site')==='cross-site')throw new HttpError(403,'ORIGIN_REJECTED','Use the application from its configured address.');
  await limit(req,'api-ip',req.ip,240);
  next();
});
app.use(['/api/companies/current/enquiries/:id/quotations','/api/companies/current/quotations/:id','/api/companies/current/operations/orders'],sameOrigin,express.json({limit:'48kb',strict:true}));
app.use('/api',sameOrigin,express.json({limit:'16kb',strict:true}),sessionMiddleware);
app.use('/api',(req,res,next)=>{const expected=req.get('x-account-id');if(expected&&expected!==req.session?.user_id)throw new HttpError(409,'ACCOUNT_CONTEXT_CHANGED','Your signed-in account changed. Refresh before submitting this form.');next();});
app.use('/api/auth',auth);
app.use('/api/platform/commercial',commercial);
app.use('/api/companies/current/subscription',ownerCommercial);
app.use('/api/customer/sia',siaRoutes());
app.use('/api/companies/current/sia',siaRoutes(true));
app.use('/api/customer/experience',customerExperience);
app.use('/api/companies/current/operations',operations,crm,orders,warehouse,delivery,finance,notificationRoutes());
app.use('/api/customer/operations',customerOperations,notificationRoutes(true));
app.use('/api/customer',purchaseCustomer,customerNotifications);
app.use('/api/companies/current',purchaseCompany,companyNotifications);
app.use('/api/public',discovery);
app.use('/api/companies/current',listings);
app.use('/api/platform/catalogue',catalogueAdmin);
app.use('/api/companies/current',setup);
app.use('/api',invitations);
app.use('/api/platform',platform);
app.use('/api/companies',companies);
app.use('/api/customer',customer);
app.get('/api/platform/audit',requireUser,platformAudit);
app.use('/api',(req,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'API route not found.',requestId:req.requestId}}));
// Explicit asset allowlist. Never expose .env, server source, migrations or dependency directories.
const root=new URL('../',import.meta.url);
for(const asset of ['index.html','styles.css','accounts.css','organization.css','marketplace.css','purchase.css','operations.css','experience.css','sia.css','src/sia.js','commercial.css','src/commercial.js','manifest.webmanifest','sw.js','offline.html','offline.css','assets/app-mark.svg','assets/app-192.png','assets/app-512.png','assets/apple-touch-icon.png','src/locale.js','src/journey.js','src/pwa.js','src/experience.js','src/app.js','src/account.js','src/organization.js','src/marketplace.js','src/purchase.js','src/operations.js']) {
  app.get(`/${asset}`,(req,res)=>{res.set('Cache-Control','no-cache');if(asset==='manifest.webmanifest')res.type('application/manifest+json');if(asset==='sw.js')res.set('Service-Worker-Allowed','/');res.sendFile(fileURLToPath(new URL(asset,root)));});
}
app.get('/',(req,res)=>{res.set('Cache-Control','no-cache');res.sendFile(fileURLToPath(new URL('index.html',root)));});
app.use((req,res)=>res.status(404).type('text').send('Page not found.'));
app.use(errorHandler);
const server=app.listen(config.port,'0.0.0.0',()=>console.log(`MY SOLAR listening on port ${config.port}`));
server.requestTimeout=30000;
server.headersTimeout=15000;
async function shutdown() {server.close(async()=>{await pool.end();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
