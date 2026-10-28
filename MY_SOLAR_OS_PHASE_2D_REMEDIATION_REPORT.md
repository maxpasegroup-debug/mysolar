# MY Solar OS Phase 2D — local writer compatibility remediation

26 October 2026. **Production release status remains NOT READY FOR PRODUCTION RELEASE APPROVAL.**

One additional snapshot-preservation defect was reproduced and fixed locally. The main post-034 line/company/source and order projection changes already existed in the worktree and were preserved. Historical Git writer versions remain incompatible; editing local source cannot upgrade or fence already deployed processes. No database rehearsal or production work occurred.

## 1. Baseline and scope

Branch `main`, HEAD `a6ee9994a0a01a2dff563e163fc180a427b58dbd`, matching the locally stored upstream reference (remote freshness not checked). No staged changes or conflicts.

Pre-existing modified tracked files (9): `scripts/browser-check.mjs`, `server/operations/orders.js`, `server/purchase/company.js`, `server/purchase/service.js`, `server/purchase/validation.js`, `src/operations.js`, `src/purchase.js`, `src/release-tools.js`, `tests/people-sales.integration.test.mjs`.

Pre-existing untracked files (10): Phase 1 review; Phase 2 plan, handoff and release review; Phase 2B audit; Phase 2C plan; migration 034; `server/purchase/sources.js`; `tests/os-phase2-sales.integration.test.mjs`; `tests/os-phase2-sources-upgrade.test.mjs`.

An in-memory content-hash baseline covered 349 existing tracked/untracked non-ignored files, together with HEAD/index state. Existing `.env`/private settings were not read. Required handoff/release/2B/2C documents and actual source were inspected. No historical migration, existing test or existing report was edited. A pre-existing validity-date message change in `company.js` was preserved; it was not introduced by this task.

## 2. Writer inventory, callers and compatibility

Classification is source-based, not a live execution claim. Search covered server, services, scripts, workers, SIA, imports and tests, including direct INSERT/UPDATE/DELETE and adjacent read/proposal paths. No additional direct production quotation/order writer was found beyond the five mutation modules below. External integrations and the running deployment remain unverified.

| File / entry point and callers | Database operation and integrity behavior | Classification / evidence |
| --- | --- | --- |
| `purchase/company.js` POST `/api/companies/current/enquiries/:id/quotations`; distributor quotation editor/API | Creates enquiry thread if needed, version with derived `source_lead_id`, and lines through `insertItems`, including company, offer/revision, trusted product/offer snapshots. Policy qualification checked server-side; version/draft uniqueness and locks retained. | Compatible current source; existing Phase 2 integration covers ownership, sources and qualification. Shared resolver defect below corrected. |
| Same PUT `/api/companies/current/quotations/:id`; editor/API | Commercial/revision/review/lead update; reads captures before transactional DELETE/reinsert of lines. Rechecks qualification and expected revision. | Compatible current source after resolver fix. Real transaction persistence/rollback not rerun. |
| Same POST quotation actions, send; editor/API | Updates sent/superseded versions, dates, issuer/customer snapshots and coalesced source lead; updates enquiry. Requires qualification, publication, validity, review and draft state; does not replace captures. | Compatible; existing purchase/people-sales/Phase 2 coverage, no new real-DB evidence. |
| Same withdraw; editor/API | Status/revision/preference changes only, retains source history. | Compatible; no new source writer. |
| `purchase/review.js:reviewDraft`, called by quotation review endpoint | Approval/policy/reviewer/override/revision fields and immutable review event. No source replacement; review/discount permissions retained; send independently checks qualification. | Compatible source; existing people-sales coverage. |
| `purchase/customer.js`, customer quotation view/clarification/revision actions | Ownership-scoped viewed timestamp or request type/revision, messages/events. No quotation-line, lead or trusted-source authoring. | Compatible source; purchase workflow coverage. |
| `operations/orders.js` POST `/api/companies/current/operations/orders`, issued-quote branch; operations UI/API | Creates order with quotation-version FK and immutable terms containing source-bearing items; inserts item snapshots. Lead remains reachable through the quotation version; private lead excluded from customer quote projection. | Compatible source. Shared item projection verified by new mock contract; actual persistence/concurrency remains a database gate. |
| Same endpoint, manual-agreement branch | Validates agreed terms and uses shared resolver for optional catalogue/own-offer sources. No fabricated enquiry/lead; quotation qualification not applicable to this separate agreement path. | Compatible source; no new agreement or price behavior added. |
| Same POST order actions, request confirmation | Changes status/revision and sends notification; no new order/snapshot. | Compatible source. |
| Same confirm | Changes agreement evidence, confirmer/time/status/revision; requires current quotation and explicit in-app consent or documented external agreement. | Compatible source; status rules untouched. |
| Same processing/partial/fulfilled | Status/fulfilment reference/revision, stage and reservation guards. | Compatible source; material/financial rules untouched. |
| Same cancel | Status/revision plus guarded reservation release/movement; checks invoices, advances, projects, service contracts and stock consumption. No terms deletion. | Compatible source; inherited transactional dependencies still required. |
| `operations/customer.js`, POST `/api/customer/operations/orders/:id/confirm`; customer API | Ownership-scoped customer confirmation time/revision/event/notification, company/order locks, explicit consent. No new order or source change. | Compatible source; customer dashboard code not edited. |
| `sales-tools.js` template save/read, called by editor/template picker | Creates separate company template JSON; reads current stored line sources. Future quotation submission validates references and rejects caller-provided snapshot authority. No issued quote/order is created. | Compatible adjacent path; current shared read requires 034. |
| `sales-tools.js` reviewed CSV imports | Contacts/leads only; no quotation/order creation. | Not an alternate quotation/order writer. |
| `sia/tools.js`, SIA routes; automation engine/routes/catalogue; mail/monitor/reminder workers | Reads/summarizes permitted records or handles proposal/delivery/queue records. No direct quotation/order mutation identified in inspected paths. | No incompatible direct writer found; effective external jobs unverified. |
| `scripts/pilot-snapshot.mjs`; browser script/admin/maintenance script search | Pilot script aggregates permitted quotations/orders; browser uses fictional fixtures. No additional business quotation/order mutation identified. | Not an alternate live writer. |
| Historical HEAD `purchase/company.js` and `service.js:items` | Old line INSERT omits mandatory company; old item projection omits sources copied into orders. | Incompatible after 034. These historical versions are not current editable writers and were not rewritten. Deployed versions are unverified. |

