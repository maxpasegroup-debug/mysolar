# Phase 6 - Financing and subsidy tracking

Implemented locally on 24 October 2026 over the preserved Phase 1-5 working tree. No production database, Railway settings, secrets, deployment, commit or push was changed. No lender, subsidy authority or payment provider was contacted. Phase 7 has not started.

## Where to use it

- **Company -> Loans & subsidies** (`#/distributor/funding`): permitted application directory, search, status filters and separate loan/subsidy views.
- **Create application tracker**: choose one application type, existing company customer, optional matching project, supplied institution/programme, requested amount, responsible employee, next action and follow-up.
- **Application record**: distinct requested/approved/disbursed amounts, submission/decision evidence, internal progress, documents, status history, assignment changes, disbursement records and corrections.
- **Customer record and project record**: linked trackers appear only within the employee's funding permissions and assignment scope. The existing Customer 360 remains intact; financing is a separate linked section rather than being added to receivables or revenue.
- **Today**: overdue/current funding follow-ups appear from actual saved application records within the current user's scope. This does not enable a new automatic messaging rule.
- **Customer installation/project record**: a read-only summary is shown only when an authorised company manager explicitly enables summary sharing on that tracker. Unshared applications are omitted. Financial documents, notes, employee identifiers, external application references, transaction references and decision evidence remain company-private.

## Meaning of the records

Each loan and subsidy is a separate `funding_applications` row with an immutable type, customer and company. Multiple legitimate applications may be linked to a customer/project. Shared service/storage code avoids duplicating validation; it does not merge loan and subsidy records or amounts.

The internal lifecycle is **preparing -> submitted -> under review / more information -> decision recorded -> closed**, with controlled withdrawal and reopening. Supported transitions are enforced by the server. Actual external submission references/dates are needed before reporting submission. An internal status change does not send an external application or imply approval.

The supporting decision is independently **pending**, **approved** or **rejected**. A dated lender/authority document reference and explicit staff confirmation are required. Approval records must be positive, within the maintained requested amount, and not below existing net disbursements. Rejection records require zero approval and cannot contradict existing net disbursements. A later decision correction requires owner-level funding.correct authority and retains the previous decision in audit/history. A different institution/programme after submission requires a separate tracker.

All decisions are labelled **staff-entered supporting records, not provider-verified decisions**. No subsidy amount, eligibility, bank approval, interest rate, repayment schedule, savings promise or automatic grant calculation is invented.

Disbursements are separate, dated, evidence-backed entries naming the actual recipient and transaction/disbursement reference. A positive application/approval status never creates one. Partial disbursements are bounded by the recorded approval. Their signed total is shown separately from requested and approved amounts. These records do not establish that MY SOLAR or the distributor received the funds: the recipient may be the customer or another named party. They do not transfer money, settle invoices, create advances or affect recorded sales collections.

Owner-authorised corrections append an equal opposite entry referencing the original. Source transaction references remain reserved after correction to prevent reuse. The original amount, recipient and evidence remain immutable. Correcting tracking does not claim or initiate a cash refund. Closed history is preserved; a supported reopening is an explicit internal action and does not erase decisions or money records.

## Authorisation, isolation and documents

New permission grants are introduced through migration 027; the historical role catalogue is unchanged:

| Role | Default funding access |
| --- | --- |
| Owner | Company read/manage, decision corrections and disbursement corrections |
| Accounts | Company read/manage, first decision and actual disbursement recording; no correction authority |
| Sales | Read/update progress and supporting documents only for specifically assigned trackers |
| Supervisor, field, inventory, part-time sales | No new funding access |

Company role profiles can restrict these base grants. Existing customised profiles are not silently expanded. Owners should review profile grants before assigning funding work. Responsible employees must have active membership and effective funding update/manage permission. Assignments, notes, document metadata, files and all mutation endpoints enforce the same company and record scope. An assigned-sales permission does not grant company accounting summaries or unrestricted project access.

Employee departure and role-restriction checks include open funding applications. The existing company-wide preview/confirmation handoff transfers them atomically, revalidates the receiving employee's permissions, preserves assignment history and revokes former access. Project-team handoffs remain about project work; a funding responsibility is separate from field-team membership and may continue after physical completion.

The existing authenticated, encrypted, scanned file service supports funding records. PDF/PNG/JPEG limits, MIME-content validation, scanner approval, company quotas, downloads, integrity checks and deletion/audit behaviour are reused. Funding files cannot be customer-shared: the API rejects that choice, the database constrains it, and the UI disables it. Customer download routes cannot read funding files. Missing scanning/encryption configuration leaves uploading unavailable; plain-text document references remain usable and are labelled metadata only. New funding uploads recheck finance entitlement before scanning and before storage.

Existing session, active-company, CSRF/origin, effective-role, tenant and subscription checks remain authoritative. Funding writes use the existing **finance** entitlement; authorised reads remain available after expiry. No plan names/prices/entitlements were changed. Browser-provided user/company/role claims are never trusted. References are treated as plain text and are not executed as URLs.

## Database and integrity

New sequential migration: `server/db/migrations/027_financing_subsidy.sql`. Historical migrations were not edited.

