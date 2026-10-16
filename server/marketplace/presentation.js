import { config } from '../config.js';
const defaults={primary:'#601c2b',secondary:'#292b29',accent:'#d8ab55'};
function luminance(hex){const channels=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];}
function color(value,fallback,dark=false){if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value)||dark&&1.05/(luminance(value)+.05)<4.5)return fallback;return value.toLowerCase();}
export function publicLogo(value){if(typeof value!=='string'||value.length>500)return '';try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&config.logoHosts.includes(u.hostname)&&/\.(png|jpe?g|webp)$/i.test(u.pathname)?u.href:'';}catch{return '';}}
export function publicBrand(value){const primary=color(value.primary_color,defaults.primary,true),secondary=color(value.secondary_color,defaults.secondary,true),accent=color(value.accent_color,defaults.accent);return {...value,name:typeof value.name==='string'&&value.name.trim()?value.name:'Solar distributor',logo_url:publicLogo(value.logo_url),primary_color:primary,secondary_color:secondary,accent_color:accent,accent_text:luminance(accent)>.179?'#171916':'#ffffff',appearance:value.appearance==='clean'?'clean':'warm',canonical_path:value.id?'/storefront/'+value.id:null,custom_domains_connected:false};}
export async function customerBrand(db,record,kind){
 const live=(await db.query('SELECT id,name,logo_url,primary_color,secondary_color,accent_color,public_email,public_phone,appearance FROM marketplace_vendors WHERE id=$1',[record.company_id])).rows[0];if(live)return {...publicBrand(live),storefront_available:true};
 let saved=kind==='orders'?record.terms?.quote?.issuer_snapshot:kind==='invoices'?record.snapshot?.terms?.quote?.issuer_snapshot:null;
 if(!saved&&record.order_id)saved=(await db.query('SELECT terms FROM business_orders WHERE id=$1 AND company_id=$2 AND contact_id=$3',[record.order_id,record.company_id,record.contact_id])).rows[0]?.terms?.quote?.issuer_snapshot;
 const company=(await db.query('SELECT name FROM companies WHERE id=$1',[record.company_id])).rows[0];return {...publicBrand({name:saved?.name||company?.name||'Your distributor',public_email:saved?.public_email||'',public_phone:saved?.public_phone||''}),storefront_available:false};
}
