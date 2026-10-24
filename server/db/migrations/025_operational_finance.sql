-- Operational subledgers: integer paise, explicit source links and append-only posted entries.
ALTER TABLE customer_invoices DROP CONSTRAINT customer_invoices_company_id_order_id_key;
CREATE INDEX invoices_order ON customer_invoices(company_id,order_id,status);
ALTER TABLE supplier_bills ADD COLUMN project_id uuid,
 ADD FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id);
CREATE TABLE order_advances (
 id uuid PRIMARY KEY,company_id uuid NOT NULL,order_id uuid NOT NULL,amount_paise bigint NOT NULL CHECK(amount_paise<>0),
 method text NOT NULL CHECK(method IN ('cash','bank_transfer','cheque','other','reversal')),
 external_reference text NOT NULL DEFAULT '',posted_on date NOT NULL,reason text NOT NULL,actor_id uuid NOT NULL REFERENCES users(id),
 reverses_id uuid,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,company_id),UNIQUE(reverses_id),
 FOREIGN KEY(order_id,company_id) REFERENCES business_orders(id,company_id),
 FOREIGN KEY(reverses_id,company_id) REFERENCES order_advances(id,company_id),
 CHECK((amount_paise>0 AND reverses_id IS NULL AND method<>'reversal') OR (amount_paise<0 AND reverses_id IS NOT NULL AND method='reversal'))
);
ALTER TABLE customer_collections ADD COLUMN advance_id uuid,
 ADD FOREIGN KEY(advance_id,company_id) REFERENCES order_advances(id,company_id);
ALTER TABLE customer_collections DROP CONSTRAINT customer_collections_method_check;
ALTER TABLE customer_collections ADD CHECK(method IN ('cash','bank_transfer','cheque','other','reversal','advance')),
 ADD CHECK((method='advance')=(advance_id IS NOT NULL AND reverses_id IS NULL) OR (method='reversal' AND advance_id IS NOT NULL));
CREATE TABLE invoice_credit_notes (
 id uuid PRIMARY KEY,company_id uuid NOT NULL,invoice_id uuid NOT NULL,reference text NOT NULL,
 amount_paise bigint NOT NULL CHECK(amount_paise<>0),posted_on date NOT NULL,reason text NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id),reverses_id uuid,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,company_id),UNIQUE(company_id,reference),UNIQUE(reverses_id),
 FOREIGN KEY(invoice_id,company_id) REFERENCES customer_invoices(id,company_id),
 FOREIGN KEY(reverses_id,company_id) REFERENCES invoice_credit_notes(id,company_id),
 CHECK((amount_paise>0 AND reverses_id IS NULL) OR (amount_paise<0 AND reverses_id IS NOT NULL))
);
CREATE TABLE customer_refunds (
 id uuid PRIMARY KEY,company_id uuid NOT NULL,invoice_id uuid,advance_id uuid,amount_paise bigint NOT NULL CHECK(amount_paise<>0),
 method text NOT NULL CHECK(method IN ('cash','bank_transfer','cheque','other','reversal')),external_reference text NOT NULL DEFAULT '',
 posted_on date NOT NULL,reason text NOT NULL,actor_id uuid NOT NULL REFERENCES users(id),reverses_id uuid,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,company_id),UNIQUE(reverses_id),CHECK(num_nonnulls(invoice_id,advance_id)=1),
 FOREIGN KEY(invoice_id,company_id) REFERENCES customer_invoices(id,company_id),
 FOREIGN KEY(advance_id,company_id) REFERENCES order_advances(id,company_id),
 FOREIGN KEY(reverses_id,company_id) REFERENCES customer_refunds(id,company_id),
 CHECK((amount_paise>0 AND reverses_id IS NULL AND method<>'reversal') OR (amount_paise<0 AND reverses_id IS NOT NULL AND method='reversal'))
);
CREATE TABLE project_expenses (
 id uuid PRIMARY KEY,company_id uuid NOT NULL,project_id uuid NOT NULL,category text NOT NULL,
 amount_paise bigint NOT NULL CHECK(amount_paise<>0),tax_paise bigint,evidence_reference text NOT NULL,
 external_reference text NOT NULL,posted_on date NOT NULL,reason text NOT NULL,actor_id uuid NOT NULL REFERENCES users(id),reverses_id uuid,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,company_id),UNIQUE(reverses_id),FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id),
 FOREIGN KEY(reverses_id,company_id) REFERENCES project_expenses(id,company_id),
 CHECK((amount_paise>0 AND reverses_id IS NULL AND (tax_paise IS NULL OR tax_paise BETWEEN 0 AND amount_paise)) OR (amount_paise<0 AND reverses_id IS NOT NULL AND (tax_paise IS NULL OR tax_paise BETWEEN amount_paise AND 0)))
);
CREATE TABLE supplier_payments (
 id uuid PRIMARY KEY,company_id uuid NOT NULL,bill_id uuid NOT NULL,amount_paise bigint NOT NULL CHECK(amount_paise<>0),
 method text NOT NULL CHECK(method IN ('cash','bank_transfer','cheque','other','reversal')),external_reference text NOT NULL DEFAULT '',
 posted_on date NOT NULL,reason text NOT NULL,actor_id uuid NOT NULL REFERENCES users(id),reverses_id uuid,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,company_id),UNIQUE(reverses_id),FOREIGN KEY(bill_id,company_id) REFERENCES supplier_bills(id,company_id),
 FOREIGN KEY(reverses_id,company_id) REFERENCES supplier_payments(id,company_id),
 CHECK((amount_paise>0 AND reverses_id IS NULL AND method<>'reversal') OR (amount_paise<0 AND reverses_id IS NOT NULL AND method='reversal'))
);
CREATE TABLE project_cost_reviews (
 project_id uuid NOT NULL,company_id uuid NOT NULL,fingerprint text NOT NULL,reason text NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id),reviewed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(project_id),FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id)
);
CREATE VIEW invoice_financial_balances AS
 SELECT s.*,greatest(net_invoiced-settled,0) AS outstanding,greatest(settled-net_invoiced,0) AS customer_credit
 FROM (SELECT i.id,i.company_id,i.order_id,i.contact_id,i.status,i.due_date,i.total_paise,
 i.total_paise-coalesce((SELECT sum(amount_paise) FROM invoice_credit_notes n WHERE n.invoice_id=i.id AND n.company_id=i.company_id),0) AS net_invoiced,
 coalesce((SELECT sum(amount_paise) FROM invoice_credit_notes n WHERE n.invoice_id=i.id AND n.company_id=i.company_id),0) AS credited,
 coalesce((SELECT sum(amount_paise) FROM customer_refunds f WHERE f.invoice_id=i.id AND f.company_id=i.company_id),0) AS refunded,
 coalesce((SELECT sum(amount_paise) FROM customer_collections c WHERE c.invoice_id=i.id AND c.company_id=i.company_id),0)-coalesce((SELECT sum(amount_paise) FROM customer_refunds f WHERE f.invoice_id=i.id AND f.company_id=i.company_id),0) AS settled
 FROM customer_invoices i) s;
