# MY Solar pricing, SIA onboarding and entitlement alignment

> SUPERSEDED TRIAL POLICY — 29 October 2026: the later owner instruction removes upfront autopay. Read [MY_SOLAR_NO_AUTOPAY_TRIAL_FLOW.md](MY_SOLAR_NO_AUTOPAY_TRIAL_FLOW.md) for current implementation and evidence: a no-mandate seven-day trial, day-5 top dashboard reminder, and server lock at 168 hours. Paid checkout is after expiry and requires verified captured payment. The mandate-before-trial passages below describe the prior implementation. Migration 043 is additionally prepared and unapplied. Current safe results: 172 unit tests, 1,291 fictional-API browser checks and 1,582 static checks passed. No PostgreSQL/provider acceptance is claimed.

29 October 2026 · Local implementation only · Repository: `D:\APPS\WEB\mysolar`

## 1. Verdict and evidence boundary

**PARTIALLY IMPLEMENTED. Not approved for production release or live recurring billing.**

The requested business experience and pricing presentation are implemented locally. Safe unit/static checks and real-browser checks with fictional intercepted API responses passed. PostgreSQL persistence, migration execution, real email delivery, Razorpay mandate authorisation, captured renewal, cancellation and operational recovery have **not** been verified in this task.

The user-declared Migration 034 release gates remain unresolved. Migration 041 belongs to the preceding committed work; new migration 042 is prepared, not applied. No current production migration ledger or Railway configuration was inspected.

| Area | Status | Evidence / limitation |
| --- | --- | --- |
| Approved proposal names, prices, capacities and monthly-only copy | IMPLEMENTED AND VERIFIED. | Local pure rendering assertions and browser checks; not published billing records |
| SIA email-first business popup and company wizard | IMPLEMENTED — MOCK-VERIFIED ONLY. | Real browser, fictional session/OTP responses; no real registration or email |
| OTP/session/lifetime checks and delivery-message classifications | IMPLEMENTED AND VERIFIED. | Unit checks of deterministic rules; not a PostgreSQL/mail acceptance result |
| Free Leads / marketplace-listing screen | IMPLEMENTED — MOCK-VERIFIED ONLY. | Existing publication services reused; no real listing published |
| Server cohort/trial/role/entitlement enforcement | PARTIALLY IMPLEMENTED. | Source plus mocked scoped-SQL tests; database rehearsal outstanding |
| Razorpay adapter, consent intents, webhook and cancellation path | PARTIALLY IMPLEMENTED. | Mocked provider/signature/invoice checks only; no provider requests made |
| Real recurring checkout, renewal and inbox delivery | BLOCKED — EXTERNAL CONFIGURATION. | Merchant configuration, approved recipient and actual acceptance evidence required |
| Publication of final prices, taxes and recurring terms | BLOCKED — APPROVAL REQUIRED. | Interface proposals are not reviewed tax-inclusive subscription agreements |
| Database cutover / production deployment | BLOCKED — RELEASE GATE. | No migration, restore, maintenance or deployment authorised by this task |
| Marketing/Enquiry AI Agents | NOT IMPLEMENTED. | Displayed as Coming Soon; no purchase or invented usage price |
| TalkinLabs channels | NOT IMPLEMENTED. | Separate Coming Soon product; no connected-channel claim |

## 2. Initial Git state and preservation

- Branch: `main`; HEAD: `cb49690` (the preceding conflict-free Git merge).
- Initial working tree: clean; no staged, unstaged, untracked or conflicted work reported.
- Initial upstream: `origin/main`, synchronized in the inspected local metadata. No fetch, merge or push was performed during this implementation.
- Final HEAD remains `cb49690`; staged diff remains empty. Changes are left in the local working tree.
- The protected customer dashboard, customer locale/marketplace files and official logo have no diff. Package/dependency files, environment files, historical migrations and existing handoff reports were not changed.

## 3. Existing architecture and published-plan findings

