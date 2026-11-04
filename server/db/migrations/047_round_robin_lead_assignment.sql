ALTER TABLE company_sales_controls
 ADD COLUMN lead_assignment_mode text NOT NULL DEFAULT 'manual' CHECK(lead_assignment_mode IN ('manual','round_robin')),
 ADD COLUMN last_auto_assignee_id uuid REFERENCES users(id);
