-- Forward migration only; the runner records this file once in its transaction.
-- Historical plan snapshots and the immutable Phase 2 role catalogue are unchanged.
INSERT INTO roles(id,scope,label) VALUES('part_time_sales','company','Part-Time Sales Executive');
INSERT INTO role_permissions(role_id,permission_id)
 SELECT 'part_time_sales',id FROM permissions WHERE id IN ('workspace.read','tasks.own');
INSERT INTO permissions(id,scope) VALUES('partners.read','company'),('partners.manage','company');
INSERT INTO role_permissions(role_id,permission_id) VALUES('owner','partners.read'),('owner','partners.manage');
ALTER TABLE company_invitations DROP CONSTRAINT company_invitations_role_id_check;
ALTER TABLE company_invitations ADD CHECK(role_id IN ('sales','supervisor','field_engineer','inventory_manager','accounts','part_time_sales'));
ALTER TABLE company_invitations ADD COLUMN staff_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(staff_details)='object');
ALTER TABLE company_memberships ADD COLUMN staff_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(staff_details)='object');
ALTER TABLE company_memberships ADD COLUMN staff_revision integer NOT NULL DEFAULT 1 CHECK(staff_revision>0);
CREATE INDEX memberships_territory ON company_memberships(company_id,role_id,(staff_details->>'state'),(staff_details->>'city'));
CREATE TABLE company_partner_relationships (
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),partner_company_id uuid REFERENCES companies(id),
 partner_name text NOT NULL CHECK(length(partner_name) BETWEEN 1 AND 100),email text NOT NULL CHECK(email=lower(email)),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended','revoked','declined')),
 token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,invited_by uuid NOT NULL REFERENCES users(id),
 accepted_by uuid REFERENCES users(id),accepted_at timestamptz,assignee_id uuid,
 notes text NOT NULL DEFAULT '',revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(partner_company_id IS NULL OR partner_company_id<>company_id),
 CHECK(status<>'active' OR (partner_company_id IS NOT NULL AND accepted_by IS NOT NULL AND accepted_at IS NOT NULL)),
 FOREIGN KEY(company_id,assignee_id) REFERENCES company_memberships(company_id,user_id)
);
CREATE UNIQUE INDEX partner_pending_email ON company_partner_relationships(company_id,email) WHERE status='pending';
CREATE UNIQUE INDEX partner_accepted_pair ON company_partner_relationships(least(company_id,partner_company_id),greatest(company_id,partner_company_id)) WHERE partner_company_id IS NOT NULL AND status IN ('active','suspended');
CREATE INDEX partners_owner ON company_partner_relationships(company_id,created_at DESC,id);
CREATE INDEX partners_recipient ON company_partner_relationships(partner_company_id,status);
-- This relationship is a contact/consent record, never a membership or data grant.
