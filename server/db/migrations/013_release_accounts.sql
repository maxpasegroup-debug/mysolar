-- Forward-only account protection and encrypted transactional mail outbox.
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
ALTER TABLE sessions ADD COLUMN mfa_verified_at timestamptz;
CREATE TABLE account_security (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 pending_secret text, pending_expires_at timestamptz, secret text,
 last_counter bigint NOT NULL DEFAULT -1,
 recovery_hashes text[] NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE email_verifications (
 token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 email text NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_verification_user ON email_verifications(user_id);
CREATE TABLE mail_jobs (
 id uuid PRIMARY KEY,kind text NOT NULL CHECK(kind IN ('verification','recovery','employee','customer','reminder')),
 user_id uuid REFERENCES users(id),company_id uuid REFERENCES companies(id),recipient text NOT NULL,
 reference_hash text, payload text,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','retry','accepted','cancelled','dead')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),available_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,lease_until timestamptz,claim_token uuid,last_code text,
 created_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz
);
CREATE INDEX mail_jobs_due ON mail_jobs(status,available_at);
CREATE INDEX mail_jobs_company ON mail_jobs(company_id,created_at DESC);
CREATE TABLE mail_attempts (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,job_id uuid NOT NULL REFERENCES mail_jobs(id) ON DELETE CASCADE,
 attempt integer NOT NULL,outcome text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE process_heartbeats (
 name text PRIMARY KEY,last_at timestamptz NOT NULL,last_status text NOT NULL
);
