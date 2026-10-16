-- SIA stores scoped request metadata and user prompts, not retrieved business snapshots.
INSERT INTO permissions(id,scope) VALUES ('customer.sia.own','customer');
INSERT INTO role_permissions(role_id,permission_id) VALUES ('customer','customer.sia.own');
INSERT INTO role_permissions(role_id,permission_id) SELECT id,'sia.read' FROM roles WHERE id IN ('sales','supervisor','field_engineer','inventory_manager','accounts') ON CONFLICT DO NOTHING;
CREATE TABLE sia_requests (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), company_id uuid REFERENCES companies(id),
 access_key text NOT NULL, fingerprint text NOT NULL, tool text NOT NULL, input jsonb NOT NULL,
 prompt text NOT NULL CHECK(length(prompt)<=1200), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','failed')),
 mode text, input_tokens integer, output_tokens integer, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE INDEX sia_history_scope ON sia_requests(user_id,access_key,created_at DESC);
CREATE TABLE sia_usage (
 scope_key text NOT NULL, day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
 requests integer NOT NULL DEFAULT 0, PRIMARY KEY(scope_key,day)
);
CREATE TABLE sia_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), company_id uuid REFERENCES companies(id),
 request_id uuid, event text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sia_events_scope ON sia_events(company_id,user_id,created_at DESC);
CREATE TABLE sia_proposals (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), company_id uuid NOT NULL REFERENCES companies(id),
 access_key text NOT NULL, session_hash text NOT NULL, token_hash text NOT NULL, payload_hash text NOT NULL,
 payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','executed','rejected')),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes', created_at timestamptz NOT NULL DEFAULT now(), result jsonb
);
CREATE INDEX sia_proposal_owner ON sia_proposals(user_id,company_id,created_at DESC);
