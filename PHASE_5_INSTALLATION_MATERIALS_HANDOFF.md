# Phase 5 - Installation and materials control

Implemented locally on 24 October 2026. Earlier uncommitted Customer 360, people/sales, project-coordination and finance work was preserved. No production database, Railway configuration, secret, deployment, commit or push was changed. Phase 6 has not started.

## Delivered workflows

- The existing project record now contains installation readiness, survey review, a confirmed installation window, active crew, material planning, safety/technical checks, commissioning/handover checks and separate utility progress.
- Actual site observations use the existing survey service. Surveys are append-only. A later survey must be reviewed again; observations do not calculate system suitability or certify roof/electrical safety.
- Managers record the survey review reference, customer-confirmed schedule reference and material source. The start date also updates the existing project schedule used by daily-work views. Required safety/technical outcomes and supporting references are needed before explicit readiness approval.
- Eight core checks are seeded for every project: site access, electrical isolation, work at height, approved design/equipment reference, earthing/protection, commissioning test results, handover documents and customer orientation/acknowledgement. Managers can add project-specific required or optional checks, up to forty total. Core requirements cannot be disabled through the API.
- Field employees may record authorised safety/technical observations on accessible projects. Managers record non-applicability, commissioning and handover outcomes. A non-pending outcome requires supporting evidence/reference and observations; non-applicability requires an explicit reason.
- Readiness approval binds the current survey, reviewed schedule, effective active crew, material coverage and safety/technical outcomes to a server-generated fingerprint. Missing or changed records invalidate approval. The approver must still have active membership and effective project-management permission.
- Installation cannot start before its recorded start date. Installation start/completion and project closure use the server-side readiness guard, including direct API calls. Existing ordered stages, deadlines, task/checklist dependencies, assignment scope and completion evidence remain enforced.
- Maintained-stock projects require an active material plan and sufficient actual reservations plus net consumption for readiness. All required quantities must be physically consumed before installation completion. Unused project reservations must be released before project closure. Documented external/customer-supplied or no-material scope is an explicit manager decision, not inferred inventory availability.
- Material requirements can be revised or retired with a reason/reference and retained history. Unused reservations must be released before retiring a requirement. Revised scope invalidates the readiness fingerprint.
- Utility application, utility inspection, net meter and energisation are separate records. Dated supporting references are required for reported decisions. They can progress after physical project completion. Utility approval is never inferred from installation status; physical completion does not establish permission to energise.
- Customer project and printable handover views expose only explicitly shared utility states/references, existing shared milestones, equipment passports and protected order documents. Private checklist observations and material costs remain private.

## Materials, locations, returns and costs

The implementation extends the existing inventory ledger, reservations and procurement receipts rather than introducing another stock system.

- Each existing warehouse label receives a company-scoped stock-location identity. New items reuse or create a matching active company location. Changing an item's location identity is blocked; physical transfers use paired ledger entries.
- A transfer requires the same SKU, catalogue product and unit at two different locations. Outgoing and incoming movements, quantities and cost lots commit atomically. Reservation and on-hand guards prevent transferring reserved or unavailable stock.
- Project managers maintain quantity requirements. Stock employees can reserve, consume, release and return stock through narrow company-scoped endpoints without general access to project records or finance. Their inventory record provides project-allocation and original-issue return controls.
- FIFO issues retain per-lot integer-paise cost allocations. Purchase receipts use the actual purchase line's maintained net cost only when tax treatment is known. Optional opening/positive-adjustment costs require a supplied cost reference. Unknown values remain null, including legacy balances and legacy consumption.
- Transfers preserve individual known/unknown cost lots and purchase-line provenance. Integer rounding conserves the original lot cost through fractional transfers and partial returns.
- Project returns must reference an original issue for that project, company and stock item. Cumulative returns cannot exceed original consumption. Original cost allocations are restored proportionately; retries cannot duplicate the return. Returns after closure retain historical completion while changing current material balances and cost-review validity.
- Supplier returns are limited to the original purchase line's actually received, not-yet-returned quantity and remaining physical source lots. Consumed, reserved or transferred-away source stock cannot be returned from the wrong location. No supplier credit, payable correction or cash payment is automatically fabricated. Received totals remain historical goods-receipt totals; a physical return does not reopen the purchase for replacement receipts.
- Project cost summaries include stock issues net of returns. Unknown remaining material costs prevent net-cost/margin claims. Potential overlap between stock consumption and project-assigned procurement bills blocks net cost/margin until cost-centre assignments are reviewed. Owners with finance.reverse may correct/remove a whole-bill project assignment using the exact prior project and a reason; immutable bill terms and payment history remain protected.
- Financial information remains subject to finance permissions. A stock or field permission does not grant company financial summaries. Existing cost-completeness attestation still applies to profitability; it is not audited net profit.

## Database and integrity

New sequential migration: `server/db/migrations/026_installation_materials.sql`. Historical migrations were not edited.

