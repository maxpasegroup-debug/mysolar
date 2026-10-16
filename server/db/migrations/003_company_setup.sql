ALTER TABLE companies ADD COLUMN lifecycle text NOT NULL DEFAULT 'draft' CHECK (lifecycle IN ('draft','onboarding','pending_review','active','suspended'));
ALTER TABLE companies ADD COLUMN suspended_from text CHECK (suspended_from IN ('draft','onboarding','pending_review','active'));
ALTER TABLE companies ADD COLUMN marketplace_status text NOT NULL DEFAULT 'not_requested' CHECK (marketplace_status IN ('not_requested','pending','approved','rejected','withdrawn'));
ALTER TABLE companies ADD COLUMN revision integer NOT NULL DEFAULT 1;
-- Preserve access for existing companies, while requiring review for previously self-published profiles.
UPDATE companies SET lifecycle=CASE WHEN status='suspended' THEN 'suspended' ELSE 'active' END,
  suspended_from=CASE WHEN status='suspended' THEN 'active' ELSE NULL END,
  marketplace_status=CASE WHEN storefront_published THEN 'pending' ELSE 'not_requested' END,
  storefront_published=false;
ALTER TABLE companies ADD CONSTRAINT company_lifecycle_consistent CHECK ((status='suspended')=(lifecycle='suspended'));
ALTER TABLE companies ADD CONSTRAINT company_publication_gate CHECK (NOT storefront_published OR (status='active' AND lifecycle='active' AND marketplace_status='approved'));

CREATE TABLE company_profiles (
  company_id uuid PRIMARY KEY REFERENCES companies(id),
  legal_name text NOT NULL DEFAULT '',
  business_type text NOT NULL DEFAULT 'distributor' CHECK (business_type IN ('distributor','installer','both')),
  primary_contact text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  pin_code text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','ml','ta')),
  website text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE company_branding (
  company_id uuid PRIMARY KEY REFERENCES companies(id),
  public_name text NOT NULL,
  logo_url text NOT NULL DEFAULT '',
  primary_color text NOT NULL DEFAULT '#601c2b' CHECK (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text NOT NULL DEFAULT '#292b29' CHECK (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color text NOT NULL DEFAULT '#d8ab55' CHECK (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  welcome_text text NOT NULL DEFAULT 'Good energy starts here.',
  public_email text NOT NULL DEFAULT '',
  public_phone text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  appearance text NOT NULL DEFAULT 'warm' CHECK (appearance IN ('warm','clean')),
  requested_domain text NOT NULL DEFAULT '',
  domain_status text NOT NULL DEFAULT 'not_connected' CHECK (domain_status='not_connected'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE company_business_profiles (
  company_id uuid PRIMARY KEY REFERENCES companies(id),
  services text[] NOT NULL DEFAULT '{}',
  rooftop_available boolean NOT NULL DEFAULT false,
  service_areas text[] NOT NULL DEFAULT '{}',
  preferred_contact text NOT NULL DEFAULT 'email' CHECK (preferred_contact IN ('email','phone')),
  marketplace_requested boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE company_onboarding (
  company_id uuid PRIMARY KEY REFERENCES companies(id),
  profile_saved_at timestamptz,
  brand_saved_at timestamptz,
  business_saved_at timestamptz,
  submitted_at timestamptz
);
CREATE FUNCTION initialize_company_setup() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO company_profiles(company_id,legal_name,district) VALUES(NEW.id,NEW.name,NEW.city);
  INSERT INTO company_branding(company_id,public_name,description) VALUES(NEW.id,NEW.name,NEW.storefront_description);
  INSERT INTO company_business_profiles(company_id) VALUES(NEW.id);
  INSERT INTO company_onboarding(company_id) VALUES(NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER company_setup_created AFTER INSERT ON companies FOR EACH ROW EXECUTE FUNCTION initialize_company_setup();
INSERT INTO company_profiles(company_id,legal_name,district) SELECT id,name,city FROM companies;
INSERT INTO company_branding(company_id,public_name,description) SELECT id,name,storefront_description FROM companies;
INSERT INTO company_business_profiles(company_id,marketplace_requested) SELECT id,marketplace_status='pending' FROM companies;
INSERT INTO company_onboarding(company_id) SELECT id FROM companies;

CREATE TABLE company_invitations (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  email text NOT NULL CHECK (email=lower(email)),
  role_id text NOT NULL CHECK (role_id IN ('sales','supervisor','field_engineer','inventory_manager','accounts')),
  role_scope text NOT NULL DEFAULT 'company' CHECK (role_scope='company'),
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','delivery_failed')),
  delivery text NOT NULL CHECK (delivery IN ('email','manual')),
  invited_by uuid NOT NULL REFERENCES users(id),
  accepted_by uuid REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  FOREIGN KEY(role_id,role_scope) REFERENCES roles(id,scope)
);
CREATE UNIQUE INDEX pending_invitation_email ON company_invitations(company_id,email) WHERE status='pending';
CREATE INDEX invitations_company_idx ON company_invitations(company_id,created_at DESC);
CREATE TABLE company_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  actor_user_id uuid NOT NULL REFERENCES users(id),
  kind text NOT NULL CHECK (kind IN ('lifecycle','marketplace','submission')),
  previous_state text NOT NULL,
  new_state text NOT NULL,
  reason text NOT NULL DEFAULT '',
  revision integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX company_reviews_idx ON company_reviews(company_id,id DESC);
CREATE TABLE platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  proposed_setup_fee_paise bigint NOT NULL DEFAULT 3500000 CHECK(proposed_setup_fee_paise BETWEEN 0 AND 1000000000),
  gst_note text NOT NULL DEFAULT 'Plus applicable GST. Proposed reference only; no active charges.',
  proposed_subscription_paise bigint CHECK(proposed_subscription_paise BETWEEN 0 AND 1000000000),
  proposed_trial_days integer CHECK(proposed_trial_days BETWEEN 0 AND 365),
  future_limits jsonb NOT NULL DEFAULT '{}',
  billing_enabled boolean NOT NULL DEFAULT false CHECK(billing_enabled=false),
  revision integer NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO platform_settings(id) VALUES(true);

INSERT INTO permissions(id,scope) VALUES
 ('company.setup.read','company'),('company.onboarding.manage','company'),('company.brand.read','company'),
 ('company.brand.manage','company'),('invitations.manage','company'),
 ('platform.companies.read','platform'),('platform.onboarding.review','platform'),('platform.lifecycle.manage','platform'),
 ('platform.marketplace.review','platform'),('platform.settings.read','platform'),('platform.settings.manage','platform');
INSERT INTO role_permissions(role_id,permission_id)
 SELECT 'owner',id FROM permissions WHERE id IN ('company.setup.read','company.onboarding.manage','company.brand.read','company.brand.manage','invitations.manage');
INSERT INTO role_permissions(role_id,permission_id)
 SELECT id,'company.brand.read' FROM roles WHERE scope='company' AND id<>'owner';
INSERT INTO role_permissions(role_id,permission_id)
 SELECT 'platform_admin',id FROM permissions WHERE id IN ('platform.companies.read','platform.onboarding.review','platform.lifecycle.manage','platform.marketplace.review','platform.settings.read','platform.settings.manage');
