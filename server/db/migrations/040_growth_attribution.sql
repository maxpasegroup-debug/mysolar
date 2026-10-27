CREATE TABLE lead_growth_records (
 lead_id uuid NOT NULL,company_id uuid NOT NULL,source_channel text NOT NULL DEFAULT 'other'
 CHECK(source_channel IN ('walk_in','referral','marketplace','website','campaign','phone','other')),
 campaign text NOT NULL DEFAULT '',referrer_contact_id uuid,
 first_response_at timestamptz,last_response_at timestamptz,response_reference text NOT NULL DEFAULT '',
 updated_by uuid NOT NULL REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(lead_id,company_id),FOREIGN KEY(lead_id,company_id) REFERENCES crm_leads(id,company_id),
 FOREIGN KEY(referrer_contact_id,company_id) REFERENCES company_contacts(id,company_id)
);
