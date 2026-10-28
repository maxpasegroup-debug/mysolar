# MY Solar OS Phase 2E — remediation verification and rehearsal gate

26 October 2026. **Verdict: NOT READY FOR PRODUCTION RELEASE APPROVAL.**

The Phase 2D fix correctly preserves complete historical product/offer capture pairs across different offer revisions. The 20 focused tests were safely rerun and passed. However, two additional incomplete/inconsistent stored-history cases were demonstrated using mocks and remain unresolved. No implementation change is made here. Database persistence, rollback/concurrency and production-specific evidence are still unverified. This report grants no rehearsal or release approval.

## 1. Repository baseline and scope

Branch `main`, HEAD `a6ee9994a0a01a2dff563e163fc180a427b58dbd`; no staged files. Remote freshness/deployment state was not queried. This report did not exist at the initial check.

Initial state: nine tracked modifications (`scripts/browser-check.mjs`, `server/operations/orders.js`, `server/purchase/company.js`, `server/purchase/service.js`, `server/purchase/validation.js`, `src/operations.js`, `src/purchase.js`, `src/release-tools.js`, `tests/people-sales.integration.test.mjs`) and twelve untracked files: Phase 1 review; Phase 2 plan/handoff/release review; Phase 2B/2C/2D documents; migration 034; source resolver; the two Phase 2 database tests; the focused source-compatibility test. All are pre-existing work.

An in-memory baseline captured content hashes for 351 tracked/untracked non-ignored files and HEAD/index state. No baseline/evidence file was created. Existing reports, code, tests, migration and configuration are unchanged by this verification. Only this report is added. No environment file values were read.

## 2. Resolver findings from actual source

`server/purchase/sources.js:resolveQuotationSources` identifies a prior line by strict equality on `product_id`, `offer_id` and `offer_revision` against the validated requested product/offer/revision. For an offer-linked historical capture it now uses that same prior line's product snapshot, provided product snapshot ID and offer snapshot ID match the requested IDs. The seller snapshot comes from that prior line too. This is the Phase 2D correction; previously product-only search could borrow a different revision's product capture.

`purchase/company.js` supplies previous items loaded from the server, not a caller's history array. Create/revision reads the previous version; edit reads saved items before replacement. Client payload validation excludes product/offer snapshot JSON, company identity and source-lead claims. The resolver is an internal function, not an independent public authorization boundary.

Fresh capture reads a published product and an eligible own-company published offer joined to its raw revision. New selections must match requested offer revision, company/product, INR and unit. An absent/stale new offer is rejected; the resolver does **not** deliberately substitute the current offer when its revision differs. Optional manual/legacy sources remain empty rather than fabricated. Negotiated quotation amounts are independent from seller snapshot prices.

### Missing, invalid and inconsistent history

| Condition | Actual source behavior / verification |
| --- | --- |
| Complete prior pair with matching product/offer/revision | Both snapshots retained from exact prior line; reordered distinct-revision regression passes without fresh query. |
| Requested revision invalid at API boundary | `purchase/validation.js:quote` requires a positive integer revision with offer/product pairing; caller snapshot and tenant/lead overrides rejected. |
| No matching prior offer/revision, or missing prior offer snapshot ID | Fresh publication lookup; missing/currently different revision rejected. If current requested revision still exists, fresh capture is allowed. Product publication absence also rejects. |
| Prior product snapshot missing/empty but prior offer snapshot present | **Confirmed gap:** current product is recaptured while historical offer snapshot is retained. There is no explicit rejection or atomic replacement of the pair. This may mix capture times/facts. |
| Stored offer snapshot's embedded revision disagrees with the line revision | **Confirmed gap:** the reuse branch checks snapshot ID, INR and unit, but not embedded revision, product/company identity consistency or complete shape. A disagreeing embedded revision was accepted by a mock probe. |
| Product-only historical lines with repeated same product | Existing first matching product snapshot policy remains. No stable line identity is provided by input; ambiguity between multiple different product-only captures is not covered by the focused tests. Treat policy/coverage as unresolved rather than assume per-line identity. |

