// Read-only home context. Caller supplies the authenticated user and existing permissions.
export async function customerHome(db,user,permissions){
 const allowed=p=>permissions.includes(p),checks=[];
 if(allowed('customer.enquiries.own'))checks.push('EXISTS(SELECT 1 FROM customer_enquiries WHERE customer_id=$1)');
 if(allowed('customer.quotations.own'))checks.push("EXISTS(SELECT 1 FROM quotation_versions q JOIN customer_enquiries e ON e.id=q.enquiry_id WHERE e.customer_id=$1 AND q.status<>'draft')");
 if(allowed('customer.orders.own'))for(const table of ['business_orders','customer_invoices','service_requests'])checks.push(`EXISTS(SELECT 1 FROM ${table} r JOIN company_contacts c ON c.id=r.contact_id AND c.company_id=r.company_id WHERE c.user_id=$1 ${table==='service_requests'?'':"AND r.status<>'draft'"})`);
 if(allowed('customer.installation.own'))checks.push('EXISTS(SELECT 1 FROM installation_projects r JOIN company_contacts c ON c.id=r.contact_id AND c.company_id=r.company_id WHERE c.user_id=$1)');
 const hasRecords=checks.length?(await db.query(`SELECT (${checks.join(' OR ')}) AS present`,[user.id])).rows[0].present:false;
 let enquiry=null;
 if(allowed('customer.enquiries.own')){
  enquiry=(await db.query("SELECT e.id,e.title,e.status,e.created_at,e.updated_at,(SELECT count(*)::int FROM enquiry_recipients r WHERE r.enquiry_id=e.id) AS recipient_count FROM customer_enquiries e WHERE e.customer_id=$1 ORDER BY (e.status IN ('closed','cancelled')),e.updated_at DESC,e.id LIMIT 1",[user.id])).rows[0]||null;
  if(enquiry&&allowed('customer.quotations.own')){
   // Same latest-issued-version rule as the existing comparison endpoint; drafts never count.
   enquiry.quotation_count=(await db.query("SELECT count(*)::int AS count FROM quotation_versions q JOIN customer_enquiries e ON e.id=q.enquiry_id WHERE e.id=$1 AND e.customer_id=$2 AND q.status<>'draft' AND NOT EXISTS(SELECT 1 FROM quotation_versions n WHERE n.quotation_id=q.quotation_id AND n.version>q.version AND n.status<>'draft')",[enquiry.id,user.id])).rows[0].count;
   const progress=(await db.query("SELECT min(q.sent_at) AS received_at,bool_or(q.viewed_at IS NOT NULL) AS has_viewed FROM quotation_versions q JOIN customer_enquiries e ON e.id=q.enquiry_id WHERE e.id=$1 AND e.customer_id=$2 AND q.status<>'draft'",[enquiry.id,user.id])).rows[0];
   enquiry.received_at=progress.received_at;enquiry.has_viewed=Boolean(progress.has_viewed);
  }
 }
 return {state:hasRecords?'existing':'new',enquiry,asOf:new Date().toISOString()};
}