Test-only direct SQL exists in the quotation-source upgrade test and historical order fixtures in business-access, automation, Customer 360, retention, management, installation/material and operational-finance suites. The upgrade test intentionally inserts the old line shape before 034. They are not production entry points and were not executed here.

## 3. Confirmed defect, reproduction and smallest fix

`server/purchase/sources.js:resolveQuotationSources` already located the prior line using product, offer and offer revision. However, its historical product lookup then searched all previous lines by product alone. With two captured lines for the same product at offer revisions 1 and 2, it could attach revision 1's product snapshot to revision 2's offer snapshot. Such history can arise when retaining an older captured line while adding a current offer revision. Reordering lines did not fix the mismatch. This was a pairing defect, not an invented pricing rule.

The new regression passes two distinct server-stored product captures/offer revisions and reverses requested line order. Its mock rejects any fresh publication query, so the case proves retention logic rather than relying on database state. Before the fix: eight tests passed and this test failed; the wrong product capture was reproduced.

The fix uses the **same exact prior offer/revision line** for both historic snapshots when an offer is selected. Missing genuine history still requires the existing authoritative published-product lookup. Product-only/manual history follows the pre-existing policy. No client-supplied snapshot is trusted; no database/history migration occurs. Prices, totals, discounts, statuses, keys, audit/authorization and concurrency logic are unchanged.

A fresh offer selection still enforces current own-company/product/revision, INR and unit. Historical genuine captures can remain after unpublication. Missing/legacy facts remain empty rather than invented. No unresolved business-rule assumption was used to change a writer.

## 4. Files changed in this task

| File | Change |
| --- | --- |
| `server/purchase/sources.js` | Small historical product/offer capture-pairing correction; preserves the rest of this pre-existing untracked implementation. |
| `tests/quotation-source-compatibility.test.mjs` | Nine no-database unit/mock contracts: pairing, historic retention, server allowlist, stale/unavailable rejection, manual/legacy truthfulness, forged source/tenant/lead payload rejection, scoped qualification, shared source read/customer privacy and sequential idempotency replay. After-hook asserts no pool connections opened. |
| `MY_SOLAR_OS_PHASE_2D_REMEDIATION_REPORT.md` | This report. |

Ignored execution logs: `.verification/os-phase2d-before.log` and `.verification/os-phase2d-focused.log`. They contain fictional contract results, not production configuration or records.

## 5. Safe tests actually executed

Before imports, the focused test calls `unitEnvironment()`, replacing runtime settings with a non-listening loopback unit target and clearing external delivery/provider credentials. Each exercised query is a supplied mock, not the runtime database pool. A final assertion verifies `pool.totalCount === 0`. Existing `purchase.test.mjs` also initializes this unit environment; `migrations.test.mjs` reads files and uses a mocked runner client. Neither executes SQL against a database.

