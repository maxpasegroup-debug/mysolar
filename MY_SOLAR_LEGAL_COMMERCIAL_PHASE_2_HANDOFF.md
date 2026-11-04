# Phase 2 — legal and commercial controls

Date: 30 October 2026, India.

## Decision

LOCAL IMPLEMENTATION COMPLETE; PROFESSIONAL/OPERATOR APPROVAL STILL REQUIRED. This is not a legal opinion, statutory-compliance certificate, approval to charge, or production release approval. Phase 1's live recovery/release gates remain separate and open.

The owner confirmed **AIRASKILL CITY PVT LTD**, registered office **2619, T2, 6th Floor, HiLite Business Park, HiLite City, Guruvayurappan College, Kozhikode, Kerala, India - 673014**. These are owner-supplied details, not an independent incorporation/GST verification. No grievance officer, GST status/GSTIN, lawyer or tax reviewer was supplied. No professional was contacted, hired or represented as having approved the documents.

## Preserved work

Started on `main`, commit `2cf589433ee2d38cb0b54dc94ae0b2c8ef9b00b4`, with all Phase 1 changes still uncommitted. Those changes were preserved. There were no other local branches in the inspected branch listing. No staging, commit, push, merge, migration, deployment or production configuration/data change was performed in this phase. Production inspection described below was explicitly read-only.

The protected customer dashboard, customer locale, marketplace implementation and official logo have no changes. Shared signup forms and public footer links changed only to expose legal notices and consent controls. No new dependency or database migration was needed.

## Documents and public routes

Six versioned drafts are defined in `server/legal/catalogue.js`:

| Document | Route | State |
| --- | --- | --- |
| Customer terms | `/terms` | Draft |
| Privacy notice | `/privacy` | Draft |
| Distributor/installer agreement | `/distributor-agreement` | Draft |
| Cancellation/refund policy | `/refunds` | Draft |
| Branded-web scope | `/branded-web` | Draft |
| Grievance handling | `/grievances` | Draft |

`/legal` is the public Legal & privacy centre, linked from public footers and support. Each policy identifies its version, SHA-256 content digest, operator, review status and grievance-contact state. Unreviewed documents remain noindex and cannot be recorded as approved agreements. Old receipt snapshots remain downloadable by their own signed-in acceptor even when source documents later change. An unavailable public digest returns 404 rather than substituting newer terms.

The privacy notice describes actual account/company/transaction processing, bounded optional SIA sharing, Railway/Resend roles, security controls, marketing choices and the limits of current retention/deletion automation. It does not promise India-only hosting, automatic erasure, executed cleanup or verified deliveries. Business and audit records currently have no automatic deletion schedule. Translations of these legal documents have not been approved.

The agreements distinguish the platform from each equipment seller/installer; listing from approval; quotations from purchases/payments; manually recorded collections from verified bank receipts; and proposals from payable contracts. They do not promise subsidies, savings, lead volumes, unsupported agents, priority support or unlimited bespoke work. Liability, dispute, jurisdiction, eligibility and sector-specific provisions remain for counsel to finalise.

Refund text preserves applicable rights. No blanket non-refundable clause, invented refund amount, guaranteed settlement deadline or production refund mechanism was added. Supplier purchases, platform subscriptions and branded-web projects are handled separately. Final cancellation/refund entitlements must be professionally reviewed before these drafts are approved.

## Versioned acceptance and marketing

Reuses the existing PostgreSQL `audit_events` system, session protection and authorisation. Fixed legal event names and transaction-scoped advisory locks provide idempotent receipts through the application service. No duplicate identity, tenancy or commercial store was introduced.

- Reviewed signup terms require an explicit, unchecked agreement control at account creation, after OTP verification, for both password and retained legacy PIN paths.
- The server validates exact document keys/digests against the current catalogue. Client-supplied identities, companies, snapshots, review evidence and marketing flags are not trusted.
- Draft notices do not create accepted-agreement records. While drafts remain, signup continues under the existing account rules with an explicit draft notice; this is not a legally approved onboarding launch.
- Saved receipts contain actor, timestamp, document version/digest, exact content snapshot, review reference, effective date and acceptance scope. Repeated acceptance does not add duplicate receipts.
- Personal account acceptance is separate from company authority. The company-owner action uses `/api/companies/current/os/legal-accept`, the existing onboarding-management permission, verified active company context and an additional owner check. It remains reachable before a paid trial and does not grant OS entitlements or authorise payment.
- New checkout requires current company-scoped owner acceptance in addition to existing permission, trial, plan, tax, provider and mandate rules.
- `/api/legal/receipts/:digest` exports the acceptor's own JSON receipt; company receipts additionally use `?company=<id>`. Other users receive no receipt.
- Optional email marketing uses a separate unchecked preference, saved/withdrawn through `/api/legal/marketing`. Absence of a preference is off. Saving terms never opts into marketing. The exported `marketingAllowed` helper reads the latest preference. No campaign sender, promotional delivery or channel integration was implemented or activated.

