# Solar OS — phases 4–8 implementation and release handoff

Date: 27 October 2026. Existing repository: `D:\APPS\WEB\mysolar`; branch `main`.

## Executive decision

The distributor OS has been extended locally through the remaining application-development milestones. The customer dashboard and logo remain unchanged. All intended earlier foundation, business-preset and practical-setup changes are preserved.

**This is a local release candidate, not an approved public launch.** Phase 8's release, real-business pilot and custom-domain portions cannot be marked complete without their actual evidence. No production database, Railway configuration, DNS, provider resources, live customer/company records, outbound messages, commit, push or deployment was changed by this task. The user will perform the real-company pilot. No real company was created here.

Local completion must not be confused with deploying the matching code/migrations. A normal push to main can trigger Railway's deployment/migration path and remains on hold pending the separately approved coordinated cutover.

## Milestone status

| Phase | Reused and completed locally | Remaining external gate |
| --- | --- | --- |
| 1 — Dependable foundation | Earlier snapshot fixes, isolated database tests and documented recovery/monitoring evidence retained | Production release/cutover remains separately authorized; earlier operations evidence is historical |
| 2 — Business presets | Equipment distributor, dealer/retailer, installer/EPC, combined; same resumable flow and permission-preserving presentation | Real-owner acceptance of each advertised preset |
| 3 — Practical setup | Seven-step guide, genuine setup states, reviewed decisions/imports, invitations and communication review | Actual company review, real employee acceptance and delivery evidence |
| 4 — Daily sales | Existing Today, Customer 360, assignment/follow-ups/qualification retained; manual lead quotations now use standard calculations, snapshots, revision approvals and issued-quotation order conversion | Real sales staff walkthrough |
| 5 — Distribution/installation | Existing purchasing/locations/transfers/lot costs/materials/field/commissioning/handover/utility gates retained; new per-line delivery and original-delivery customer returns | Real receipt/delivery/installation evidence in pilot |
| 6 — Finance | Existing advances/partial invoices/collections/credits/refunds/expenses/payables preserved; customer credit holds/limits and accountant exports added | Qualified tax/accounting review before statutory claims |
| 7 — Repeat sales | Recorded source/referrer/campaign and actual-response history; management/SIA context; existing approved durable reminders and retention workflows verified locally | Authorized running production workers, actual recipient delivery and measured adoption |
| 8 — Branded delivery/launch | Company onboarding/delivery checklist, truthful public share link, owner guide, support runbook, packaging review and pilot matrix | Coordinated production release, real pilot, live plan/cost review, approved domain provider implementation and verified DNS/TLS/activation |

Supplier/manufacturer-specific onboarding, payroll, live checkout/payment collection, autonomous SIA financial actions and one-click custom-domain provisioning are not advertised as complete.

## Phase 4 — real manual sales without artificial enquiries

Migration 037 adds an explicit manual contact/lead channel to the existing quotation thread/version tables. A quotation belongs either to a real marketplace enquiry or to a real same-company manual lead/contact pair, with database checks and company-qualified foreign keys. No customer account or enquiry is fabricated.

- `GET /api/companies/current/manual-leads/:id` and `POST .../manual-leads/:id/quotations` enforce current tenant, lead assignment/read access, CRM management, quotation drafting, active company and saved qualification rules.
- The existing draft service, editor, exact money calculations, trusted product/seller-offer snapshot resolver, versioning, discount limits and review service are reused. Issued manual quotations can be externally shared/printed; issuing does not claim an email was sent or an agreement/payment was received.
- Edits invalidate approval. Own-draft approval is rejected unless the existing explicit owner override/reason is used. Required approval is bound to the exact draft revision and current policy.
- Manual quotations retain their contact and lead. Order conversion copies the issued immutable terms and requires documented external acceptance; no app-customer consent is fabricated. Existing expiry/withdrawal/open-order uniqueness checks remain.
- Quotation list/read scopes preserve customer privacy. Manual quotations do not appear in another customer's marketplace comparison. Customer 360 includes the contact's legitimate manual quotation history.
- Workflow review notifications can reference a manual quotation without a fictional enquiry. The new company-qualified version foreign key prevents mismatched company notification context.

## Phase 5 — quantities, returns and stock/project reconciliation

Migration 038 adds `order_fulfilment_entries` and a tracking flag. New/open orders require actual per-line quantities before partial/full fulfilment can be claimed. Historical already-closed orders are not assigned invented quantities.

