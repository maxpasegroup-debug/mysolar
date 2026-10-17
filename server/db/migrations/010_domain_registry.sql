-- Domain foundation only. No DNS/provider resources or websites are provisioned by this migration.
CREATE TABLE company_domains (
 id uuid PRIMARY KEY,
 company_id uuid NOT NULL REFERENCES companies(id),
 hostname text NOT NULL CHECK(hostname=lower(hostname) AND length(hostname) BETWEEN 4 AND 253
   AND hostname ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$'),
 kind text NOT NULL CHECK(kind IN ('custom','platform_subdomain')),
 is_primary boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','active','suspended','removed')),
 challenge_hash text CHECK(challenge_hash ~ '^[0-9a-f]{64}$'),
 challenge_expires_at timestamptz,
 verified_at timestamptz,
 ownership_checked_at timestamptz,
 provider text NOT NULL DEFAULT 'unconfigured',
 provider_hostname_id text,
 provider_hostname_status text NOT NULL DEFAULT 'unknown' CHECK(provider_hostname_status IN ('unknown','pending','active','suspended','removed','error')),
 certificate_status text NOT NULL DEFAULT 'unknown' CHECK(certificate_status IN ('unknown','pending','active','expired','error','removed')),
 provider_checked_at timestamptz,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 deactivated_at timestamptz,
 UNIQUE(id,company_id),
 CHECK(status NOT IN ('verified','active') OR (verified_at IS NOT NULL AND ownership_checked_at IS NOT NULL)),
 CHECK(status<>'active' OR (provider<>'unconfigured' AND provider_hostname_id IS NOT NULL AND provider_hostname_status='active' AND certificate_status='active' AND provider_checked_at IS NOT NULL)),
 CHECK(status<>'pending' OR (challenge_hash IS NOT NULL AND challenge_expires_at IS NOT NULL)),
 CHECK(status<>'removed' OR (NOT is_primary AND challenge_hash IS NULL AND deactivated_at IS NOT NULL))
);
-- Removed assignments are historical. Reclaiming requires a new row and a new ownership challenge.
CREATE UNIQUE INDEX domain_hostname_claim ON company_domains(hostname) WHERE status<>'removed';
CREATE UNIQUE INDEX domain_primary_company ON company_domains(company_id) WHERE is_primary AND status<>'removed';
CREATE INDEX domain_company_directory ON company_domains(company_id,created_at DESC,id);
CREATE INDEX domain_platform_directory ON company_domains(created_at DESC,id);
CREATE INDEX domain_provider_reconcile ON company_domains(provider_checked_at,id) WHERE status IN ('verified','active','suspended');
CREATE INDEX domain_removed_cleanup ON company_domains(hostname) WHERE status='removed' AND provider_hostname_id IS NOT NULL;

CREATE FUNCTION domain_assignment_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.id,NEW.company_id,NEW.hostname,NEW.kind,NEW.created_by,NEW.created_at)
    IS DISTINCT FROM ROW(OLD.id,OLD.company_id,OLD.hostname,OLD.kind,OLD.created_by,OLD.created_at)
 THEN RAISE EXCEPTION 'Domain assignment identity is immutable'; END IF;
 IF OLD.status='removed' AND NEW.status<>'removed' THEN RAISE EXCEPTION 'Removed domain requires a new assignment'; END IF;
 IF NEW.status<>OLD.status AND NOT (
   (OLD.status='pending' AND NEW.status IN ('verified','suspended','removed')) OR
   (OLD.status='verified' AND NEW.status IN ('pending','active','suspended','removed')) OR
   (OLD.status='active' AND NEW.status IN ('pending','suspended','removed')) OR
   (OLD.status='suspended' AND NEW.status IN ('pending','removed'))
 ) THEN RAISE EXCEPTION 'Invalid domain lifecycle transition'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER domain_assignment_guard BEFORE UPDATE ON company_domains FOR EACH ROW EXECUTE FUNCTION domain_assignment_immutable();

CREATE TABLE domain_operations (
 id uuid PRIMARY KEY,
 company_id uuid NOT NULL REFERENCES companies(id),
 domain_id uuid NOT NULL,
 operation_key uuid NOT NULL,
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 assignment_revision integer NOT NULL CHECK(assignment_revision>0),
 action text NOT NULL CHECK(action IN ('register','challenge','verify','primary','setup','suspend','remove','reconcile')),
 provider text NOT NULL DEFAULT 'unconfigured',
 status text NOT NULL CHECK(status IN ('pending','running','blocked','succeeded','failed','cancelled')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 next_attempt_at timestamptz,
 last_error_code text NOT NULL DEFAULT '',
 actor_user_id uuid NOT NULL REFERENCES users(id),
 reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(domain_id,company_id) REFERENCES company_domains(id,company_id),
 UNIQUE(company_id,operation_key)
);
CREATE INDEX domain_operation_queue ON domain_operations(status,next_attempt_at,id) WHERE status IN ('pending','failed','blocked');
CREATE INDEX domain_operation_history ON domain_operations(company_id,domain_id,created_at DESC,id);

INSERT INTO permissions(id,scope) VALUES ('domains.read','company'),('domains.manage','company'),('platform.domains.read','platform'),('platform.domains.manage','platform');
INSERT INTO role_permissions(role_id,permission_id) VALUES ('owner','domains.read'),('owner','domains.manage'),('platform_admin','platform.domains.read'),('platform_admin','platform.domains.manage');
