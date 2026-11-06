# MY SOLAR SOLUTIONS — Subscription test report

**Run date:** 6 November 2026  
**Environment:** Local workspace only; no Razorpay requests or production changes.

## Results

| Check | Result | Notes |
|---|---|---|
| Focused subscription suite | **24 passed, 0 failed, 1 skipped** | `node --test tests/business-subscription.test.mjs tests/business-subscription.integration.test.mjs`. The skipped test requires a database-backed integration environment. |
| Repository static check | **Passed** | `npm.cmd run check` completed successfully. |
| Full test suite | **216 passed, 5 failed, 59 skipped** | The five failures are unrelated pre-existing/stale expectations: Boss dashboard still expects old “Coming soon” Sales Booster text; commercial team-cap invitation behavior; legal proposal amount expectations; two SIA orb tests. Database-dependent integration tests were skipped. |
| Production browser flow | **Not run** | No deployed change or production browser verification was performed. |
| Razorpay test checkout/webhooks | **Not run** | No test account credentials, test plan mappings or webhook service were configured in this local run. |
| Live payment | **Not run / must remain off** | Live billing is not approved or enabled. |

## Coverage confirmed by focused tests

- Billing fails closed without valid provider configuration and test mode cannot unlock production.
- Unsupported tax terms, annual/non-INR/zero/unpublished prices and unsupported trial changes cannot be billed.
- Webhook HMAC verification is based on exact raw bytes and rejects invalid signatures.
- Checkout URLs remain restricted to the approved Razorpay origin.
- Provider calls reject arbitrary URL paths and do not blindly retry subscription-creating POST requests.
- Captured payment and paid invoice evidence must reconcile before access is activated.
- Duplicate webhook events do not create another subscription or payment.
- Plan capacities and monthly-only limits are enforced; custom Enterprise and annual checkout are excluded.
- Current new-customer path does not offer a free trial or checkout before subscription eligibility.

## Caveats

The unit suite uses fixtures and does not prove Railway variables, database migration state, Razorpay plan configuration, webhook delivery, invoice email, or production UI behavior. Run the database-backed and Razorpay test-mode acceptance suite before considering launch. Full-suite failures remain open and should be repaired or explicitly triaged before release.