CREATE VIEW advance_financial_balances AS
 SELECT a.*,a.amount_paise+coalesce((SELECT sum(amount_paise) FROM order_advances r WHERE r.reverses_id=a.id AND r.company_id=a.company_id),0)-coalesce((SELECT sum(amount_paise) FROM customer_collections c WHERE c.advance_id=a.id AND c.company_id=a.company_id),0)-coalesce((SELECT sum(amount_paise) FROM customer_refunds f WHERE f.advance_id=a.id AND f.company_id=a.company_id),0) AS available
 FROM order_advances a WHERE a.reverses_id IS NULL;
CREATE VIEW supplier_bill_balances AS
 SELECT b.*,coalesce((SELECT sum(amount_paise) FROM supplier_payments p WHERE p.bill_id=b.id AND p.company_id=b.company_id),0) AS paid,
 b.amount_paise-coalesce((SELECT sum(amount_paise) FROM supplier_payments p WHERE p.bill_id=b.id AND p.company_id=b.company_id),0) AS outstanding FROM supplier_bills b;
CREATE INDEX advance_order ON order_advances(company_id,order_id);
CREATE INDEX credit_invoice ON invoice_credit_notes(company_id,invoice_id);
CREATE INDEX refund_invoice ON customer_refunds(company_id,invoice_id);
CREATE INDEX refund_advance ON customer_refunds(company_id,advance_id);
CREATE INDEX collection_advance ON customer_collections(company_id,advance_id);
CREATE INDEX expense_project ON project_expenses(company_id,project_id);
CREATE INDEX payment_bill ON supplier_payments(company_id,bill_id);
CREATE INDEX bill_project ON supplier_bills(company_id,project_id);
CREATE UNIQUE INDEX advance_reference_unique ON order_advances(company_id,external_reference) WHERE external_reference<>'' AND reverses_id IS NULL;
CREATE UNIQUE INDEX refund_reference_unique ON customer_refunds(company_id,external_reference) WHERE external_reference<>'' AND reverses_id IS NULL;
CREATE UNIQUE INDEX expense_reference_unique ON project_expenses(company_id,external_reference) WHERE reverses_id IS NULL;
CREATE UNIQUE INDEX supplier_payment_reference_unique ON supplier_payments(company_id,external_reference) WHERE external_reference<>'' AND reverses_id IS NULL;
CREATE FUNCTION preserve_financial_entry() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Posted financial entries are append-only; append an authorised reversal' USING ERRCODE='23514'; END $$;
CREATE TRIGGER preserve_advance BEFORE UPDATE OR DELETE ON order_advances FOR EACH ROW EXECUTE FUNCTION preserve_financial_entry();
CREATE TRIGGER preserve_collection BEFORE UPDATE OR DELETE ON customer_collections FOR EACH ROW EXECUTE FUNCTION preserve_financial_entry();
CREATE TRIGGER preserve_credit BEFORE UPDATE OR DELETE ON invoice_credit_notes FOR EACH ROW EXECUTE FUNCTION preserve_financial_entry();
CREATE TRIGGER preserve_refund BEFORE UPDATE OR DELETE ON customer_refunds FOR EACH ROW EXECUTE FUNCTION preserve_financial_entry();
CREATE TRIGGER preserve_expense BEFORE UPDATE OR DELETE ON project_expenses FOR EACH ROW EXECUTE FUNCTION preserve_financial_entry();
CREATE TRIGGER preserve_supplier_payment BEFORE UPDATE OR DELETE ON supplier_payments FOR EACH ROW EXECUTE FUNCTION preserve_financial_entry();
-- Ledger corrections must point to the exact original in the same company.
CREATE FUNCTION validate_financial_correction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original jsonb; current_entry jsonb; key text;
BEGIN
 IF NEW.reverses_id IS NULL THEN RETURN NEW; END IF;
 EXECUTE format('SELECT to_jsonb(r) FROM %I r WHERE r.id=$1 AND r.company_id=$2',TG_TABLE_NAME) INTO original USING NEW.reverses_id,NEW.company_id;
 IF original IS NULL OR original->>'reverses_id' IS NOT NULL OR NEW.amount_paise<>-(original->>'amount_paise')::bigint THEN RAISE EXCEPTION 'Correction must exactly reverse an original entry' USING ERRCODE='23514'; END IF;
 current_entry=to_jsonb(NEW);
 FOREACH key IN ARRAY ARRAY['invoice_id','order_id','project_id','bill_id','advance_id'] LOOP
  IF current_entry ? key AND current_entry->key IS DISTINCT FROM original->key THEN RAISE EXCEPTION 'Correction cannot change its source record' USING ERRCODE='23514'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_advance BEFORE INSERT ON order_advances FOR EACH ROW EXECUTE FUNCTION validate_financial_correction();