The two confirmed gaps were demonstrated with fictional in-memory history, not live records:

1. Prior line references offer revision 1, has empty product snapshot and a complete old offer snapshot. Mock published product returns revision 4. Resolver returns the current product capture together with the retained old offer capture.
2. Prior line references offer revision 1 but its stored offer JSON says revision 99; IDs/currency/unit otherwise match. Resolver reuses that JSON without a fresh lookup or rejection.

Both probes exited 0 after asserting the described behavior; runtime pool connections remained zero. These are missing consistency safeguards under partial/inconsistent stored-history input, **not proof that production contains such records**. Migration 034 constrains line relationships and JSON object shape; it does not ensure snapshot content matches the line/reference or that both snapshots are complete. Present browser payload checks prevent direct public snapshot injection; they do not validate historical JSON at reuse.

Therefore the fix is valid for its demonstrated complete-history case, but a universal claim that both snapshots always remain a consistent pair is unsupported. A newer seller-offer row is not silently substituted during fresh revision checking; inconsistent stored JSON can nevertheless claim a different revision and pass reuse. Existing reports should be read with this narrower scope. They were not edited.

Before acceptance, decide and separately implement a fail-closed/manual-reselection policy for partial or inconsistent history, with focused tests. Do not invent historical facts, silently repair saved issued records or weaken schema checks. This phase makes no fix.

## 3. Exact focused-test mapping and evidence

Safety inspection preceded execution: `tests/helpers/env.mjs:unitEnvironment` supplies a non-listening loopback unit configuration and clears external provider/mail credentials. Tests pass mocked clients to queried functions; no migration SQL is sent to a server. Source test's after-hook asserts `pool.totalCount === 0`. `migrations.test.mjs` uses file reads and a mock runner, not a database. No test capable of real database creation/mutation was run.

Exact command executed:

`node --test tests/quotation-source-compatibility.test.mjs tests/purchase.test.mjs tests/migrations.test.mjs`

**Actual exit 0: 20 passed, 0 failed, 0 skipped.** Terminal evidence was inspected directly; no new log file was written. Existing `.verification/os-phase2d-focused.log` independently records the prior run's same totals (502.7799 ms). Counts are separate runs, not additive. No test below is database-backed.

| # in current output | File / test behavior | Evidence type and practical limit |
| --- | --- | --- |
| 1 | `migrations.test.mjs`: generated 002 catalogue ordered between 001 and 003 | File/manifest unit; no applied history proof |
| 2 | Historical migration SQL hashes match baseline fixture | File/hash assertion; no live checksum query |
| 3 | Changed applied checksum rejected | Mock runner client; no real rollback |
| 4 | Unknown migration boundary rejected before query | Mock call contract |
| 5 | `purchase.test.mjs`: duplicate/excessive/direct-fanout recipients rejected | Input unit |
| 6 | Unknown quantity, PIN/unit and identity payload validation | Input unit |
| 7 | Stale revisions and closed/cancelled workflow rejection | Pure service guards |
| 8 | Customer/company privacy projections exclude private identifiers | Serializer unit |
| 9 | Quote query binds customer/company, excludes customer drafts and hides competing preference ID | Mock SQL/serialization contract; not actual authorization execution |
| 10 | Missing publication does not fall back to private/raw rows | Mock retrieval contract |
| 11 | Missing terms/tax produce questions without fabricated engineering claims | Assistance unit |
| 12 | `quotation-source-compatibility.test.mjs`: two historic offer revisions keep corresponding product/offer pair after reordering | Mock no-query complete-history regression; no persistence |
| 13 | Historical source retained without changing recorded money | Mock prior-history branch; actual unpublication not executed |
| 14 | New source uses authoritative projection allowlist and separate negotiated money | Mock server data; SQL scope asserted, not enforced by PostgreSQL |
| 15 | Missing/stale new offer rejected instead of using another prior revision | Mock source lookup |
| 16 | Manual product-only history and unlinked legacy sources stay truthful | Mock history branch |
| 17 | Client source JSON, tenant and lead overrides rejected | Actual input-validator unit |
| 18 | Qualification binds company/enquiry, rejects missing/malformed/lost lead; valid and non-required cases | Mock data with actual policy logic; not transaction/role enforcement |
| 19 | Shared order-item read includes sources; customer quote hides private lead | Mock SQL/serializer contract; not order insertion |
| 20 | Idempotency returns saved result, rejects changed payload, work runs once | Sequential mock contract; not concurrent requests, DB uniqueness or transactional atomicity |

