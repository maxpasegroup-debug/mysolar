-- Durable, opt-in in-app reminders. No external provider or financial execution.
INSERT INTO permissions(id,scope) VALUES('automation.read','company'),('automation.manage','company');
INSERT INTO role_permissions(role_id,permission_id) VALUES('owner','automation.read'),('owner','automation.manage');
CREATE TABLE reminder_preferences (
 user_id uuid PRIMARY KEY REFERENCES users(id),
 enabled boolean NOT NULL DEFAULT true,
 kinds text[] NOT NULL DEFAULT ARRAY['followup','quotation','milestone','collection','service'],
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(kinds<@ARRAY['followup','quotation','milestone','collection','service']::text[])
);
CREATE TABLE automation_rules (
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),
 kind text NOT NULL CHECK(kind IN ('followup','quotation','milestone','collection','service')),
 enabled boolean NOT NULL DEFAULT false,customers boolean NOT NULL DEFAULT false,
 hour_ist integer NOT NULL DEFAULT 10 CHECK(hour_ist BETWEEN 8 AND 18),
 lead_days integer NOT NULL DEFAULT 0 CHECK(lead_days BETWEEN 0 AND 14),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 approved_by uuid REFERENCES users(id),approved_at timestamptz,reason text NOT NULL DEFAULT '',
 last_planned_at timestamptz,cursor_day date,cursor_id uuid,
 UNIQUE(company_id,kind),UNIQUE(id,company_id),
 CHECK(NOT enabled OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND length(reason)>=10)),
 CHECK(kind<>'followup' OR NOT customers),CHECK(kind IN ('quotation','milestone') OR lead_days=0)
);
CREATE TABLE automation_jobs (
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),rule_id uuid NOT NULL,
 rule_revision integer NOT NULL CHECK(rule_revision>0),
 kind text NOT NULL CHECK(kind IN ('followup','quotation','milestone','collection','service')),
 record_id uuid NOT NULL,recipient_id uuid NOT NULL REFERENCES users(id),
 audience text NOT NULL CHECK(audience IN ('staff','customer')),
 occurrence date NOT NULL,source_date date NOT NULL,
 channel text NOT NULL DEFAULT 'in_app' CHECK(channel='in_app'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','retry','delivered','skipped','dead','cancelled')),
 available_at timestamptz NOT NULL,attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 lease_until timestamptz,claim_token uuid,last_error text,
 created_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,
 FOREIGN KEY(rule_id,company_id) REFERENCES automation_rules(id,company_id),
 UNIQUE(company_id,kind,record_id,recipient_id,channel,occurrence),
 CHECK((status='running')=(lease_until IS NOT NULL AND claim_token IS NOT NULL))
);
CREATE INDEX automation_ready ON automation_jobs(available_at,id) WHERE status IN ('pending','retry');
CREATE INDEX automation_abandoned ON automation_jobs(lease_until,id) WHERE status='running';
CREATE INDEX automation_company_history ON automation_jobs(company_id,created_at DESC,id);
CREATE INDEX automation_rules_scan ON automation_rules(last_planned_at NULLS FIRST,id) WHERE enabled;
CREATE TABLE automation_deliveries (
 job_id uuid PRIMARY KEY REFERENCES automation_jobs(id),
 notification_id uuid NOT NULL UNIQUE,channel text NOT NULL CHECK(channel='in_app'),
 delivered_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE automation_attempts (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,job_id uuid NOT NULL REFERENCES automation_jobs(id),
 attempt integer NOT NULL CHECK(attempt BETWEEN 1 AND 5),
 outcome text NOT NULL CHECK(outcome IN ('claimed','delivered','retry','dead','skipped','cancelled','lease_expired')),
 code text NOT NULL CHECK(length(code)<=80),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX automation_attempt_job ON automation_attempts(job_id,id);
CREATE TABLE automation_worker_state (
 worker text PRIMARY KEY CHECK(worker='reminders'),last_started_at timestamptz,last_finished_at timestamptz,
 last_status text NOT NULL CHECK(last_status IN ('running','ok','failed'))
);
