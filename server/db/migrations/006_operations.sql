-- Phase 6. Prior migration history and the original role catalogue remain immutable.
ALTER TABLE quotation_versions ADD UNIQUE(id,company_id);
CREATE TABLE company_contacts (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), user_id uuid REFERENCES users(id),
 kind text NOT NULL CHECK(kind IN ('individual','business')), name text NOT NULL, email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '',
 billing_address text NOT NULL DEFAULT '', service_address text NOT NULL DEFAULT '', revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,company_id)
);
CREATE UNIQUE INDEX contact_user_unique ON company_contacts(company_id,user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX contact_email_unique ON company_contacts(company_id,lower(email)) WHERE email<>'';
CREATE UNIQUE INDEX contact_phone_unique ON company_contacts(company_id,phone) WHERE phone<>'';
CREATE TABLE crm_leads (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), contact_id uuid NOT NULL,
 enquiry_id uuid, title text NOT NULL, source text NOT NULL, interest text NOT NULL, location text NOT NULL,
 assignee_id uuid REFERENCES users(id), stage text NOT NULL DEFAULT 'new' CHECK(stage IN ('new','contacted','qualified','opportunity','won','lost')),
 priority text NOT NULL CHECK(priority IN ('low','normal','high','urgent')), next_action text NOT NULL DEFAULT '', follow_up date,
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(contact_id,company_id) REFERENCES company_contacts(id,company_id),
 FOREIGN KEY(enquiry_id,company_id) REFERENCES enquiry_recipients(enquiry_id,company_id), UNIQUE(id,company_id), UNIQUE(company_id,enquiry_id)
);
CREATE TABLE business_orders (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), contact_id uuid NOT NULL, quotation_id uuid REFERENCES quotation_versions(id),
 reference text NOT NULL, terms jsonb NOT NULL, total_paise bigint NOT NULL CHECK(total_paise BETWEEN 0 AND 100000000000),
 billing_address text NOT NULL, service_address text NOT NULL, expected_date date, owner_id uuid NOT NULL REFERENCES users(id),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','awaiting_confirmation','confirmed','processing','partially_fulfilled','fulfilled','cancelled')),
 acceptance_mode text NOT NULL CHECK(acceptance_mode IN ('in_app','external')), customer_confirmed_at timestamptz,
 agreement_reference text NOT NULL DEFAULT '', agreement_notes text NOT NULL DEFAULT '', confirmed_by uuid REFERENCES users(id), confirmed_at timestamptz,
 fulfilment_reference text NOT NULL DEFAULT '', revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(contact_id,company_id) REFERENCES company_contacts(id,company_id), FOREIGN KEY(quotation_id,company_id) REFERENCES quotation_versions(id,company_id), UNIQUE(id,company_id), UNIQUE(company_id,reference), UNIQUE(company_id,quotation_id),
 CHECK(status NOT IN ('confirmed','processing','partially_fulfilled','fulfilled') OR (confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL AND ((acceptance_mode='in_app' AND customer_confirmed_at IS NOT NULL) OR (acceptance_mode='external' AND agreement_reference<>''))))
);
CREATE TABLE business_order_items (
 id uuid PRIMARY KEY, order_id uuid NOT NULL, company_id uuid NOT NULL, position integer NOT NULL, product_id uuid REFERENCES catalogue_products(id),
 description text NOT NULL, quantity_milli bigint NOT NULL CHECK(quantity_milli>0), unit text NOT NULL, snapshot jsonb NOT NULL,
 FOREIGN KEY(order_id,company_id) REFERENCES business_orders(id,company_id), UNIQUE(id,company_id), UNIQUE(id,order_id,company_id), UNIQUE(order_id,position)
);
CREATE TABLE inventory_items (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), product_id uuid REFERENCES catalogue_products(id),
 name text NOT NULL, sku text NOT NULL, unit text NOT NULL, warehouse text NOT NULL, threshold_milli bigint NOT NULL DEFAULT 0 CHECK(threshold_milli>=0),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,company_id), UNIQUE(company_id,sku,warehouse)
);
CREATE TABLE inventory_reservations (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), item_id uuid NOT NULL, order_id uuid NOT NULL, order_item_id uuid NOT NULL,
 remaining_milli bigint NOT NULL CHECK(remaining_milli>=0), consumed_milli bigint NOT NULL DEFAULT 0 CHECK(consumed_milli>=0),
 FOREIGN KEY(item_id,company_id) REFERENCES inventory_items(id,company_id),
 FOREIGN KEY(order_item_id,order_id,company_id) REFERENCES business_order_items(id,order_id,company_id), UNIQUE(id,company_id)
);
CREATE TABLE inventory_movements (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), item_id uuid NOT NULL, operation_key uuid NOT NULL,
 on_hand_delta bigint NOT NULL DEFAULT 0, reserved_delta bigint NOT NULL DEFAULT 0,
 kind text NOT NULL CHECK(kind IN ('opening','adjustment','receipt','reserve','release','consume')), reason text NOT NULL,
 reservation_id uuid, actor_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(item_id,company_id) REFERENCES inventory_items(id,company_id), FOREIGN KEY(reservation_id,company_id) REFERENCES inventory_reservations(id,company_id),
 CHECK(on_hand_delta<>0 OR reserved_delta<>0)
);
CREATE TABLE suppliers (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), name text NOT NULL, contact text NOT NULL DEFAULT '',
 email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,company_id)
);
CREATE TABLE purchase_orders (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), supplier_id uuid NOT NULL, reference text NOT NULL, supplier_reference text NOT NULL DEFAULT '',
 expected_date date, tax_mode text NOT NULL CHECK(tax_mode IN ('unknown','exclusive','inclusive','exempt')), total_paise bigint, totals jsonb,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','partially_received','received','cancelled')),
 revision integer NOT NULL DEFAULT 1, approved_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(supplier_id,company_id) REFERENCES suppliers(id,company_id), UNIQUE(id,company_id), UNIQUE(company_id,reference)
);
CREATE TABLE purchase_order_items (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), purchase_id uuid NOT NULL, item_id uuid NOT NULL,
 quantity_milli bigint NOT NULL CHECK(quantity_milli>0), received_milli bigint NOT NULL DEFAULT 0 CHECK(received_milli>=0 AND received_milli<=quantity_milli),
 unit_price_paise bigint, tax_rate text NOT NULL DEFAULT '', amounts jsonb,
 FOREIGN KEY(purchase_id,company_id) REFERENCES purchase_orders(id,company_id), FOREIGN KEY(item_id,company_id) REFERENCES inventory_items(id,company_id),
 UNIQUE(id,company_id), UNIQUE(purchase_id,item_id)
);
CREATE TABLE installation_projects (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), contact_id uuid NOT NULL, order_id uuid, lead_id uuid,
 reference text NOT NULL, name text NOT NULL, location text NOT NULL, scope text NOT NULL, equipment text NOT NULL DEFAULT '', capacity text NOT NULL DEFAULT '',
 manager_id uuid NOT NULL REFERENCES users(id), scheduled_date date, completion_reference text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','on_hold','completed','cancelled')),
 revision integer NOT NULL DEFAULT 1, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(contact_id,company_id) REFERENCES company_contacts(id,company_id), FOREIGN KEY(order_id,company_id) REFERENCES business_orders(id,company_id),
 FOREIGN KEY(lead_id,company_id) REFERENCES crm_leads(id,company_id), UNIQUE(id,company_id), UNIQUE(company_id,reference), UNIQUE(company_id,order_id)
);
CREATE TABLE project_assignments (
 project_id uuid NOT NULL, company_id uuid NOT NULL, user_id uuid NOT NULL REFERENCES users(id),
 FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id), PRIMARY KEY(project_id,user_id)
);
CREATE TABLE project_milestones (
 project_id uuid NOT NULL, company_id uuid NOT NULL, code text NOT NULL CHECK(code IN ('survey','design','materials','schedule','installation','inspection','commissioning','handover')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done','not_applicable')),
 notes text NOT NULL DEFAULT '', evidence_reference text NOT NULL DEFAULT '', updated_by uuid REFERENCES users(id), updated_at timestamptz,
 FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id), PRIMARY KEY(project_id,code)
);
CREATE TABLE service_requests (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), contact_id uuid NOT NULL, order_id uuid, project_id uuid,
 product_id uuid REFERENCES catalogue_products(id), reference text NOT NULL, issue text NOT NULL,
 warranty_terms text NOT NULL DEFAULT '', warranty_reference text NOT NULL DEFAULT '', priority text NOT NULL,
 assignee_id uuid REFERENCES users(id), follow_up date, resolution text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','triaged','assigned','in_progress','awaiting_customer','resolved','closed')),
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(contact_id,company_id) REFERENCES company_contacts(id,company_id), FOREIGN KEY(order_id,company_id) REFERENCES business_orders(id,company_id),
 FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id), UNIQUE(id,company_id), UNIQUE(company_id,reference),
 CHECK(warranty_terms='' OR warranty_reference<>'')
);
CREATE TABLE business_tasks (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), title text NOT NULL, description text NOT NULL DEFAULT '',
 contact_id uuid, order_id uuid, project_id uuid, service_id uuid, assignee_id uuid NOT NULL REFERENCES users(id),
 priority text NOT NULL CHECK(priority IN ('low','normal','high','urgent')), due_date date,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','blocked','completed','cancelled')),
 completion_notes text NOT NULL DEFAULT '', revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(contact_id,company_id) REFERENCES company_contacts(id,company_id), FOREIGN KEY(order_id,company_id) REFERENCES business_orders(id,company_id),
 FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id), FOREIGN KEY(service_id,company_id) REFERENCES service_requests(id,company_id), UNIQUE(id,company_id)
);
CREATE TABLE customer_invoices (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), order_id uuid NOT NULL, contact_id uuid NOT NULL,
 reference text NOT NULL, snapshot jsonb NOT NULL, total_paise bigint NOT NULL CHECK(total_paise>=0),
 issue_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date, due_date date NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','void')), revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(order_id,company_id) REFERENCES business_orders(id,company_id), FOREIGN KEY(contact_id,company_id) REFERENCES company_contacts(id,company_id),
 UNIQUE(id,company_id), UNIQUE(company_id,order_id), UNIQUE(company_id,reference), CHECK(due_date>=issue_date)
);
CREATE TABLE customer_collections (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), invoice_id uuid NOT NULL, amount_paise bigint NOT NULL CHECK(amount_paise<>0),
 method text NOT NULL CHECK(method IN ('cash','bank_transfer','cheque','other','reversal')), external_reference text NOT NULL DEFAULT '',
 collected_on date NOT NULL, reason text NOT NULL, reverses_id uuid, actor_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(invoice_id,company_id) REFERENCES customer_invoices(id,company_id), FOREIGN KEY(reverses_id,company_id) REFERENCES customer_collections(id,company_id),
 UNIQUE(id,company_id), UNIQUE(reverses_id), CHECK((amount_paise>0 AND reverses_id IS NULL AND method<>'reversal') OR (amount_paise<0 AND reverses_id IS NOT NULL AND method='reversal'))
);
CREATE UNIQUE INDEX collection_reference_unique ON customer_collections(company_id,external_reference) WHERE external_reference<>'' AND reverses_id IS NULL;
CREATE TABLE supplier_bills (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), supplier_id uuid NOT NULL, purchase_id uuid,
 reference text NOT NULL, amount_paise bigint NOT NULL CHECK(amount_paise>0), tax_mode text NOT NULL CHECK(tax_mode IN ('unknown','exclusive','inclusive','exempt')),
 tax_paise bigint, due_date date NOT NULL, evidence_reference text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(supplier_id,company_id) REFERENCES suppliers(id,company_id), FOREIGN KEY(purchase_id,company_id) REFERENCES purchase_orders(id,company_id), UNIQUE(id,company_id), UNIQUE(company_id,supplier_id,reference)
);
CREATE TABLE operations_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), record_type text NOT NULL, record_id uuid NOT NULL,
 action text NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), notes text NOT NULL DEFAULT '', customer_visible boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE operations_documents (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), record_type text NOT NULL, record_id uuid NOT NULL,
 title text NOT NULL, reference text NOT NULL, document_date date, notes text NOT NULL DEFAULT '', created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE operations_notifications (
 id uuid PRIMARY KEY, company_id uuid REFERENCES companies(id), user_id uuid NOT NULL REFERENCES users(id), record_type text NOT NULL, record_id uuid NOT NULL,
 message text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE operations_idempotency (
 company_id uuid NOT NULL REFERENCES companies(id), operation_key uuid NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(company_id,operation_key)
);
CREATE INDEX crm_company_stage ON crm_leads(company_id,stage,follow_up);
CREATE INDEX contacts_company_name ON company_contacts(company_id,lower(name));
CREATE INDEX orders_company_status ON business_orders(company_id,status,created_at DESC);
CREATE INDEX orders_company_contact ON business_orders(company_id,contact_id,created_at DESC);
CREATE INDEX leads_company_contact ON crm_leads(company_id,contact_id,created_at DESC);
CREATE INDEX projects_company_contact ON installation_projects(company_id,contact_id,created_at DESC);
CREATE INDEX invoices_company_contact ON customer_invoices(company_id,contact_id,created_at DESC);
CREATE INDEX service_company_contact ON service_requests(company_id,contact_id,created_at DESC);
CREATE INDEX stock_company_item ON inventory_movements(company_id,item_id,created_at DESC);
CREATE INDEX reservations_order ON inventory_reservations(company_id,order_id,order_item_id);
CREATE INDEX purchase_company_status ON purchase_orders(company_id,status,expected_date);
CREATE INDEX projects_company_status ON installation_projects(company_id,status,scheduled_date);
CREATE INDEX assignments_employee ON project_assignments(company_id,user_id,project_id);
CREATE INDEX tasks_employee_due ON business_tasks(company_id,assignee_id,status,due_date);
CREATE INDEX service_employee ON service_requests(company_id,assignee_id,status);
CREATE INDEX invoices_due ON customer_invoices(company_id,status,due_date);
CREATE INDEX collections_invoice ON customer_collections(company_id,invoice_id);
CREATE INDEX payable_due ON supplier_bills(company_id,due_date);
CREATE INDEX operations_timeline ON operations_events(company_id,record_type,record_id,id DESC);
CREATE INDEX operations_documents_record ON operations_documents(company_id,record_type,record_id);
CREATE INDEX operations_notification_user ON operations_notifications(user_id,company_id,created_at DESC);
INSERT INTO permissions(id,scope) SELECT p,'company' FROM unnest(ARRAY['crm.read','crm.manage','customers.read','customers.manage','orders.read','orders.manage','orders.confirm','inventory.manage','inventory.adjust','procurement.read','procurement.manage','procurement.approve','procurement.receive','projects.manage','projects.progress','tasks.own','tasks.manage','finance.read','finance.manage','finance.reverse','service.manage','service.assigned']) p;
INSERT INTO role_permissions(role_id,permission_id) SELECT 'owner',p FROM unnest(ARRAY['crm.read','crm.manage','customers.read','customers.manage','orders.read','orders.manage','orders.confirm','inventory.manage','inventory.adjust','procurement.read','procurement.manage','procurement.approve','procurement.receive','projects.manage','projects.progress','tasks.own','tasks.manage','finance.read','finance.manage','finance.reverse','service.manage','service.assigned']) p;
INSERT INTO role_permissions(role_id,permission_id) SELECT 'sales',p FROM unnest(ARRAY['crm.read','crm.manage','customers.read','customers.manage','orders.read','orders.manage','tasks.own']) p;
INSERT INTO role_permissions(role_id,permission_id) SELECT 'supervisor',p FROM unnest(ARRAY['projects.manage','projects.progress','tasks.own','tasks.manage','service.manage']) p;
INSERT INTO role_permissions(role_id,permission_id) SELECT 'field_engineer',p FROM unnest(ARRAY['projects.progress','tasks.own','service.assigned']) p;
INSERT INTO role_permissions(role_id,permission_id) SELECT 'inventory_manager',p FROM unnest(ARRAY['inventory.manage','inventory.adjust','procurement.read','procurement.manage','procurement.receive','tasks.own']) p;
INSERT INTO role_permissions(role_id,permission_id) SELECT 'accounts',p FROM unnest(ARRAY['finance.read','finance.manage','tasks.own']) p;
