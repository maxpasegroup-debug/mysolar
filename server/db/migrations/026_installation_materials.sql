-- Location identity retains each existing warehouse-labelled stock row and balance.
CREATE TABLE stock_locations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES companies(id),name text NOT NULL,active boolean NOT NULL DEFAULT true,UNIQUE(id,company_id),UNIQUE(company_id,name));
INSERT INTO stock_locations(company_id,name) SELECT DISTINCT company_id,warehouse FROM inventory_items;
ALTER TABLE inventory_items ADD COLUMN location_id uuid,ADD FOREIGN KEY(location_id,company_id) REFERENCES stock_locations(id,company_id);
UPDATE inventory_items i SET location_id=l.id FROM stock_locations l WHERE l.company_id=i.company_id AND l.name=i.warehouse;
ALTER TABLE inventory_items ALTER COLUMN location_id SET NOT NULL;
CREATE FUNCTION resolve_stock_location() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='UPDATE' AND (NEW.warehouse,NEW.location_id,NEW.company_id) IS DISTINCT FROM (OLD.warehouse,OLD.location_id,OLD.company_id) THEN RAISE EXCEPTION 'Transfer stock instead of rewriting its location' USING ERRCODE='23514'; END IF;
 IF NEW.location_id IS NULL THEN INSERT INTO stock_locations(company_id,name) VALUES(NEW.company_id,NEW.warehouse) ON CONFLICT(company_id,name) DO NOTHING;SELECT id INTO NEW.location_id FROM stock_locations WHERE company_id=NEW.company_id AND name=NEW.warehouse AND active;END IF;
 IF NOT EXISTS(SELECT 1 FROM stock_locations WHERE id=NEW.location_id AND company_id=NEW.company_id AND name=NEW.warehouse AND active) THEN RAISE EXCEPTION 'Use an active matching stock location' USING ERRCODE='23514'; END IF;RETURN NEW;END $$;
CREATE TRIGGER stock_location_identity BEFORE INSERT OR UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION resolve_stock_location();
CREATE TABLE project_installation_controls(
 project_id uuid PRIMARY KEY,company_id uuid NOT NULL,legacy_closed boolean NOT NULL DEFAULT false,
 reviewed_survey_id uuid REFERENCES site_surveys(id),survey_reference text NOT NULL DEFAULT '',
 window_start date,window_end date,schedule_reference text NOT NULL DEFAULT '',
 materials_mode text NOT NULL DEFAULT 'pending' CHECK(materials_mode IN ('pending','stock','external','none')),materials_reference text NOT NULL DEFAULT '',
 readiness_fingerprint text,approved_by uuid REFERENCES users(id),approved_at timestamptz,
 FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id),CHECK(window_start IS NULL OR window_end IS NULL OR window_start<=window_end)
);
CREATE TABLE installation_checks(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,project_id uuid NOT NULL,code text NOT NULL,title text NOT NULL,
 category text NOT NULL CHECK(category IN ('safety','technical','commissioning','handover')),required boolean NOT NULL DEFAULT true,core boolean NOT NULL DEFAULT false,
 outcome text NOT NULL DEFAULT 'pending' CHECK(outcome IN ('pending','pass','fail','not_applicable')),evidence_reference text NOT NULL DEFAULT '',notes text NOT NULL DEFAULT '',
 recorded_by uuid REFERENCES users(id),recorded_at timestamptz,FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id),UNIQUE(project_id,code),UNIQUE(id,company_id)
);
CREATE FUNCTION initialize_installation_controls() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 INSERT INTO project_installation_controls(project_id,company_id,legacy_closed) VALUES(NEW.id,NEW.company_id,NEW.status IN ('completed','cancelled'));
 INSERT INTO installation_checks(company_id,project_id,code,title,category,core) SELECT NEW.company_id,NEW.id,x.code,x.title,x.category,true FROM (VALUES
 ('site_access','Site access and work area reviewed','safety'),('isolation','Electrical isolation procedure recorded','safety'),('height_work','Work-at-height arrangements reviewed','safety'),
 ('design_review','Approved design and equipment compatibility reference','technical'),('earthing','Earthing and electrical protection inspection reference','technical'),
 ('test_record','Commissioning and test results recorded','commissioning'),('handover_documents','Handover documents and equipment records provided','handover'),('customer_orientation','Customer operation guidance and acknowledgement recorded','handover')) x(code,title,category);
 RETURN NEW;END $$;
