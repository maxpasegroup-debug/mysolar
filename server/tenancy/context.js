import { transaction } from '../db/pool.js';
import { lockedUser } from '../auth/sessions.js';
import { permissionsFor } from '../permissions.js';
import { HttpError } from '../errors.js';
import { guard as commercialGuard } from '../commercial/policy.js';
// All private company repositories MUST run inside this callback. Never accept a browser tenant ID.
export async function withCompany(req, permission, work) {
  return transaction(async db => {
    const user = await lockedUser(db,req);
    if (!user.active_company_id) throw new HttpError(409,'COMPANY_REQUIRED','Choose a company to continue.');
    if (req.get('x-company-id') !== user.active_company_id) throw new HttpError(409,'COMPANY_CONTEXT_CHANGED','Your active company changed. Refresh this view before continuing.');
    const membership = await db.query(`SELECT m.id,m.role_id,c.id AS company_id,c.status,c.lifecycle FROM company_memberships m
      JOIN companies c ON c.id=m.company_id WHERE m.user_id=$1 AND m.company_id=$2
      AND m.status='active' AND (c.status='active' OR m.role_id='owner') FOR SHARE OF m FOR UPDATE OF c`,[user.id,user.active_company_id]);
    if (!membership.rowCount) throw new HttpError(403,'COMPANY_ACCESS_DENIED','You no longer have access to the selected company.');
    const permissions = await permissionsFor(db,membership.rows[0].role_id);
    if (!permissions.includes(permission)) throw new HttpError(403,'PERMISSION_DENIED','Your company role does not allow this action.');
    const company=membership.rows[0];
    const readOnly=['company.read','company.setup.read','company.brand.read','members.read','audit.read','workspace.read','offers.read','subscription.read','domains.read'];
    if(company.status==='suspended'&&!readOnly.includes(permission))throw new HttpError(403,'COMPANY_SUSPENDED','This company is suspended. Only read-only setup access is available to its owner.');
    const context = Object.freeze({ userId:user.id, companyId:user.active_company_id, membershipId:company.id, role:company.role_id, lifecycle:company.lifecycle, permissions:Object.freeze(permissions) });
    await commercialGuard(db,context,req,permission);
    return work(db,context);
  });
}
