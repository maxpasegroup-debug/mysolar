CREATE TABLE catalogue_categories (
 id uuid PRIMARY KEY, parent_id uuid REFERENCES catalogue_categories(id), slug text NOT NULL UNIQUE,
 name text NOT NULL, kind text NOT NULL CHECK(kind IN ('product','service')),
 attribute_schema jsonb NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true,
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,parent_id), CHECK(parent_id IS NULL OR parent_id<>id)
);
-- Taxonomy only: these are categories, not fabricated product listings or performance claims.
INSERT INTO catalogue_categories(id,slug,name,kind,attribute_schema) VALUES
 ('10000000-0000-4000-8000-000000000001','solar-panels','Solar panels and modules','product','{"rated_watts":{"type":"number","label":"Rated capacity","unit":"W","min":0.01,"max":100000},"technology":{"type":"text","label":"Module technology"},"dimensions_mm":{"type":"text","label":"Dimensions in mm"},"efficiency_percent":{"type":"number","label":"Efficiency","unit":"%","min":0,"max":100}}'),
 ('10000000-0000-4000-8000-000000000002','inverters','Solar inverters','product','{"capacity_kw":{"type":"number","label":"Capacity","unit":"kW","min":0.001,"max":1000000},"phase":{"type":"enum","label":"Phase","options":["Single phase","Three phase"]},"grid_compatibility":{"type":"text","label":"Grid compatibility"},"operating_mode":{"type":"enum","label":"Operating mode","options":["On-grid","Off-grid","Hybrid"]}}'),
 ('10000000-0000-4000-8000-000000000003','batteries','Batteries and energy storage','product','{"chemistry":{"type":"text","label":"Chemistry"},"voltage_v":{"type":"number","label":"Nominal voltage","unit":"V","min":0.01,"max":100000},"capacity_ah":{"type":"number","label":"Capacity","unit":"Ah","min":0.001,"max":10000000},"usable_energy_kwh":{"type":"number","label":"Usable energy","unit":"kWh","min":0.001,"max":10000000}}'),
 ('10000000-0000-4000-8000-000000000004','mounting','Solar mounting structures','product','{}'),
 ('10000000-0000-4000-8000-000000000005','cables-protection','Solar cables and electrical protection','product','{}'),
 ('10000000-0000-4000-8000-000000000006','solar-pumps','Solar pumps','product','{}'),
 ('10000000-0000-4000-8000-000000000007','solar-lighting','Solar lighting','product','{}'),
 ('10000000-0000-4000-8000-000000000008','rooftop-services','Rooftop solar installation','service','{}'),
 ('10000000-0000-4000-8000-000000000009','maintenance','Maintenance and after-sales services','service','{}');

CREATE TABLE catalogue_products (
 id uuid PRIMARY KEY, category_id uuid NOT NULL REFERENCES catalogue_categories(id), subcategory_id uuid,
 name text NOT NULL, brand text NOT NULL DEFAULT '', model text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
 attributes jsonb NOT NULL DEFAULT '{}', unit text NOT NULL, image_urls text[] NOT NULL DEFAULT '{}', warranty text NOT NULL DEFAULT '',
 source_note text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','inactive')),
 public_visible boolean NOT NULL DEFAULT false, schema_revision integer NOT NULL, revision integer NOT NULL DEFAULT 1,
 created_by uuid NOT NULL REFERENCES users(id), published_by uuid REFERENCES users(id), published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 search_document tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, name||' '||brand||' '||model)) STORED,
 FOREIGN KEY(subcategory_id,category_id) REFERENCES catalogue_categories(id,parent_id),
 CHECK(status<>'published' OR (published_by IS NOT NULL AND published_at IS NOT NULL))
);
CREATE INDEX products_category_idx ON catalogue_products(category_id,subcategory_id,status);
CREATE INDEX products_search_idx ON catalogue_products USING gin(search_document);
CREATE INDEX products_brand_idx ON catalogue_products(lower(brand));
CREATE INDEX products_name_model_idx ON catalogue_products(lower(name),lower(model));