Inspected and extended the existing vanilla JavaScript/hash-route frontend, Express application, session/CSRF protections, PostgreSQL migration runner, company membership/permission services, publication review, commercial versioning, authoritative subscription policy, SIA setup component and durable reminder/mail workers.

Relevant inspected sources include:

- `src/account.js`, `src/onboarding.js`, `src/public-header.js`, `src/app.js`, `src/workspace.js`, `src/organization.js`, `src/sia-company-setup.js`, `src/boss-dashboard.js`, `src/commercial.js`, `index.html`.
- `server/auth/{routes,email-registration,registration,sessions,security,sealed}.js`.
- `server/tenancy/{routes,context,company-creation}.js` and `server/setup/{routes,service,guide,sia-plan}.js`.
- `server/commercial/{routes,policy,validation,growth,payments}.js`.
- `server/index.js`, `server/config.js`, `server/mail-config.js`, `server/mail-queue.js`, `server/automation/{engine,worker}.js`, the existing migration runner/manifest and relevant migrations 003, 005, 008, 012, 032 and 041.
- Existing commercial, workspace, Boss, onboarding and local/browser verification tests.

**Published plan rows were not inspected:** database access was prohibited. Their actual existence, prices, status, limits and effective dates remain unknown. Source inspection found operator-managed versioned plan creation, not seeded Starter/Pro/Elite monthly agreements. No plan, company, user or payment record was inserted by this task.

The reserved internal code `pro` still governs the existing PRO Partner Network / part-time sales features. It was not renamed or weakened. Historic FREE/ELITE/PRO discussion is not evidence of actual current database configuration; existing agreements remain authoritative.

## 4. Approved proposals versus effective billing

| Interface proposal | Monthly price before GST | Proposed capacity | Effective/published configuration |
| --- | ---: | --- | --- |
| Starter | ₹3,500 | Up to 10 users | Not inspected; no record created |
| Pro | ₹6,999 | Up to 25 users | Not inspected; no record created |
| Elite | ₹9,999 | Up to 50 users | Not inspected; no record created |
| Enterprise | Custom pricing | Based on agreement | Real support telephone enquiry; no self-service checkout |

The page explicitly labels these as proposals. It does not calculate GST, invent a rate, invent a gross renewal amount, advertise an annual price/discount or enable purchasing from proposal cards. Annual self-service billing is unavailable, including direct checkout attempts. Existing annual historical agreements are not rewritten.

An activation offer must come from an actually active/current/effective plan version, not the proposal array. New self-service offers are restricted server-side to the `starter`, `pro`, `elite` codes with their respective 10/25/50 team allowances, monthly interval and seven-day trial. Provider mapping must match currency, interval and final price. Enterprise and unknown/agent plan codes cannot use this checkout.

The provider adapter currently accepts only an explicitly configured positive final INR amount with known included/exempt tax treatment/rate. The approved proposal prices are **before GST**, so they are not automatically converted into those billable terms. A professional commercial/tax review and explicit operator publication are required. No statutory-compliance claim is made.

The existing team-capacity service remains the authority for active memberships plus pending unexpired invitations, including acceptance/reactivation paths. Dashboard employee counts describe employees, not a replacement licence counter. Proposed limits do not grant seats until reviewed terms are assigned.

## 5. SIA-led onboarding

Business entry opens a native modal with the existing burgundy/gold identity and animated replaceable SIA placeholder:

1. SIA introduces herself as the Virtual CEO assistant and asks only for email.
2. A successful backend queue operation opens eight-digit OTP entry, with Edit Email, resend and Check Email Status.
3. Only after email verification does SIA request name and password.
4. The existing company wizard collects essential company contacts/preset/location, product/service choices and planned team positions in the same popup experience.
5. Successful company creation follows the existing dashboard destination. Remaining legal/profile/publication steps remain available through Complete Profile.

