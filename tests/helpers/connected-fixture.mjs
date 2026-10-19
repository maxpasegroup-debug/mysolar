import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedApp} from './isolated-app.mjs';
export async function connectedFixture(t){
 const fixture=await isolatedApp(t);await fixture.applyMigrations(fixture.db);await fixture.start();
 const {db}=fixture,a=fixture.client(),b=fixture.client(),customer=fixture.client(),stranger=fixture.client();
 for(const [client,name] of [[a,'journey-owner-a'],[b,'journey-owner-b'],[customer,'journey-customer'],[stranger,'journey-stranger']])await client.register(name);
 const companyA=await a.createCompany('journey-company-a'),companyB=await b.createCompany('journey-company-b'),product=randomUUID(),category='10000000-0000-4000-8000-000000000001';
 for(const [company,owner] of [[companyA,a],[companyB,b]]){
  await db.query("UPDATE company_branding SET description='[TEST] published solar company',public_email='fixture@example.invalid' WHERE company_id=$1",[company]);
  await db.query("UPDATE companies SET marketplace_status='approved',storefront_published=true WHERE id=$1",[company]);
  await db.query("INSERT INTO company_reviews(company_id,actor_user_id,kind,previous_state,new_state,reason,revision) VALUES($1,$2,'marketplace','pending','approved','[TEST] isolated fixture approval',1)",[company,owner.user.id]);
  await db.query("INSERT INTO company_service_areas(id,company_id,scope,label,state,district,pin,state_key,district_key) VALUES($1,$2,'pin','[TEST] PIN','Kerala','Ernakulam','682001','kerala','ernakulam')",[randomUUID(),company]);
 }
 await db.query("INSERT INTO catalogue_products(id,category_id,name,unit,schema_revision,created_by,published_by,published_at,status,public_visible) VALUES($1,$2,'[TEST] solar equipment','unit',1,$3,$3,now(),'published',true)",[product,category,a.user.id]);
 for(const [company,owner] of [[companyA,a],[companyB,b]])await db.query("INSERT INTO distributor_offers(id,company_id,product_id,price_mode,price_unit,private_notes,status,published,approved_revision,approved_product_revision,reviewed_by,reviewed_at,created_by) VALUES($1,$2,$3,'request_quote','unit','PRIVATE-OFFER-COST','approved',true,1,1,$4,now(),$4)",[randomUUID(),company,product,owner.user.id]);
 const payload={title:'[TEST] Connected solar request',requestedItem:'[TEST] equipment and installation',categoryId:category,productId:product,offerId:null,quantity:'1',unit:'unit',projectType:'rooftop_home',state:'Kerala',district:'Ernakulam',pin:'682001',locality:'',address:'[TEST] site',requirements:'',contactMethod:'in_app',timeframe:'',mode:'multiple',service:'',companyIds:[companyA,companyB],submissionKey:randomUUID()};
 const enquiry=await customer.request('/customer/enquiries','POST',payload);assert.equal(enquiry.status,201,JSON.stringify(enquiry.data));const enquiryId=enquiry.data.id;
 const validity=new Date(Date.now()+7*86400000).toISOString().slice(0,10),quote=revision=>({revision,reference:'TEST-JOURNEY-QUOTE',validUntil:validity,taxMode:'exclusive',items:[{productId:product,description:'[TEST] supplied equipment',brand:'[TEST]',model:'Fixture',specifications:'Fixture only',quantity:'1',unit:'unit',unitPrice:'100',discount:'0',taxRate:'18'}],delivery:'0',installation:'0',chargesTaxRate:'0',included:'[TEST] equipment and recorded installation',excluded:'[TEST] additional civil work',warranty:'[TEST] supplied terms',timeframe:'[TEST] subject to agreed schedule',paymentTerms:'[TEST] agreed separately',assumptions:'[TEST] no engineering suitability assumed',installationScope:'[TEST] equipment and installation',estimated:false});
 const draft=await a.request('/companies/current/enquiries/'+enquiryId+'/quotations','POST',quote(1));assert.equal(draft.status,201);
 assert.equal((await customer.request('/customer/experience/exports/quotations/'+draft.data.id)).status,404);
 assert.equal((await a.request('/companies/current/quotations/'+draft.data.id+'/actions','POST',{revision:1,action:'send'})).status,200);
 return {...fixture,a,b,customer,stranger,companyA,companyB,product,enquiryId,quote};
}
