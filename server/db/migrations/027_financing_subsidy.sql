-- Operational tracking only. No lender, authority or payment-provider integration.
INSERT INTO permissions(id,scope) SELECT p,'company' FROM unnest(ARRAY['funding.read','funding.manage','funding.assigned.read','funding.assigned.update','funding.correct']) p;
INSERT INTO role_permissions(role_id,permission_id) SELECT r,p FROM unnest(ARRAY['owner','accounts']) r CROSS JOIN unnest(ARRAY['funding.read','funding.manage']) p;
INSERT INTO role_permissions(role_id,permission_id) VALUES('owner','funding.correct'),('sales','funding.assigned.read'),('sales','funding.assigned.update');
ALTER TABLE installation_projects ADD UNIQUE(id,contact_id,company_id);
CREATE TABLE funding_applications(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES companies(id),contact_id uuid NOT NULL,project_id uuid,
 kind text NOT NULL CHECK(kind IN ('loan','subsidy')),reference text NOT NULL,institution text NOT NULL,programme text NOT NULL DEFAULT '',application_reference text NOT NULL DEFAULT '',
 requested_paise bigint NOT NULL CHECK(requested_paise>0),approved_paise bigint NOT NULL DEFAULT 0 CHECK(approved_paise>=0),disbursed_paise bigint NOT NULL DEFAULT 0 CHECK(disbursed_paise>=0),
 decision text NOT NULL DEFAULT 'pending' CHECK(decision IN ('pending','approved','rejected')),decision_on date,decision_reference text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'preparing' CHECK(status IN ('preparing','submitted','under_review','more_information','decision_recorded','closed','withdrawn')),
 assignee_id uuid NOT NULL,submitted_on date,follow_up date,next_action text NOT NULL DEFAULT '',notes text NOT NULL DEFAULT '',customer_visible boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),created_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(contact_id,company_id) REFERENCES company_contacts(id,company_id),FOREIGN KEY(project_id,contact_id,company_id) REFERENCES installation_projects(id,contact_id,company_id),
 FOREIGN KEY(company_id,assignee_id) REFERENCES company_memberships(company_id,user_id),UNIQUE(id,company_id),UNIQUE(company_id,reference),
 CHECK(disbursed_paise<=approved_paise AND approved_paise<=requested_paise),
 CHECK((decision='pending' AND approved_paise=0 AND decision_on IS NULL AND decision_reference='') OR (decision IN ('approved','rejected') AND decision_on IS NOT NULL AND decision_reference<>'' AND (decision<>'rejected' OR approved_paise=0) AND (decision<>'approved' OR approved_paise>0))),
 CHECK(status NOT IN ('submitted','under_review','more_information','decision_recorded') OR (submitted_on IS NOT NULL AND application_reference<>'')),
 CHECK(status<>'decision_recorded' OR decision<>'pending')
);
CREATE UNIQUE INDEX funding_external_identity ON funding_applications(company_id,kind,lower(institution),lower(application_reference)) WHERE application_reference<>'';
CREATE INDEX funding_customer ON funding_applications(company_id,contact_id,created_at DESC);
CREATE INDEX funding_project ON funding_applications(company_id,project_id);
CREATE INDEX funding_follow_up ON funding_applications(company_id,assignee_id,follow_up) WHERE status NOT IN ('closed','withdrawn');
CREATE TABLE funding_disbursements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,application_id uuid NOT NULL,amount_paise bigint NOT NULL CHECK(amount_paise<>0),
 external_reference text,posted_on date NOT NULL,recipient text NOT NULL,evidence_reference text NOT NULL,reason text NOT NULL,actor_id uuid NOT NULL REFERENCES users(id),
 reverses_id uuid,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,company_id),UNIQUE(reverses_id),UNIQUE(company_id,external_reference),
 FOREIGN KEY(application_id,company_id) REFERENCES funding_applications(id,company_id),FOREIGN KEY(reverses_id,company_id) REFERENCES funding_disbursements(id,company_id),
 CHECK((amount_paise>0 AND reverses_id IS NULL AND external_reference IS NOT NULL AND external_reference<>'') OR (amount_paise<0 AND reverses_id IS NOT NULL AND external_reference IS NULL))
);
CREATE INDEX funding_disbursement_application ON funding_disbursements(company_id,application_id,created_at,id);
CREATE FUNCTION funding_disbursement_guard() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a funding_applications; source funding_disbursements; BEGIN
 SELECT * INTO a FROM funding_applications WHERE id=NEW.application_id AND company_id=NEW.company_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown application' USING ERRCODE='23503'; END IF;
 IF NEW.reverses_id IS NOT NULL THEN SELECT * INTO source FROM funding_disbursements WHERE id=NEW.reverses_id AND company_id=NEW.company_id;
  IF NOT FOUND OR source.application_id<>NEW.application_id OR source.amount_paise<=0 OR NEW.amount_paise<>-source.amount_paise OR NEW.recipient<>source.recipient THEN RAISE EXCEPTION 'Correction must match the original disbursement' USING ERRCODE='23514'; END IF;
 ELSIF a.decision<>'approved' OR a.status IN ('closed','withdrawn') THEN RAISE EXCEPTION 'Record an approved decision on an open application first' USING ERRCODE='23514'; END IF;
 IF a.disbursed_paise+NEW.amount_paise<0 OR a.disbursed_paise+NEW.amount_paise>a.approved_paise THEN RAISE EXCEPTION 'Disbursement exceeds recorded approval' USING ERRCODE='23514'; END IF;
 UPDATE funding_applications SET disbursed_paise=disbursed_paise+NEW.amount_paise,revision=revision+1 WHERE id=a.id AND company_id=a.company_id;RETURN NEW;END $$;
CREATE TRIGGER funding_disbursement_bounds BEFORE INSERT ON funding_disbursements FOR EACH ROW EXECUTE FUNCTION funding_disbursement_guard();
CREATE TRIGGER funding_disbursement_history BEFORE UPDATE OR DELETE ON funding_disbursements FOR EACH ROW EXECUTE FUNCTION preserve_financial_entry();
CREATE FUNCTION preserve_funding_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain application history' USING ERRCODE='23514'; END IF;
 IF NEW.disbursed_paise IS DISTINCT FROM OLD.disbursed_paise AND pg_trigger_depth()<2 THEN RAISE EXCEPTION 'Disbursement totals come from immutable entries' USING ERRCODE='23514'; END IF;
 IF (NEW.id,NEW.company_id,NEW.contact_id,NEW.kind,NEW.created_by,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.company_id,OLD.contact_id,OLD.kind,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Application identity is immutable' USING ERRCODE='23514'; END IF;RETURN NEW;END $$;
CREATE TRIGGER funding_identity BEFORE UPDATE OR DELETE ON funding_applications FOR EACH ROW EXECUTE FUNCTION preserve_funding_identity();
ALTER TABLE managed_files DROP CONSTRAINT managed_files_record_kind_check,ADD CHECK(record_kind IN ('orders','projects','invoices','service','funding')),ADD CHECK(record_kind<>'funding' OR NOT customer_visible);