New tables: `stock_locations`, `project_installation_controls`, `installation_checks`, `project_materials`, `inventory_cost_lots`, `stock_issue_allocations`, `stock_return_allocations`, `utility_progress`.

Existing inventory movements/reservations gain project/material/source/cost/purchase-line links. The company-scoped project_stock_movements view resolves issues recorded before project creation through the order's unique project, preserving original immutable movement history and cost/return eligibility. Composite foreign keys bind company, project, material, stock and reviewed survey relationships. Quantity/outcome/state constraints, FIFO and project indexes, and append-only movement/allocation/survey triggers protect records. Company transaction locking serialises consequential stock mutations; operation keys bind the request payload and actor. Exact retries reuse saved results; changed payloads conflict. Installation mutations additionally bind the project and expected revision.

Existing completed/cancelled projects retain their status and are labelled historical. New pending checks are not retroactively marked passed. Existing open projects need genuine review before new readiness/completion claims. Legacy warehouse balances retain quantity with unknown costs, and historical consumption receives unknown-cost issue allocations so documented returns remain possible.

Existing session authentication, effective role profiles, assignment scope, tenant isolation, CSRF/origin protections, subscription feature guards and audit events remain authoritative. Utility/check/control events retain previous/new information where applicable; stock movement/source allocations retain actor, time, reason and source record. Read access does not grant write access on expired plans.

## Files

Created:

- `server/db/migrations/026_installation_materials.sql`
- `server/operations/installation.js`
- `server/operations/materials.js`
- `server/operations/material-ledger.js`
- `tests/helpers/installation-fixture.mjs`
- `tests/installation-materials.integration.test.mjs`
- `tests/installation-materials-upgrade.test.mjs`
- This handoff.

Extended for Phase 5: `server/index.js`; `server/operations/core.js`, `read.js`, `delivery.js`, `stock.js`, `customer.js`, `finance-ledger.js`, `finance-posting.js`; `server/solar-delivery.js`; `src/operations.js`, `src/release-tools.js`; `scripts/browser-check.mjs`; existing connected-journey/operating-flow helpers and project-coordination integration/finance-upgrade tests. These files also contain preserved earlier-phase work.

## Verification

Verification is local only: disposable loopback PostgreSQL, fictional companies/users and intercepted browser fixtures. Real API transactions, concurrency and constraints are exercised in PostgreSQL; browser fixture writes deliberately fail rather than simulate successful business changes.

The focused installation/upgrade run passed all 13 tests after adding evidence, current approver-authority and future-date cases. Upgrade checks preserve a populated legacy closed project, stock balance, survey and consumed quantities; exercise an unknown-cost historical return; reject historical rewriting; inspect indexes/constraints; compare all migration checksums; and confirm a repeat migration run applies nothing.

Browser verification passed 711 checks with zero failures, and static verification passed 1,182 checks with zero failures. git diff --check passed; mobile project and desktop inventory screenshots were inspected. Final full regression: 338 automated tests passed, zero failed and zero skipped. All 26 migration entries passed fresh installation, checksum and repeat-run verification; the populated 025-to-026 upgrade passed separately. Evidence logs: `.verification/phase-5-postgres-final.log`, `.verification/phase-5-installation-final.log`, `.verification/phase-5-browser.log`, `.verification/phase-5-static.log`. Initial failed runs were corrected: a SQL string quoting error, incomplete mandatory agreement fields in legacy/pre-project fixtures and redundant fixture writes exceeding the unchanged request rate limit.

Browser widths: 360, 390, 768, 1024, 1280 and 1440px. New checks cover project/inventory overflow, unchecked explicit approval, private utility sharing by default, typed/scoped approval payloads, failed-write messaging and field-role control visibility. Desktop/mobile screenshots are in `.verification/browser/installation-*.png`.

## Release and limitations

Before a separately authorised release, retain a recoverable database backup and use the repository's supported checksum-aware `npm run db:migrate` mechanism through 026. Earlier uncommitted migrations 023-025 must be included with their associated application changes. Do not apply this migration without its matching application code. Live migration state and Railway's effective deployment configuration were not inspected or changed in this task. A push may trigger the existing Railway auto-deployment; review that release path first.

These are staff-maintained operational records, not engineering certification, government/utility verification, electrical design calculations or permission to energise. References may identify actual external inspection documents; the app does not independently validate their authenticity. Existing protected upload/download controls remain available. Scheduling does not add calendar-provider integration, crew capacity optimisation, vehicle routing or automatic bookings. Utility-provider APIs, serial/batch valuation, landed-cost allocation, supplier financial credit-note processing, statutory stock accounting and automatic customer signatures are not introduced. Core check defaults must be reviewed by a qualified company safety/technical authority for its work practices; additional project checks can be configured in the application.

The single next development milestone is Phase 6 from the approved roadmap, after the owner reviews this Phase 5 delivery. No real-company onboarding or production-readiness claim follows from local checks alone.
