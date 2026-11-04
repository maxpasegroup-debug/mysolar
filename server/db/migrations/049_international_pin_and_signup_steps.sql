ALTER TABLE mobile_credentials DROP CONSTRAINT mobile_credentials_mobile_check;
ALTER TABLE mobile_credentials ADD CONSTRAINT mobile_credentials_mobile_check CHECK(mobile ~ '^\+[1-9][0-9]{7,14}$');
ALTER TABLE pin_challenges DROP CONSTRAINT pin_challenges_mobile_check;
ALTER TABLE pin_challenges ADD CONSTRAINT pin_challenges_mobile_check CHECK(mobile ~ '^\+[1-9][0-9]{7,14}$');
ALTER TABLE pin_challenges ADD COLUMN otp_verified_at timestamptz;
