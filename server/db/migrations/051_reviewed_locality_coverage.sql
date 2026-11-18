-- Additive only. No legacy declarations are widened, rewritten or auto-approved.
CREATE TABLE postal_localities (
 id uuid PRIMARY KEY, pin text NOT NULL REFERENCES postal_locations(pin),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
 locality_key text NOT NULL, source_reference text NOT NULL,
 reviewed_by uuid NOT NULL REFERENCES users(id), reviewed_at timestamptz NOT NULL DEFAULT now(),
 active boolean NOT NULL DEFAULT true, UNIQUE(pin,locality_key)
);
CREATE INDEX postal_localities_active_idx ON postal_localities(pin,locality_key) WHERE active;
ALTER TABLE company_service_areas ADD COLUMN locality_reference_id uuid REFERENCES postal_localities(id);
COMMENT ON COLUMN company_service_areas.locality_reference_id IS 'Only explicit owner declarations bound to reviewed reference data; legacy NULL rows are not inferred or upgraded.';
