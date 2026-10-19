ALTER TABLE automation_rules ADD COLUMN email_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE reminder_preferences ADD COLUMN email_enabled boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX mail_reminder_identity ON mail_jobs(reference_hash) WHERE kind='reminder';
CREATE TABLE service_contracts (
 id uuid PRIMARY KEY,company_id uuid NOT NULL,order_id uuid NOT NULL,contact_id uuid NOT NULL,
 reference text NOT NULL,terms text NOT NULL,start_at date NOT NULL,end_at date NOT NULL,next_visit date,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled')),revision integer NOT NULL DEFAULT 1,
 created_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,reference),FOREIGN KEY(order_id,company_id) REFERENCES business_orders(id,company_id),
 FOREIGN KEY(contact_id,company_id) REFERENCES company_contacts(id,company_id),CHECK(end_at>=start_at),CHECK(next_visit IS NULL OR next_visit BETWEEN start_at AND end_at)
);
CREATE TABLE contract_visits (
 contract_id uuid NOT NULL REFERENCES service_contracts(id),visit_date date NOT NULL,service_id uuid NOT NULL,
 company_id uuid NOT NULL,PRIMARY KEY(contract_id,visit_date),FOREIGN KEY(service_id,company_id) REFERENCES service_requests(id,company_id)
);
ALTER TABLE automation_rules DROP CONSTRAINT automation_rules_kind_check;
ALTER TABLE automation_rules ADD CHECK(kind IN ('followup','quotation','milestone','collection','service','maintenance','renewal'));
ALTER TABLE automation_jobs DROP CONSTRAINT automation_jobs_kind_check;
ALTER TABLE automation_jobs ADD CHECK(kind IN ('followup','quotation','milestone','collection','service','maintenance','renewal'));
ALTER TABLE reminder_preferences DROP CONSTRAINT reminder_preferences_kinds_check;
ALTER TABLE reminder_preferences ADD CHECK(kinds<@ARRAY['followup','quotation','milestone','collection','service','maintenance','renewal']::text[]);