- Delivery links an order line to actual consumption when maintained stock/reservations are involved. A free-text delivery reference alone cannot bypass that linkage. External supply/service quantities require actual reference/explanation and do not pretend to be stock consumption.
- Quantities cannot exceed the order line or the linked consumption. Idempotency and the existing company lock prevent duplicate execution and over-delivery.
- Returns reference an actual original delivery and cannot exceed its remaining unreturned quantity. Managed-stock returns reuse the original cost-allocation engine; costs/quantities are restored, not revalued from a newer price.
- Return movements preserve associated project identity. Installation material balances include customer returns; project cost balances use the same returned-cost allocations. A return from a fulfilled order reopens partial fulfilment and enables quantity tracking.
- For a historical untracked closed order, an authorized employee may first document real historical delivery evidence, then record its actual return. No automatic historical delivery record is manufactured.
- Delivery/return records do not issue a commercial credit, change the immutable contract or send/refund money. Existing credit-note/refund workflows remain separate.
- Existing paired warehouse transfers, partial receipt, supplier returns, surveys, safety/technical checklists, materials readiness, field evidence, commissioning/handover and separate utility progress are retained.

## Phase 6 — credit controls and exports

Migration 039 adds nullable operational credit limits and credit holds to existing company customers. Only authorized finance management can update them, with reason, revision protection and audit. New settings do not alter the contract/invoice/cash ledgers. Credit settings are removed from non-finance contact projections; sensitive changes are written to the protected audit system rather than general customer activity.

Order confirmation checks holds and contract-based exposure using confirmed commitments, existing invoice settlement and available unapplied advances. Unbilled commitments count; no bank creditworthiness or payment verification is claimed. Existing company locking serializes consequential changes.

`GET /api/companies/current/operations/finance/export?ledger=...&page=...` requires finance read access. Eight allowlisted ledgers: invoice balances, advances, collections, credit notes, refunds, project expenses, supplier payments and supplier balances. It returns explicit actual fields, CSV, page/total metadata and timestamp; no arbitrary table or SQL input is exposed.

Invoice exports join trusted balance calculations to original invoice reference/date records. Export code does not invent unavailable invoice tax-mode columns or calculate statutory tax. Source tax records still require professional review. Supplier tax treatment and nullable cost tax remain as recorded.

Exports are up to 500 rows per page, with owner-selectable pages and an explicit additional-pages warning. Monetary values are INR paise; formula-like text is neutralized while genuine negative monetary integers remain numeric. Each page reflects current records, not a frozen multi-page accounting snapshot. Reconcile source totals and export during a quiet period. No statutory filing, e-invoice certification or bank reconciliation is claimed.

## Phase 7 — traceability, retention and SIA

Migration 040 stores reviewed source channel/campaign/referrer and first/latest staff-recorded response for an existing lead. Foreign-company referrers fail; a manual lead cannot claim marketplace attribution without a real enquiry. Source changes are audited and preserve the original CRM source field. An import used as a referral source cannot be destructively rolled back.

Actual-response recording requires a reference and explanation. First recorded response time is preserved and stale retries are rejected; it is not a message send/read receipt. New source groups use assignment-aware lead scope in management reports. SIA can summarize those server-calculated reports alongside existing permitted priorities, with current context and existing explicit proposal approvals.

Existing durable follow-up, quotation, task/milestone, procurement, service, maintenance and renewal reminders remain permission/feature/consent aware, idempotent and observable. No production reminder worker was started. Renewals are reminders, not paid renewals or automatic charges. No provider credentials were introduced and no external AI or messaging success is fabricated.

## Phase 8 — useful delivery status, not a false ready badge

`GET /api/companies/current/setup/delivery` and `/#/distributor/setup?step=delivery` show actual setup completion, activation, current access mode/assigned snapshot plan when permitted, public profile eligibility, and explicit acceptance gates. Domain metadata is restricted to domain-read permission; plan details require subscription-read permission.

A copyable canonical public company link appears only when the current published vendor view confirms eligibility. An unpublished company is not presented as live. Branding, website draft/publish and consultation workflows are reused; opening WhatsApp still only prepares a user-sent message.

The existing domain provider is deliberately unconfigured. The custom-domain portion is **not implemented as a live provider integration** and has not been delivered. Required next work: select/authorize a provider, implement and test its adapter, verify ownership and TLS evidence, and separately approve traffic activation. No DNS, provider resource or certificate operation occurred here.

The code reserves `pro` for PRO-only partner/executive features. FREE/ELITE labels and their actual prices/features must be checked against authorized live commercial records; this task did not read or change production commercial settings or invent a new price catalogue. Plans remain versioned/snapshotted and billing disabled where configured. See the packaging guide for the pilot matrix and launch gates.

## Files added in phases 4–8

