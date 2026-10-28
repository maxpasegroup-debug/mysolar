// Called with the server-derived current company context, never browser claims.
// Saved notification ownership is necessary but not sufficient after role changes.
export function companyNotificationScope(ctx,companyParameter){
 const quote=ctx.permissions.includes('quotations.read')?`(n.version_id IS NOT NULL AND EXISTS(SELECT 1 FROM quotation_versions q WHERE q.id=n.version_id AND q.company_id=${companyParameter}))`:'false';
 const enquiry=ctx.permissions.includes('leads.read')?`(n.version_id IS NULL AND n.enquiry_id IS NOT NULL AND EXISTS(SELECT 1 FROM enquiry_recipients er WHERE er.enquiry_id=n.enquiry_id AND er.company_id=${companyParameter}))`:'false';
 return `(${quote} OR ${enquiry})`;
}