CREATE TRIGGER installation_controls_new AFTER INSERT ON installation_projects FOR EACH ROW EXECUTE FUNCTION initialize_installation_controls();
INSERT INTO project_installation_controls(project_id,company_id,legacy_closed) SELECT id,company_id,status IN ('completed','cancelled') FROM installation_projects;
INSERT INTO installation_checks(company_id,project_id,code,title,category,core) SELECT p.id_company,p.id,x.code,x.title,x.category,true FROM (SELECT id,company_id AS id_company FROM installation_projects) p CROSS JOIN (VALUES
 ('site_access','Site access and work area reviewed','safety'),('isolation','Electrical isolation procedure recorded','safety'),('height_work','Work-at-height arrangements reviewed','safety'),('design_review','Approved design and equipment compatibility reference','technical'),('earthing','Earthing and electrical protection inspection reference','technical'),('test_record','Commissioning and test results recorded','commissioning'),('handover_documents','Handover documents and equipment records provided','handover'),('customer_orientation','Customer operation guidance and acknowledgement recorded','handover')) x(code,title,category);
CREATE TABLE project_materials(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,project_id uuid NOT NULL,item_id uuid NOT NULL,required_milli bigint NOT NULL CHECK(required_milli>0),reference text NOT NULL,
 FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id),FOREIGN KEY(item_id,company_id) REFERENCES inventory_items(id,company_id),UNIQUE(project_id,item_id),UNIQUE(id,company_id));
ALTER TABLE inventory_reservations ALTER COLUMN order_id DROP NOT NULL,ALTER COLUMN order_item_id DROP NOT NULL,
 ADD COLUMN project_id uuid,ADD COLUMN material_id uuid,ADD FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id),ADD FOREIGN KEY(material_id,company_id) REFERENCES project_materials(id,company_id),
 ADD CHECK((order_id IS NOT NULL AND order_item_id IS NOT NULL) OR (project_id IS NOT NULL AND material_id IS NOT NULL));
UPDATE inventory_reservations r SET project_id=p.id FROM installation_projects p WHERE p.company_id=r.company_id AND p.order_id=r.order_id;
ALTER TABLE inventory_movements DROP CONSTRAINT inventory_movements_kind_check;
ALTER TABLE inventory_movements ADD CHECK(kind IN ('opening','adjustment','receipt','reserve','release','consume','transfer_in','transfer_out','project_return','supplier_return')),
 ADD COLUMN project_id uuid,ADD COLUMN source_movement_id uuid,ADD COLUMN cost_paise bigint,ADD COLUMN cost_reference text NOT NULL DEFAULT '',ADD COLUMN purchase_line_id uuid,
 ADD UNIQUE(id,company_id),ADD FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id),ADD FOREIGN KEY(source_movement_id,company_id) REFERENCES inventory_movements(id,company_id),ADD FOREIGN KEY(purchase_line_id,company_id) REFERENCES purchase_order_items(id,company_id);
UPDATE inventory_movements m SET project_id=r.project_id FROM inventory_reservations r WHERE m.company_id=r.company_id AND m.reservation_id=r.id AND m.kind='consume';
CREATE TABLE inventory_cost_lots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,item_id uuid NOT NULL,movement_id uuid,
 quantity_milli bigint NOT NULL CHECK(quantity_milli>0),remaining_milli bigint NOT NULL CHECK(remaining_milli>=0),remaining_cost_paise bigint CHECK(remaining_cost_paise>=0),cost_reference text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(item_id,company_id) REFERENCES inventory_items(id,company_id),FOREIGN KEY(movement_id,company_id) REFERENCES inventory_movements(id,company_id),UNIQUE(id,company_id));
-- No historical purchase cost is inferred from unrelated supplier prices.
INSERT INTO inventory_cost_lots(company_id,item_id,quantity_milli,remaining_milli,cost_reference) SELECT company_id,item_id,sum(on_hand_delta),sum(on_hand_delta),'Legacy stock: cost unknown' FROM inventory_movements GROUP BY company_id,item_id HAVING sum(on_hand_delta)>0;
CREATE TABLE stock_issue_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,movement_id uuid NOT NULL,lot_id uuid NOT NULL,quantity_milli bigint NOT NULL CHECK(quantity_milli>0),cost_paise bigint CHECK(cost_paise>=0),
 FOREIGN KEY(movement_id,company_id) REFERENCES inventory_movements(id,company_id),FOREIGN KEY(lot_id,company_id) REFERENCES inventory_cost_lots(id,company_id),UNIQUE(id,company_id));
CREATE TABLE stock_return_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,movement_id uuid NOT NULL,issue_allocation_id uuid NOT NULL,quantity_milli bigint NOT NULL CHECK(quantity_milli>0),cost_paise bigint CHECK(cost_paise>=0),
 FOREIGN KEY(movement_id,company_id) REFERENCES inventory_movements(id,company_id),FOREIGN KEY(issue_allocation_id,company_id) REFERENCES stock_issue_allocations(id,company_id));