Audit storage is durable application evidence, not a cryptographically tamper-proof store against a database administrator. Existing backup, database privilege and retention controls still apply. Dedicated legal/grievance indexing may be appropriate after measured scale; no unapproved schema alteration was made.

## Grievances and privacy requests

Signed-in users can record account, privacy, subscription, seller, branded-web or other grievances, view paginated progress and download their recorded complaint plus updates. Submission is explicitly intake, not officer acknowledgment, resolution, refund approval or deletion. Repeated concurrent submission with the same operation key replays one record; changed payloads conflict. The request content is escaped in the browser and visible only to its submitter or authorised platform operators.

The platform queue reuses `platform.audit.read`; officer updates require `platform.commercial.settings` and existing privileged-access checks. No new role or grant was created. The centre exposes these controls only to the corresponding platform permissions. Company staff do not receive platform-wide complaint access. Platform queue errors do not erase a user's own legal/preferences controls.

Transitions are controlled and recorded: submitted → acknowledged → investigating/resolved; resolved → reopened; reopening can return to investigation/resolution. Expected-state checks prevent stale updates. Dates record a 48-hour acknowledgment review and calendar-month redress review, including correct month-end handling. There is no unattended automatic acknowledgment/resolution, reminder worker or automatic officer notification. The operator must appoint staff and actually meet applicable handling obligations.

Signed-out/access-problem users retain the confirmed support phone/WhatsApp route. Opening WhatsApp remains an unsent draft. No new email address, officer appointment, received message or support availability was invented.

## Read-only commercial evidence

Inspected production at **30 October 2026, 05:26 UTC / 10:56 IST**, using a fixed-target SSH helper and `BEGIN READ ONLY`, with the database session enforcing read-only mode. Only public-commercial configuration fields were selected; credentials and customer records were not printed.

| Item | Actual observation | Result |
| --- | --- | --- |
| Active published plans | None returned | No online subscription offer can be claimed as published |
| Trial configuration | No row | Seven-day trial scope still requires explicit configuration |
| Billing | Disabled; unavailable | No live checkout/mandate capability established |
| Setup fee | INR 3,500,000 paise / ₹35,000, disabled, optional | Proposal, not a charge |
| Setup tax | Exclusive, rate null | No approved tax amount |

Sanitized evidence: `.verification/phase2-commercial-readonly.json`. Draft/inactive plan contents and company-specific subscription records were not inspected by this query. No conclusion about their existence is implied.

Interface proposals remain Starter ₹3,500/month/up to 10 users; Pro ₹6,999/month/up to 25; Elite ₹9,999/month/up to 50; Enterprise custom. No annual price, tax rate or discount was invented. The web-only branded proposal remains ₹35,000 plus applicable GST, subject to final tax review. Domains, native apps, ongoing hosting/subscription charges, AI/messaging usage and bespoke scope are not silently included.

The seven-day no-mandate trial, day-five onward in-app reminders, expiry restrictions, retained records/free-listing separation, historical plan terms and server-side user limits continue through existing commercial services. Published-plan absence means their paid capacities are not newly effective merely because a proposal card displays them. New checkout is additionally blocked until the review manifest is complete. Existing cancellation/reconciliation and verified-provider-event paths are not blocked by this new-purchase gate.

## Review and publication controls

`server/legal/review.json` is deliberately unapproved. It contains no fabricated reviewer, grievance officer, GST number or legal sign-off. A reviewed policy must match the exact content digest and have a real reviewer/reference, approval timestamp and effective timestamp (not before approval or in the future), together with the appointed grievance officer's name/designation/email. Editing the document invalidates its prior approval digest.

Commercial readiness requires every document reviewed plus a separate tax-review status, reviewer, reference and confirmed registration status. It does not independently verify a lawyer's opinion, incorporation, GST registration or invoice correctness. Do not fill placeholders to make the gate pass. Final documents and metadata must be a reviewed release, not browser-supplied switches. No runtime public publication/approval endpoint exists.

Owner/reviewer actions:

1. Confirm exact legal entity spelling, CIN/contact disclosures, registered-office wording, GST registration status and GSTIN if applicable.
2. Appoint the grievance officer and confirm a monitored public grievance/privacy email, responsibility, escalation and response coverage. The support number is not automatically that appointment.
3. Have an Indian technology/consumer-law lawyer review all six drafts, contracting/marketplace responsibilities, consumer rights, cancellation remedies, liability/dispute clauses, employee/customer data authority, minors, privacy choices, retention, breach response and supplier disclosures. Keep dated review evidence.
4. Have the accountant/tax professional review GST registration, service classification, tax rate/place of supply, invoicing/receipts/credit notes, renewal amounts and the ₹35,000 branded proposal. Do not assume an 18% rate or charge GST without the appropriate basis.
5. Agree measurable branded-web deliverables, design revisions, content licences, milestones, acceptance, cancellation/changes, recurring charges and domain ownership/disconnection in each actual statement of work.
6. After edits are approved, capture exact document digests, reviewer references and effective dates in the review manifest. Retain historical versions and receipts. Test new/old-user acceptance and withdrawal again before release.
7. Separately approve and configure published monthly plan versions, verified trial scope and payment mappings; test effective entitlement/user limits and final amounts. This phase does not publish or charge anything.
8. Resolve Phase 1 recovery gates, approve release and perform live acceptance with the appointed staff. Do not advertise legal/tax compliance based on local tests.

