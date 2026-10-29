-- Reviewed trial scope references immutable existing plan terms; no price or plan seed.
CREATE TABLE os_trial_configuration (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 plan_version_id uuid NOT NULL REFERENCES commercial_plan_versions(id),
 enabled boolean NOT NULL,revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_by uuid NOT NULL REFERENCES users(id),reason text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
-- Preserve older consent snapshots while distinguishing paid conversion from
-- the superseded upfront-trial mandate flow. Prior trial dates are retained as history.
ALTER TABLE os_billing_contracts ADD COLUMN purpose text NOT NULL DEFAULT 'legacy_trial_mandate'
 CHECK(purpose IN ('legacy_trial_mandate','post_trial_subscription'));
CREATE FUNCTION os_billing_purpose_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.purpose IS DISTINCT FROM OLD.purpose THEN RAISE EXCEPTION 'Billing purpose is immutable';END IF;RETURN NEW;
END; $$;
CREATE TRIGGER os_contract_purpose BEFORE UPDATE ON os_billing_contracts FOR EACH ROW EXECUTE FUNCTION os_billing_purpose_immutable();
