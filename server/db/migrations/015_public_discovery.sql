CREATE TABLE postal_locations (
 pin text PRIMARY KEY CHECK(pin~'^[1-9][0-9]{5}$'),state text NOT NULL,district text NOT NULL,
 state_key text NOT NULL,district_key text NOT NULL,source_reference text NOT NULL,
 reviewed_by uuid NOT NULL REFERENCES users(id),reviewed_at timestamptz NOT NULL DEFAULT now(),active boolean NOT NULL DEFAULT true
);
CREATE INDEX postal_region ON postal_locations(state_key,district_key) WHERE active;