## Primary-source review inputs

These support the review checklist, not an opinion on MY Solar's legal classification or full compliance:

- [MeitY DPDP Act commencement notification, G.S.R. 843(E)](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf) and [final DPDP Rules, G.S.R. 846(E)](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf): commencement is phased. Do not treat every provision as already applicable solely because the rules were notified. Counsel must confirm applicable dates and obligations for the actual launch.
- [Department of Consumer Affairs rules directory](https://consumeraffairs.gov.in/pages/consumer-protection-acts) and [2026 government parliamentary response](https://fcainfoweb.nic.in/PMS/writereaddata/2026_LS_B_361.pdf): relevant marketplace duties include grievance contact disclosures and complaint handling.
- [Government announcement of the 2026 e-commerce amendments](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2308759&lang=1&reg=3): announced commencement is 1 January 2027; review NCH participation, recorded-complaint copies, sponsored search/disclosures and price-reduction requirements before that date. No NCH integration was created.
- [CBIC tax-invoice rules](https://cbic-gst.gov.in/gst-invoice-rules.html): tax/invoice particulars need professional validation for the real supplier and transaction. No rate or statutory accounting certification is inferred.

## Files created or extended in this phase

New: `server/legal/catalogue.js`, `server/legal/review.json`, `server/legal/service.js`, `server/legal/routes.js`, `src/legal-center.js`, `scripts/verify-legal-browser.mjs`, `tests/legal-controls.test.mjs`, `tests/legal-controls.integration.test.mjs`, this report.

Extended: `server/public-pages.js`, `server/index.js`, `server/auth/registration.js`, `server/auth/routes.js`, `server/auth/email-registration.js`, `server/auth/business-signup.js`, `server/auth/pin-routes.js`, `server/commercial/os-routes.js`, `src/account.js`, `src/onboarding.js`, `src/mobile-auth.js`, `src/business-onboarding.js`, `src/business-access.js`, `src/app.js`, `src/landing.js`, `index.html`, `scripts/verify-master-local.mjs`.

Phase 1's other changed/new files remain preserved, not reclassified as Phase 2 work. Ignored `.verification/` contains safe execution helpers and test evidence, not release artifacts or secrets to commit.

## Tests and final gate

The test runner was inspected before execution: generated credentials, disposable local PostgreSQL, loopback-only target/name checks, external credential stripping, fictional records and SMTP mocks. The browser runners use isolated profiles/local servers and fictional intercepted APIs. No production or real email send was used for testing.

- Full PostgreSQL-backed runner (including unit/static-contract specifications): 530 passed, zero failures/skips before the final company-scope/effective-date refinements. This does not mean all 530 tests are independent database scenarios.
- Existing browser regression: 1,303 passed, zero failures.
- Focused legal browser: 21 passed, zero failures across 360, 390, 768, 1024, 1280 and 1440px. Tests escaping, no horizontal overflow, unchecked marketing, blocked draft acceptance, complaint-copy links and operator controls.
- Earlier targeted legal/auth run: 17 passed; subsequent final company-scope regression exposed and fixed an incorrect permission/path. The correction uses the existing onboarding permission and free OS route, without weakening the commercial gate.
- Initial focused-browser failure was a selector quoting error in the test harness; corrected and rerun successfully.
- **Final complete run: 531 passed, 0 failed, 0 skipped/cancelled; exit 0**, duration 187577.2662 ms (`.verification/phase2-legal-final-all.log`). Includes the final backend company scope, effective-date and direct-checkout-bypass regressions. Command: `node scripts/verify-postgres.mjs`.
- **Final static checks: 1,673 passed, 0 failed** (`.verification/phase2-legal-static-final.log`). Command: `node scripts/check.mjs`. Build/lint aliases use this same checker and are not separate independent evidence.
- **Final focused browser: 21 passed, 0 failed** (`.verification/phase2-legal-browser-final.log`), after the final UI changes. Reproducible script: `node scripts/verify-legal-browser.mjs`. These APIs are fictional intercepted responses, not PostgreSQL or production acceptance.
- Existing browser command `node scripts/browser-check.mjs`: **1,303 passed, 0 failed** (`.verification/phase2-legal-browser.log`), before final company-scope/pagination UI refinements; the final focused checks cover the new centre. No claim of real email delivery or professional review is made from browser results.
- Final Git preservation inspection: no staged changes; no diff in historical migrations, protected customer dashboard/locale/marketplace or official logo. Phase 1 changes remain in the working tree. `git diff --check` passes with line-ending warnings only. Git warned that the user-global ignore file was unreadable; repository inspection still succeeded, and no Git mutation was attempted.

Remaining release blockers are real professional review, missing officer/GST details, commercial publication/configuration, Phase 1 recovery evidence and deployment approval. No production-readiness claim is made.
