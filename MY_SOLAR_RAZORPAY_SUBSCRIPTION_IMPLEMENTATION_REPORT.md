# MY SOLAR SOLUTIONS — Subscription implementation report

**Reviewed:** 6 November 2026

## Existing implementation

- **Plan presentation:** `src/business-access.js` shows proposed Starter, Pro, Elite and custom Enterprise scopes. It labels the prices as proposals before GST; the cards do not directly start checkout.
- **Eligibility:** `server/commercial/os-routes.js` enables a plan only when its current version is billable, an exact Razorpay mapping exists, the app's mode matches, billing configuration is available, the company is eligible and legal/tax review passes.
- **Checkout:** `server/commercial/os-billing.js` records owner consent against a plan version, creates an idempotent contract and requests a Razorpay recurring subscription. It rejects duplicate unresolved contracts and does not automatically retry an ambiguous provider POST.
- **Access activation:** Signed webhooks are checked against raw bytes. Charge events require provider-side evidence for subscription, captured payment and paid invoice with matching INR amount and billing period. Browser redirects and mandate authentication alone do not grant access.
- **Cancellation:** The owner can request cancellation; the app verifies the provider response and explains that cancellation is not a refund. Existing recorded access runs only for its recorded paid period.
- **Free trials:** New free trials have been disabled. The `/trial` route returns `410`; historical trial records remain supported for their existing terms.
- **Safeguards:** Provider is disabled by default; test mode cannot unlock production; live requires a separate explicit flag; checkout URLs are restricted; provider operations use an allowlist; sensitive credentials stay server-side.

## Local code changes in this audit

1. Webhook event recognition now includes Razorpay `subscription.paused`, `subscription.resumed` and `subscription.updated`. These are observed/audited and do not independently grant paid access.
2. Provider state validation now recognises `resumed` as a valid observed provider status.
3. Updated subscription tests that expected the retired activation error and new free trial checkout, and corrected a legacy invoice fixture to declare its legacy trial-mandate purpose.

No database migration, production setting, provider plan, webhook, payment, deployment, commit or push was performed.

## Known engineering work before launch

1. Design a durable webhook intake/worker path that acknowledges quickly and processes idempotently. Current synchronous provider lookups can exceed Razorpay's 5-second webhook response guidance; the provider request timeout is 10 seconds. Do not launch until timeout, retry, duplicate and recovery behavior has been proven.
2. Define customer-visible states and operational alerts for pending, halted, paused, resumed, updated, cancellation and unknown provider results. Existing contract states do not represent every provider lifecycle state.
3. Define an auditable reconciliation runbook for ambiguous checkout creation, missed webhooks, refunds and customer disputes. Do not automatically retry an unknown subscription creation.
4. Decide and implement upgrade/downgrade policy, if offered. No customer-facing plan change workflow was found.
5. Run database-backed integration tests with an isolated test database and a Razorpay test-mode account. These were not run because no test database/service credentials were provided in the local test environment.
6. Verify onboarding and checkout in the deployed environment after an authorised deployment; this audit made no production change.

## Public provider behavior reference

Razorpay's webhook guidance says endpoints should return a 2xx response within 5 seconds and explains retry/duplicate delivery behavior. Build the intake path for at-least-once delivery and idempotency. [Razorpay webhook best practices](https://tfs.np.razorpay.in/docs/us/webhooks/best-practices) · [Razorpay webhook setup](https://tfs.np.razorpay.in/docs/api/payments/recurring-payments/webhooks)
