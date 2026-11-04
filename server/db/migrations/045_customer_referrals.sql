CREATE TABLE referral_program_control (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),enabled boolean NOT NULL DEFAULT false,
 reward_amount_paise bigint CHECK(reward_amount_paise IS NULL OR reward_amount_paise>0),
 payout_method text CHECK(payout_method IS NULL OR payout_method='manual_external'),
 rules_version integer NOT NULL DEFAULT 1 CHECK(rules_version>0),updated_by uuid REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT enabled OR (reward_amount_paise IS NOT NULL AND payout_method IS NOT NULL))
);
INSERT INTO referral_program_control(id) VALUES(true);
CREATE TABLE customer_referral_codes (
 user_id uuid PRIMARY KEY REFERENCES users(id),code text NOT NULL UNIQUE CHECK(code ~ '^[A-F0-9]{10}$'),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE customer_referrals (
 id uuid PRIMARY KEY,referrer_user_id uuid NOT NULL REFERENCES users(id),referred_user_id uuid NOT NULL UNIQUE REFERENCES users(id),
 code text NOT NULL REFERENCES customer_referral_codes(code),rules_version integer NOT NULL,
 status text NOT NULL DEFAULT 'awaiting_installation' CHECK(status IN ('awaiting_installation','pending_review','eligible','rejected','cancelled','disputed')),
 dispute_previous_status text CHECK(dispute_previous_status IS NULL OR dispute_previous_status IN ('awaiting_installation','pending_review','eligible','rejected','cancelled')),
 outcome_project_id uuid UNIQUE REFERENCES installation_projects(id),outcome_reference text NOT NULL DEFAULT '',reward_amount_paise bigint CHECK(reward_amount_paise IS NULL OR reward_amount_paise>0),
 payout_status text NOT NULL DEFAULT 'not_earned' CHECK(payout_status IN ('not_earned','pending','recorded','held')),
 payout_reference text NOT NULL DEFAULT '',paid_at date,review_reference text NOT NULL DEFAULT '',review_reason text NOT NULL DEFAULT '',fraud_checks_confirmed boolean NOT NULL DEFAULT false,reviewed_by uuid REFERENCES users(id),reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(referrer_user_id<>referred_user_id),CHECK((payout_status<>'recorded') OR (payout_reference<>'' AND paid_at IS NOT NULL))
);
CREATE TABLE customer_referral_disputes (
 id uuid PRIMARY KEY,referral_id uuid NOT NULL REFERENCES customer_referrals(id),opened_by uuid NOT NULL REFERENCES users(id),message text NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),resolution text NOT NULL DEFAULT '',resolved_by uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz
);
CREATE INDEX customer_referrals_referrer ON customer_referrals(referrer_user_id,created_at DESC);
CREATE INDEX customer_referrals_status ON customer_referrals(status,created_at);
CREATE UNIQUE INDEX customer_referral_payout_reference ON customer_referrals(payout_reference) WHERE payout_reference<>'';
INSERT INTO permissions(id,scope) VALUES ('platform.referrals.read','platform'),('platform.referrals.manage','platform');
INSERT INTO role_permissions(role_id,permission_id) VALUES ('platform_admin','platform.referrals.read'),('platform_admin','platform.referrals.manage');
