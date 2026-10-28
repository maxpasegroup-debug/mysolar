// Shared owner KPI/list definition. One latest usable version per live thread.
// The fixed SQL alias is internal; no user-supplied identifier is interpolated.
export const activeQuotationSql=`q.status IN ('draft','sent')
 AND q.valid_until>=(now() AT TIME ZONE 'Asia/Kolkata')::date
 AND NOT EXISTS(SELECT 1 FROM customer_enquiries ce WHERE ce.id=q.enquiry_id AND ce.status IN ('cancelled','closed'))
 AND NOT EXISTS(SELECT 1 FROM business_orders o JOIN quotation_versions source ON source.id=o.quotation_id AND source.company_id=o.company_id WHERE o.company_id=q.company_id AND source.quotation_id=q.quotation_id AND o.status<>'cancelled')
 AND NOT EXISTS(SELECT 1 FROM quotation_versions newer WHERE newer.company_id=q.company_id AND newer.quotation_id=q.quotation_id AND newer.version>q.version AND newer.status IN ('draft','sent') AND newer.valid_until>=(now() AT TIME ZONE 'Asia/Kolkata')::date)`;