CREATE TRIGGER validate_collection BEFORE INSERT ON customer_collections FOR EACH ROW EXECUTE FUNCTION validate_financial_correction();
CREATE TRIGGER validate_credit BEFORE INSERT ON invoice_credit_notes FOR EACH ROW EXECUTE FUNCTION validate_financial_correction();
CREATE TRIGGER validate_refund BEFORE INSERT ON customer_refunds FOR EACH ROW EXECUTE FUNCTION validate_financial_correction();
CREATE TRIGGER validate_expense BEFORE INSERT ON project_expenses FOR EACH ROW EXECUTE FUNCTION validate_financial_correction();
CREATE TRIGGER validate_supplier_payment BEFORE INSERT ON supplier_payments FOR EACH ROW EXECUTE FUNCTION validate_financial_correction();
CREATE FUNCTION preserve_bill_terms() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Supplier bill history must be retained' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-'project_id') IS DISTINCT FROM (to_jsonb(OLD)-'project_id') OR (OLD.project_id IS NOT NULL AND NEW.project_id IS DISTINCT FROM OLD.project_id) THEN RAISE EXCEPTION 'Posted bill terms are immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER preserve_bill BEFORE UPDATE OR DELETE ON supplier_bills FOR EACH ROW EXECUTE FUNCTION preserve_bill_terms();
CREATE FUNCTION preserve_issued_invoice_terms() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Invoice history must be retained' USING ERRCODE='23514'; END IF;
 IF OLD.status<>'draft' AND (NEW.total_paise,NEW.snapshot,NEW.company_id,NEW.order_id,NEW.contact_id,NEW.reference) IS DISTINCT FROM (OLD.total_paise,OLD.snapshot,OLD.company_id,OLD.order_id,OLD.contact_id,OLD.reference) THEN RAISE EXCEPTION 'Issued invoice terms are immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER preserve_invoice BEFORE UPDATE OR DELETE ON customer_invoices FOR EACH ROW EXECUTE FUNCTION preserve_issued_invoice_terms();
CREATE TABLE financial_cash_references (
 company_id uuid NOT NULL REFERENCES companies(id),reference text NOT NULL,record_table text NOT NULL,record_id uuid NOT NULL,
 PRIMARY KEY(company_id,reference)
);
INSERT INTO financial_cash_references SELECT company_id,external_reference,'customer_collections',id FROM customer_collections WHERE external_reference<>'' AND reverses_id IS NULL;
CREATE FUNCTION claim_financial_cash_reference() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.reverses_id IS NULL AND NEW.external_reference<>'' THEN INSERT INTO financial_cash_references(company_id,reference,record_table,record_id) VALUES(NEW.company_id,NEW.external_reference,TG_TABLE_NAME,NEW.id); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER claim_collection_reference AFTER INSERT ON customer_collections FOR EACH ROW EXECUTE FUNCTION claim_financial_cash_reference();
CREATE TRIGGER claim_advance_reference AFTER INSERT ON order_advances FOR EACH ROW EXECUTE FUNCTION claim_financial_cash_reference();
CREATE TRIGGER claim_refund_reference AFTER INSERT ON customer_refunds FOR EACH ROW EXECUTE FUNCTION claim_financial_cash_reference();
CREATE TRIGGER claim_supplier_payment_reference AFTER INSERT ON supplier_payments FOR EACH ROW EXECUTE FUNCTION claim_financial_cash_reference();