These are scripted guided conversations, not fabricated model responses, automatic employee creation or autonomous business execution. Existing customer signup and the protected customer dashboard remain unchanged.

New endpoints reuse `registration_challenges`, existing encrypted context, OTP hashing/rate limiting, the global email-uniqueness rule and `createIdentity`/session issuance:

- `POST /api/auth/business-signup/request`
- `POST /api/auth/business-signup/verify`
- `POST /api/auth/business-signup/complete`
- `GET /api/auth/business-signup/status?challenge=...`

Proof is session-bound, expires after 15 minutes and allows at most five failed attempts. An edited/re-requested email invalidates the previous supplied challenge only within its own session. Repeated verification can return the already-recorded verified result for that same live proof; it does not consume another OTP or create another account. Completion consumes the proof atomically.

Delivery status is scoped to the same anonymous session and challenge. It returns no OTP, password, credentials, raw mail error or another user's email. It distinguishes waiting/running, retry, failure and mail-server acceptance. Mail-server acceptance is never described as inbox receipt. Failed enqueue stays on the email screen; failed account creation does not open a fake dashboard.

Switching signup journeys leaves one modal open. Escape/close work, reduced motion remains respected, and changes of signed-in account/company clear private draft UI and invalidate late async responses. A customer account is not converted into a business account. Existing invitations lead to their existing acceptance flow instead of creating an unnecessary company.

## 6. Free Leads and the existing Boss dashboard

- Primary **LEADS** navigation: `#/distributor/marketplace-leads`.
- Actual backend: `GET /api/companies/current/os/leads`, protected by company/session permissions and owner scope.
- Shows actual company/publication state and recorded enquiry count when authorised. It directs owners to their existing profile and publication-review screens.
- A profile is not automatically published. The existing active-company, approved-review and published-storefront conditions still apply. Enquiries/visibility are not guaranteed.
- The approved marketplace company listing remains eligible without a paid automation subscription. Paid catalogue/operational capabilities keep their separate entitlements.

The original Boss KPI, sales, team, attention and quick-action composition remains in place for enabled workspaces. New trial-required companies receive the setup/access state rather than invented operational figures. An already-approved company without OS access is described as approved, with a separate activation action—not asked to obtain company approval again.

Pricing is on `#/distributor/activate`, not inserted as a pricing-card dashboard redesign. `#/distributor/subscription` remains the detailed source of current agreements/usage/history and links to the new activation screen. The activation screen also projects current agreement/source/end date when present.

Active desktop Boss/setup layouts were checked at 1366×768, 1440×900 and 1536×864. Pricing and listing screens may scroll naturally. Existing mobile/tablet layouts were retained.

## 7. Trial, entitlement and historical protections

The existing `company_subscriptions`, immutable plan snapshots, company commercial state, lifecycle events and `commercial_policy` remain authoritative. There is no browser-managed entitlement store or second identity/company/subscription model.

New cohort metadata marks companies inserted after migration 042 through a database trigger. Existing companies are not silently enrolled, repriced, downgraded or forced off their historic/pre-billing terms. Their existing policy remains in force; transition to new commercial terms needs a separately reviewed action.

For newly enrolled companies:

- Listing/profile/review access is separate from paid OS activation.
- Server guards reject new operational actions without valid access. First-time restricted operational reads cannot be used to bypass activation; existing authorised records remain readable after an agreement expires. Security/history and deactivation/revocation paths remain available as appropriate.
- Starting a trial requires owner authority, verified owner email, active company, no previous subscription/trial/unresolved mandate, reviewed published/mapped terms, configured provider and explicit recurring consent.
- GET eligibility and POST eligibility are both server-derived. Changing a hidden field or selecting a proposal cannot grant access or restart a trial.
- A contract records the consent-time start and a first-charge time exactly 168 hours later. The exact dates are shown before the user authorises at Razorpay. Email signup alone does not start the trial.
- Trial access is assigned through the existing subscription model only after verified provider authorisation. Its recorded expiry controls server access; browser return/success is not authoritative.
- Actual paid periods require a verified captured payment and matching paid subscription invoice/period/amount. Authorisation-only transactions cannot be treated as paid renewal.
- Historical terms, consent snapshots, mappings, captured-payment evidence and provider-event records have proposed immutability protections in migration 042. These constraints still need PostgreSQL verification.

