// Job titles suggest restrictions over existing roles; they never grant privileges.
const standard=['workspace.read','company.read'];
const field=['projects.assigned.read','tasks.own','service.assigned','funding.assigned.read'];
const entries=[
 ['owner_director','Owner / director',null,[],'Owner access uses the existing protected ownership workflow; it cannot be granted with a job title.'],
 ['manager','Operations manager','supervisor',['projects.read','projects.manage','service.read','service.manage','tasks.own','tasks.manage'],'No finance, permission administration or ownership authority.'],
 ['telecaller','Telecaller','sales',['customers.read','crm.read','crm.manage','leads.read','tasks.own'],'Customer contact and lead follow-up only; no quotation approval or financial access.'],
 ['sales','Sales executive','sales',['customers.read','crm.read','crm.manage','leads.read','quotations.read','quotations.manage','orders.read','tasks.own'],'Quotation review and discount policy still apply.'],
 ['site_engineer','Site-visit engineer','field_engineer',field,'Assigned work only; no unrestricted company project data.'],
 ['feasibility_engineer','Feasibility engineer','field_engineer',field,'Assigned project records and existing checklists; no automatic engineering certification.'],
 ['utility_coordinator','Electricity-board coordinator','field_engineer',field,'Internal assigned utility tracking only; no official approval or board integration.'],
 ['installation_engineer','Installation engineer','field_engineer',field,'Existing assigned installation checks and evidence remain mandatory.'],
 ['service_technician','Service technician','field_engineer',['tasks.own','service.assigned'],'Only assigned service requests; no unrestricted company customer records.'],
 ['storekeeper','Storekeeper','inventory_manager',['inventory.read','inventory.manage','procurement.read','tasks.own'],'Stock mutations still require the existing permission, confirmation and stock rules.'],
 ['inventory','Inventory staff','inventory_manager',['inventory.read','tasks.own'],'Read-only stock by default; no adjustment or procurement posting.'],
 ['procurement','Procurement coordinator','inventory_manager',['inventory.read','procurement.read','procurement.manage','tasks.own'],'No supplier payment or financial posting authority.'],
 ['accounts','Accounts staff','accounts',['accounts.read','finance.read','finance.manage','procurement.read','tasks.own'],'Existing financial confirmations, reconciliation and owner-only restrictions remain.'],
 ['hr','HR coordinator (basic access)','supervisor',[],'HR records, attendance and payroll are not implemented in this phase. Basic workspace access only.'],
 ['administrator','Office administrator (basic access)','supervisor',[],'No user status, permission or platform administration authority. Ask the owner for approved responsibilities.'],
 ['auditor','Read-only auditor','auditor',['company.setup.read','members.read','audit.read'],'Team and company audit visibility only. No finance access, mutations or audit sign-off.']
];
export async function workforceTemplates(db){
 const bases=[...new Set(entries.map(x=>x[2]).filter(Boolean))],grants=new Map();
 for(const base of bases)grants.set(base,(await db.query('SELECT permission_id FROM role_permissions WHERE role_id=$1 ORDER BY permission_id',[base])).rows.map(r=>r.permission_id));
 return entries.map(([code,label,baseRole,permissions,limitations])=>({code,label,baseRole,available:Boolean(baseRole&&grants.get(baseRole)?.length),permissions:baseRole?[...new Set([...standard,...permissions])].filter(p=>grants.get(baseRole).includes(p)):[],limitations}));
}
