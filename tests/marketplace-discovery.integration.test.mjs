import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {connectedFixture} from './helpers/connected-fixture.mjs';

test('discovery migration upgrades taxonomy without changing category IDs or activation',{skip:!process.env.TEST_DATABASE_URL},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db,{through:'021_mobile_pin.sql'});
 const before=(await db.query('SELECT id,slug,revision FROM catalogue_categories ORDER BY id')).rows;
 await db.query("UPDATE catalogue_categories SET active=false WHERE slug='inverters'");
 await env.applyMigrations(db);const sql=await readFile(new URL('../server/db/migrations/022_marketplace_discovery.sql',import.meta.url),'utf8');
 await db.query(sql);await env.applyMigrations(db);
 const categories=(await db.query('SELECT * FROM catalogue_categories')).rows;
 assert.equal(categories.filter(c=>c.discovery_key).length,8);assert.equal(new Set(categories.map(c=>c.slug)).size,categories.length);
 for(const old of before){const actual=categories.find(c=>c.id===old.id);assert.equal(actual.slug,old.slug);assert.equal(actual.revision,old.revision);}
 assert.equal(categories.find(c=>c.slug==='inverters').active,false);
 assert.equal(categories.find(c=>c.slug==='solar-lighting').discovery_category_id,categories.find(c=>c.discovery_key==='lighting-pumps').id);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM catalogue_products')).rows[0].n,0);
});

test('marketplace discovery uses eligible offers, real prices and customer-owned location',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,a,b,customer,stranger,companyA,companyB,product}=await connectedFixture(t);
 await t.test('eight active managed categories and no private fields',async()=>{
  const r=await customer.request('/public/products');assert.equal(r.status,200);assert.equal(r.data.categories.filter(c=>c.discovery_key).length,8);
  const p=r.data.items.find(p=>p.id===product);assert.equal(p.offer_count,2);assert.equal(p.offer_previews.length,2);assert.equal(p.offer_previews[0].price_paise,null);
  assert.ok(!JSON.stringify(r.data).includes('PRIVATE-OFFER-COST'));
  assert.equal((await customer.request('/public/products?availability=invalid')).status,400);
 });
 await t.test('search, category, prices and seller availability match recorded values',async()=>{
  await db.query("UPDATE distributor_offers SET price_mode='price_available',price_paise=1234500,tax_mode='exclusive',availability='in_stock' WHERE company_id=$1 AND product_id=$2",[companyA,product]);
  let r=await customer.request('/public/products?search=equipment&price=price_available&availability=in_stock&sellers=available');
  assert.equal(r.status,200);assert.equal(r.data.items.length,1);assert.equal(r.data.items[0].offer_count,1);assert.equal(r.data.items[0].offer_previews[0].price_paise,1234500);assert.equal(r.data.items[0].offer_previews[0].tax_mode,'exclusive');
  assert.equal((await customer.request('/public/products?search=nonexistent')).data.total,0);
  const category=(await db.query("SELECT id FROM catalogue_categories WHERE discovery_key='storage'")).rows[0].id;
  assert.equal((await customer.request('/public/products?category='+category)).data.total,0);
 });
 await t.test('coverage is exact or reviewed-region based, and preview counts use the same scope',async()=>{
  await db.query("UPDATE company_service_areas SET pin='673014' WHERE company_id=$1",[companyB]);
  const r=await customer.request('/public/products?pin=673014');assert.equal(r.data.locationFiltered,true);assert.equal(r.data.items[0].offer_count,1);assert.equal(r.data.items[0].offer_previews[0].company_id,companyB);
  assert.equal((await customer.request('/public/products?pin=999999')).data.total,0);
  assert.equal((await customer.request('/public/products?pin=123')).status,400);
 });
 await t.test('saved location is private and does not alter public discovery responses',async()=>{
  assert.equal((await customer.request('/customer/experience/marketplace-context')).data.location.pin,'682001');
  assert.equal((await stranger.request('/customer/experience/marketplace-context')).data.location,null);
  assert.ok(!(await customer.request('/public/products')).data.location);
 });
 await t.test('legacy lighting products remain discoverable through the managed lighting/pump group',async()=>{
  const categories=(await db.query("SELECT id,slug,discovery_key FROM catalogue_categories WHERE slug IN ('solar-lighting','solar-pumps','solar-panels')")).rows;
  const group=categories.find(c=>c.discovery_key==='lighting-pumps').id,lighting=categories.find(c=>c.slug==='solar-lighting').id,panels=categories.find(c=>c.slug==='solar-panels').id;
  await db.query('UPDATE catalogue_products SET category_id=$1 WHERE id=$2',[lighting,product]);
  assert.equal((await customer.request('/public/products?category='+group)).data.items[0].id,product);
  await db.query('UPDATE catalogue_categories SET active=false WHERE id=$1',[group]);
  assert.equal((await customer.request('/public/products?category='+group)).data.total,0);
  await db.query('UPDATE catalogue_categories SET active=true WHERE id=$1',[group]);
  await db.query('UPDATE catalogue_products SET category_id=$1 WHERE id=$2',[panels,product]);
 });
 await t.test('category descriptions, ordering and language metadata remain operator-only and validated',async()=>{
  const body={revision:1,name:'[TEST] Subcategory',slug:'test-subcategory',parentId:null,kind:'product',schema:{},active:true,description:'[TEST] Supplied description',displayOrder:12,localizedNames:{ml:'[TEST] Localized label'},localizedDescriptions:{hi:'[TEST] Localized description'}};
  assert.equal((await b.request('/platform/catalogue/categories','POST',body)).status,403);
  await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[TEST] category metadata operator')",[a.user.id]);
  const created=await a.request('/platform/catalogue/categories','POST',body);assert.equal(created.status,201,JSON.stringify(created.data));
  const row=(await customer.request('/public/categories')).data.categories.find(c=>c.id===created.data.id);assert.equal(row.display_order,12);assert.equal(row.localized_names.ml,body.localizedNames.ml);
  assert.equal((await a.request('/platform/catalogue/categories','POST',{...body,slug:'invalid-language',localizedNames:{unsupported:'No'}})).status,400);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM catalogue_categories WHERE slug='invalid-language'")).rows[0].n,0);
 });
 await t.test('publication, inactive categories and cross-company update guards remain in force',async()=>{
  const offer=(await db.query('SELECT id FROM distributor_offers WHERE company_id=$1 AND product_id=$2',[companyA,product])).rows[0].id;
  assert.equal((await b.request('/companies/current/offers/'+offer)).status,404);
  const payload={revision:1,productId:product,sku:'',priceMode:'request_quote',pricePaise:null,currency:'INR',priceUnit:'unit',estimated:false,taxMode:'unknown',taxRate:null,availability:'unknown',stockMaintained:false,stockQuantity:null,minimumOrder:null,coverage:[],terms:'',termsConfirmed:false,privateNotes:''};
  assert.equal((await b.request('/companies/current/offers/'+offer,'PUT',payload)).status,404);
  assert.equal((await customer.request('/platform/catalogue/categories')).status,403);
  await db.query('UPDATE companies SET storefront_published=false WHERE id=$1',[companyB]);
  assert.equal((await customer.request('/public/products')).data.items[0].offer_count,1);
  await db.query('UPDATE catalogue_categories SET active=false WHERE id=(SELECT category_id FROM catalogue_products WHERE id=$1)',[product]);
  assert.equal((await customer.request('/public/products')).data.items.length,0);
 });
});
