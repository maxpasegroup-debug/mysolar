# MY Solar Solutions - real company and operational acceptance plan

28 October 2026. **Plan only for prohibited database/production steps. No live company is created by this task.**

## Gates are separate approvals

A. Authorize creation/mutation of one disposable local PostgreSQL cluster and fictional test schemas, including the supported migration runner. B. Separately approve destructive failure/retry/rollback/recovery scenarios inside that disposable target. C. Separately authorize production metadata/backup inspection and restoration into an explicitly isolated recovery target. D. Approve production maintenance, writer fence, matching-code release/migrations and rollback decision. E. Approve reopening users and a named real-company pilot. Approval for A does not authorize B-E.

The current directive does not grant A-E. No Railway, DNS, provider, production database or deployment action is included.

## Disposable rehearsal specification

- Existing runner: `scripts/verify-postgres.mjs`; isolated application harness: `tests/helpers/isolated-app.mjs`. Inspect both again before authorization/execution. They create a fresh random cluster below ignored `.verification`, bind a random loopback port, generate credentials in memory, use the disposable `mysolar_test_phase1` database and random per-suite schemas. No externally supplied production URL is an acceptable substitute.
- Confirm installed PostgreSQL version, Node/dependencies, executable paths, disk capacity and supported version compatibility before mutation. Prior records of PostgreSQL 18.6 do not establish today's binary/runtime. Version-sensitive DDL must be verified on the selected version.
- Show only sanitized identity evidence: loopback host, approved disposable database name, generated cluster/schema identifiers, database/server version and absence of Railway/shared-host references. Never print passwords, URLs or private environment values.
- Reject inherited production/shared endpoints, a pre-existing unidentified database and any non-disposable target. Do not replace strict target, schema or checksum checks with mocks to make the gate pass.
- Review the complete existing 001-040 ledger manifest, including the generated permissions entry; verify checksum, empty install, supported upgrade, repeat-run and expected constraints/indexes/FKs. Do not rewrite historical SQL.
- Fictional seed data only: at least two company owners, sales/field/accounts/auditor employees, separate customers, published/unpublished catalogue/offer revisions and source-linked orders/projects/finance. Seed creation is part of approval A, not permitted now.
- Keep logs, exact commands, process exits, ledger/checksum evidence, assertions and failure traces under ignored local verification storage with no credentials/private records. Approve cleanup and exactly which disposable paths may be removed. Production recovery data requires its own retention/security authorization.

Prepared new suite: `tests/master-onboarding.integration.test.mjs`. It has **not run**. The future approved invocation uses the existing isolated runner and named suites; it must not be replaced by `npm test` with an unidentified `TEST_DATABASE_URL`.

## Company onboarding acceptance

1. Create a fictional business account using the existing email/password and email-OTP flow. Verify incomplete, invalid, wrong-type, expired, excessive-attempt, replay and resend behavior. Confirm password/OTP never appears in logs, URLs or audit metadata.
2. Test sign-in, sign-out, refreshed sessions, recovery, password reset and revoked sessions. Confirm customer/business email uniqueness according to the current account model, without creating a second auth system.
3. Open company setup with India default; select state/UT and district, including the manual renamed-district fallback. Create a company with its retry UUID. Verify exactly one company, owner membership, profile/address and creation audit.
4. Repeat the exact request and verify the same company/status-200 replay; change payload with the same key and expect conflict; use a different account with the same key and verify distinct identity; revoke ownership and reject replay. Retry a lost-response request and a new-key identical company after a page reload. Never restore removed owner authority.
5. Under approval B, run simultaneous identical requests from separate sessions/processes and conflicting keys, insert failure after company/owner/audit steps, verify complete rollback and retry. The user-row lock and primary key are source intentions until proven here.
6. Save each company step, refresh and sign in again. Verify legal/contact/address/brand/services/coverage and practical setup choices remain linked to the right company. Test stale revision, invalid PIN, invalid URL/logo host and state/district changes.
7. Test equipment distributor, dealer/retailer, installer/EPC and combined presets. Presets guide terminology/services/navigation; they must never grant role or plan permission. Do not advertise a supplier/manufacturer portal from these labels.
8. Invite fictional employees through the existing role templates, team/manager/profile tools; accept with the intended authenticated email/account type. Verify expiry, replay, revocation, recipient mismatch, company capacity and current PRO eligibility for part-time executives.
9. Submit company setup. Verify owner completion does not independently activate the company, publish it or record payment. A separate authorized platform reviewer handles eligibility/review. Self/affiliated approval stays rejected.
10. In an eligible pre-billing or administratively assigned trial/subscription, enter the actual workspace. Verify setup home vs active-owner Boss vs employee Today, source counts, current company switching and return routes.

## Daily business chain

