CREATE TABLE quotation_templates (
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),name text NOT NULL,
 quote jsonb NOT NULL,items jsonb NOT NULL,created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(company_id,name)
);
CREATE TABLE import_batches (
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),user_id uuid NOT NULL REFERENCES users(id),
 kind text NOT NULL CHECK(kind IN ('contacts','leads')),digest text NOT NULL,rows jsonb NOT NULL,
 status text NOT NULL DEFAULT 'preview' CHECK(status IN ('preview','completed','rolled_back')),
 results jsonb NOT NULL DEFAULT '[]',expires_at timestamptz NOT NULL DEFAULT now()+interval '1 hour',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX import_company ON import_batches(company_id,created_at DESC);