Two additional read-only in-memory probes described above were run through Node stdin after `unitEnvironment`; exit 0, zero runtime DB connections. They are diagnostic mock assertions outside the 20-test count. They created no test/script/log file. No existing test covers the two gaps. Tests for persistence, partial-failure rollback, constraints and races remain required in an authorized real PostgreSQL rehearsal.

## 4. Current writer compatibility inventory

Search rechecked direct mutations across server/scripts and inspected current diff. Shared trust boundary is `withCompany`/session-derived tenant/effective grants/commercial guard. It locks the company row; `db/pool.js:transaction` commits/rolls back the callback. Order creation retains canonical key/fingerprint/result plus open-thread and unique company/quotation/reference checks. Source inspection does not prove these execute correctly against the current production database.

| Production-capable path / callers | Source/lineage/qualification and order guarantees | Post-034 classification |
| --- | --- | --- |
| `purchase/company.js` POST `/api/companies/current/enquiries/:id/quotations`, editor/API | Supplies mandatory company/source fields; derives linked lead and enforces configured qualification. Calls resolver using prior server version captures. | Compatible schema shape; **unverified for complete snapshot-integrity requirement under gaps above** |
| Same PUT `/api/companies/current/quotations/:id` | Revision-checked transactional replacement; server history and qualification; review reset. | Compatible schema shape; **unverified for partial/inconsistent history** |
| Same send action | Retains existing line captures; rechecks qualification/review/publication/validity; records/coalesces lead, sent/superseded versions and enquiry state. | Compatible based on inspected source; does not itself repair/revalidate snapshot content |
| Same withdraw action | Status/revision/preference changes; no source replacement or qualification exemption for creating quotes. | Compatible based on inspected source |
| `purchase/review.js:reviewDraft`, review endpoint | Review/policy/reviewer/approval/revision and immutable history; no line authoring; required grants retained. | Compatible based on inspected source |
| `purchase/customer.js`, view/clarification/revision actions | Customer ownership; timestamps/request type/revision/messages only; no trusted source authoring. | Compatible based on inspected source |
| `operations/orders.js` POST `/api/companies/current/operations/orders`, quotation branch | Requires issued/current fixed quote; copies shared source-bearing items into immutable terms/item snapshots. Version FK preserves lead lineage; private lead omitted from customer projection. Existing duplicate/transaction checks retained. | Compatible based on inspected source for schema/source copying; **source accuracy unverified if incoming stored quote is inconsistent** |
| Same manual agreement branch | Server capture for optional product/own-offer; no fabricated quote/lead. Separate agreement authorization, same order protections; no previous-history input to resolver. | Compatible based on inspected source; fresh branch subject to authorized DB verification |
| Same request-confirmation action | Status/revision/notification; no new order or source mutation. | Compatible based on inspected source |
| Same confirm action | Current quote rechecked; customer consent or external agreement evidence; status/actor/time/revision. | Compatible based on inspected source |
| Same processing/partial/fulfilled | Stage/reference/revision and reservation guards, snapshots unchanged. | Compatible based on inspected source |
| Same cancel | Status and guarded stock release; finance/advance/project/service/material checks; terms retained. | Compatible based on inspected source |
| `operations/customer.js`, POST `/api/customer/operations/orders/:id/confirm` | Own-customer consent and company/order locks, timestamp/revision; no order creation/source edits. | Compatible based on inspected source |
| `sales-tools.js`, template save/read | Separate template store; reads captures. Future quote submission revalidates references, cannot supply trusted JSON. | Compatible based on inspected source; shared reads require added columns |
| Same module imports/rollback | Contacts/leads, not quote/order writers; new source-lead FK can restrict connected lead removal. | Not an alternate quote/order writer; inherited FK behavior needs rehearsal |
| SIA/automation/delivery/admin/scripts | No further direct quotation/order INSERT/UPDATE found; permitted reads, proposals and delivery records only in inspected paths. Pilot snapshot aggregates. | No incompatible writer found in inspected repository scope; actual external jobs **unverified** |
| Historical Git HEAD line writer/item projection | Omits mandatory line company; old item read omits source captures in orders. | **Incompatible based on inspected historical source**; actual deployed versions unverified |

