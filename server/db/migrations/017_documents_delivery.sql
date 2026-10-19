CREATE TABLE managed_files (
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),record_kind text NOT NULL CHECK(record_kind IN ('orders','projects','invoices','service')),
 record_id uuid NOT NULL,uploaded_by uuid NOT NULL REFERENCES users(id),filename text NOT NULL,mime text NOT NULL,
 size integer NOT NULL CHECK(size BETWEEN 1 AND 2097152),sha256 text NOT NULL,payload text,
 customer_visible boolean NOT NULL DEFAULT false,scan_status text NOT NULL CHECK(scan_status='clean'),created_at timestamptz NOT NULL DEFAULT now(),deleted_at timestamptz
);
CREATE INDEX managed_files_record ON managed_files(company_id,record_kind,record_id) WHERE deleted_at IS NULL;
CREATE TABLE site_surveys (
 id uuid PRIMARY KEY,company_id uuid NOT NULL,project_id uuid NOT NULL,assessed_on date NOT NULL,
 roof_type text NOT NULL,usable_area text NOT NULL,shading text NOT NULL,roof_condition text NOT NULL,electrical_notes text NOT NULL,
 recorded_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(project_id,company_id) REFERENCES installation_projects(id,company_id)
);
CREATE TABLE equipment_assets (
 id uuid PRIMARY KEY,company_id uuid NOT NULL,order_id uuid NOT NULL,category text NOT NULL,brand text NOT NULL,
 model text NOT NULL,serial text NOT NULL,installed_on date,warranty_end date,warranty_terms text NOT NULL,
 recorded_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,serial),FOREIGN KEY(order_id,company_id) REFERENCES business_orders(id,company_id),CHECK(warranty_end IS NULL OR installed_on IS NULL OR warranty_end>=installed_on)
);
CREATE INDEX assets_order ON equipment_assets(company_id,order_id);
