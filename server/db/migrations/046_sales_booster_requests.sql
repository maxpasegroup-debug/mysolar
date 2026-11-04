ALTER TABLE mail_jobs DROP CONSTRAINT mail_jobs_kind_check;
ALTER TABLE mail_jobs ADD CONSTRAINT mail_jobs_kind_check CHECK(kind IN ('verification','recovery','employee','customer','reminder','operations','pin_otp','password_otp','registration_otp','billing_reminder','sales_booster'));
