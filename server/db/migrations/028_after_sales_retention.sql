-- Preserve old closures as historical, never manufacture customer acceptance.
ALTER TABLE service_requests ADD COLUMN resolution_cycle integer NOT NULL DEFAULT 0 CHECK(resolution_cycle>=0),
 ADD COLUMN closure_basis text NOT NULL DEFAULT 'none' CHECK(closure_basis IN ('none','legacy','customer_confirmed','administrative_exception')),
 ADD COLUMN escalation_level integer NOT NULL DEFAULT 0 CHECK(escalation_level BETWEEN 0 AND 3),
 ADD COLUMN escalation_reason text NOT NULL DEFAULT '',ADD COLUMN escalation_due date;
UPDATE service_requests SET closure_basis='legacy' WHERE status='closed';
CREATE TABLE service_resolutions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,service_id uuid NOT NULL,cycle integer NOT NULL CHECK(cycle>0),
 summary text NOT NULL CHECK(length(btrim(summary)) BETWEEN 1 AND 500),evidence_reference text NOT NULL CHECK(length(btrim(evidence_reference)) BETWEEN 1 AND 200),
 actor_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,company_id),UNIQUE(service_id,cycle),FOREIGN KEY(service_id,company_id) REFERENCES service_requests(id,company_id)
);
CREATE TABLE service_feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,resolution_id uuid NOT NULL,service_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id),accepted boolean NOT NULL,rating integer CHECK(rating BETWEEN 1 AND 5),
 comment text NOT NULL CHECK(length(comment)<=500),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(resolution_id),
 FOREIGN KEY(resolution_id,company_id) REFERENCES service_resolutions(id,company_id),FOREIGN KEY(service_id,company_id) REFERENCES service_requests(id,company_id)
);
CREATE TABLE service_retention_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,service_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('communication','maintenance','warranty')),recorded_on date NOT NULL,
 details jsonb NOT NULL CHECK(jsonb_typeof(details)='object'),customer_visible boolean NOT NULL DEFAULT false,
 actor_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(service_id,company_id) REFERENCES service_requests(id,company_id)
);
CREATE INDEX service_retention_history ON service_retention_records(company_id,service_id,created_at DESC,id);
CREATE INDEX service_confirmation_work ON service_requests(company_id,assignee_id,follow_up) WHERE status<>'closed';
CREATE INDEX service_escalations ON service_requests(company_id,escalation_due) WHERE escalation_level>0 AND status<>'closed';
CREATE FUNCTION preserve_service_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Service history is append only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER service_resolution_history BEFORE UPDATE OR DELETE ON service_resolutions FOR EACH ROW EXECUTE FUNCTION preserve_service_history();
CREATE TRIGGER service_feedback_history BEFORE UPDATE OR DELETE ON service_feedback FOR EACH ROW EXECUTE FUNCTION preserve_service_history();
CREATE TRIGGER service_retention_history BEFORE UPDATE OR DELETE ON service_retention_records FOR EACH ROW EXECUTE FUNCTION preserve_service_history();
CREATE FUNCTION service_feedback_relationship() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM service_resolutions r JOIN service_requests s ON s.id=r.service_id AND s.company_id=r.company_id
 JOIN company_contacts c ON c.id=s.contact_id AND c.company_id=s.company_id
 WHERE r.id=NEW.resolution_id AND r.company_id=NEW.company_id AND r.service_id=NEW.service_id AND c.user_id=NEW.actor_id)
 THEN RAISE EXCEPTION 'Feedback must belong to this customer and resolution' USING ERRCODE='23503';END IF;RETURN NEW;END $$;
CREATE TRIGGER service_feedback_scope BEFORE INSERT ON service_feedback FOR EACH ROW EXECUTE FUNCTION service_feedback_relationship();
ALTER TABLE equipment_assets ADD UNIQUE(id,company_id);
ALTER TABLE service_retention_records ADD COLUMN equipment_id uuid,
 ADD FOREIGN KEY(equipment_id,company_id) REFERENCES equipment_assets(id,company_id),
 ADD CHECK((kind='warranty')=(equipment_id IS NOT NULL));
CREATE FUNCTION service_equipment_scope() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.kind='warranty' AND NOT EXISTS(SELECT 1 FROM equipment_assets e JOIN service_requests s ON s.order_id=e.order_id AND s.company_id=e.company_id
 WHERE s.id=NEW.service_id AND s.company_id=NEW.company_id AND e.id=NEW.equipment_id AND NEW.details->>'equipmentId'=e.id::text)
 THEN RAISE EXCEPTION 'Equipment must belong to the service order' USING ERRCODE='23503';END IF;RETURN NEW;END $$;
CREATE TRIGGER service_equipment_relationship BEFORE INSERT ON service_retention_records FOR EACH ROW EXECUTE FUNCTION service_equipment_scope();