| Area | Acceptance evidence required |
| --- | --- |
| Customers/CRM | Create/edit/search a real fictional contact, duplicate conflict, lead qualification, allowed pipeline transitions, assignment to current authorized employees and Customer 360 links; reject another tenant/unauthorized role. |
| Quotations | Marketplace enquiry and manually acquired lead flows, current catalogue/own approved offer, exact captured product+offer revision pair, missing/contradictory history rejected, edit/review invalidation, discount limits, expiry, source preservation and explicit issue action. |
| Orders | Convert the exact eligible quotation, preserve immutable source/terms, require correct in-app/external acceptance, reject duplicate/concurrent conversion, enforce credit controls and fulfilment quantities. |
| Stock/purchases | Locations, reservations, actual consumption, transfers, partial supplier receipts, original-cost returns, purchase quantities/cost lots and order/project material reconciliation. No PO means goods received; no order means stock automatically consumed. |
| Projects | Survey, crew/schedule, dependencies/checklists/blockers/evidence, assignment history and explicit transfer of open work; readiness approval binding; commissioning/handover checks; utility progress remains separate. |
| Finance | Advances, partial/milestone invoices, allocations/collections/reversals, credit notes/refunds, expenses/supplier payments, credit holds and unbilled vs invoiced balances; duplicate/concurrent retries and CSV source reconciliation. Staff records are not bank verification or statutory compliance. |
| Service | Installation-to-service, customer-visible updates, warranty/replacement/maintenance history, actual customer resolution review, rejection/reopen/escalation and permission-controlled feedback. |
| Notifications | Combined and legacy workflow feeds show manual quotation notices to currently permitted staff without a false enquiry; list/unread/read share visibility rules; revoked module permissions, changed company, other recipient and wrong source remain denied. |
| Reminders | Rule approval, source eligibility, preferences, company policy, manual quote staff-only recipient, order-converted/closed-source exclusion, duplicate occurrence protection, worker crash/lease/retry/dead handling and audit/delivery records. No customer consent inferred from a manual contact. |
| SIA | Accurate permission-scoped evidence, unavailable provider fallback, bounded/invalid model output, costs/limits, exact session/payload-bound approved enquiry response, rejection/expiry/replay and no autonomous stock/finance operation. |
| Reports | Dashboard/list/report definitions match actual source rows; active quotation thread count matches its filtered list; pending order count matches its view; current vs previous periods and receipt/contract/invoice definitions remain distinct. |
| Documents | Fail closed with scanner/key unavailable, configured clean scan, encrypted private storage, ownership recheck on download, deleted/tampered/quota-rejected content and export privacy. |
| Public profile | Independent review/publication, inactive/unpublished/unknown profile fail closed, published offers and declared PIN coverage only; public listing does not imply operational access/payment. |
| Commercial | Configured pre-billing, explicit plan snapshot/trial dates/one-time eligibility, expiry/downgrade/cancellation preserving reads, role permission AND feature enforcement, no browser status/payment spoofing. |

Relevant suite families: authentication/email-signup/password-codes/account-channels; company-location/practical-setup/company-onboarding/master-onboarding; people-sales/customer-360/manual-sales/os-phase2/quotation-source upgrade; purchase/installation/materials/operational-finance/funding/retention; automation/management-automation; tenancy/business-access/commercial/PRO; documents/connected-journey; release-concurrency/recovery. Consult the audit's coverage matrix for exact files. Their existence is not execution evidence.

## External delivery and operational acceptance

Separately authorize and name the provider, sender and test recipients for email/OTP/invitations/reminders. No email is authorized by this plan. Verify encrypted queue payload, provider acceptance, actual inbox receipt, link/code expiry, failure classification/retry and preference enforcement. A previously received monitoring email does not prove current signup, worker or reminder delivery.

Verify the actual deployed mail/reminder/monitor process revisions, heartbeats, safe logs, alert inbox receipt and capacity alerts only with explicit Railway/production access approval. Test restore recoverability into the approved isolated target, never over production. Keep production/backup evidence separate from fictional local acceptance.

Custom domains require a real approved adapter, ownership/TLS/reconcile proof, header/origin/cookie/caching/unknown-host isolation and explicit traffic activation. Do not change DNS, attach domains or provision certificates/resources here. TalkinLabs, payment checkout, recurring charges and marketing agents remain unavailable; do not simulate them in a pilot.

## Real-company pilot and go/no-go

Only after A-D and exact release approval: the owner supplies/enters their real data and authorizes a named pilot under E. Do not provision Athira or any company from historic chat details, invent credentials, or send invitations without that pilot scope. Document who approves activation and the configured access/trial conditions before onboarding.

An unfamiliar owner and employee should perform one lead-to-order-to-project/service journey with authorized finance/stock roles, on a phone and desktop, without developer help. Observe actual daily usage and failures. Reconcile source records, communications, subscription state and permission revocation. Obtain qualified tax/accounting review before compliance claims.

**GO for onboarding trials** only with successful database-backed scenarios, no critical isolation/finance/source defect, verified recovery and delivery/worker evidence, truthful enabled feature catalogue and explicit pilot approval. Otherwise keep **NO GO**, state the failed gate and preserve all records. UI screenshots, mocked results and this plan cannot grant release or reopening approval.
