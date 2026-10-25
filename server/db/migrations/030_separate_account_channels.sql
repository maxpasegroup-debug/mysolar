-- Recovery addresses may be shared across purposes, never a login/mobile identity.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM users u WHERE
 (EXISTS(SELECT 1 FROM company_memberships m WHERE m.user_id=u.id) OR EXISTS(SELECT 1 FROM companies c WHERE c.created_by=u.id))
 AND (EXISTS(SELECT 1 FROM customer_enquiries e WHERE e.customer_id=u.id) OR EXISTS(SELECT 1 FROM company_contacts x WHERE x.user_id=u.id)))
 THEN RAISE EXCEPTION 'Mixed customer/business identities require reviewed separation before migration 030' USING ERRCODE='23514';END IF;END $$;
ALTER TABLE users ADD COLUMN account_type text CHECK(account_type IN ('customer','business'));
UPDATE users u SET account_type=CASE WHEN EXISTS(SELECT 1 FROM company_memberships m WHERE m.user_id=u.id)
 OR EXISTS(SELECT 1 FROM companies c WHERE c.created_by=u.id)
 OR EXISTS(SELECT 1 FROM platform_admin_grants g WHERE g.user_id=u.id) THEN 'business' ELSE 'customer' END;
ALTER TABLE users DROP CONSTRAINT users_email_key;
CREATE UNIQUE INDEX users_email_account_type ON users(email,coalesce(account_type,'legacy'));
CREATE FUNCTION preserve_account_type() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.account_type IS NOT NULL AND NEW.account_type IS DISTINCT FROM OLD.account_type THEN
 RAISE EXCEPTION 'Account purpose cannot be converted; register a separate mobile identity' USING ERRCODE='23514';END IF;RETURN NEW;END $$;
CREATE TRIGGER account_type_immutable BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION preserve_account_type();
CREATE FUNCTION business_membership_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM users WHERE id=NEW.user_id AND account_type='customer') THEN
 RAISE EXCEPTION 'Use a separate business account for company membership' USING ERRCODE='23514';END IF;RETURN NEW;END $$;
CREATE TRIGGER business_membership_account BEFORE INSERT OR UPDATE ON company_memberships FOR EACH ROW EXECUTE FUNCTION business_membership_identity();
CREATE INDEX pin_challenge_identity ON pin_challenges(mobile,purpose) WHERE used_at IS NULL;
