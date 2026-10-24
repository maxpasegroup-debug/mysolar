-- Company-local restrictions extend, but never replace, the global role catalogue.
ALTER TABLE company_memberships ADD CONSTRAINT membership_company_identity UNIQUE(id,company_id);
CREATE TABLE company_role_profiles (
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),name text NOT NULL,
 base_role text NOT NULL REFERENCES roles(id) CHECK(base_role IN ('sales','supervisor','field_engineer','inventory_manager','accounts','part_time_sales')),
 permissions text[] NOT NULL,discount_limit_bps integer CHECK(discount_limit_bps BETWEEN 0 AND 10000),
 active boolean NOT NULL DEFAULT true,revision integer NOT NULL DEFAULT 1,
 UNIQUE(id,company_id),UNIQUE(company_id,name)
);
CREATE TABLE company_teams (
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),name text NOT NULL,
 manager_id uuid,active boolean NOT NULL DEFAULT true,revision integer NOT NULL DEFAULT 1,
 FOREIGN KEY(manager_id,company_id) REFERENCES company_memberships(id,company_id),
 UNIQUE(id,company_id),UNIQUE(company_id,name)
);
ALTER TABLE company_memberships ADD COLUMN role_profile_id uuid,
 ADD COLUMN team_id uuid,ADD COLUMN reporting_manager_id uuid,ADD COLUMN people_revision integer NOT NULL DEFAULT 1,
 ADD FOREIGN KEY(role_profile_id,company_id) REFERENCES company_role_profiles(id,company_id),
 ADD FOREIGN KEY(team_id,company_id) REFERENCES company_teams(id,company_id),
 ADD FOREIGN KEY(reporting_manager_id,company_id) REFERENCES company_memberships(id,company_id),
 ADD CHECK(reporting_manager_id IS NULL OR reporting_manager_id<>id),
 ADD CHECK(role_id<>'owner' OR role_profile_id IS NULL);
CREATE FUNCTION membership_people_revision() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN
  NEW.people_revision=OLD.people_revision+1;
  IF NEW.role_id<>OLD.role_id THEN NEW.role_profile_id=NULL; END IF;
  RETURN NEW;
 END $$;
CREATE TRIGGER membership_people_revision BEFORE UPDATE ON company_memberships FOR EACH ROW EXECUTE FUNCTION membership_people_revision();
CREATE TABLE company_sales_controls (
 company_id uuid PRIMARY KEY REFERENCES companies(id),revision integer NOT NULL DEFAULT 1,
 require_review boolean NOT NULL DEFAULT false,discount_limit_bps integer NOT NULL DEFAULT 10000 CHECK(discount_limit_bps BETWEEN 0 AND 10000),
 qualification_required boolean NOT NULL DEFAULT false,
 pipeline jsonb NOT NULL DEFAULT '[{"code":"new","label":"New","category":"new","next":["contacted","lost"]},{"code":"contacted","label":"Contacted","category":"contacted","next":["qualified","lost"]},{"code":"qualified","label":"Qualified","category":"qualified","next":["opportunity","lost"]},{"code":"opportunity","label":"Opportunity","category":"opportunity","next":["won","lost"]},{"code":"won","label":"Won","category":"won","next":[]},{"code":"lost","label":"Lost","category":"lost","next":["new"]}]'::jsonb
);
INSERT INTO company_sales_controls(company_id) SELECT id FROM companies;
CREATE FUNCTION initialize_sales_controls() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN INSERT INTO company_sales_controls(company_id) VALUES(NEW.id); RETURN NEW; END $$;
CREATE TRIGGER initialize_sales_controls AFTER INSERT ON companies FOR EACH ROW EXECUTE FUNCTION initialize_sales_controls();
ALTER TABLE crm_leads ADD COLUMN pipeline_step text NOT NULL DEFAULT 'new',
 ADD COLUMN qualification jsonb NOT NULL DEFAULT '{}',ADD COLUMN lost_reason text NOT NULL DEFAULT '';
UPDATE crm_leads SET pipeline_step=stage;
ALTER TABLE quotation_versions ADD COLUMN review_status text NOT NULL DEFAULT 'none' CHECK(review_status IN ('none','pending','approved','rejected')),
 ADD COLUMN approval_revision integer,ADD COLUMN reviewed_policy_revision integer,
 ADD COLUMN reviewer_id uuid REFERENCES users(id),ADD COLUMN approval_override boolean NOT NULL DEFAULT false;
CREATE TABLE quotation_review_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),
 version_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES users(id),action text NOT NULL,
 quote_revision integer NOT NULL,policy_revision integer NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(version_id,company_id) REFERENCES quotation_versions(id,company_id)
);
CREATE FUNCTION preserve_quote_review() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Quotation review history is immutable'; END $$;
CREATE TRIGGER preserve_quote_review BEFORE UPDATE OR DELETE ON quotation_review_events FOR EACH ROW EXECUTE FUNCTION preserve_quote_review();
INSERT INTO permissions(id,scope) VALUES('quotations.approve','company');
INSERT INTO role_permissions(role_id,permission_id) VALUES('owner','quotations.approve');
CREATE INDEX company_role_assignment ON company_memberships(company_id,role_profile_id);
ALTER TABLE company_invitations ADD COLUMN role_profile_id uuid,
 ADD FOREIGN KEY(role_profile_id,company_id) REFERENCES company_role_profiles(id,company_id);
CREATE INDEX company_team_assignment ON company_memberships(company_id,team_id);
CREATE INDEX lead_pipeline_step ON crm_leads(company_id,pipeline_step);
CREATE INDEX quote_review_pending ON quotation_versions(company_id,review_status) WHERE status='draft';
CREATE INDEX quote_review_history ON quotation_review_events(company_id,version_id,id DESC);
