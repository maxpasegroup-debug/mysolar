CREATE TABLE company_work_reports (
 id uuid PRIMARY KEY,
 company_id uuid NOT NULL REFERENCES companies(id),
 user_id uuid NOT NULL REFERENCES users(id),
 operation_key uuid NOT NULL,
 report_date date NOT NULL,
 report_hour smallint NOT NULL CHECK(report_hour BETWEEN 0 AND 23),
 work_summary text NOT NULL CHECK(length(work_summary) BETWEEN 4 AND 800),
 progress text NOT NULL DEFAULT '' CHECK(length(progress)<=800),
 blockers text NOT NULL DEFAULT '' CHECK(length(blockers)<=800),
 next_step text NOT NULL DEFAULT '' CHECK(length(next_step)<=500),
 manager_note text NOT NULL DEFAULT '' CHECK(length(manager_note)<=800),
 reviewed_by uuid REFERENCES users(id),
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,user_id,operation_key),
 UNIQUE(company_id,user_id,report_date,report_hour),
 FOREIGN KEY(company_id,user_id) REFERENCES company_memberships(company_id,user_id)
);
CREATE INDEX company_work_reports_date ON company_work_reports(company_id,report_date DESC,user_id);
CREATE INDEX company_work_reports_user_date ON company_work_reports(company_id,user_id,report_date DESC);
INSERT INTO permissions(id,scope) VALUES('workreports.own','company'),('workreports.team','company'),('workreports.review','company');
INSERT INTO role_permissions(role_id,permission_id) SELECT id,'workreports.own' FROM roles WHERE scope='company' AND id<>'owner';
INSERT INTO role_permissions(role_id,permission_id) VALUES('owner','workreports.own'),('owner','workreports.team'),('owner','workreports.review'),('supervisor','workreports.team'),('supervisor','workreports.review') ON CONFLICT DO NOTHING;
UPDATE company_role_profiles SET permissions=array_append(permissions,'workreports.own') WHERE active AND NOT ('workreports.own'=ANY(permissions));
