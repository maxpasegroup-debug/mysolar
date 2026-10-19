CREATE TABLE white_label_requests (
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),user_id uuid NOT NULL REFERENCES users(id),
 operation_key uuid NOT NULL,fingerprint text NOT NULL,message text NOT NULL,contact_preference text NOT NULL CHECK(contact_preference IN ('email','phone')),
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','closed')),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(company_id,operation_key)
);
CREATE TABLE website_versions (
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),template text NOT NULL CHECK(template IN ('warm','clean')),
 content jsonb NOT NULL,created_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,company_id)
);
CREATE TABLE company_websites (
 company_id uuid PRIMARY KEY REFERENCES companies(id),draft_version_id uuid,published_version_id uuid,revision integer NOT NULL DEFAULT 1,
 FOREIGN KEY(draft_version_id,company_id) REFERENCES website_versions(id,company_id),FOREIGN KEY(published_version_id,company_id) REFERENCES website_versions(id,company_id)
);
CREATE TABLE platform_cost_entries (
 id uuid PRIMARY KEY,period_start date NOT NULL,period_end date NOT NULL,category text NOT NULL,
 amount_paise bigint NOT NULL CHECK(amount_paise>=0),currency text NOT NULL CHECK(currency IN ('INR','USD','EUR','GBP','AED')),
 evidence_reference text NOT NULL,recorded_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),CHECK(period_end>=period_start)
);
