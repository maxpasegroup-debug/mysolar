-- Never merge existing identities or silently choose between shared addresses.
DO $$ BEGIN IF EXISTS(SELECT lower(email) FROM users GROUP BY lower(email) HAVING count(*)>1) THEN
 RAISE EXCEPTION 'Shared email identities require reviewed separation before migration 032' USING ERRCODE='23514';
END IF;END $$;
CREATE UNIQUE INDEX users_email_global_ci ON users(lower(email));
DROP INDEX users_email_account_type;
CREATE TABLE registration_challenges (
 id uuid PRIMARY KEY,email text NOT NULL,session_hash text NOT NULL,
 code_hash text NOT NULL,context text,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL,used_at timestamptz,
 CHECK(expires_at>created_at),CHECK(used_at IS NOT NULL OR context IS NOT NULL)
);
CREATE INDEX registration_challenge_identity ON registration_challenges(email,session_hash) WHERE used_at IS NULL;
CREATE INDEX registration_challenge_expiry ON registration_challenges(expires_at);
ALTER TABLE mail_jobs DROP CONSTRAINT mail_jobs_kind_check;
ALTER TABLE mail_jobs ADD CONSTRAINT mail_jobs_kind_check CHECK(kind IN ('verification','recovery','employee','customer','reminder','operations','pin_otp','password_otp','registration_otp'));