- `server/db/migrations/037_manual_sales.sql`
- `server/db/migrations/038_order_fulfilment.sql`
- `server/db/migrations/039_credit_controls.sql`
- `server/db/migrations/040_growth_attribution.sql`
- `server/operations/fulfilment.js`
- `server/operations/credit.js`
- `server/operations/finance-export.js`
- `server/operations/growth.js`
- `server/setup/delivery.js`
- `tests/manual-sales.integration.test.mjs`
- `tests/finance-csv.test.mjs`
- `SOLAR_OS_OWNER_ONBOARDING_GUIDE.md`
- `SOLAR_OS_PACKAGING_AND_LAUNCH.md`
- `SOLAR_OS_SUPPORT_RUNBOOK.md`
- This handoff.

## Existing files extended without discarding earlier work

`server/purchase/company.js`, `server/purchase/service.js`, `server/operations/orders.js`, `server/operations/material-ledger.js`, `server/operations/installation.js`, `server/operations/crm.js`, `server/operations/read.js`, `server/operations/customer-360.js`, `server/operations/reporting.js`, `server/operations/finance-posting.js`, `server/setup/routes.js`, `server/sia/tools.js`, `server/sales-tools.js`, `src/purchase.js`, `src/operations.js`, `src/organization.js`, `scripts/browser-check.mjs`, `tests/account-channels-upgrade.test.mjs`, `tests/practical-setup.integration.test.mjs`, `README.md`.

No new runtime dependency, backend architecture, identity system, tenant store, payment path or separate distributor codebase was introduced. Historical migrations 001–036 were not rewritten by these phases. Listed pre-existing line-ending/stat notices for historical files are not new SQL edits.

## Final verification — local release candidate PASS

Final results, with process exit code **0** confirmed for the comprehensive, browser and static runs:

| Check | Actual result | Evidence |
| --- | --- | --- |
| Full isolated PostgreSQL / HTTP / unit suite | **456 passed, 0 failed, 0 skipped** | `.verification/solar-os-final-postgres.log` |
| Focused sales, exports, historical returns, setup privacy and CSV tests | **13 passed, 0 failed, 0 skipped** | `.verification/solar-os-final-focused.log` |
| Browser / responsive suite | **1,041 passed, 0 failed** | `.verification/solar-os-final-browser.log` |
| Static syntax / imports / assets | **1,402 passed, 0 failed** | `.verification/solar-os-final-static.log` |

Counts overlap and must not be added. The full manifest through migration 040 was applied by the supported runner in disposable local fixtures; checksum, repeat/upgrade and failure regressions were retained. Clusters were stopped. No production migration was run. Browser coverage includes 360, 390, 768, 1024, 1280 and 1440 pixels and the new distributor screens. The last application changes preceded the final full run; no application-source changes followed it.

Protected customer-dashboard, marketplace-dashboard, locale and logo hashes match the preserved baseline. Git staged diff was empty. The last whitespace check passed; existing Windows line-ending and Git ignore-file permission notices are informational.

Browser APIs use fictional intercepted fixtures; they are not production delivery or pilot evidence. Database runs use generated loopback-only disposable PostgreSQL clusters, not production credentials/data. Existing customer/dashboard, source-integrity, company tenancy, roles, recovery, CSRF/origin, PRO downgrade, stock/finance, project/service, automation, migration/checksum/failure/retry tests are retained.

Defects found during verification were corrected rather than bypassed: launch-query JavaScript quoting, a test-only selector quoting error, a legacy test fixture missing required agreement confirmation, an upgrade comparison that did not account for new safe-default credit columns, invoice export metadata not present in the balance view, installation net quantity after customer returns, and sensitive credit metadata appearing in general customer history. Existing checks/permissions were not weakened to turn failures green.

## Release boundary and commands

No Git staging/commit/push was performed. Review all intended prior foundation/setup changes together with this work. The local release set includes pending migrations **034–040**; never trigger a partial or rolling migration-034 release against old quotation writers. Use the documented coordinated write-fence, recovery, migration, matching-code, health and reopening procedure after explicit approval.

Private `.verification` evidence/recovery material and `.env` must remain excluded. Commands below are a review reference, not executed actions:

```powershell
cd D:\APPS\WEB\mysolar
git status --short
git diff
git add -- .
git diff --cached --stat
git diff --cached
git commit -m "Complete Solar OS sales operations finance and controlled delivery foundation"
# HOLD until the coordinated production cutover is separately approved:
# git push origin main
```

Single next external milestone: authorize and execute the reviewed matching-code/migration release, then have the approved real-company owner/employee/customer pilot demonstrate acceptance. Domain delivery remains a separate provider implementation and activation milestone; neither a local test pass nor a commit closes it.
