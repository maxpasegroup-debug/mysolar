CREATE TABLE customer_enquiries (
 id uuid PRIMARY KEY, customer_id uuid NOT NULL REFERENCES users(id), submission_key uuid NOT NULL,
 title text NOT NULL, requested_item text NOT NULL, category_id uuid REFERENCES catalogue_categories(id),
 product_id uuid REFERENCES catalogue_products(id), offer_id uuid REFERENCES distributor_offers(id),
 quantity numeric(12,3), unit text NOT NULL DEFAULT '', project_type text NOT NULL, requested_service text NOT NULL DEFAULT '',
 state text NOT NULL, district text NOT NULL, pin text NOT NULL, locality text NOT NULL DEFAULT '', address text NOT NULL,
 requirements text NOT NULL DEFAULT '', contact_method text NOT NULL CHECK(contact_method IN ('in_app','email','phone')),
 contact_snapshot jsonb NOT NULL, timeframe text NOT NULL DEFAULT '', distribution_mode text NOT NULL CHECK(distribution_mode IN ('direct','multiple','matching')),
 status text NOT NULL CHECK(status IN ('submitted','sent','discussion','quotation_received','preferred','closed','cancelled')),
 preferred_version_id uuid, revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(customer_id,submission_key), UNIQUE(id,customer_id), CHECK(pin ~ '^[1-9][0-9]{5}$'), CHECK(quantity IS NULL OR quantity>0)
);
CREATE TABLE enquiry_recipients (
 enquiry_id uuid NOT NULL REFERENCES customer_enquiries(id), company_id uuid NOT NULL REFERENCES companies(id),
 vendor_snapshot jsonb NOT NULL, viewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(enquiry_id,company_id)
);
CREATE TABLE enquiry_quotations (
 id uuid PRIMARY KEY, enquiry_id uuid NOT NULL, company_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(enquiry_id,company_id) REFERENCES enquiry_recipients(enquiry_id,company_id),
 UNIQUE(enquiry_id,company_id), UNIQUE(id,enquiry_id,company_id)
);
CREATE TABLE quotation_versions (
 id uuid PRIMARY KEY, quotation_id uuid NOT NULL, enquiry_id uuid NOT NULL, company_id uuid NOT NULL,
 version integer NOT NULL CHECK(version>0), previous_id uuid,
 reference text NOT NULL, quote_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date, valid_until date NOT NULL,
 currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), tax_mode text NOT NULL CHECK(tax_mode IN ('unknown','exclusive','inclusive','exempt')),
 issuer_snapshot jsonb NOT NULL DEFAULT '{}', customer_snapshot jsonb NOT NULL DEFAULT '{}',
 included text NOT NULL DEFAULT '', excluded text NOT NULL DEFAULT '', warranty text NOT NULL DEFAULT '', timeframe text NOT NULL DEFAULT '',
 payment_terms text NOT NULL DEFAULT '', assumptions text NOT NULL DEFAULT '', installation_scope text NOT NULL DEFAULT '',
 delivery_paise bigint NOT NULL DEFAULT 0 CHECK(delivery_paise>=0), installation_paise bigint NOT NULL DEFAULT 0 CHECK(installation_paise>=0),
 charges_tax_rate text NOT NULL DEFAULT '', total_paise bigint NOT NULL DEFAULT 0 CHECK(total_paise>=0), totals jsonb NOT NULL,
 estimated boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','superseded','withdrawn')),
 request_type text NOT NULL DEFAULT '' CHECK(request_type IN ('','clarification','revision')), revision integer NOT NULL DEFAULT 1,
 sent_at timestamptz, viewed_at timestamptz, created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(quotation_id,enquiry_id,company_id) REFERENCES enquiry_quotations(id,enquiry_id,company_id),
 UNIQUE(quotation_id,version), UNIQUE(id,enquiry_id), UNIQUE(id,quotation_id),
 FOREIGN KEY(previous_id,quotation_id) REFERENCES quotation_versions(id,quotation_id),
 CHECK(status='draft' OR sent_at IS NOT NULL), CHECK(valid_until>=quote_date)
);
CREATE UNIQUE INDEX quotation_one_draft_idx ON quotation_versions(quotation_id) WHERE status='draft';
ALTER TABLE customer_enquiries ADD FOREIGN KEY(preferred_version_id,id) REFERENCES quotation_versions(id,enquiry_id);
CREATE TABLE quotation_line_items (
 version_id uuid NOT NULL REFERENCES quotation_versions(id), position integer NOT NULL,
 product_id uuid REFERENCES catalogue_products(id), description text NOT NULL, brand text NOT NULL DEFAULT '', model text NOT NULL DEFAULT '',
 specifications text NOT NULL DEFAULT '', quantity text NOT NULL, unit text NOT NULL, unit_price_paise bigint NOT NULL CHECK(unit_price_paise>=0),
 discount_paise bigint NOT NULL CHECK(discount_paise>=0), tax_rate text NOT NULL DEFAULT '', amounts jsonb NOT NULL,
 PRIMARY KEY(version_id,position)
);
CREATE TABLE enquiry_messages (
 id uuid PRIMARY KEY, enquiry_id uuid NOT NULL, company_id uuid NOT NULL, version_id uuid,
 author_id uuid NOT NULL REFERENCES users(id), author_side text NOT NULL CHECK(author_side IN ('customer','distributor')),
 kind text NOT NULL CHECK(kind IN ('message','clarification','revision','response')), body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(enquiry_id,company_id) REFERENCES enquiry_recipients(enquiry_id,company_id),
 FOREIGN KEY(version_id,enquiry_id) REFERENCES quotation_versions(id,enquiry_id)
);
CREATE TABLE enquiry_internal_notes (
 id uuid PRIMARY KEY, enquiry_id uuid NOT NULL, company_id uuid NOT NULL, author_id uuid NOT NULL REFERENCES users(id),
 body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(enquiry_id,company_id) REFERENCES enquiry_recipients(enquiry_id,company_id)
);
CREATE TABLE enquiry_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, enquiry_id uuid NOT NULL REFERENCES customer_enquiries(id),
 company_id uuid REFERENCES companies(id), actor_id uuid NOT NULL REFERENCES users(id), action text NOT NULL,
 customer_visible boolean NOT NULL DEFAULT true, version_id uuid REFERENCES quotation_versions(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workflow_notifications (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), company_id uuid REFERENCES companies(id),
 enquiry_id uuid NOT NULL REFERENCES customer_enquiries(id), version_id uuid REFERENCES quotation_versions(id),
 message text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX enquiries_customer_idx ON customer_enquiries(customer_id,created_at DESC,id);
CREATE INDEX enquiry_filter_idx ON customer_enquiries(status,category_id,created_at DESC);
CREATE INDEX recipients_company_idx ON enquiry_recipients(company_id,created_at DESC,enquiry_id);
CREATE INDEX quotations_company_idx ON enquiry_quotations(company_id,enquiry_id);
CREATE INDEX quotation_expiry_idx ON quotation_versions(valid_until,status) WHERE status='sent';
CREATE INDEX quotation_enquiry_idx ON quotation_versions(enquiry_id,company_id,version DESC);
CREATE INDEX quotation_company_status_idx ON quotation_versions(company_id,status,created_at DESC,id);
CREATE INDEX enquiry_timeline_idx ON enquiry_events(enquiry_id,company_id,id DESC);
CREATE INDEX enquiry_messages_idx ON enquiry_messages(enquiry_id,company_id,created_at DESC);
CREATE INDEX enquiry_notes_idx ON enquiry_internal_notes(company_id,enquiry_id,created_at DESC);
CREATE INDEX workflow_notifications_user_idx ON workflow_notifications(user_id,company_id,created_at DESC);
INSERT INTO permissions(id,scope) VALUES ('enquiries.manage','company'),('quotations.manage','company'),('quotations.send','company');
INSERT INTO role_permissions(role_id,permission_id) SELECT role,id FROM (VALUES ('owner'),('sales')) AS roles(role) CROSS JOIN permissions WHERE id IN ('enquiries.manage','quotations.manage','quotations.send');
