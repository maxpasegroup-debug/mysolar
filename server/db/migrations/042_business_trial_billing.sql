ALTER TABLE registration_challenges ADD COLUMN verified_at timestamptz;
ALTER TABLE company_subscriptions DROP CONSTRAINT company_subscriptions_activation_source_check;
ALTER TABLE company_subscriptions ADD CONSTRAINT company_subscriptions_activation_source_check CHECK(activation_source IN ('manual_administration','owner_trial','razorpay_verified'));
-- No existing company is silently moved off its agreed/pre-billing access.
CREATE TABLE company_os_enrolment(company_id uuid PRIMARY KEY REFERENCES companies(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION company_os_enrol_new() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 INSERT INTO company_os_enrolment(company_id) VALUES(NEW.id);RETURN NEW;
END; $$;
CREATE TRIGGER company_os_enrol_after_insert AFTER INSERT ON companies FOR EACH ROW EXECUTE FUNCTION company_os_enrol_new();
CREATE TABLE razorpay_plan_mappings(
 plan_version_id uuid PRIMARY KEY REFERENCES commercial_plan_versions(id),provider_plan_id text NOT NULL UNIQUE CHECK(provider_plan_id ~ '^plan_[A-Za-z0-9]+$'),
 mode text NOT NULL CHECK(mode IN ('test','live')),total_count integer NOT NULL CHECK(total_count BETWEEN 1 AND 1000),
 created_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE os_billing_contracts(
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),owner_id uuid NOT NULL REFERENCES users(id),operation_key uuid NOT NULL,
 plan_id uuid NOT NULL REFERENCES commercial_plans(id),plan_version_id uuid NOT NULL REFERENCES commercial_plan_versions(id),terms jsonb NOT NULL,setup_terms jsonb NOT NULL,
 settings_version_id bigint NOT NULL REFERENCES commercial_settings_versions(id),commercial_revision integer NOT NULL,mode text NOT NULL CHECK(mode IN ('test','live')),
 state text NOT NULL CHECK(state IN ('preparing','created','unknown','trial','paid','cancel_requested','cancelled','failed','review_required')),
 provider_subscription_id text UNIQUE,checkout_url text CHECK(checkout_url IS NULL OR checkout_url ~ '^https://rzp[.]io/'),trial_start timestamptz NOT NULL,trial_end timestamptz NOT NULL CHECK(trial_end=trial_start+interval '168 hours'),
 consent_at timestamptz NOT NULL DEFAULT now(),consent_version text NOT NULL DEFAULT 'os-trial-v1',last_provider_at bigint NOT NULL DEFAULT 0,
 UNIQUE(company_id,operation_key)
);
CREATE UNIQUE INDEX os_one_unresolved_contract ON os_billing_contracts(company_id) WHERE state NOT IN ('cancelled','failed');
CREATE TABLE os_billing_events(payload_hash text PRIMARY KEY,provider_event_id text NOT NULL UNIQUE,contract_id uuid REFERENCES os_billing_contracts(id),kind text NOT NULL,received_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE os_billing_payments(provider_payment_id text PRIMARY KEY,contract_id uuid NOT NULL REFERENCES os_billing_contracts(id),amount_paise bigint NOT NULL CHECK(amount_paise>0),currency text NOT NULL CHECK(currency='INR'),period_start timestamptz NOT NULL,period_end timestamptz NOT NULL CHECK(period_end>period_start),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE os_trial_reminders(contract_id uuid NOT NULL REFERENCES os_billing_contracts(id),day integer NOT NULL CHECK(day IN (5,6,7)),due_at timestamptz NOT NULL,mail_id uuid REFERENCES mail_jobs(id),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','queued','cancelled','blocked')),PRIMARY KEY(contract_id,day));
ALTER TABLE mail_jobs DROP CONSTRAINT mail_jobs_kind_check;
ALTER TABLE mail_jobs ADD CONSTRAINT mail_jobs_kind_check CHECK(kind IN ('verification','recovery','employee','customer','reminder','operations','pin_otp','password_otp','registration_otp','billing_reminder'));
CREATE INDEX os_trial_reminder_due ON os_trial_reminders(due_at) WHERE status='pending';
CREATE FUNCTION os_billing_snapshot_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF ROW(NEW.company_id,NEW.owner_id,NEW.operation_key,NEW.plan_id,NEW.plan_version_id,NEW.terms,NEW.setup_terms,NEW.settings_version_id,NEW.mode,NEW.trial_start,NEW.trial_end,NEW.consent_at,NEW.consent_version)
 IS DISTINCT FROM ROW(OLD.company_id,OLD.owner_id,OLD.operation_key,OLD.plan_id,OLD.plan_version_id,OLD.terms,OLD.setup_terms,OLD.settings_version_id,OLD.mode,OLD.trial_start,OLD.trial_end,OLD.consent_at,OLD.consent_version)
 OR OLD.provider_subscription_id IS NOT NULL AND NEW.provider_subscription_id IS DISTINCT FROM OLD.provider_subscription_id
 OR OLD.checkout_url IS NOT NULL AND NEW.checkout_url IS DISTINCT FROM OLD.checkout_url
 THEN RAISE EXCEPTION 'Approved billing consent cannot be rewritten';END IF;RETURN NEW;
END; $$;
CREATE TRIGGER os_contract_snapshot BEFORE UPDATE ON os_billing_contracts FOR EACH ROW EXECUTE FUNCTION os_billing_snapshot_immutable();
CREATE TRIGGER os_contract_no_delete BEFORE DELETE ON os_billing_contracts FOR EACH ROW EXECUTE FUNCTION commercial_immutable();
CREATE TRIGGER razorpay_mapping_immutable BEFORE UPDATE OR DELETE ON razorpay_plan_mappings FOR EACH ROW EXECUTE FUNCTION commercial_immutable();
CREATE TRIGGER os_events_immutable BEFORE UPDATE OR DELETE ON os_billing_events FOR EACH ROW EXECUTE FUNCTION commercial_immutable();
CREATE TRIGGER os_payments_immutable BEFORE UPDATE OR DELETE ON os_billing_payments FOR EACH ROW EXECUTE FUNCTION commercial_immutable();
-- Preserve legacy policy and agreements; only newly enrolled companies need trial activation.
ALTER FUNCTION commercial_policy(uuid) RENAME TO commercial_policy_before_os_trial;
CREATE FUNCTION commercial_policy(target uuid) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE result jsonb; BEGIN
 result:=commercial_policy_before_os_trial(target);
 IF target IS NOT NULL AND EXISTS(SELECT 1 FROM company_os_enrolment WHERE company_id=target) THEN
  result:=jsonb_set(result,'{features,storefront}','true'::jsonb,true);
  IF NOT EXISTS(SELECT 1 FROM company_commercial_state WHERE company_id=target AND current_subscription_id IS NOT NULL) THEN
   result:=result||jsonb_build_object('mode','trial_required','status','not_configured','writable',false);
  END IF;
 END IF;RETURN result;
END; $$;
CREATE OR REPLACE FUNCTION commercial_public_allowed(target uuid,feature text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN feature='storefront' AND EXISTS(SELECT 1 FROM company_os_enrolment WHERE company_id=target) THEN true ELSE coalesce((commercial_policy(target)->>'writable')::boolean,false) AND coalesce((commercial_policy(target)->'features'->>feature)::boolean,false) END;
$$;
