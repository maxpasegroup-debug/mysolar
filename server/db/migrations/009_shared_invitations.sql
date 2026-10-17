-- Add production-safe, recipient-bound sharing without changing historical migrations.
ALTER TABLE company_invitations DROP CONSTRAINT company_invitations_delivery_check;
ALTER TABLE company_invitations ADD CONSTRAINT company_invitations_delivery_check CHECK(delivery IN ('email','manual','share'));

CREATE TABLE customer_access_invitations (
 id uuid PRIMARY KEY,
 company_id uuid NOT NULL REFERENCES companies(id),
 contact_id uuid NOT NULL,
 email text NOT NULL CHECK(email=lower(email) AND length(email) BETWEEN 3 AND 254),
 contact_revision integer NOT NULL CHECK(contact_revision>0),
 token_hash text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked','delivery_failed')),
 delivery text NOT NULL CHECK(delivery IN ('email','share')),
 invited_by uuid NOT NULL REFERENCES users(id),
 accepted_by uuid REFERENCES users(id),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 accepted_at timestamptz,
 FOREIGN KEY(contact_id,company_id) REFERENCES company_contacts(id,company_id)
);
CREATE UNIQUE INDEX customer_access_pending ON customer_access_invitations(company_id,contact_id) WHERE status='pending';
CREATE INDEX customer_access_company ON customer_access_invitations(company_id,created_at DESC);