CREATE TABLE utility_progress(project_id uuid NOT NULL,company_id uuid NOT NULL,step text NOT NULL CHECK(step IN ('application','utility_inspection','net_meter','energisation')),
 status text NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','pending','submitted','approved','rejected','completed','not_applicable')),recorded_on date,reference text NOT NULL DEFAULT '',notes text NOT NULL DEFAULT '',customer_visible boolean NOT NULL DEFAULT false,recorded_by uuid REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(project_id,step),FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id));
CREATE INDEX material_project ON project_materials(company_id,project_id);
CREATE INDEX lots_fifo ON inventory_cost_lots(company_id,item_id,created_at,id) WHERE remaining_milli>0;
CREATE INDEX allocation_movement ON stock_issue_allocations(company_id,movement_id);
CREATE INDEX return_allocation ON stock_return_allocations(company_id,issue_allocation_id);
CREATE INDEX movement_project ON inventory_movements(company_id,project_id);
CREATE INDEX checks_project ON installation_checks(company_id,project_id);
CREATE TRIGGER preserve_stock_movement BEFORE UPDATE OR DELETE ON inventory_movements FOR EACH ROW EXECUTE FUNCTION preserve_financial_entry();
CREATE TRIGGER preserve_stock_issue BEFORE UPDATE OR DELETE ON stock_issue_allocations FOR EACH ROW EXECUTE FUNCTION preserve_financial_entry();
CREATE TRIGGER preserve_stock_return BEFORE UPDATE OR DELETE ON stock_return_allocations FOR EACH ROW EXECUTE FUNCTION preserve_financial_entry();
ALTER TABLE project_materials ADD COLUMN active boolean NOT NULL DEFAULT true,ADD UNIQUE(id,project_id,item_id,company_id);
ALTER TABLE inventory_reservations ADD FOREIGN KEY(material_id,project_id,item_id,company_id) REFERENCES project_materials(id,project_id,item_id,company_id);
ALTER TABLE inventory_cost_lots ADD CHECK(remaining_milli<=quantity_milli);
-- Historical consumed stock can be returned with its known quantity and unknown cost.
INSERT INTO inventory_cost_lots(company_id,item_id,movement_id,quantity_milli,remaining_milli,cost_reference)
 SELECT company_id,item_id,id,-on_hand_delta,0,'Legacy consumption: cost unknown' FROM inventory_movements WHERE kind='consume' AND on_hand_delta<0;
INSERT INTO stock_issue_allocations(company_id,movement_id,lot_id,quantity_milli)
 SELECT m.company_id,m.id,l.id,-m.on_hand_delta FROM inventory_movements m JOIN inventory_cost_lots l ON l.movement_id=m.id AND l.company_id=m.company_id WHERE m.kind='consume' AND m.on_hand_delta<0;
-- Cost-centre assignment corrections retain bill terms and are audited by the finance service.
CREATE OR REPLACE FUNCTION preserve_bill_terms() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Supplier bill history must be retained' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-'project_id') IS DISTINCT FROM (to_jsonb(OLD)-'project_id') THEN RAISE EXCEPTION 'Posted bill terms are immutable' USING ERRCODE='23514'; END IF;RETURN NEW;END $$;
CREATE TRIGGER preserve_survey BEFORE UPDATE OR DELETE ON site_surveys FOR EACH ROW EXECUTE FUNCTION preserve_financial_entry();
ALTER TABLE inventory_cost_lots ADD COLUMN purchase_line_id uuid,ADD FOREIGN KEY(purchase_line_id,company_id) REFERENCES purchase_order_items(id,company_id),ADD COLUMN received_sequence bigint GENERATED ALWAYS AS IDENTITY;
CREATE INDEX lot_sequence ON inventory_cost_lots(company_id,item_id,received_sequence) WHERE remaining_milli>0;

-- Bind reviewed observations to the same project and company at the database boundary.
ALTER TABLE site_surveys ADD UNIQUE(id,project_id,company_id);
ALTER TABLE project_installation_controls DROP CONSTRAINT project_installation_controls_reviewed_survey_id_fkey,ADD FOREIGN KEY(reviewed_survey_id,project_id,company_id) REFERENCES site_surveys(id,project_id,company_id);

-- Resolve immutable pre-project order issues through the order's unique company project.
CREATE VIEW project_stock_movements AS SELECT m.*,coalesce(m.project_id,p.id) AS resolved_project_id FROM inventory_movements m LEFT JOIN inventory_reservations r ON r.id=m.reservation_id AND r.company_id=m.company_id LEFT JOIN installation_projects p ON p.order_id=r.order_id AND p.company_id=r.company_id;
