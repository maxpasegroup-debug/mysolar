-- Contact phone fields are deliberately not migrated into login identities.
CREATE TABLE mobile_credentials (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 mobile text NOT NULL UNIQUE CHECK(mobile ~ '^\+91[6-9][0-9]{9}$'),
 pin_hash text NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
 failed_attempts integer NOT NULL DEFAULT 0 CHECK(failed_attempts BETWEEN 0 AND 5),
 locked_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE pin_challenges (
 id uuid PRIMARY KEY,
 purpose text NOT NULL CHECK(purpose IN ('signup','enrol','reset')),
 user_id uuid REFERENCES users(id) ON DELETE CASCADE,
 email text NOT NULL,
 mobile text NOT NULL CHECK(mobile ~ '^\+91[6-9][0-9]{9}$'),
 session_hash text NOT NULL,
 credential_revision integer,
 code_hash text NOT NULL,
 context text,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 expires_at timestamptz NOT NULL,
 used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(expires_at > created_at),
 CHECK((purpose='signup' AND user_id IS NULL AND context IS NOT NULL) OR (purpose IN ('enrol','reset') AND user_id IS NOT NULL))
);
CREATE INDEX pin_challenges_email_purpose ON pin_challenges(email,purpose,created_at DESC);
CREATE INDEX pin_challenges_expiry ON pin_challenges(expires_at);
ALTER TABLE mail_jobs DROP CONSTRAINT mail_jobs_kind_check;
ALTER TABLE mail_jobs ADD CONSTRAINT mail_jobs_kind_check CHECK(kind IN ('verification','recovery','employee','customer','reminder','operations','pin_otp'));