CREATE TABLE distributor_offers (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), product_id uuid NOT NULL REFERENCES catalogue_products(id),
 distributor_sku text NOT NULL DEFAULT '', price_mode text NOT NULL CHECK(price_mode IN ('price_available','request_quote','contact_distributor')),
 price_paise bigint CHECK(price_paise BETWEEN 0 AND 100000000000), currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
 price_unit text NOT NULL, estimated boolean NOT NULL DEFAULT false,
 tax_mode text NOT NULL DEFAULT 'unknown' CHECK(tax_mode IN ('unknown','inclusive','exclusive','exempt')), tax_rate numeric(5,2) CHECK(tax_rate BETWEEN 0 AND 100),
 availability text NOT NULL DEFAULT 'unknown' CHECK(availability IN ('unknown','in_stock','on_request','out_of_stock','service_available')),
 stock_maintained boolean NOT NULL DEFAULT false, stock_quantity integer CHECK(stock_quantity BETWEEN 0 AND 1000000000),
 minimum_order numeric(12,3) CHECK(minimum_order>0), coverage_labels text[] NOT NULL DEFAULT '{}',
 public_terms text NOT NULL DEFAULT '', terms_confirmed boolean NOT NULL DEFAULT false, private_notes text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected','inactive')), published boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1, approved_revision integer, approved_product_revision integer,
 reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz, created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,product_id), UNIQUE(id,company_id),
 CHECK((price_mode='price_available' AND price_paise IS NOT NULL) OR (price_mode<>'price_available' AND price_paise IS NULL)),
 CHECK((stock_maintained AND stock_quantity IS NOT NULL) OR (NOT stock_maintained AND stock_quantity IS NULL)),
 CHECK(public_terms='' OR terms_confirmed),
 CHECK(status<>'approved' OR (approved_revision IS NOT NULL AND approved_product_revision IS NOT NULL AND approved_revision=revision AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
 CHECK(NOT published OR (status='approved' AND approved_revision IS NOT NULL AND approved_revision=revision))
);
CREATE INDEX offers_company_product_idx ON distributor_offers(company_id,product_id);
CREATE INDEX offers_public_idx ON distributor_offers(product_id,company_id) WHERE published AND status='approved';
CREATE INDEX offers_review_idx ON distributor_offers(status,updated_at);
CREATE TABLE offer_reviews (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, offer_id uuid NOT NULL, company_id uuid NOT NULL,
 actor_user_id uuid NOT NULL REFERENCES users(id), previous_state text NOT NULL, new_state text NOT NULL, reason text NOT NULL DEFAULT '',
 offer_revision integer NOT NULL, product_revision integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(offer_id,company_id) REFERENCES distributor_offers(id,company_id)
);
CREATE INDEX offer_reviews_tenant_idx ON offer_reviews(company_id,offer_id,id DESC);

CREATE TABLE company_service_areas (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id),
 scope text NOT NULL CHECK(scope IN ('state','district','pin','locality')), label text NOT NULL,
 state text NOT NULL DEFAULT '', district text NOT NULL DEFAULT '', pin text NOT NULL DEFAULT '', locality text NOT NULL DEFAULT '',
 state_key text NOT NULL DEFAULT '', district_key text NOT NULL DEFAULT '', locality_key text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,label), CHECK(pin='' OR pin ~ '^[1-9][0-9]{5}$')
);
-- Legacy labels remain exact named areas; registration addresses are not inferred as service coverage.
INSERT INTO company_service_areas(id,company_id,scope,label,locality,locality_key)
 SELECT gen_random_uuid(),b.company_id,'locality',trim(area),trim(area),lower(regexp_replace(trim(area),'\s+',' ','g'))
 FROM company_business_profiles b CROSS JOIN LATERAL unnest(b.service_areas) AS area WHERE trim(area)<>'' ON CONFLICT DO NOTHING;
CREATE FUNCTION synchronize_legacy_service_areas() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 DELETE FROM company_service_areas WHERE company_id=NEW.company_id AND NOT(label=ANY(NEW.service_areas));
 INSERT INTO company_service_areas(id,company_id,scope,label,locality,locality_key)
 SELECT gen_random_uuid(),NEW.company_id,'locality',trim(area),trim(area),lower(regexp_replace(trim(area),'\s+',' ','g')) FROM unnest(NEW.service_areas) AS area WHERE trim(area)<>'' ON CONFLICT DO NOTHING;
 RETURN NEW;
