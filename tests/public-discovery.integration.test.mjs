import test from 'node:test';
import assert from 'node:assert/strict';
import {connectedFixture} from './helpers/connected-fixture.mjs';
test('published clean URLs and reviewed PIN-to-region coverage',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,a,b,customer,companyA,product,base}=await connectedFixture(t);await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[TEST] postal source reviewer')",[a.user.id]);
 assert.equal((await b.request('/platform/locations/import','POST',{rows:[{pin:'673014',state:'Kerala',district:'Kozhikode'}],source:'[TEST] fixture source',reason:'[TEST] reviewed fixture only'})).status,403);
 assert.equal((await a.request('/platform/locations/import','POST',{rows:[{pin:'673014',state:'Kerala',district:'Kozhikode'}],source:'[TEST] fixture source',reason:'[TEST] reviewed fixture only'})).status,200);
 await db.query("DELETE FROM company_service_areas WHERE company_id=$1",[companyA]);await db.query("INSERT INTO company_service_areas(id,company_id,scope,label,state,state_key,district,district_key) VALUES(gen_random_uuid(),$1,'district','[TEST] Kozhikode','Kerala','kerala','Kozhikode','kozhikode')",[companyA]);
 const providers=await customer.request('/public/vendors?pin=673014');assert.equal(providers.status,200);assert.ok(providers.data.items.some(x=>x.id===companyA));
 assert.equal((await customer.request('/public/locations/999999')).data.location,null);
 for(const path of ['/catalogue','/companies','/products/'+product,'/companies/'+companyA,'/solar-basics','/support','/sitemap.xml','/robots.txt']){const r=await fetch(base+path);assert.equal(r.status,200,path);const text=await r.text();assert.ok(!text.includes('PRIVATE-OFFER-COST'));if(path==='/sitemap.xml')assert.ok(text.includes('/products/'+product));}
 await db.query('UPDATE companies SET storefront_published=false WHERE id=$1',[companyA]);assert.equal((await fetch(base+'/companies/'+companyA)).status,404);const sitemap=await (await fetch(base+'/sitemap.xml')).text();assert.ok(!sitemap.includes('/companies/'+companyA));assert.equal((await fetch(base+'/privacy')).headers.get('x-robots-tag'),'noindex, nofollow');
});
