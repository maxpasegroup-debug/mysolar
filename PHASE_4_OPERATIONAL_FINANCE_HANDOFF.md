# Phase 4 — Operational finance

Implemented locally on 24 October 2026. All earlier uncommitted phases were preserved. No production database, Railway variables, secrets, deployment, commit, push or external payment service was changed.

## Delivered workflows

- Full, milestone-labelled and partial operational invoices use the existing confirmed order and immutable agreement snapshot. Multiple partial invoices are allowed; issuing concurrent drafts cannot exceed the remaining contract value. Duplicate default full-order drafts remain blocked.
- Order advances are recorded separately as unapplied customer money. Explicit application to an issued invoice creates settlement, not another cash receipt. Applications can be corrected through the existing collection reversal workflow.
- Operational credit notes retain the original invoice. Actual customer refunds can draw only from an invoice's recorded customer credit or an available unapplied advance. Reversing a credit cannot over-invoice a subsequently re-billed contract.
- Supplier bills support partial, bounded payment records and equal corrections. Recording a payment never sends money. Whole bills can be assigned once to a project as costs, avoiding automatic double counting as direct expenses.
- Direct project expenses record gross amount, supplied tax (or unknown), category, date and evidence/reference. Corrections append equal negative entries.
- Margin is shown only for a fully invoiced confirmed order without net credit adjustments, confirmed source tax, positive maintained project costs with known tax, and a current explicit cost-completeness attestation. New cost/commercial records invalidate that attestation. Revenue/costs exclude recorded tax; payroll, overhead or stock costs are included only if explicitly recorded here. This is maintained project margin, not audited net profit.

## Where to use it

- **Accounts / customer invoices:** company-wide finance summary, order balances/advances and project cost controls. Accounting employees can use these financial controls without gaining general project management access.
- **Order record:** advance balance, refund/correction controls and receipt/correction history.
- **Invoice record:** allocated amount/scope, credit notes, advance application, customer credit and actual refunds.
- **Supplier bill record:** paid/outstanding balance, payment history and project cost assignment.
- **Project record:** direct costs, assigned supplier bills and conditional margin/completeness review, only with finance access.
- **Customer 360, Today, customer invoice views, exports/print, SIA and reminders:** use the shared invoice balance calculations. Customer responses omit staff reasons, transaction references, cost data and staff audit details.

## Reconciliation definitions

All arithmetic uses integer INR paise in PostgreSQL and BigInt on the server.

- Net invoiced = issued invoice face values minus net credit notes.
- Invoice settlement = signed collections (including applied advances) minus net invoice refunds.
- Outstanding = positive part of net invoiced minus settlement.
- Customer credit = positive part of settlement minus net invoiced.
- Unbilled = positive contract-minus-net-invoiced difference, calculated separately per confirmed order before aggregation. Credit notes do not silently amend contract terms. Historical over-invoicing remains separately visible.
- Available advance = receipt minus receipt corrections, applications and advance refunds. Advance applications do not count again as cash.
- Net actual receipts recorded = signed cash collections excluding advance applications, plus signed advance receipts, minus all actual refund records.
- Supplier payable = supplier bill gross amount minus signed recorded payments. Paying a bill does not create a second project expense.

Report totals cover all matching saved records; order/project lists are paginated. On-record adjustment histories display up to the latest 200 supplied entries while balances use all entries. Customer collection exports retain their existing truncation/count metadata.

## Security and traceability

The implementation reuses company sessions, role profiles, tenant isolation, finance.read/manage/reverse permissions, commercial finance entitlements, CSRF/origin controls, company transaction locking, operations_idempotency, notifications and audit records. No new authentication, tenant or parallel accounting service was introduced.

Accounts employees may post ordinary operational finance records. Existing finance.reverse authority (owner by default) controls refunds, reversals and cost-completeness attestations. Sales/customer accounts cannot invoke company finance controls. Expired entitlements preserve authorised reads and block new finance writes according to the existing commercial policy.

New consequential entries require operation keys, reasons, actual dates and explicit confirmation. Payment/advance/refund flows require transaction references. A shared database uniqueness registry prevents the same nonempty reference being reused across advances, collections, refunds or supplier payments within a company, including references backfilled from legacy collections. Legacy collections retain support for blank references; their exact request retries remain idempotent.

Posted subledger rows are append-only at database level. Correction triggers require the same original/source/company and equal opposite amount; unique reversal links prevent a second correction. Supplier bill terms and issued invoice amounts/agreement snapshots cannot be rewritten. Source events retain actor, timestamp, reference, reason and record links. Correcting a record is explicitly distinguished from returning cash.

## Schema and files

New migration: `server/db/migrations/025_operational_finance.sql`. It removes the former one-invoice-per-order uniqueness rule; adds advances, credit notes, refunds, expenses, supplier payments, cost reviews and cash-reference uniqueness; extends collection/bill source links; and introduces shared invoice/advance/payable balance views and integrity triggers. Historical migrations were not edited.

New services: `server/operations/finance-ledger.js`, `server/operations/finance-posting.js`.

Extended: existing finance, order, read and Customer 360 services; customer records/exports/print; customer experience; SIA; reminder eligibility; commercial route mapping; server routing; `src/operations.js`; browser checks.

New tests: `tests/operational-finance.integration.test.mjs`, `tests/operational-finance-upgrade.test.mjs`. The Phase 3 upgrade test now derives later migration names from the manifest rather than assuming 024 is the final migration.

## Verification and release boundary

Local verification uses disposable loopback PostgreSQL, fictional users/companies, and intercepted browser fixtures. No production credentials or customer data were used. Actual financial writes and concurrency are exercised by PostgreSQL integration tests; browser fixtures do not simulate successful business writes.

Final results: **325 automated tests passed, 0 failed, 0 skipped; 684 browser checks passed, 0 failed; 1,149 static checks passed, 0 failed.** The final focused finance rerun also passed all 12 tests, including actual API advance-correction history. `git diff --check` passed. Desktop and mobile finance screenshots were inspected.

Commands used: `node scripts/verify-postgres.mjs`, focused runs through the same disposable-database runner, `node scripts/browser-check.mjs`, `node scripts/check.mjs`, and `git diff --check`. Evidence is recorded in `.verification/phase-4-integration.log`, `.verification/phase-4-finance.log`, `.verification/phase-4-upgrade.log`, `.verification/phase-4-browser.log` and `.verification/phase-4-static.log`. Browser widths: 360, 390, 768, 1024, 1280 and 1440px.

Before a separately authorised release, retain a recoverable database backup and run the repository's supported checksum-aware migration mechanism through 025. Earlier uncommitted migrations 023 and 024 are also included in the working tree. The repository already declares `npm run db:migrate` as the Railway pre-deploy command; its effective live configuration was not changed or verified here.

No bank reconciliation, gateway, payment initiation, automatic refunds, GST filing/e-invoicing, payroll costing engine, automatic stock valuation or unrestricted AI financial execution was introduced. Partial invoices are explicit operational gross allocations; original order line/tax details are labelled as source agreement information, not invented partial tax breakdowns.

Phase 5 was not started.
