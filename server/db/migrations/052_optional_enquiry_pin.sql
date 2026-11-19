-- District-based enquiry routing does not require a postal PIN. Existing PINs
-- remain unchanged and supplied PINs must still use the six-digit format.
ALTER TABLE customer_enquiries DROP CONSTRAINT customer_enquiries_pin_check;
ALTER TABLE customer_enquiries ALTER COLUMN pin SET DEFAULT '';
ALTER TABLE customer_enquiries ADD CONSTRAINT customer_enquiries_pin_check
  CHECK (pin = '' OR pin ~ '^[1-9][0-9]{5}$');