## 8. Razorpay and reminders: implemented boundary, not live acceptance

The existing `server/commercial/payments.js` boundary is extended and used by the new routes. Unprepared calls still fail closed. The new provider adapter has fixed API paths/origin, timeouts, safe error classifications and no automatic retry of subscription-creation POSTs.

Routes:

- Owner: `/api/companies/current/os/plans`, `/checkout`, `/cancel`.
- Operator: `/api/platform/billing`, `/api/platform/billing/mapping`; screen `#/platform/razorpay`.
- Provider: `POST /webhooks/razorpay` uses a bounded raw body and HMAC verification. It intentionally does not use browser CSRF as provider authentication; owner/admin mutations keep existing CSRF/origin protections.

The operator mapping action checks the actual provider plan against a real application plan version. It does not create a provider plan or subscription. Owner checkout requires separate explicit consent. Only validated `https://rzp.io/` authorisation links are returned; no provider key or arbitrary redirect is accepted from the browser.

Duplicate protection uses company-scoped operation keys, one unresolved contract per company, unique event IDs/body hashes and unique payment IDs. An uncertain provider creation result is retained for reconciliation, not automatically repeated. Signed webhooks are rechecked against provider subscription/payment/invoice data. User/company lock order is preserved. An operator agreement change prevents an old mandate from overwriting current access; captured financial evidence remains recorded for review.

Cancellation requests do not claim success until provider cancellation is confirmed. They do not issue refunds. Confirmed cancellation stops future billing while existing recorded access expires under its own terms. Failure does not create an earned future paid period.

Days **5, 6 and 7** reminders are recorded from the consent-time trial start. The existing reminder worker queues them through the existing encrypted mail queue. Unique per-contract/day records avoid repeated planning; preferences, verified active owner membership, company status and contract status are rechecked. Stale reminders are not bulk-sent after recovery. Pending/blocked/mail retry/dead/accepted status is visible in the owner plan response. Email delivery follows communication preferences and existing worker retries. SMTP delivery remains at least once; exactly-once inbox delivery is not claimed.

Official technical references used, not evidence that MY Solar's provider is configured:

- [Razorpay subscription integration](https://razorpay.com/docs/payments/subscriptions/integration-guide/).
- [Create a subscription and scheduled start](https://razorpay.com/docs/api/payments/subscriptions/create-subscription/).
- [Raw-body webhook signature, duplicate and ordering guidance](https://razorpay.com/docs/webhooks/validate-test/).
- [Subscription invoices](https://razorpay.com/docs/api/payments/subscriptions/fetch-invoices/).

## 9. AI Agents, TalkinLabs and scope

**AI Agents** is one optional add-on category. SIA Marketing Agent and SIA Enquiry Agent are Coming Soon, with no invented prices, budgets or purchase controls. Existing SIA summaries/assistance remain a separate permission-controlled capability; a link remains accessible. No paid AI operation runs by rendering pricing.

**TalkinLabs** is a separate communication product, visibly Coming Soon. No WhatsApp/Instagram channel, external messaging account, communication subscription or channel rate is represented as active.

Multi-branch permissions, negotiated SLAs, priority support and custom integrations are not advertised as implemented included features. Enterprise has a genuine telephone consultation path using the previously approved support number. No custom-domain traffic, DNS or provider infrastructure was enabled.

## 10. Files changed

New application/schema files:

- `business-onboarding.css`, `src/business-onboarding.js`.
- `business-access.css`, `src/business-access.js`.
- `server/auth/business-signup.js`.
- `server/commercial/os-access.js`, `os-billing.js`, `os-routes.js`, `razorpay.js`, `trial-reminders.js`.
- `server/db/migrations/042_business_trial_billing.sql`.

Modified application files:

- `index.html`, `src/account.js`, `src/app.js`, `src/onboarding.js`, `src/public-header.js`.
- `src/boss-dashboard.js`, `src/commercial.js`, `src/workspace.js`, `src/sia-company-setup.js`.
- `server/auth/routes.js`, `server/auth/email-registration.js`.
- `server/commercial/routes.js`, `server/commercial/policy.js`, `server/commercial/payments.js`.
- `server/index.js`, `server/mail-queue.js`, `server/automation/engine.js`.

Verification/documentation:

- New `tests/business-subscription.test.mjs`.
- New `tests/business-subscription.integration.test.mjs` — prepared, **NOT RUN**.
- Modified `tests/commercial.test.mjs`: mocks now include the additional trusted company-cohort read; original deny/revoke/unmapped/payment-disabled assertions remain.
- Modified `tests/helpers/env.mjs`: explicitly removes new provider credentials/flags from safe test environments.
- Modified `scripts/verify-master-local.mjs`, `scripts/browser-check.mjs`.
- This report.

Migration 042 adds verified-email proof state, cohort metadata/trigger, provider mappings, consent contracts, provider event/payment evidence and reminder records; extends the permitted subscription activation-source values; preserves the old policy and wraps new-cohort behaviour; and extends mail kinds for scoped billing reminders. **No plan-price seed or production data migration was created. No SQL was executed.** Its full DDL/trigger/function/FK/checksum compatibility remains a rehearsal gate.

## 11. Safe checks actually run

Test configuration was inspected first. The safe runner fixes an allowlist of unit/in-memory specifications, does not load `.env`, clears provider credentials, sets an unreachable loopback PostgreSQL port 1 and removes disposable-database targets. The browser harness uses the same environment, a local HTTP server and fictional intercepted API responses. It does not start background workers or contact real email/payment services.

| Command/check | Actual result |
| --- | --- |
| `node scripts/verify-master-local.mjs` | **166 passed, 0 failed, 0 skipped; exit 0** |
| `node scripts/browser-check.mjs` | **1,268 passed, 0 failed; browser process exit 0** |
| `node scripts/check.mjs` | **1,576 passed, 0 failed; exit 0** |
| Sanitised application-module import, without listening | Passed; no database connection established |
| `git diff --check` | Passed |
| Protected customer/dashboard/marketplace/logo diff | Empty |

These counts overlap; they are not a count of unique product scenarios. No database-backed result is included. The integration suite and comprehensive database/root test suites were **not run** because they can create schemas, migrate, seed or mutate a database.

Coverage includes exact proposed prices/capacities, monthly-only offers, trial time boundaries, backend deny/read-preservation rules, HMAC bytes, safe provider URLs, no automatic POST retry, matching plan/payment/invoice evidence, duplicate-event handling, no paid grant after conflicting operator terms, consent rendering and disabled purchasing.

Browser checks include SIA email-first ordering, eight-digit OTP, Edit Email/resend, actual queue-state rendering from fixtures, failed send staying out of OTP, failed creation without fake success, company setup reuse, account-change privacy reset, one modal on journey switch, Escape, six responsive widths, free Leads, unpublished states, unavailable checkout, agent/TalkinLabs labels, compact Boss trial-required layouts and existing customer regressions. No uncaught browser exceptions were reported.

Evidence retained locally under ignored `.verification/`:

- `business-alignment-unit-final.log`.
- `business-alignment-browser-verified.log` and its stderr log.
- `business-alignment-static-verified.log`.
- Browser screenshots: `business-sia-otp-390.png`, `business-sia-identity-1440.png`, `solar-os-pricing-locked-1440.png` and corresponding mobile/listing images. Desktop/mobile screenshots were visually inspected.

## 12. Outstanding configuration, implementation and approvals

**BLOCKED — RELEASE GATE.** Complete separately authorised isolated PostgreSQL rehearsal of all required migrations, especially the existing 034 gate, 041 and new 042. Verify fresh/upgrade/checksum/repeat application, triggers/FKs, rollback/recovery, all company/quote/order writers, auth proof persistence, concurrent signup, concurrent checkout/webhooks/cancellation and lock contention. No production database, backup or cutover evidence was collected here.

**BLOCKED — APPROVAL REQUIRED.** Obtain professional review of final GST/tax treatment, gross renewal prices, recurring terms, cancellation/support policy and package capabilities. Publish reviewed versions through the existing operator console. The proposal array must not be treated as a billing seed. Review the reserved PRO-code semantics before selling a new package matrix. Explicitly approve any transition of existing companies; no automatic legacy migration is provided.

**BLOCKED — EXTERNAL CONFIGURATION.** Server-only optional variables:

- `RAZORPAY_BILLING_MODE`: `disabled` by default; `test` or `live` only when deliberately configured.
- `RAZORPAY_KEY_ID`: matching `rzp_test_...` or `rzp_live_...` provider-issued ID.
- `RAZORPAY_KEY_SECRET`: provider-issued secret, retained on the server.
- `RAZORPAY_WEBHOOK_SECRET`: independently configured webhook secret, at least 32 characters under this implementation's rule.
- `RAZORPAY_LIVE_ENABLED`: explicit `true` additionally required for live mode. Test mode is rejected when `NODE_ENV=production`.

No actual provider credentials were read, requested in chat, generated or configured by this task. Unit tests used explicitly fictional injected values. Missing/invalid optional billing configuration makes billing unavailable without preventing the app's unrelated functions from loading.

Existing email configuration (`RESEND_API_KEY`/configured SMTP, `MAIL_FROM`, `DATA_ENCRYPTION_KEY`) and running mail/reminder workers are still required. Real approved-recipient OTP, reminder receipt, failure/retry and preference/cancellation tests have not occurred. The new status control reports internal queue evidence, not provider inbox tracking.

**PARTIALLY IMPLEMENTED.** Operator unresolved-mandate visibility exists, but a complete audited reconciliation workflow/SOP for unknown provider creations, cancellation timeouts, owner changes, webhook outages, secret rotation and conflicting administrative agreements still needs acceptance before live billing. Do not resolve uncertainty by creating duplicate mandates or manually inventing payment success. Refunds, bank settlement reconciliation and statutory invoice certification are not implemented by this work.

Provider Test-mode acceptance with real approved test credentials/recipients needs separate approval and an isolated target. It must prove consent, exact first-charge dates, signature/replay/order handling, captured invoice matching, cancellation, expiry, recovery and reminder delivery. No external resource, merchant subscription, test transaction or webhook configuration was created here.

Keep approvals separate: disposable-database creation/mutation; destructive failure/recovery exercises; external provider/email acceptance; production backup/restore evidence; production maintenance/migration/deployment; and reopening access. Approval of one is not approval of the others.

New business copy is English. No new claim of fully translated Indian-language onboarding is made.

## 13. Final preservation and next step

Final Git review: `main`, unchanged HEAD `cb49690`, no staged files, no merge conflict and no Git history changes. Working-tree modifications/new files are the local implementation described above. Protected customer dashboard/locale/marketplace files and official logo are unchanged. No unrelated work was discarded or overwritten.

No database was created, connected for application data, reset, restored, seeded, migrated or mutated. Tests may attempt the deliberately unreachable loopback port; they do not use a database or production credentials. No production database or Railway service/variable was accessed or changed; no real email, invitation, provider payment request, recurring charge, DNS, deployment, commit, push, merge or rebase operation occurred.

**Single next milestone:** obtain explicit approval for the disposable PostgreSQL rehearsal and complete the database release gate before any external-provider acceptance or production release. Stop at local implementation and this report.
