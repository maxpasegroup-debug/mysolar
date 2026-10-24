// Immutable Phase 2 catalogue (checksum retained). Phase 3 permission extensions are in migration 003.
// Requests always read authoritative database grants, including later permission migrations.
export const roleDefinitions = Object.freeze({
  platform_admin: { scope: 'platform', label: 'Platform Administrator', permissions: ['platform.audit.read'] },
  owner: { scope: 'company', label: 'Distributor Owner', permissions: ['workspace.read','company.read','company.manage','members.read','members.manage','audit.read','leads.read','quotations.read','projects.read','inventory.read','accounts.read','service.read','sia.read'] },
  sales: { scope: 'company', label: 'Sales', permissions: ['workspace.read','company.read','leads.read','quotations.read'] },
  supervisor: { scope: 'company', label: 'Supervisor', permissions: ['workspace.read','company.read','projects.read','service.read'] },
  field_engineer: { scope: 'company', label: 'Field Engineer', permissions: ['workspace.read','company.read','projects.assigned.read'] },
  inventory_manager: { scope: 'company', label: 'Inventory Manager', permissions: ['workspace.read','company.read','inventory.read'] },
  accounts: { scope: 'company', label: 'Accounts', permissions: ['workspace.read','company.read','accounts.read'] },
  customer: { scope: 'customer', label: 'Customer', permissions: ['customer.profile','customer.enquiries.own','customer.quotations.own','customer.orders.own','customer.installation.own'] }
});
export const staffRoles = [...Object.keys(roleDefinitions).filter(key => roleDefinitions[key].scope === 'company' && key !== 'owner'),'part_time_sales'];
export const modulePermissions = Object.freeze({ leads: 'leads.read', quotations: 'quotations.read', projects: 'projects.read', inventory: 'inventory.read', accounts: 'accounts.read', service: 'service.read', sia: 'sia.read' });
export async function permissionsFor(db, role) {
  const result = await db.query('SELECT permission_id FROM role_permissions WHERE role_id = $1 ORDER BY permission_id', [role]);
  return result.rows.map(row => row.permission_id);
}
// A company profile can only restrict the immutable base role; owner/platform grants
// are never obtained through a company profile. Re-evaluate on every protected request.
export async function companyPermissions(db,role,companyId,userId){
 const baseline=await permissionsFor(db,role);
 if(role==='owner')return baseline;
 const member=(await db.query('SELECT m.role_profile_id,p.base_role,p.permissions,p.active FROM company_memberships m LEFT JOIN company_role_profiles p ON p.id=m.role_profile_id AND p.company_id=m.company_id WHERE m.company_id=$1 AND m.user_id=$2',[companyId,userId])).rows[0];
 if(!member)return [];
 if(!member.role_profile_id)return baseline;
 if(!member.active||member.base_role!==role)return baseline.filter(p=>['workspace.read','company.read'].includes(p));
 const granted=baseline.filter(p=>member.permissions.includes(p)||['workspace.read','company.read'].includes(p));
 if(granted.includes('quotations.read')&&member.permissions.includes('quotations.approve'))granted.push('quotations.approve');
 return [...new Set(granted)];
}
