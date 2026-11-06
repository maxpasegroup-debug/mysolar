CREATE TABLE razorpay_webhook_inbox (
 id uuid PRIMARY KEY,
 provider_mode text NOT NULL CHECK(provider_mode IN ('test','live')),
 provider_event_id text NOT NULL CHECK(length(provider_event_id) BETWEEN 1 AND 200),
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
 event_type text NOT NULL CHECK(event_type IN ('subscription.authenticated','subscription.activated','subscription.charged','subscription.cancelled','subscription.completed','subscription.halted','subscription.pending','subscription.paused','subscription.resumed','subscription.updated')),
 provider_subscription_id text NOT NULL CHECK(provider_subscription_id ~ '^sub_[A-Za-z0-9]{1,100}$'),
 contract_id uuid REFERENCES os_billing_contracts(id),
 encrypted_payload text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','retry','processed','dead','review_required')),
 attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count BETWEEN 0 AND 8),
 available_at timestamptz NOT NULL DEFAULT now(),
 received_at timestamptz NOT NULL DEFAULT now(),
 claimed_at timestamptz,
 lease_expires_at timestamptz,
 claim_token uuid,
 last_error_code text CHECK(last_error_code IS NULL OR last_error_code ~ '^[A-Z0-9_]{1,80}$'),
 completed_at timestamptz,
 UNIQUE(provider_mode,provider_event_id),
 UNIQUE(provider_mode,payload_hash),
 CHECK((status='processing' AND claimed_at IS NOT NULL AND lease_expires_at IS NOT NULL AND claim_token IS NOT NULL) OR (status<>'processing' AND claimed_at IS NULL AND lease_expires_at IS NULL AND claim_token IS NULL)),
 CHECK((status='processed')=(completed_at IS NOT NULL))
);
CREATE INDEX razorpay_webhook_inbox_ready ON razorpay_webhook_inbox(provider_mode,available_at,received_at,id) WHERE status IN ('pending','retry');
CREATE INDEX razorpay_webhook_inbox_lease ON razorpay_webhook_inbox(provider_mode,lease_expires_at,received_at,id) WHERE status='processing';
CREATE INDEX razorpay_webhook_inbox_history ON razorpay_webhook_inbox(received_at DESC,id);
CREATE INDEX razorpay_webhook_inbox_contract ON razorpay_webhook_inbox(contract_id,received_at DESC) WHERE contract_id IS NOT NULL;