Test-only SQL/fixtures are not production entry points. Previous immutable snapshots/order records are not rewritten by this verification. No prices, calculations, order statuses, key logic or permissions were changed by the Phase 2D pairing patch. Its unresolved malformed-history behavior affects source integrity; passing schema-level SQL alone would not resolve it.

## 5. Disposable rehearsal prerequisites and STOP/GO

No migration command is generated here. No database listener/connection or destructive operation was used.

| Requirement before future execution | Required evidence / STOP condition |
| --- | --- |
| Version and compatibility | Record approved binary plus actual test server version; prior local read-only binary observation was 18.6, not production's verified version. Require compatible production-version coverage before release. STOP on untested assumptions. |
| Explicit disposable target | Named local cluster/data directory, database/schema, role, owner, resource/time bounds and permitted lifecycle. STOP if target unnamed or shared. |
| Isolation proof | Fresh process/listener/data-directory association, loopback binding, generated test-only credentials and fictional data; no production forwarding/shared endpoint. A loopback/test-like name alone is insufficient. |
| Target safeguards | Review URL overrides without disclosure; verify current database/schema/user and generated identity before any mutation or teardown. STOP on ambiguity; no broad/wildcard cleanup. |
| Baseline/data | Supported manifest through 033 with exact checksums; representative old quote/order rows, multiple tenants/roles, optional manual sources, multiple offer revisions, partial and inconsistent history. Capture old fields/terms/amounts/source counts/hashes. |
| 034 cases | Fresh full chain and 033 upgrade, success, induced mid-transaction failure, prior-entry retention, no partial 034 ledger/schema state, corrected retry, repeat no-op and checksum rejection. No rewriting historical SQL/checksums. |
| Snapshot persistence | Correct complete pairs survive create/edit/revise/read/order insertion. Negative partial/inconsistent-history cases need explicit accepted behavior and tests; do not accept the two demonstrated gaps as passing. |
| Integration/authorization | Every writer row above, tenant/role/qualification/private lead/customer ownership, trusted allowlist and actual FK/check/index behavior. |
| Duplicate/concurrent requests | Same/changed key, competing keys/version/thread, immutable amounts/source snapshots, actual uniqueness/transaction/locks; sequential mocks insufficient. |
| Recovery/rollback | Induced failure and verified rollback/retry; reconcile uncertain commit before retry. No destructive down migration. Separate approval for any restore target/data; never revive legacy incompatible writers blindly. |
| Evidence | Source/artifact hashes, safe target/version identity, command names/exit codes without secrets, timestamps/durations, pre/post ledger/schema/count/hash checks, failure/skips, reviewer and cleanup result. |
| Cleanup permission | Exact generated-resource teardown explicitly authorized; revalidate identity. Preserve isolated failure evidence if cleanup cannot safely complete. |

`scripts/verify-postgres.mjs` creates a cluster/database and `isolated-app.mjs` creates/drops schemas; recovery tests create another database. They were inspected but not invoked. The current task supplies no approval for those actions. Controlled diagnostic rehearsal may investigate gaps, but an acceptance rehearsal cannot report source integrity passed without an agreed and verified handling policy. No unconditional rehearsal GO is issued.

