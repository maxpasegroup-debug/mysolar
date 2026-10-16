import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../src/journey.js',import.meta.url),'utf8'),locale=await readFile(new URL('../src/locale.js',import.meta.url),'utf8');
function journey(hash){const window={addEventListener(){}},location={hash};vm.runInNewContext(source,{window,location,URLSearchParams});return window.Journey;}
test('journey: customer context survives auth return without automatic submission',()=>{const j=journey('#/customer/enquiry/new?productId=abc');assert.equal(j.destination(),'/customer/enquiry/new?productId=abc');assert.match(j.authPath('/register'),/next=/);});
test('journey: external redirects, credentials and demo return flags are rejected or stripped',()=>{const j=journey('#/');for(const value of ['https://evil.invalid','//evil.invalid','/customer/dashboard?token=secret','/customer/dashboard#x'])assert.equal(j.safe(value),null);assert.equal(j.safe('/customer/orders?demo=1'),'/customer/orders');});
test('journey: switching signed-in users clears pending customer intent',()=>{const j=journey('#/customer/orders');j.sessionChanged({user:{id:'a'}},{user:{id:'b'}});assert.equal(j.destination(),null);});
test('locale: Malayalam/Tamil navigation has English fallback and exact money display',()=>{const window={};vm.runInNewContext(locale,{window,Intl,BigInt});assert.notEqual(window.I18n.text('Overview','ml'),'Overview');assert.notEqual(window.I18n.text('Overview','ta'),'Overview');assert.equal(window.I18n.text('Untranslated warranty terms','ml'),'Untranslated warranty terms');assert.equal(window.I18n.money('123456789'),'₹12,34,567.89');});
