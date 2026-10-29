import * as v from '../validation.js';
import {badInput} from '../errors.js';

// Job titles are planning labels, never permission grants or additional owners.
export const setupCatalogue = {
 products:[['solar_panels','Solar panels'],['inverters','Inverters'],['batteries','Batteries'],['complete_systems','Complete solar systems'],['water_heaters','Solar water heaters'],['mounting','Mounting structures'],['accessories','Cables & accessories'],['pumps','Solar pumps'],['installation','Installation & EPC'],['maintenance','Maintenance & service']],
 departments:[
  {name:'Leadership & management',roles:[['director','Managing director','supervisor'],['operations_manager','Operations manager','supervisor']]},
  {name:'Sales & customer care',roles:[['sales_manager','Sales manager','sales'],['sales_executive','Sales executive','sales'],['telecaller','Telecaller','sales'],['customer_care','Customer care executive','sales']]},
  {name:'Projects & field work',roles:[['project_manager','Project manager','supervisor'],['supervisor','Site supervisor','supervisor'],['engineer','Field engineer','field_engineer'],['technician','Installation technician','field_engineer']]},
  {name:'Stock & purchasing',roles:[['warehouse','Warehouse / stock manager','inventory_manager']]},
  {name:'Finance & review',roles:[['accountant','Accountant','accounts'],['auditor','Read-only auditor','auditor']]}
 ],
 notice:'These are planned positions. Titles do not grant access. Invite each employee using an existing role, reviewed permissions and plan capacity. Selecting positions does not start background automations.'
};
export function validateSetupPlan(value){
 v.body(value,['website','emergencyContact','whatsapp','products','otherProducts','team']);
 const website=v.text(value.website,'website',500,0);
 if(website){let url;try{url=new URL(website);}catch{throw badInput('Enter a complete HTTPS website address.');}if(url.protocol!=='https:'||url.username||url.password)throw badInput('Use an HTTPS website without embedded credentials.');}
 const emergencyContact=v.phone(value.emergencyContact),whatsapp=v.phone(value.whatsapp);
 if(!emergencyContact||!whatsapp)throw badInput('Enter emergency and WhatsApp contact numbers.');
 if(!Array.isArray(value.products)||value.products.length>setupCatalogue.products.length||new Set(value.products).size!==value.products.length||value.products.some(x=>!setupCatalogue.products.some(([id])=>id===x)))throw badInput('Choose products from the list.');
 const otherProducts=v.description(value.otherProducts);
 if(!value.products.length&&!otherProducts)throw badInput('Choose at least one product or describe your other products.');
 const roles=setupCatalogue.departments.flatMap(d=>d.roles.map(([id])=>id));
 if(!Array.isArray(value.team)||value.team.length>roles.length)throw badInput('Review the planned team.');
 const seen=new Set();let total=0;
 const team=value.team.map(item=>{v.body(item,['role','count']);if(!roles.includes(item.role)||seen.has(item.role)||!Number.isSafeInteger(item.count)||item.count<1||item.count>100)throw badInput('Choose each job once with 1 to 100 planned positions.');seen.add(item.role);total+=item.count;return {role:item.role,count:item.count};});
 if(total>250)throw badInput('Plan up to 250 positions here. Contact support for a larger organisation.');
 return {website,emergencyContact,whatsapp,products:[...value.products].sort(),otherProducts,team:team.sort((a,b)=>a.role.localeCompare(b.role))};
}
export async function saveSetupPlan(db,companyId,userId,plan){
 await db.query(`INSERT INTO company_workspace_plans(company_id,plan,updated_by) VALUES($1,$2,$3) ON CONFLICT(company_id) DO UPDATE SET plan=excluded.plan,updated_by=excluded.updated_by,updated_at=now()`,[companyId,plan,userId]);
 await db.query('UPDATE company_profiles SET website=$1 WHERE company_id=$2',[plan.website,companyId]);
}
// Only call from an authorised owner view. Contacts remain in the private editor.
export async function workspaceBlueprint(db,companyId){
 const row=(await db.query("SELECT plan->'products' AS products,plan->'team' AS team FROM company_workspace_plans WHERE company_id=$1",[companyId])).rows[0];
 return row?{products:row.products,team:row.team}:null;
}
