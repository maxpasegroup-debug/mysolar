ALTER TABLE company_contacts ADD COLUMN credit_hold boolean NOT NULL DEFAULT false;
ALTER TABLE company_contacts ADD COLUMN credit_limit_paise bigint CHECK(credit_limit_paise BETWEEN 0 AND 100000000000);
