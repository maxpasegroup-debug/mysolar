-- A manual lead is not a marketplace enquiry or a registered customer account.
ALTER TABLE crm_leads ADD CONSTRAINT crm_lead_contact_identity UNIQUE(id,company_id,contact_id);
ALTER TABLE enquiry_quotations ALTER COLUMN enquiry_id DROP NOT NULL;
ALTER TABLE enquiry_quotations ADD COLUMN manual_contact_id uuid;
ALTER TABLE enquiry_quotations ADD COLUMN manual_lead_id uuid;
ALTER TABLE enquiry_quotations ADD CONSTRAINT quotation_thread_channel CHECK (
 (enquiry_id IS NOT NULL AND manual_contact_id IS NULL AND manual_lead_id IS NULL) OR
 (enquiry_id IS NULL AND manual_contact_id IS NOT NULL AND manual_lead_id IS NOT NULL));
ALTER TABLE enquiry_quotations ADD CONSTRAINT manual_thread_lead FOREIGN KEY(manual_lead_id,company_id,manual_contact_id) REFERENCES crm_leads(id,company_id,contact_id);
ALTER TABLE enquiry_quotations ADD CONSTRAINT manual_thread_identity UNIQUE(id,company_id,manual_contact_id,manual_lead_id);
CREATE UNIQUE INDEX manual_quotation_lead ON enquiry_quotations(company_id,manual_lead_id) WHERE manual_lead_id IS NOT NULL;
ALTER TABLE quotation_versions ALTER COLUMN enquiry_id DROP NOT NULL;
ALTER TABLE quotation_versions ADD COLUMN manual_contact_id uuid;
ALTER TABLE quotation_versions ADD CONSTRAINT quotation_version_channel CHECK (
 (enquiry_id IS NOT NULL AND manual_contact_id IS NULL) OR
 (enquiry_id IS NULL AND manual_contact_id IS NOT NULL AND source_lead_id IS NOT NULL));
ALTER TABLE quotation_versions ADD CONSTRAINT manual_version_thread FOREIGN KEY(quotation_id,company_id,manual_contact_id,source_lead_id) REFERENCES enquiry_quotations(id,company_id,manual_contact_id,manual_lead_id);
ALTER TABLE workflow_notifications ALTER COLUMN enquiry_id DROP NOT NULL;
ALTER TABLE workflow_notifications ADD CONSTRAINT notification_quotation_context CHECK(enquiry_id IS NOT NULL OR (version_id IS NOT NULL AND company_id IS NOT NULL));
ALTER TABLE workflow_notifications ADD CONSTRAINT notification_version_company FOREIGN KEY(version_id,company_id) REFERENCES quotation_versions(id,company_id);