END;
$$;
CREATE TRIGGER legacy_service_area_sync AFTER UPDATE OF service_areas ON company_business_profiles FOR EACH ROW EXECUTE FUNCTION synchronize_legacy_service_areas();
CREATE INDEX areas_company_idx ON company_service_areas(company_id);
CREATE INDEX areas_state_district_idx ON company_service_areas(state_key,district_key,company_id);
CREATE INDEX areas_pin_idx ON company_service_areas(pin,company_id);
CREATE INDEX areas_locality_idx ON company_service_areas(locality_key,company_id);
CREATE INDEX companies_public_idx ON companies(id) WHERE status='active' AND lifecycle='active' AND marketplace_status='approved' AND storefront_published;

-- Explicit, public-only projections: private columns must not be added to these views.
CREATE VIEW marketplace_vendors AS
 SELECT c.id,b.public_name AS name,c.city,p.business_type,b.description,b.logo_url,b.primary_color,b.secondary_color,b.accent_color,
 b.welcome_text,b.public_email,b.public_phone,b.appearance,s.services,s.rooftop_available,s.service_areas,s.preferred_contact
 FROM companies c JOIN company_branding b ON b.company_id=c.id JOIN company_profiles p ON p.company_id=c.id JOIN company_business_profiles s ON s.company_id=c.id
 WHERE c.status='active' AND c.lifecycle='active' AND c.marketplace_status='approved' AND c.storefront_published
 AND b.public_name<>'' AND b.description<>'' AND ((s.preferred_contact='email' AND b.public_email<>'') OR (s.preferred_contact='phone' AND b.public_phone<>''))
 AND EXISTS(SELECT 1 FROM company_reviews r WHERE r.company_id=c.id AND r.kind='marketplace' AND r.new_state='approved');
CREATE VIEW marketplace_products AS
 SELECT p.id,p.category_id,p.subcategory_id,p.name,p.brand,p.model,p.description,p.attributes,p.unit,p.image_urls,p.warranty,p.revision,p.created_at,p.updated_at,
 c.name AS category_name,l.name AS specification_category,l.attribute_schema,c.kind
 FROM catalogue_products p JOIN catalogue_categories c ON c.id=p.category_id JOIN catalogue_categories l ON l.id=coalesce(p.subcategory_id,p.category_id)
 WHERE p.status='published' AND p.public_visible AND c.active AND l.active AND p.schema_revision=l.revision;
CREATE VIEW marketplace_offers AS
 SELECT o.id,o.company_id,o.product_id,o.distributor_sku,o.price_mode,o.price_paise,o.currency,o.price_unit,o.estimated,o.tax_mode,o.tax_rate,o.availability,
 o.stock_maintained,o.stock_quantity,o.minimum_order,o.coverage_labels,o.public_terms,o.updated_at
 FROM distributor_offers o JOIN marketplace_vendors v ON v.id=o.company_id JOIN marketplace_products p ON p.id=o.product_id
 WHERE o.published AND o.status='approved' AND o.approved_revision=o.revision AND o.approved_product_revision=p.revision
 AND o.coverage_labels <@ ARRAY(SELECT a.label FROM company_service_areas a WHERE a.company_id=o.company_id);

INSERT INTO permissions(id,scope) VALUES ('offers.read','company'),('offers.manage','company'),('offers.submit','company'),('offers.publish','company'),('offers.deactivate','company'),('service_areas.manage','company'),('catalogue.read','platform'),('catalogue.manage','platform'),('offers.review','platform');
INSERT INTO role_permissions(role_id,permission_id) SELECT 'owner',id FROM permissions WHERE id IN ('offers.read','offers.manage','offers.submit','offers.publish','offers.deactivate','service_areas.manage');
INSERT INTO role_permissions(role_id,permission_id) VALUES ('sales','offers.read'),('inventory_manager','offers.read'),('inventory_manager','offers.manage'),('inventory_manager','offers.deactivate');
INSERT INTO role_permissions(role_id,permission_id) SELECT 'platform_admin',id FROM permissions WHERE id IN ('catalogue.read','catalogue.manage','offers.review');
