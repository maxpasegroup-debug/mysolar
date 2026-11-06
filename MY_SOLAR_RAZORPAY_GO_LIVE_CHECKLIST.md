# MY SOLAR SOLUTIONS — Razorpay go-live checklist

**Current decision: NO-GO.** Live billing must remain disabled until every required item below is evidenced and the final acceptance run succeeds.

| Gate | Status | Required evidence / action | Responsible |
|---|---|---|---|
| Final plans and comparison | **Open** | Approve exact plan names, prices, user limits, included/excluded features, monthly term and Enterprise handling. Reconcile the website comparison with enforceable server entitlements. | Business owner |
| Tax treatment | **Open** | Confirm legal entity, GST registration state, tax rate/inclusion and invoice requirements with qualified adviser. Record real approval evidence in reviewed configuration. | Business owner / tax adviser |
| Terms and notices | **Open** | Approve subscription agreement, cancellation, renewal/autopay consent, privacy, refund and grievance/support details, effective dates and document digests. | Business owner / legal adviser |
| Razorpay account approval | **Unverified** | Confirm Razorpay has approved the business/category, recurring subscriptions and customer-facing website. Complete any requested demo credentials and website review. | Business owner / Razorpay |
| Test-mode plan setup | **Open** | Create test plans and map each reviewed application plan version to the exact Razorpay plan. Verify amount, INR currency, monthly interval and total charge count. | Platform administrator |
| Test webhook | **Open** | Configure the test endpoint, distinct test webhook secret, and subscription event subscriptions needed by this application, including authenticated, activated, charged, pending, halted, cancelled, completed, paused, resumed and updated. | Platform administrator |
| Webhook processing latency | **Blocking engineering** | Implement durable fast acknowledgement/queue processing; prove all responses meet provider response guidance under slow provider/database conditions. | Engineering |
| Lifecycle and recovery | **Open** | Exercise duplicate, out-of-order, missing, invalid-signature, pending/halted, cancellation, timeout/unknown and reconciliation cases. Alert a named operator on unresolved cases. | Engineering / operations |
| Refund handling | **Open** | Publish a truthful refund policy and support procedure; assign owner for provider-dashboard refunds and reconciliation because the app does not process refunds. | Business owner / operations |
| Upgrade/downgrade | **Decision open** | Decide whether plan changes are unavailable initially or implement and test an explicit policy before advertising them. | Business owner / engineering |
| Isolated DB tests | **Open** | Run full integration suite on a disposable database with migrations; verify schema constraints and rollback. Do not use production for tests. | Engineering |
| Browser acceptance, test mode | **Open** | From a fresh business owner account, inspect plans, consent, hosted checkout, success/failure/return, invoices, cancellation, expiry and blocked operational actions in desktop/mobile browsers. | QA / business owner |
| Production variables | **Not inspected** | After approval, verify the required Railway variable names and correct live/test mode without exposing values. Leave live flag off until final release approval. | Railway administrator |
| Live plans and mapping | **Open** | Create Razorpay live plans only after final terms approval; fetch/verify each plan, then save the matching production mapping. | Platform administrator |
| Live webhook endpoint | **Open** | Configure production endpoint and a separate strong webhook secret; verify signature and delivery from Razorpay without using secrets in logs. | Platform administrator |
| Final live smoke test | **Open** | Use an owner-approved low-risk real transaction only after all previous gates; verify captured payment, paid invoice, entitlement, receipt, cancellation/refund operations and reconciliation. | Business owner / QA |
| Production deployment | **Not performed** | Review and explicitly deploy approved code/configuration after test-mode acceptance. | Release owner |

## Required event behavior

Razorpay webhook delivery is asynchronous and may be retried. Configure the app's supported events, handle duplicate/out-of-order delivery idempotently, and acknowledge promptly. Razorpay documents a 5-second response target. [Webhook setup guidance](https://tfs.np.razorpay.in/docs/api/payments/recurring-payments/webhooks) · [Event catalogue](https://tfs.np.razorpay.in/docs/sg/webhooks/all)

## Release rule

Do not set `RAZORPAY_LIVE_ENABLED=true` until commercial/legal review, live plan mapping, live webhook verification, test-mode acceptance, operational ownership and engineering blockers are complete. The flag is an explicit code-level gate; it does not itself establish regulatory approval or readiness.
