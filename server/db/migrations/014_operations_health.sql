CREATE TABLE operational_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,code text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX operational_events_time ON operational_events(created_at DESC);
CREATE TABLE operational_incidents (
 code text PRIMARY KEY,active boolean NOT NULL,last_changed_at timestamptz NOT NULL DEFAULT now(),last_alert_at timestamptz
);
ALTER TABLE mail_jobs DROP CONSTRAINT mail_jobs_kind_check;
ALTER TABLE mail_jobs ADD CHECK(kind IN ('verification','recovery','employee','customer','reminder','operations'));
