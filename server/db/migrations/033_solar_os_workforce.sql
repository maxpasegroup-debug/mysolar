-- Read-only company auditor. No mutation, financial posting or sign-off grants.
INSERT INTO roles(id,scope,label) VALUES('auditor','company','Read-only Auditor');
INSERT INTO role_permissions(role_id,permission_id) VALUES
 ('auditor','workspace.read'),('auditor','company.read'),('auditor','company.setup.read'),('auditor','members.read'),('auditor','audit.read');
ALTER TABLE company_invitations DROP CONSTRAINT company_invitations_role_id_check;
ALTER TABLE company_invitations ADD CONSTRAINT company_invitations_role_id_check CHECK(role_id IN ('sales','supervisor','field_engineer','inventory_manager','accounts','auditor','part_time_sales'));
ALTER TABLE company_role_profiles DROP CONSTRAINT company_role_profiles_base_role_check;
ALTER TABLE company_role_profiles ADD CONSTRAINT company_role_profiles_base_role_check CHECK(base_role IN ('sales','supervisor','field_engineer','inventory_manager','accounts','auditor','part_time_sales'));
