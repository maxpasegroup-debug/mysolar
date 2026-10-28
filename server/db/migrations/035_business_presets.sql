-- Keep existing marketplace classifications and permissions unchanged.
-- NULL preserves legacy clients; their current business_type supplies the default.
ALTER TABLE company_profiles ADD COLUMN business_preset text;
ALTER TABLE company_profiles ADD CONSTRAINT company_business_preset_valid CHECK (
 business_preset IS NULL OR
 (business_preset IN ('distributor','dealer') AND business_type='distributor') OR
 (business_preset='installer' AND business_type='installer') OR
 (business_preset='both' AND business_type='both')
);
