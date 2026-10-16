CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) <= 254),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE customer_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','ml','ta')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE roles (
  id text PRIMARY KEY,
  scope text NOT NULL CHECK (scope IN ('company','customer','platform')),
  label text NOT NULL,
  UNIQUE(id, scope)
);
CREATE TABLE permissions (id text PRIMARY KEY, scope text NOT NULL CHECK (scope IN ('company','customer','platform')));
CREATE TABLE role_permissions (
  role_id text NOT NULL REFERENCES roles(id),
  permission_id text NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE companies (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  city text NOT NULL CHECK (length(city) BETWEEN 1 AND 100),
  business_email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  storefront_description text NOT NULL DEFAULT '',
  storefront_published boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE company_memberships (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role_id text NOT NULL,
  role_scope text NOT NULL DEFAULT 'company' CHECK (role_scope = 'company'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(role_id, role_scope) REFERENCES roles(id, scope),
  UNIQUE (company_id, user_id)
);
CREATE INDEX memberships_user_idx ON company_memberships(user_id, status);
CREATE TABLE platform_admin_grants (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  role_id text NOT NULL DEFAULT 'platform_admin' CHECK (role_id = 'platform_admin'),
  role_scope text NOT NULL DEFAULT 'platform' CHECK (role_scope = 'platform'),
  reason text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(role_id, role_scope) REFERENCES roles(id, scope)
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  active_company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE password_reset_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE INDEX reset_user_idx ON password_reset_tokens(user_id);
CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id),
  company_id uuid REFERENCES companies(id),
  action text NOT NULL,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_company_idx ON audit_events(company_id, created_at DESC);
CREATE TABLE rate_limit_buckets (
  key_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (key_hash, window_start)
);
