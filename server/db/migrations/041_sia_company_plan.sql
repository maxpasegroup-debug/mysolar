-- Private, owner-reviewed setup intent. No memberships, grants or jobs are created.
CREATE TABLE company_workspace_plans (
 company_id uuid PRIMARY KEY REFERENCES companies(id),
 plan jsonb NOT NULL CHECK(jsonb_typeof(plan)='object' AND octet_length(plan::text)<=16000),
 updated_by uuid NOT NULL REFERENCES users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
