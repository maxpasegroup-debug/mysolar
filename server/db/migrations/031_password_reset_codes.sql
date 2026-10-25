CREATE TABLE password_reset_challenges (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 session_hash text NOT NULL,
 code_hash text NOT NULL,
 credential_hash text NOT NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 used_at timestamptz,
 CHECK(expires_at>created_at)
);
CREATE INDEX password_reset_challenge_user ON password_reset_challenges(user_id) WHERE used_at IS NULL;
CREATE INDEX password_reset_challenge_expiry ON password_reset_challenges(expires_at);
ALTER TABLE mail_jobs DROP CONSTRAINT mail_jobs_kind_check;
ALTER TABLE mail_jobs ADD CONSTRAINT mail_jobs_kind_check CHECK(kind IN ('verification','recovery','employee','customer','reminder','operations','pin_otp','password_otp'));