## 6. Separate approvals and outstanding operational evidence

| Gate | Exact scope requiring separate explicit approval | Evidence before GO / STOP |
| --- | --- | --- |
| A | Create/modify the identified isolated disposable cluster/database/schema, role, fictional data and exact cleanup | Proved isolation/identity, version/resources and teardown scope; otherwise STOP |
| B | Fault injection, migration failure/retry, commit interruption and recovery/restore testing | Reviewed non-destructive-to-others method and recovery target/data; A alone does not authorize B |
| C | Production backup verification and isolated restore of the specified production backup | Current scope/timestamp/completion/integrity/retention/access, encryption/file dependencies, privacy, measured recovery and accepted RPO/RTO. Neither A nor B authorizes production access or data restore |
| D | Production maintenance, writer shutdown, named migration target/execution and compatible application cutover | All release blockers closed, exact artifacts/replicas/workers and effective Railway settings, zero old writers, verified recovery point and staffed window. C is not D |
| E | Reopen customer access after cutover | Actual acceptance, health/schema/source/concurrency/privacy/consent checks, healthy queues/workers, monitoring/alert receipt and explicit owner GO. D is not E |

Historical production backup documentation dated 20 October and staging/local restore reports remain historical evidence only. Current production schema/configuration/artifact, backup availability and specific recoverability, role/worker/key state, fence effectiveness, capacity/locks and alert receipt are unverified. No Railway access was used to resolve them. Existing approvals elsewhere do not override this task's restrictions.

## 7. Exact files inspected and actions deliberately omitted

Read required reports: `MY_SOLAR_OS_PHASE_2_RELEASE_REVIEW.md`, `MY_SOLAR_OS_PHASE_2B_READINESS_AUDIT.md`, `MY_SOLAR_OS_PHASE_2C_BLOCKER_CLOSURE_PLAN.md`, `MY_SOLAR_OS_PHASE_2D_REMEDIATION_REPORT.md`.

Code/configuration/test evidence inspected: `server/purchase/sources.js`, `server/purchase/company.js`, `server/purchase/service.js`, `server/purchase/validation.js`, `server/purchase/review.js`, `server/purchase/customer.js`, `server/purchase/money.js` indirectly through tests, `server/operations/orders.js`, `server/operations/customer.js`, `server/operations/core.js`, `server/tenancy/context.js`, `server/people-sales.js` via resolver dependency, `server/sales-tools.js`, `server/sia/tools.js`, `server/automation/catalogue.js`, `scripts/pilot-snapshot.mjs`, `server/db/migrations/034_quotation_sources.sql`, `server/db/migrations.js`, `server/db/pool.js`, `server/index.js`, `railway.json`, `scripts/verify-postgres.mjs`, `tests/helpers/isolated-app.mjs`, `tests/helpers/env.mjs`, `tests/quotation-source-compatibility.test.mjs`, `tests/purchase.test.mjs`, `tests/migrations.test.mjs`, `tests/fixtures/migration-checksums.json` read by the test, and `.verification/os-phase2d-focused.log`. Search inventoried other server/script files; content hashing of all pre-existing files is preservation evidence, not a claim of semantic review of every file.

No application/test/migration/configuration or prior report edits. No new script/test/log/inventory file was created. No database connections/mutations, schema creation, seed, reset, migration, restore/backup or production/Railway/settings operation. No Git stage/commit/push/merge/fetch/history change, deployment or customer dashboard/logo change. Only this report is added; test process configuration was temporary and not persisted.

**Next decision:** separately authorize handling-policy/remediation work for the two demonstrated stored-history gaps, or explicitly scope an isolated diagnostic rehearsal to establish their desired rejection behavior. Do not infer production or database execution approval from this verification. Stop after this report.

Final preservation result: all **351** starting tracked/untracked non-ignored files match their initial byte hashes; zero modified, zero removed. The only added file is this report. HEAD and index are unchanged. No existing user work was overwritten.
