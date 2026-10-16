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
export const staffRoles = Object.keys(roleDefinitions).filter(key => roleDefinitions[key].scope === 'company' && key !== 'owner');
export const modulePermissions = Object.freeze({ leads: 'leads.read', quotations: 'quotations.read', projects: 'projects.read', inventory: 'inventory.read', accounts: 'accounts.read', service: 'service.read', sia: 'sia.read' });
export async function permissionsFor(db, role) {
  const result = await db.query('SELECT permission_id FROM role_permissions WHERE role_id = $1 ORDER BY permission_id', [role]);
  return result.rows.map(row => row.permission_id);
}
