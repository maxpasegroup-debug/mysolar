-- Extend the existing queue; rules stay disabled until explicitly approved.
ALTER TABLE project_milestones ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid(),ADD UNIQUE(id);
ALTER TABLE automation_rules DROP CONSTRAINT automation_rules_kind_check;
ALTER TABLE automation_jobs DROP CONSTRAINT automation_jobs_kind_check;
ALTER TABLE reminder_preferences DROP CONSTRAINT reminder_preferences_kinds_check;
ALTER TABLE automation_rules ADD CHECK(kind IN ('followup','quotation','milestone','collection','service','maintenance','renewal','task','stage','funding','procurement','escalation','resolution'));
ALTER TABLE automation_jobs ADD CHECK(kind IN ('followup','quotation','milestone','collection','service','maintenance','renewal','task','stage','funding','procurement','escalation','resolution'));
ALTER TABLE reminder_preferences ADD CHECK(kinds<@ARRAY['followup','quotation','milestone','collection','service','maintenance','renewal','task','stage','funding','procurement','escalation','resolution']::text[]);
DO $$ DECLARE x record; BEGIN FOR x IN SELECT conname FROM pg_constraint WHERE conrelid='automation_rules'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%lead_days%' AND pg_get_constraintdef(oid) LIKE '%kind%' LOOP EXECUTE format('ALTER TABLE automation_rules DROP CONSTRAINT %I',x.conname);END LOOP;END $$;
ALTER TABLE automation_rules ADD CONSTRAINT automation_advance_days CHECK(kind IN ('quotation','milestone','maintenance','renewal','task','stage','procurement') OR lead_days=0),
 ADD CONSTRAINT automation_private_audiences CHECK(kind NOT IN ('followup','task','stage','funding','procurement','escalation') OR NOT customers);
CREATE INDEX tasks_due_reminders ON business_tasks(company_id,due_date,id) WHERE status NOT IN ('completed','cancelled');
CREATE INDEX stage_due_reminders ON project_milestones(company_id,due_date,id) WHERE status NOT IN ('done','not_applicable');
CREATE INDEX procurement_due_reminders ON purchase_orders(company_id,expected_date,id) WHERE status IN ('approved','partially_received');
CREATE INDEX expenses_reporting ON project_expenses(company_id,posted_on,category,id);