- `funding_applications`: typed application identity, same-company customer/project/employee links, internal lifecycle, decision/evidence, independent amount columns, dates, responsibility, follow-up, revision and explicit customer-summary visibility.
- `funding_disbursements`: append-only signed evidence entries, source-linked equal corrections, unique reversal and company-wide transaction-reference protection.
- Composite foreign keys ensure that an optional project belongs to the same customer/company and the responsible employee belongs to the company.
- Constraints enforce positive requested amounts, bounded approval/disbursement totals, decision evidence and submission prerequisites. A database trigger derives the disbursement total from entries; direct rewrites of that total are rejected.
- Row/transaction locking, expected revisions and actor/path/payload-bound operation keys prevent stale writes, over-disbursement, duplicate retries and changing a previously accepted request payload.
- Application identity is immutable and deletion is blocked. History uses the existing operational events and audit system, recording actor/time/reason and previous/new values. No parallel audit or payment system was introduced.
- Company/customer/project, follow-up, disbursement and external-reference indexes/uniqueness support scoped retrieval and duplicate handling. Empty application references are permitted during preparation; submitted identifiers are retained.
- Existing records are preserved. Migration 027 creates no historical loan/subsidy applications, approvals or money records.

## Files

Created: this handoff; `server/db/migrations/027_financing_subsidy.sql`; `server/operations/funding.js`; `tests/funding.integration.test.mjs`; `tests/funding-upgrade.test.mjs`.

Extended: `server/index.js`, `server/commercial/policy.js`, `server/documents.js`, `server/operations/core.js`, `read.js`, `customer.js`, `work-handoffs.js`; `src/app.js`, `account.js`, `workspace.js`, `operations.js`, `release-tools.js`; `scripts/browser-check.mjs`; `tests/installation-materials-upgrade.test.mjs` (derives subsequent migration names from the manifest), and `tests/company-onboarding-acceptance.integration.test.mjs` (deterministic test clock). Existing earlier-phase changes in these files were preserved.

## Verification

Local only: disposable loopback PostgreSQL, fictional participants and intercepted browser fixtures. The scanner is mocked in integration tests; no real scanner/provider delivery or production readiness is claimed. Browser writes deliberately return failure rather than simulate successful business actions.

Focused API checks cover distinct loan/subsidy records, scoped reads, application filters, exact retries/changed payloads, evidence/date/amount requirements, prohibited sales decision/money actions, concurrent partial disbursement, excess/duplicate references, owner-only corrections, immutable originals, no customer collection/advance side effects, document privacy, limited customer summaries, customer/project links, departure handoff, CSRF and expired-entitlement behaviour. The final case additionally proves an expired plan cannot invoke scanning for a new funding upload.

The populated upgrade check verifies unchanged existing shared project documents, empty new application tables, role grants, customer/project foreign keys, immutable identity, ledger-derived totals, disbursement/correction bounds, private-document constraints, migration checksums and repeat-run behaviour. The complete regression suite exercises the preceding phases as well.

Final results: **348 automated tests passed, zero failed and zero skipped; 739 browser checks passed, zero failed; 1,201 static checks passed, zero failed.** All 27 migration entries passed fresh-install, checksum and repeat-run checks, with the populated 026-to-027 upgrade checked separately. The final database suite ran alone after an earlier run alongside Chromium hit a local connection timeout. `git diff --check` passed. Mobile and desktop funding screenshots were inspected. Browser widths: 360, 390, 768, 1024, 1280 and 1440px. An explicitly delayed private-file response also preserved an unsaved follow-up draft. Evidence logs: `.verification/phase-6-postgres-final.log`, `.verification/phase-6-funding-final.log`, `.verification/phase-6-static.log`, `.verification/phase-6-browser.log`. Initial checks exposed and corrected an unapplied loan/subsidy list filter, an incorrect commercial-policy test fixture table name, a missing create-form dispatch and an existing nested private-file loading issue. File panels now mount their asynchronous result into their own placeholder without replacing other form drafts, and only in the original account/company/view context. Existing migration-upgrade expectations now allow the new sequential migration. A pre-existing onboarding quota assertion was made deterministic by pinning that test's clock across rate-limit windows; production limits were unchanged.

## Release and remaining boundaries

No new environment variables or dependencies are required. Secure file uploads depend on the existing encryption, scanning and quota configuration; none was changed. Staff must retain real source documents and accurately identify the recipient of any disbursement.

Before a separately authorised release, preserve a recoverable backup and use the existing checksum-aware migration runner through **027**, with matching application code and any unapplied earlier migrations **023-026**. Production migration state and Railway's effective settings were not inspected or changed here. A push may trigger Railway auto-deployment; review its backup/migration path first.

Deferred: actual bank/government integrations, official eligibility checks, external submissions or verified decisions, EMI/amortisation/interest accounting, repayment collection, payment initiation/reconciliation, automatic subsidy calculations, automatic funding reminder messages, customer document sharing and bulk funding exports. The implemented tracker is usable without those integrations and does not advertise them as operational.

The next milestone is the separately requested Phase 7. This phase does not authorise deploying, changing live data or onboarding real companies.