| Command | Actual exit/result | Evidence/limits |
| --- | --- | --- |
| `node --test tests/quotation-source-compatibility.test.mjs` before fix | **1**; 9 tests: 8 passed, 1 failed, 0 skipped | `os-phase2d-before.log`; intentional reproduction of wrong product capture |
| `node --test tests/quotation-source-compatibility.test.mjs tests/purchase.test.mjs tests/migrations.test.mjs` after fix, final run | **0**; **20 passed, 0 failed, 0 skipped** | `os-phase2d-focused.log`; unit/mock/file contracts only, zero database connections |
| Same combined command, first post-fix run | **0**; 20 passed/0 failed/0 skipped | Before adding zero-connection after-hook; final run replaces log. Do not sum runs. |
| `node --check server/purchase/sources.js` | **0** | Syntax only |
| `node --check tests/quotation-source-compatibility.test.mjs` | **0** | Syntax only |
| `git diff --check` | **0** | Git CRLF notices only; whitespace, not behavior |

Not executed: all PostgreSQL integration/upgrade/restore suites, migration 034, fresh cluster runner, browser suite, comprehensive test/build checks. No test was counted as skipped in this task's executed sets. The earlier release review's two skipped database scenarios remain historical unverified gates, not passes here. Earlier 411/955/1333 totals are not fresh validation of this change.

## 6. Business integrity and remaining verification

Source-inspected transaction boundary remains `withCompany`/`db/pool.js:transaction` with company-row locking. Order `once` retains canonical fingerprint/result in the transaction, rejects changed-payload replay, and is backed by company/version/reference uniqueness plus open-thread checks. The new sequential mocked idempotency contract is **not** proof of concurrent transactions or uniqueness enforcement.

No financial calculation or posted order/quotation was changed. No permissions, tenant derivation, publication gates, qualification policy, agreement/consent rules or immutable source/history fields were relaxed. Local serializer tests verify source fields are read and private lead excluded; they do not establish actual database persistence.

Remaining requirements: actual SQL persistence/rollback of the corrected resolver through create/edit/revise and both order flows; concurrent requests and duplicate posting; full migration/constraints and production-compatible server version; deployment identity, current backup/restorability and maintenance fence. Production schema/configuration, backup and workers remain unverified and unauthorized for access here.

## 7. Maintenance and next disposable rehearsal

Legacy quotation create/edit processes must be fenced/drained before 034; legacy order creation must also be stopped to avoid incomplete snapshots. Drain affected review/customer confirmation/state requests and account for all replicas, retries/integrations, workers and automatic restarts. No native selective fence was implemented. Old readiness may remain green with additional migrations, so it cannot establish a safe writer boundary. The 2C approval gates still apply; a source fix does not close operational blockers.

Next separately authorized milestone: identify a fresh disposable loopback PostgreSQL cluster/role/database/schema with no production/shared credentials/data; record exact target/process identity and version, resource/teardown scope and content hashes. The normal `verify-postgres.mjs` creates databases and `isolated-app.mjs` creates/drops schemas, so **do not invoke either under this task's prohibition**. Authorized work must cover 033-to-034 legacy preservation, repeat/checksum behavior, injected failure/rollback/retry, this multi-capture case persisted through APIs/orders, tenant/privacy/qualification and same-key/competing-key concurrency. Retain outcomes/skips honestly. Specific production-backup restoration requires separate authorization and isolated recovery evidence.

## 8. Preservation and final decision

Comparison against the 349-file starting baseline, before this report was added, found exactly one intended existing-file modification: `server/purchase/sources.js`; zero removals; only the focused test newly added. Every other pre-existing tracked/untracked file matched its initial byte hash, including all existing user diffs, prior reports, customer dashboard files, marketplace/language files and original logo. HEAD and index were unchanged. Final report-inclusive verification is recorded below.

No database operations/connections, production changes, Railway access, migration, backup/restore, service creation, commit, push, merge or deployment occurred. All SQL calls in new tests were mocks. No live secrets/credentials or customer records were read or printed.

**Result:** one confirmed additional local source defect fixed and unit/mock regressions pass. Current worktree writer updates are preserved. Production status remains **NOT READY**; stop here without database rehearsal or release.

Final report-inclusive preservation check: 349 starting files compared; only `server/purchase/sources.js` intentionally modified, zero removed, and exactly the new focused test and this report added. All other 348 starting files are byte-identical. HEAD/index unchanged; final `git diff --check` exit 0. No unrelated work was overwritten.
