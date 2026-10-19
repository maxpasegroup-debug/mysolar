-- Bounded private delivery and publishing lookups. Existing tenant predicates remain mandatory.
CREATE INDEX survey_project_history ON site_surveys(company_id,project_id,assessed_on DESC);
CREATE INDEX service_contract_due ON service_contracts(company_id,next_visit) WHERE status='active';
CREATE INDEX service_contract_expiry ON service_contracts(company_id,end_at) WHERE status='active';
CREATE INDEX private_quotation_templates ON quotation_templates(company_id,created_at DESC);
CREATE INDEX import_batch_owner ON import_batches(company_id,user_id,created_at DESC);
CREATE INDEX mail_job_expiry ON mail_jobs(expires_at) WHERE payload IS NOT NULL;
CREATE INDEX operational_events_recent ON operational_events(created_at DESC);
CREATE INDEX white_label_review ON white_label_requests(status,created_at DESC);
CREATE FUNCTION preserve_website_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Saved website versions are immutable'; END $$;
CREATE TRIGGER website_version_immutable BEFORE UPDATE OR DELETE ON website_versions FOR EACH ROW EXECUTE FUNCTION preserve_website_version();
