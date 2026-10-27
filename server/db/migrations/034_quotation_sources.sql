-- Add provenance only; do not invent historical catalogue, seller or lead facts.
ALTER TABLE crm_leads ADD CONSTRAINT crm_lead_enquiry_identity UNIQUE(id,company_id,enquiry_id);
ALTER TABLE quotation_versions ADD COLUMN source_lead_id uuid;
ALTER TABLE quotation_versions ADD CONSTRAINT quotation_source_lead_tenant FOREIGN KEY(source_lead_id,company_id,enquiry_id) REFERENCES crm_leads(id,company_id,enquiry_id);
ALTER TABLE distributor_offers ADD CONSTRAINT offer_product_tenant_identity UNIQUE(id,company_id,product_id);
ALTER TABLE quotation_line_items ADD COLUMN company_id uuid;
UPDATE quotation_line_items i SET company_id=q.company_id FROM quotation_versions q WHERE q.id=i.version_id;
ALTER TABLE quotation_line_items ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE quotation_line_items ADD CONSTRAINT quotation_line_tenant FOREIGN KEY(version_id,company_id) REFERENCES quotation_versions(id,company_id);
ALTER TABLE quotation_line_items ADD COLUMN offer_id uuid;
ALTER TABLE quotation_line_items ADD COLUMN offer_revision integer;
ALTER TABLE quotation_line_items ADD COLUMN product_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(product_snapshot)='object');
ALTER TABLE quotation_line_items ADD COLUMN offer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(offer_snapshot)='object');
ALTER TABLE quotation_line_items ADD CONSTRAINT quotation_offer_tenant FOREIGN KEY(offer_id,company_id,product_id) REFERENCES distributor_offers(id,company_id,product_id);
ALTER TABLE quotation_line_items ADD CONSTRAINT quotation_offer_reference CHECK((offer_id IS NULL AND offer_revision IS NULL) OR (offer_id IS NOT NULL AND product_id IS NOT NULL AND offer_revision IS NOT NULL AND offer_revision>0));
CREATE INDEX quotation_source_lead_idx ON quotation_versions(company_id,source_lead_id) WHERE source_lead_id IS NOT NULL;
CREATE INDEX quotation_line_offer_idx ON quotation_line_items(company_id,offer_id) WHERE offer_id IS NOT NULL;
