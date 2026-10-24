-- Extend the existing operational records; preserve original milestones and history.
ALTER TABLE operations_events ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}';
ALTER TABLE project_milestones DROP CONSTRAINT project_milestones_code_check,
 DROP CONSTRAINT project_milestones_status_check;
ALTER TABLE project_milestones ADD CHECK(code ~ '^[a-z][a-z0-9_]{0,39}$'),
 ADD CHECK(status IN ('pending','in_progress','blocked','done','not_applicable')),
 ADD COLUMN title text NOT NULL DEFAULT '',ADD COLUMN position integer,
 ADD COLUMN start_date date,ADD COLUMN due_date date,ADD COLUMN completed_at timestamptz,
 ADD COLUMN assignee_id uuid,ADD COLUMN blocker_reason text NOT NULL DEFAULT '',
 ADD COLUMN evidence_required boolean NOT NULL DEFAULT false,
 ADD COLUMN field_editable boolean NOT NULL DEFAULT false,
 ADD COLUMN customer_visible boolean NOT NULL DEFAULT true,
 ADD FOREIGN KEY(company_id,assignee_id) REFERENCES company_memberships(company_id,user_id),
 ADD CHECK(start_date IS NULL OR due_date IS NULL OR start_date<=due_date),
 ADD UNIQUE(project_id,company_id,code);
UPDATE project_milestones SET title=initcap(replace(code,'_',' ')),
 position=CASE code WHEN 'survey' THEN 10 WHEN 'design' THEN 20 WHEN 'materials' THEN 30 WHEN 'schedule' THEN 40 WHEN 'installation' THEN 50 WHEN 'inspection' THEN 60 WHEN 'commissioning' THEN 70 WHEN 'handover' THEN 80 END,
 evidence_required=code IN ('inspection','commissioning','handover'),field_editable=code IN ('survey','installation'),
 completed_at=CASE WHEN status='done' THEN updated_at ELSE NULL END;
ALTER TABLE project_milestones ALTER COLUMN position SET NOT NULL,
 ADD CHECK(position BETWEEN 1 AND 10000),ADD UNIQUE(project_id,position);
ALTER TABLE business_tasks ADD COLUMN start_date date,ADD COLUMN completed_at timestamptz,
 ADD COLUMN milestone_code text,ADD COLUMN blocker_reason text NOT NULL DEFAULT '',
 ADD COLUMN evidence_reference text NOT NULL DEFAULT '',ADD COLUMN evidence_required boolean NOT NULL DEFAULT false,
 ADD CHECK(start_date IS NULL OR due_date IS NULL OR start_date<=due_date),
 ADD CHECK(milestone_code IS NULL OR project_id IS NOT NULL),
 ADD FOREIGN KEY(project_id,company_id,milestone_code) REFERENCES project_milestones(project_id,company_id,code);
CREATE TABLE task_dependencies (
 company_id uuid NOT NULL REFERENCES companies(id),task_id uuid NOT NULL,depends_on_id uuid NOT NULL,
 created_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(task_id,depends_on_id),CHECK(task_id<>depends_on_id),
 FOREIGN KEY(task_id,company_id) REFERENCES business_tasks(id,company_id),
 FOREIGN KEY(depends_on_id,company_id) REFERENCES business_tasks(id,company_id)
);
CREATE TABLE task_checklist (
 id uuid PRIMARY KEY,company_id uuid NOT NULL,task_id uuid NOT NULL,label text NOT NULL,
 required boolean NOT NULL DEFAULT true,done boolean NOT NULL DEFAULT false,active boolean NOT NULL DEFAULT true,
 evidence_reference text NOT NULL DEFAULT '',notes text NOT NULL DEFAULT '',
 completed_by uuid REFERENCES users(id),completed_at timestamptz,
 FOREIGN KEY(task_id,company_id) REFERENCES business_tasks(id,company_id),UNIQUE(id,company_id)
);
CREATE INDEX task_dependency_reverse ON task_dependencies(company_id,depends_on_id);
CREATE INDEX task_checklist_record ON task_checklist(company_id,task_id) WHERE active;
CREATE INDEX project_open_tasks ON business_tasks(company_id,project_id,assignee_id) WHERE status NOT IN ('completed','cancelled');
CREATE INDEX stage_employee_work ON project_milestones(company_id,assignee_id) WHERE status NOT IN ('done','not_applicable');
