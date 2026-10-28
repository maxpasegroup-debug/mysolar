// Manual quotations have no marketplace customer consent. Their reminders are
// staff-only even if a company rule enables customer reminders for other quotes.
export const quotationReminderCondition=`r.status='sent' AND (
 (r.enquiry_id IS NOT NULL AND EXISTS(SELECT 1 FROM customer_enquiries e WHERE e.id=r.enquiry_id AND e.status NOT IN ('closed','cancelled')))
 OR (r.enquiry_id IS NULL AND r.manual_contact_id IS NOT NULL AND EXISTS(SELECT 1 FROM company_contacts c WHERE c.id=r.manual_contact_id AND c.company_id=r.company_id))
) AND NOT EXISTS(SELECT 1 FROM business_orders o JOIN quotation_versions q ON q.id=o.quotation_id AND q.company_id=o.company_id WHERE o.company_id=r.company_id AND q.quotation_id=r.quotation_id AND o.status<>'cancelled')`;

export function quotationStaffAccess(permissions,row){
 return permissions.includes('quotations.read')&&permissions.includes(row.manual_contact_id?'crm.read':'leads.read');
}
export async function quotationCustomer(db,row){
 if(row.manual_contact_id||!row.enquiry_id)return null;
 return (await db.query('SELECT customer_id AS user_id FROM customer_enquiries WHERE id=$1',[row.enquiry_id])).rows[0]?.user_id||null;
}
