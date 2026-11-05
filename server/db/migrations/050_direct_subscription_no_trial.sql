-- New company subscriptions start directly; historic trials and agreements remain unchanged.
-- The inline CHECK in migration 042 receives a generated Postgres constraint name.
-- Find the 168-hour trial-date check by its definition so deployments created by
-- different PostgreSQL versions or restored schemas do not depend on that name.
DO $$
DECLARE trial_check record;
BEGIN
 FOR trial_check IN
  SELECT conname
    FROM pg_constraint
   WHERE conrelid='os_billing_contracts'::regclass
     AND contype='c'
     AND pg_get_constraintdef(oid) ILIKE '%trial_end%'
     AND pg_get_constraintdef(oid) ILIKE '%168%'
 LOOP
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', 'os_billing_contracts'::regclass, trial_check.conname);
 END LOOP;
END $$;
ALTER TABLE os_billing_contracts ALTER COLUMN trial_start DROP NOT NULL;
ALTER TABLE os_billing_contracts ALTER COLUMN trial_end DROP NOT NULL;
ALTER TABLE os_billing_contracts ADD CONSTRAINT os_billing_contracts_trial_dates_check
 CHECK((trial_start IS NULL AND trial_end IS NULL) OR
       (trial_start IS NOT NULL AND trial_end=trial_start+interval '168 hours'));
ALTER TABLE os_billing_contracts DROP CONSTRAINT os_billing_contracts_purpose_check;
ALTER TABLE os_billing_contracts ADD CONSTRAINT os_billing_contracts_purpose_check
 CHECK(purpose IN ('legacy_trial_mandate','post_trial_subscription','direct_subscription'));

-- The new onboarding journey does not offer trials. Keep trial support for existing records only.
CREATE OR REPLACE FUNCTION commercial_policy(target uuid) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE result jsonb; BEGIN
 result:=commercial_policy_before_os_trial(target);
 IF target IS NOT NULL AND EXISTS(SELECT 1 FROM company_os_enrolment WHERE company_id=target) THEN
  result:=jsonb_set(result,'{features,storefront}','true'::jsonb,true);
  IF NOT EXISTS(SELECT 1 FROM company_commercial_state WHERE company_id=target AND current_subscription_id IS NOT NULL) THEN
   result:=result||jsonb_build_object('mode','subscription_required','status','not_subscribed','writable',false);
  END IF;
 END IF;RETURN result;
END; $$;
