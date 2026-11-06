# MY SOLAR SOLUTIONS — Razorpay subscription readiness audit

**Reviewed:** 6 November 2026  
**Scope:** Local repository and automated checks only. No Railway variables, production database, Razorpay dashboard, test payment, or live payment were accessed.

## Executive finding

**Not ready to accept real customer subscriptions.** The application contains a guarded subscription checkout and payment verification flow, but the current repository deliberately reports billing unavailable. Its legal/tax review configuration is incomplete, customer facing prices are proposals, and production provider configuration and plan mappings have not been verified. Keep live billing disabled.

The main safeguard is sound: a browser return or mandate authorisation does not activate Solar OS. Access is granted only after the signed webhook is checked and the server verifies a captured INR payment and matching paid invoice against the mapped plan and recorded terms.

## Readiness by area

| Area | Finding | Evidence / remaining work |
|---|---|---|
| Price and plan terms | **Blocked** | Starter ₹3,500/10 users, Pro ₹6,999/25 users and Elite ₹9,999/50 users are rendered as monthly proposals before GST. They are not published checkout offers. Enterprise is custom and excluded from automated checkout. Business owner must approve final price, GST treatment, billing cycles, inclusions, cancellation, renewal and refund wording. |
| Legal and tax approval | **Blocked** | `server/legal/review.json` has no reviewed documents or grievance contact and tax status is `pending`. `commercialReady()` therefore fails closed. Obtain genuine professional review and record reviewer, references, effective dates and registration status; do not fill placeholders. |
| Provider credentials | **Unverified** | Billing is disabled by default. No Railway variables were inspected. Live mode additionally requires explicit `RAZORPAY_LIVE_ENABLED=true`, a live key ID, API secret and webhook secret. |
| Provider plans | **Unverified** | A platform admin mapping flow fetches each Razorpay plan and checks INR amount, interval and period before saving. The live Razorpay plan IDs and DB mappings have not been checked. |
| Customer consent and checkout | **Implemented, gated** | Owner-only checkout records versioned plan terms and explicit consent to amount, cycles, payment now and recurring autopay. It refuses unresolved mandates and accepts only approved monthly tiers. |
| Webhook authentication | **Implemented** | Raw request bytes are HMAC-SHA256 verified with constant-time comparison before JSON handling. The endpoint is mounted before the JSON parser. |
| Payment-to-access proof | **Implemented** | A captured INR payment and matching paid invoice, subscription, amount and billing period are required before a paid entitlement is recorded. Duplicate event IDs and changed payload hashes are guarded. |
| Lifecycle events | **Partially covered** | Activated, charged, cancelled, completed, halted, pending, authenticated and now paused/resumed/updated are recognised. Pending/halted do not grant access. Customer/admin visibility for these states is limited by the existing contract state model. |
| Webhook response time | **Risk / blocker** | Event processing performs provider API reads inline, with up to 10 seconds per request. Razorpay asks for a 2xx webhook response within 5 seconds. This can cause provider retries and duplicate deliveries. Reliable quick-acknowledgement plus durable asynchronous processing needs a design and likely schema work before launch. |
| Retry and reconciliation | **Partial** | Provider POSTs are not blindly retried after an ambiguous result; unresolved contracts must be reconciled. A documented operational process and support ownership are still needed. |
| Cancellation and refunds | **Partial** | Cancellation requests immediate provider cancellation, verifies the response, and states no refund was issued. Refund issuance/reconciliation is not integrated into the app. Confirm customer support and manual refund handling before launch. |
| Upgrade/downgrade | **Not implemented** | No customer plan change workflow was found. Define whether changes are immediate or at renewal and how proration/limits work before selling. |
| Production onboarding | **Not verified** | Local onboarding source includes prior fixes, but no production deployment or live browser verification was performed in this audit. |

## Current purchase path

1. Owner opens the subscription page. Prices shown as proposal cards do not create a purchase.
2. Server loads active plan versions and mapped provider plans. Checkout eligibility also requires explicit billable tax terms, a legal review pass, correct provider mode, active company and no unresolved mandate.
3. Owner reviews the exact plan and explicitly consents.
4. Server records the consent and contract before creating the Razorpay subscription. An ambiguous provider response is left for reconciliation rather than retried automatically.
5. Customer authorises/pays at Razorpay. Returning to the app alone does not activate the account.
6. Razorpay webhook signature is checked. For a charge, the server fetches provider subscription, payment and invoice and verifies captured payment plus matching paid invoice.
7. Only verified evidence activates a paid period. Expiry blocks new operational writes while historical authorised reads remain available.

Razorpay documents `subscription.pending` for a failed charge/retry process, `subscription.halted` after retries are exhausted, and additional pause/resume/update lifecycle events. Configure the required live webhook events and test their handling before launch. [Razorpay webhook event reference](https://tfs.np.razorpay.in/docs/sg/webhooks/all)

## Launch decision

**NO-GO for real subscriptions today.** This is not a finding that checkout logic is absent; it is a finding that commercial approval, production configuration, provider mappings, webhook timing/recovery and production acceptance evidence are not complete. See [go-live checklist](MY_SOLAR_RAZORPAY_GO_LIVE_CHECKLIST.md).
