# MY Solar OS Phase 2B — production prerequisites and recovery evidence audit

26 October 2026. **Verdict: NOT READY FOR PRODUCTION RELEASE APPROVAL.**

This is a source/evidence-only audit. No database, Railway or other external service was contacted. No test, migration, rehearsal, backup, restore, deployment or production operation was executed. An understood local test harness exists, but running it requires a separate authorization because it creates and removes databases/schemas. This audit does not authorize that execution.

## Baseline and preservation

Branch `main`; HEAD `a6ee9994a0a01a2dff563e163fc180a427b58dbd`. No staged changes or merge conflict was found. The locally stored upstream reference is not a fresh remote/deployment observation. No fetch/login occurred.

Initial modified tracked files (9): `scripts/browser-check.mjs`; `server/operations/orders.js`; `server/purchase/company.js`; `server/purchase/service.js`; `server/purchase/validation.js`; `src/operations.js`; `src/purchase.js`; `src/release-tools.js`; `tests/people-sales.integration.test.mjs`.

Initial untracked files (8): `MY_SOLAR_OS_PHASE_1_REVIEW.md`; `MY_SOLAR_OS_PHASE_2_PLAN.md`; `MY_SOLAR_OS_PHASE_2_HANDOFF.md`; `MY_SOLAR_OS_PHASE_2_RELEASE_REVIEW.md`; `server/db/migrations/034_quotation_sources.sql`; `server/purchase/sources.js`; `tests/os-phase2-sales.integration.test.mjs`; `tests/os-phase2-sources-upgrade.test.mjs`.

All four required reports were read. Their attribution is consistent with the current diff: the browser file combines the Phase 1 wait correction and Phase 2 coverage; the review document is not application implementation. No separate Phase 2 commit exists to prove finer editing-session attribution. No AGENTS.md was found in the repository search.

An initial SHA-256 inventory of 347 tracked/untracked, non-ignored files and Git status was saved to ignored `.verification/os-phase2b-initial.json`. Local `.env` and private configuration values were not read. Only this audit report and ignored evidence files are created by this audit. Final preservation evidence is recorded below and in `.verification/os-phase2b-preservation.json`.

## A. Schema prerequisites

Repository definitions are VERIFIED SOURCE; **every effective production prerequisite remains NOT VERIFIED**. Neither migration files nor historical test output prove that the live schema matches them.

### Migration order

The supported manifest in `server/db/migrations.js` contains 34 entries: SQL 001, a generated `002_role_catalogue_v1`, SQL 003 through 034. There is no SQL file numbered 002. Appendix A records every exact name/checksum in order. Required pre-034 state: entries through 033 applied with matching checksums, required objects intact, and no unexplained migration history or schema drift. Do not use a row count alone as proof.

034 SHA-256: `9af3672955fc6573dd9c1df2ac79c55895b4b9003bbde7b55beb7ca9bf59f1f0`.

### Direct migration dependencies and postconditions

| Object | Required before 034 | Required after 034 / operator evidence |
| --- | --- | --- |
| `schema_migrations` | `name` PK, `checksum`, `applied_at`; correct prior manifest | Matching 034 entry only after successful transaction; earlier checksums/timestamps unchanged |
| `crm_leads` | `id` PK, `company_id`, nullable `enquiry_id`; existing company/contact/recipient FKs and `(company_id,enquiry_id)` uniqueness from 006 | New unique `crm_lead_enquiry_identity(id,company_id,enquiry_id)` |
| `quotation_versions` | `id`, `company_id`, `enquiry_id`; unique `(id,company_id)` from 006; thread/version/previous-version relationships from 005 | Nullable `source_lead_id`; FK `quotation_source_lead_tenant(source_lead_id,company_id,enquiry_id)` to the lead triple; partial `quotation_source_lead_idx(company_id,source_lead_id)` |
| `distributor_offers` | `id`, `company_id`, `product_id`, existing company/product FKs and `(company_id,product_id)` uniqueness | Unique `offer_product_tenant_identity(id,company_id,product_id)` |
| `quotation_line_items` | Version FK, `(version_id,position)` PK, product FK; every existing version resolves to its parent with non-null company | New `company_id` filled solely from parent and NOT NULL; FK `quotation_line_tenant(version_id,company_id)`; optional `offer_id`, `offer_revision`; NOT NULL object JSON `product_snapshot`, `offer_snapshot` with empty-object defaults; FK `quotation_offer_tenant(offer_id,company_id,product_id)`; check `quotation_offer_reference`; partial `quotation_line_offer_idx(company_id,offer_id)` |

The reference check requires either no offer/revision or an offer plus product and positive revision. JSON checks prove object shape, not truth or trusted origin. The composite offer FK binds company/product identity but does not bind an historical revision; the source resolver checks new selection revisions and captures history. No historical product/seller facts, source lead, price or availability are backfilled.

Appendix B inventories source-defined columns, constraint clauses, relationships and indexes for the directly affected and supporting tables, including later ALTER statements. It is a source inspection appendix, not an executed schema report. The complete ordered manifest remains authoritative for inherited auth, commercial, finance, installation and retention prerequisites.

### Phase 2 runtime dependency checklist

| Runtime dependency | Required objects/columns and relationships | Source / evidence |
| --- | --- | --- |
| Source products | `catalogue_products`: product identity, category/subcategory, name/brand/model, unit/attributes/warranty, revision/search document, publication/schema revision; `catalogue_categories`: identity, parent, active/revision/schema | 004; discovery additions/projection changes 022; `marketplace/service.js:publishedProduct`; `purchase/sources.js` |
| Source sellers | `distributor_offers`: identity/company/product, revision/approval revisions, price mode/paise/currency/unit/estimate, tax, availability, maintained stock/minimum order, coverage/public terms, status/publication | 004; `marketplace_offers` joined to `marketplace_products` and eligible `marketplace_vendors`; no private seller notes copied |
| Published vendor | `companies`, `company_branding`, `company_profiles`, `company_business_profiles`, `company_reviews`; active lifecycle/status, approved reviewed listing and published storefront | `marketplace_vendors` in 004 and its complete subsequent migrations; contact requirements remain authoritative |
| Enquiry/thread | `customer_enquiries`, `enquiry_recipients`, `enquiry_quotations`; recipient pair and thread/enquiry/company triple FKs, customer ownership, preference/version FK | 005; received-enquiry locks and open-status checks in `purchase/service.js`, `company.js` |
| Qualification/review | `crm_leads.qualification/pipeline_step/lost_reason`; `company_sales_controls` policy; quote review columns, `quotation_review_events` immutable history; `company_role_profiles` restrictions | 023, auditor extension 033; `people-sales.js`, `purchase/sources.js`, `purchase/review.js` |
| Line/source reads | Every base line field, new offer/snapshot fields; version lineage and optional lead | 005/006/034; `purchase/service.js:items`, customer serializer removes private lead/review data |
| Order capture | `business_orders` immutable `terms`, `quotation_id`, company/contact, monetary and agreement/status/revision fields; `business_order_items` product/company/order/position, quantity/unit and `snapshot` | 006; tenant FKs, company/reference and company/quotation uniqueness, order/position uniqueness; `operations/orders.js` |
| Retry/authorization/audit | `operations_idempotency` company/key/fingerprint/result; session/user/active company, membership/base/profile grants, commercial policy; `audit_events`, `enquiry_events`, workflow/operations notifications | 001/generated 002/003/006/008/013/023/030–033; `tenancy/context.js`, `operations/core.js`, `db/pool.js`; company row lock serializes cooperating requests |
| Order lifecycle guards | Existing invoice balance view, advances/allocations queried by `orderFinance`, projects, service contracts, inventory reservations/movements | 006/025/026/028 and `operations/finance-ledger.js`; inherited cancellation/fulfilment checks are not removed by 034 |
| Templates | `quotation_templates` company-scoped quote/items JSON and creator | 016; template is not an issued quotation or trusted incoming snapshot |

### Required future schema/readiness evidence

An authorized operator must provide redacted results, not customer rows: exact target/schema identity; ordered prior migration names/checksums; expected columns/types/nullability/defaults; PK/unique/composite-FK/check definitions and validated state; required indexes/views/triggers; orphan/mismatch counts; object ownership and migration-role ALTER/CREATE privileges; sizes and lock/timeout characteristics. Missing prerequisites or unexpected drift are STOP conditions. Tests must check legacy quotation/order terms and amounts remain unchanged and captured lineage survives subsequent writes.

`server/index.js:/readyz` checks expected names/checksums using `name=ANY(expected)` and a bounded query; it does **not** inspect columns, constraints, drift or reject extra migration entries. `/healthz` proves process health only. An old binary can pass its own readiness after 034. Required future acceptance therefore includes both new-artifact readiness and actual schema/business checks; an HTTP 200 is insufficient.

## B. Railway configuration inventory — names only

Local `.env` was deliberately not inspected. The example is documentation, not configured-service evidence. Runtime references and validation below are confirmed from `server/config.js`, `server/mail-config.js`, `server/sia/config.js` and `.env.example`; **configured in Railway** and **effective in deployed process** are NOT VERIFIED for every row. No login, variable query or provider request was made.

Safe verification methods for an authorized operator:

- **P**: inspect the exact service's Variables presence/reference privately; report name/presence only, never copy the value. Check pending versus deployed state and release identity.
- **F**: privately validate format or bounded range against source, reporting pass/fail only. Do not rotate keys to fix a failed comparison.
- **R**: after separately approved access/release, verify observed runtime behavior, safe logs and worker heartbeats; for email include approved recipient receipt. A saved setting is not a running setting.

| Variable | Purpose / requirement | Documented; repository validation | Safe operator method |
| --- | --- | --- | --- |
| `NODE_ENV` | Required operational environment policy | Yes; comparison selects production protections, no enum validation | P/F/R |
| `PORT` | Listener; platform supplied/defaulted | Yes; startup integer/range | P/F/R |
| `APP_ORIGIN` | Required production origin | Yes; startup valid exact HTTP(S) origin, production HTTPS | P/F/R |
| `DATABASE_URL` | Required database binding | Yes; startup URL/protocol/host/database/hash and SSL-query checks, not connectivity/schema proof | P/F; separately authorized target evidence |
| `DATABASE_SSL` | Required reviewed TLS policy, default exists | Yes; startup enum, certificate verification on TLS | P/F/R; verify private-network/TLS assumptions |
| `SESSION_SECRET` | Required CSRF/session security | Yes; startup length and placeholder rejection | P/F/R; preserve established key |
| `SESSION_ABSOLUTE_HOURS` | Optional session duration override | Yes; startup integer/range | P/F/R |
| `SESSION_IDLE_HOURS` | Optional idle duration override | Yes; startup integer/range | P/F/R |
| `TRUST_PROXY_HOPS` | Conditional trusted-proxy topology | Yes; startup bounded integer, topology not proven | P/F/R; inspect actual ingress chain |
| `DATA_ENCRYPTION_KEY` | Conditional queue/MFA/private-file encryption | Yes; startup format if present, not required universally | P/F/R; verify matching services and secure recovery copy without disclosure |
| `AUTH_PIN_PEPPER` | Conditional legacy PIN/OTP compatibility | Yes; startup format if present | P/F/R; verify remaining consumers before rotation/removal |
| `AUTH_REQUIRE_VERIFIED_EMAIL` | Optional verification enforcement policy | Yes; equality flag, no strict boolean enum | P/F/R |
| `AUTH_REQUIRE_PRIVILEGED_MFA` | Optional privileged MFA policy | Yes; equality flag, no strict boolean enum | P/F/R; verify enrolment/recovery before enabling |
| `INVITATION_DELIVERY` | Conditional delivery mode | Yes; startup enum and production manual-mode rejection | P/F/R |
| `RESEND_API_KEY` | Conditional Resend transport credential | Yes; presence/config selection, not key validity | P/F/R; sender and approved actual receipt separately |
| `SMTP_HOST` | Conditional explicit SMTP host | Yes; transport selection, not general hostname validation | P/F/R |
| `SMTP_PORT` | Conditional SMTP port/default | Yes; startup integer/range | P/F/R |
| `SMTP_SECURE` | Conditional transport/TLS mode | Yes; equality flag, no strict enum | P/F/R; check complete effective settings together |
| `SMTP_USER` | Conditional SMTP identity | Yes; transport presence/Resend pairing | P/F/R |
| `SMTP_PASSWORD` | Conditional SMTP secret | Yes; transport presence, not validity | P/F/R; never print |
| `MAIL_FROM` | Conditional verified email sender | Yes; CR/LF rejection, not domain/provider verification | P/F/R |
| `LOGO_ALLOWED_HOSTS` | Optional exact external logo hosts | Yes; startup DNS-format allowlist | P/F/R |
| `PRODUCT_IMAGE_ALLOWED_HOSTS` | Optional exact external image hosts | Yes; startup DNS-format allowlist | P/F/R |
| `APP_RELEASE` | Optional safe release label | Yes; string truncation only | P/R; reconcile with actual deployed artifact |
| `OPS_ALERTS_ENABLED` | Optional alert policy | Yes; equality flag only | P/F/R; verify actual alert receipt |
| `OPS_ALERT_RECIPIENT` | Conditional approved alert inbox | Yes; config accepts string, not proof of deliverability | P/F/R |
| `DB_WARNING_BYTES` | Optional capacity threshold | Yes; startup integer/range | P/F/R |
| `FILE_SCAN_URL` | Conditional scanning gateway; required for upload feature | Yes; startup HTTPS/no embedded credentials/query/hash | P/F/R; approved gateway proof |
| `FILE_SCAN_KEY` | Conditional gateway credential | Yes; accepted string, feature availability enforced downstream | P/F/R |
| `FILE_QUOTA_BYTES` | Optional company quota override | Yes; startup integer/range | P/F/R |
| `SIA_ENABLED` | Optional assistant flag | Yes; equality switch, not strict enum | P/F/R |
| `SIA_PROVIDER` | Optional configured adapter | Yes; availability checks supported adapter, not startup enum | P/F/R |
| `SIA_PROVIDER_URL` | Conditional provider gateway | Yes; feature availability validates URL restrictions | P/F/R; no request in audit |
| `SIA_API_KEY` | Conditional provider secret | Yes; presence, not credential validity | P/F/R |
| `SIA_MODEL` | Conditional model identifier | Yes; presence, not provider compatibility | P/F/R |
| `SIA_TIMEOUT_MS` | Optional provider timeout | Yes; SIA module integer/range | P/F/R |
| `SIA_REQUESTS_PER_MINUTE` | Optional abuse limit | Yes; SIA module integer/range | P/F/R |
| `SIA_USER_DAILY_LIMIT` | Optional user budget | Yes; SIA module integer/range | P/F/R |
| `SIA_COMPANY_DAILY_LIMIT` | Optional company budget | Yes; SIA module integer/range | P/F/R |
| `STAGING_MODE` | Legacy compatibility hazard, not a current supported deployment mode | Deliberate startup rejection of legacy enabled mode; absent from current example | P/F; do not change settings in this audit |
| `TEST_DATABASE_URL` | Test-only disposable target; not a production requirement | Runbooks/harness; loopback/name/identity checks at test execution | P: confirm no production binding used for tests |
| `POSTGRES_BIN` | Optional local test binaries | Harness reference; executable availability checks, not app startup | Local file inspection only |
| `BROWSER_EXECUTABLE` | Optional local browser executable | Browser harness/runbook; path availability | Local file inspection only |

Mail uses the existing SMTP transport with Resend fallback and explicit credential/host pairing. Missing settings can leave delivery unavailable without blocking all startup. The always-running mail worker is separately required for queued delivery. Reminder and monitor workers are separate commands; declared commands do not prove supervised processes. Historical worker configuration/receipt records are not current effective-state proof.

`railway.json` declares the migration pre-deploy command and readiness path/timeout. `package.json` defines root build/start/migration and worker commands; `.railwayignore` excludes private/test artifacts. `ROOT_DEPLOYMENT.md` is current root guidance; older staging runbooks are explicitly historical. Effective overrides, replica count, source/artifact, auto-deploy behavior, restart policy, worker versions and traffic fencing remain NOT VERIFIED. No native application maintenance/write-fence control was established by this audit.

## C. Complete production-capable quotation/order mutation matrix

Search scope: root application/server/scripts/tests, including SQL INSERT/UPDATE/DELETE against quotations and orders; source resolver/shared services; SIA/automation; import/template endpoints. Test fixtures are separated below. No additional production-capable direct quotation/order writer was found outside these six direct mutation files. Dynamic/external integrations are not proven absent from production.

| File / entry point | Fields and behavior | Product / seller snapshots; lead; qualification | Order snapshots / duplicate prevention | Post-034 source assessment |
| --- | --- | --- | --- | --- |
| `purchase/company.js` POST `/enquiries/:id/quotations` | Thread if needed, complete version/commercial fields, source lead, all line fields incl company and source references, audit | Trusted resolver; optional genuine lead; policy check server-side | No order; existing draft/version uniqueness and locks | Compatible source; old version omits mandatory company |
| Same PUT `/quotations/:id` | Commercial fields/revision/review reset/source lead; replaces lines transactionally | Trusted new captures or retained genuine history; qualification rechecked | No order; optimistic revision, company lock | Compatible; old writer fails after deleting lines but transaction rollback should retain prior draft |
| Same POST `/quotations/:id/actions` send | Supersedes prior sent version; status, dates, issuer/customer snapshots, coalesced source lead, enquiry status | Does not replace lines; qualification/review/publication/validity checked | No order | Compatible; historical empty captures remain honest |
| Same withdraw | Quote status/revision; clears related preference when needed | Retains sources; qualification not needed to withdraw | No order | Compatible |
| `purchase/review.js:reviewDraft` | Review status/revision/approval revision/policy/reviewer/override; immutable review event | Does not author sources/lead; approval/discount authority retained; send separately checks qualification | No order | Compatible |
| `purchase/customer.js` quotation view/clarification/revision requests | View timestamp or request type/revision, messages/events/notifications | No line/source authoring; customer ownership; qualification N/A | No order | Compatible; cannot approve company's draft |
| `operations/orders.js` POST `/orders`, quotation branch | Order identity/company/contact/quotation/reference, immutable terms/items, amount, addresses, dates/owner/acceptance; order lines/snapshot | Copies issued version sources; lead remains reachable via quotation FK, intentionally not exposed in customer quote snapshot | Existing company lock, fingerprint/idempotency, open-thread check, company/quote/reference uniqueness; explicit later acceptance | Compatible; old item projection silently omits source snapshots |
| Same endpoint, manual agreement branch | Same order fields; supplied validated agreed terms | Trusted optional catalogue/own-offer capture; no manufactured lead; no lead-based quotation qualification claim | Same protections; manual agreement remains separate | Compatible; legacy lines without selected sources remain possible by design |
| Same POST `/orders/:id/actions`, request confirmation | Status/revision; notification | Sources immutable; qualification N/A | Existing order only, guarded stage/revision | Compatible |
| Same confirm | Status/agreement reference/notes/confirmed actor/time/revision | Sources retained; current issued quotation revalidated | Requires exact in-app customer confirmation or documented external agreement | Compatible |
| Same processing/partial fulfilment/fulfilled | Status/fulfilment reference/revision | Sources retained | Stage/revision checks; reservations guard fulfilment | Compatible |
| Same cancel | Order status/revision; associated reservation release and stock movement records | Does not erase sources or history | Invoice/advance/project/service/consumption guards; scoped transaction | Compatible; inherited finance/material dependencies must exist |
| `operations/customer.js` POST `/orders/:id/confirm` | Customer-confirmed timestamp/revision; event/notification | No source changes; own registered customer only | Company/order locks, stage/revision and explicit consent; no new order | Compatible |
| `sales-tools.js` template POST | Separate template company/name/quote/items/creator | Reads saved sources; template input is not trusted snapshot authoring | Creates neither quote nor order | Compatible shared new-column read; old template payloads must be reviewed/revalidated |
| `sales-tools.js` import preview/commit | Contacts and leads only | Does not insert quotes/orders | N/A | Not a quote/order bypass |
| SIA / automation / mail / monitor | No direct INSERT/UPDATE to quotation or order records found; reminder catalogue reads sources; proposals remain existing human workflows | No alternate trusted snapshot authority | No alternate order posting route found | No incompatible direct writer found; effective external jobs still operator inventory required |

Shared `purchase/sources.js`, `service.js`, validation, `tenancy/context.js`, `operations/core.js` and `db/pool.js` establish the trust/transaction boundaries. New source fields are not client-assigned JSON. Company/product/revision and currency/unit checks remain; recorded seller facts are not independent verification or stock reservation. `customerQuote` excludes internal lead/review details.

Tests/fixtures with direct SQL: `os-phase2-sources-upgrade.test.mjs` writes old-shaped lines only before 034; `business-access`, `automation.integration`, `after-sales-retention.integration`, `customer-360.integration`, `management-automation.integration`, `installation-materials.integration` and its upgrade test, `operational-finance.integration` and its upgrade test create fictional historical orders or adjust fixtures. `people-sales.integration` tests immutable review history. These are not deployable business writers. `tests/helpers/purchase-flows.mjs` uses existing APIs. No business seed/import migration is run by this audit.

Evidence: `os-phase2-sales.integration.test.mjs` tests foreign/stale/mismatched offers, qualification bypass, historical snapshots/negotiated prices, customer privacy, telecaller restrictions, same-key concurrency, competing keys, preserved sources and confirmation. `os-phase2-sources-upgrade.test.mjs` preserves each legacy field/checksum and checks tenant FK/repeat behavior. Their actual run boundaries are in section F.

## D. Recovery evidence matrix

| Artifact/date | Scope; existence evidence | Integrity / restore | Release sufficiency / uncertainty |
| --- | --- | --- | --- |
| `AUTH_REPAIR_HANDOFF.md`, 20 October backup and subsequent historical listing | Historical **production** manual backup, pre-signin migration recovery point; provider-listed completion described in handoff | No isolated restore of that backup claimed; current retention/access/integrity not rechecked | Additional historical production evidence beyond the earlier release review's staging discussion. Six days old on audit date; not evidence of a current pre-034 recovery point or current schema coverage |
| `PHASE_11_STAGING_ACCEPTANCE_HANDOFF.md`, 18 October | Historical staging snapshot and recovered volume | Marker and eleven unchanged migration entries checked after actual restore; subsequent archival recovery documented | Different environment and old schema; cannot cover today's production. RPO/RTO guarantee explicitly absent |
| `.verification/os-phase2-postgres.log` and `tests/recovery-restore.integration.test.mjs` | Retained local run: fictional schema dump into separate disposable database | Test asserts restored sentinel and manifest; 411-run log shows scenario passed | Local mechanism evidence only, not a production backup or full encrypted/file recovery certification |
| `RELEASE_PROGRAMME_HANDOFF.md` / `RELEASE_OPERATIONS_RUNBOOK.md` | Historical local dump/restore and documented guarded process | Source procedure exists; target-specific production rehearsal not demonstrated | Documentation does not prove a current backup or recovery duration |
| `AUTH_REPAIR_HANDOFF.md` / operations runbook protected-key recovery notes | Historical profile-bound encrypted key backup described | Off-site secure key recovery is not established | Required encryption dependencies may be outside database backup; do not read/print private artifacts or rotate keys during audit |
| Current production backup, its completeness and measured restore | **NOT VERIFIED** | **NOT VERIFIED** | Blocking: no newly supplied/provider-confirmed current recovery evidence |

Ignored local recovery artifacts exist, but file presence/count alone is not integrity, completeness, recency or production coverage. They were not restored or opened as business data. Sensitive backup locations/identifiers and raw provider records are intentionally not reproduced.

Operator evidence required: target/database/schema identity; timestamp and completed status of the intended production recovery point; integrity/completeness and required encrypted/file dependencies; retention, access and secret recovery ownership; exact restore procedure; successful restoration of **that backup** into an authorized isolated target with schema/count/relationship/financial/source and application checks; elapsed recovery time and accepted RPO/RTO. Establish business-owner acceptance of permissible loss/downtime. None is inferred from a configured schedule or historical successful API response.

## E. Migration/recovery risk and maintenance runbook

`server/db/migrations.js` performs each missing migration and its ledger insertion in one transaction, under advisory locks. 034's backfill/constraints/indexes roll back together on SQL failure. Earlier successfully committed entries remain. The CLI also uses an outer advisory lock. Runner retry skips matching applied entries; raw 034 SQL is not idempotent. Checksum mismatches must remain failures.

No safe reviewed down migration exists. Removing source fields would lose lineage/history; a previous application artifact is not automatically schema-compatible. New code fails before added columns exist; old quote writers fail afterward and old order projections can lose provenance. Old readiness does not stop them. Index building/backfill/FK checks can lock tables; pool statement timeout and production scale/locks are unmeasured. Connection-loss commit ambiguity requires inspecting ledger and constraints under separately authorized access, not blindly assuming rollback or repeating raw SQL.

Checks possible now: source/hash/order/writer inventory, static review of atomicity and guards, existing log inspection. Future **authorized disposable** rehearsal must prove 033-to-034 legacy preservation, fresh chain, repeat/checksum behavior, induced halfway failure/rollback and retry, stale/new writer incompatibility, source capture and concurrent order replay, and representative scale/lock timing. Prior passing happy-path logs do not prove every failure rehearsal.

Proposed steps below are **NOT executed**. Every remote inspection, maintenance action, test write, backup/restore, migration and release needs explicit target-specific human authorization; this document is not that authorization.

| Gate | Authorized action and STOP condition |
| --- | --- |
| 1 — artifact/preflight | Identify reviewed immutable artifact, current deployment/replicas/workers, exact target and previous artifact. Provide schema/config evidence and complete safe disposable rehearsal. STOP on mismatch, drift, missing role privileges or unclear target. |
| 2 — recovery | Verify current target backup, restore evidence, encryption/file dependencies, RPO/RTO and named recovery owner. STOP if recovery point is not accessible/verified or loss window unacceptable. |
| 3 — fence/drain | Prove maintenance mechanism, stop new traffic/writes, drain in-flight work and old web processes/integrations, pause relevant workers/restarts. Confirm no old quote/order writer remains. STOP if this cannot be demonstrated. No established in-app fence is claimed. |
| 4 — migrate under fence | Use only `npm run db:migrate` via the approved artifact's release mechanism; account for checked-in pre-deploy hook so no uncontrolled parallel runner executes. Capture safe exit/ledger evidence and verify 034 postconditions. STOP and keep fence on any error/timeout/ambiguous result. |
| 5 — compatible cutover | Start only matching web/worker code; verify actual artifact, health, readiness and constraints. STOP if old replicas return or schema differs. Do not use an old readiness 200 as proof. |
| 6 — acceptance | Authorized fictional/approved test records: own/foreign permissions, qualification rejection, draft/edit/send sources, customer privacy, exact order lineage/replay/concurrency and consent; approved mail delivery where needed. STOP on data or security failure. |
| 7 — resume/monitor | Resume traffic and workers only after acceptance, verify queue/worker health, error/latency/lock/capacity signals and actual alert receipt. No automatic repeat delivery of stale work. STOP/fence on source loss, duplicate transactions or elevated errors. |
| 8 — recovery decision | Failed migration: inspect rollback/ledger and cause before supported-runner retry. Applied migration + failed app: keep fence, use reviewed schema-compatible roll-forward. Restore only after separate authorized recovery/cutover and newer-transaction reconciliation; never blindly overwrite production or drop 034 columns. |

## F. Test evidence integrity — no new tests in Phase 2B

| Category/run | Inspected evidence and result | Boundary |
| --- | --- | --- |
| Static validation, earlier implementation | `.verification/os-phase2-static-final.log`: 1333 passed/0 failed | Syntax/assets/dependency/static checks; no independent TypeScript suite in this plain-JS app |
| Static validation, release review | `.verification/os-phase2-release-static.log`: 1333 passed/0 failed | Separate later run; do not sum counts |
| Browser, earlier and release-review runs | `os-phase2-browser-final.log` and `os-phase2-release-browser.log`: each 955 passed/0 failed | Local browser with fictional intercepted API data, no database authorization proof; no production verification |
| Focused release-review run | `os-phase2-release-targeted.log`: 13 tests, 11 passed/0 failed, 2 skipped | Purchase units/mocked service and migration-runner/static contracts passed; database scenarios skipped without TEST_DATABASE_URL |
| Earlier isolated automated/database suite | `os-phase2-postgres.log`: 411 passed/0 failed/0 skipped | Combined unit/HTTP/real-DB suite, **not 411 distinct PostgreSQL scenarios**. Harness starts a fresh local cluster/database and per-test schemas; includes 033-to-034 upgrade and fictional restore |
| Earlier focused failure | `os-phase2-focused-final.log`: 12 passed/1 failed | Historical failed attempt, not renamed a pass; later full evidence retained separately |
| New Phase 2B execution | None | No test, type check, build, migration, database connection or browser was run |
| Current production acceptance | None | NOT VERIFIED; local/historical results cannot substitute |

Harness inspection: `scripts/verify-postgres.mjs` creates a loopback cluster with generated local credentials, creates a named test database, clears external-service secrets for tests, then stops the cluster. `tests/helpers/isolated-app.mjs` checks loopback/name/identity and creates/drops random schemas. `tests/recovery-restore.integration.test.mjs` creates/drops a separate restore database. These are mutation-capable and deliberately **not invoked**. `tests/purchase.test.mjs` uses unitEnvironment and mocks; `tests/migrations.test.mjs` includes mocked-runner contracts. No `.env` values were loaded during audit. Old logs do not bind every current source byte to the original execution; the new audit fingerprint is a preservation record, not retroactive test provenance.

## Prioritized blockers

| Severity | Issue / evidence | Unknown | Safe closing action / authorization |
| --- | --- | --- | --- |
| Critical | No current target-specific schema proof; source manifest/readiness only | Effective history, constraints, drift, size and privileges | Owner supplies redacted target/metadata evidence or separately authorizes precise read-only inspection; no queries now |
| Critical | Mixed-version window proven by old/new item fields and pre-deploy ordering | Effective replicas, external writers, fencing and restart behavior | Reviewed maintenance/drain plan and authorized demonstration; no deploy/setting change now |
| Critical | Historical 20 October production backup lacks current status and specific restore proof | Current recovery point/completeness/access/RPO/RTO | Approved current backup/isolated restore evidence and ownership; separate external/mutation authorization |
| High | Fresh failure/retry and scale rehearsal not performed for this release | Rollback under injected error/commit ambiguity; production-size lock duration | Explicitly authorized disposable target and rehearsal; no migration/database creation under this audit |
| High | Railway declared configuration does not prove runtime | Target/artifact, override settings, migration invocation, workers/keys and restart state | Private operator presence/format comparisons and safe runtime evidence; explicit authorization for external inspection |
| High | Monitoring/recovery dependency acceptance not current | Alert receipt, worker health, encrypted-data/file recoverability | Approved recipients/ops acceptance and secure key recovery; never paste credentials |
| Medium | Earlier test evidence not cryptographically tied to all current source bytes | Intervening changes since historical runs | Future authorized repeat tests against fingerprinted reviewed artifact; preserve failed attempts and separate counts |

## Actions deliberately not performed and next gate

No Railway login/API/CLI operations; no live URLs/health probes; no production or local database connections; no schema queries, migrations, seeding, backup or restore; no environment/secret reads or writes; no service/resource/DNS/payment changes; no test/browser/build execution; no application edits; no Git staging, commits, fetch, merge, push, reset, clean or history changes. Customer dashboard and original logo were not changed.

Next milestone: obtain explicit authorization for a fingerprinted **disposable-only migration failure/retry and compatibility rehearsal**, plus operator-supplied production metadata and specific backup/recovery evidence. This is a proposed milestone, not an execution instruction or production approval. Stop after this audit.

Final worktree preservation and generated appendices follow.

## Appendix A ? exact source migration order and expected checksums

Read-only computation from migration sources and role definitions; not an applied database ledger.

| Order | Manifest entry | SHA-256 |
| --- | --- | --- |
| 1 | `001_identity.sql` | `97da0abf7668f9ff0a8df71d10c9bdabdd48f2532a89f9c05a4a467a351e6d7a` |
| 2 | `002_role_catalogue_v1` | `d77b5e16c6099cfca973d9639c91d899d073297f749e89b92aa6b7dba3c90c7c` |
| 3 | `003_company_setup.sql` | `6e6ffaa6d4d16fa69ccbb7a1aa09c76945cfae3dbd966c7784799614c619fcb0` |
| 4 | `004_marketplace.sql` | `8c3f185de1711a352e3e07c0d9d241645b8bedaf6381bc8799f270b74f78f419` |
| 5 | `005_enquiries_quotations.sql` | `31af8c35f6012a4eb6ff56b5414a3dd56573da65bc715bd0da09c160c59aaefa` |
| 6 | `006_operations.sql` | `50fc05885c4cdc3b2636c1bdf2ab87ab4cc5ca3e917cde68c292e243252827b1` |
| 7 | `007_sia.sql` | `37d5da35855ad3d3b8744692fec48ac50c6a2c089408771985a82aff3a1e3590` |
| 8 | `008_commercial.sql` | `3d50ba531ef82d23a2198c13c74dd19556b2a57b1eb7ebd3cac8d8a79c39dce7` |
| 9 | `009_shared_invitations.sql` | `aaa630b02ade28916b96ebb9b215381f52e4297f72724da0c88c163d8c232da6` |
| 10 | `010_domain_registry.sql` | `3080052aa75a4128cea62ffc924ca0d285857242c1b2d38064b9552e80a0c05e` |
| 11 | `011_pro_network.sql` | `8a24af7e8e8bdefef2d8e2ca604f555ec899bd81e8812af273b506db376b0ad0` |
| 12 | `012_automation.sql` | `b18ef4486af570ae26cdb304931d879f7fdad7beb1a30f9a8954a557829edad9` |
| 13 | `013_release_accounts.sql` | `7da389d23563e7d244088b20e1d042c34c119a09b2739b4eb165b87eb72c2a29` |
| 14 | `014_operations_health.sql` | `cdafcb79e09abf38a2d6d4393ec39e08b16eb21765f2f6c1b55d94217f531f63` |
| 15 | `015_public_discovery.sql` | `0d7a22a1025e85cfc7ccd634377611ac1b7a22fa99f82d4f00723e256d909282` |
| 16 | `016_sales_tools.sql` | `198e0a312f2c411a0f4e206b128df03988afcdf2490c47e23accdbfb497cc444` |
| 17 | `017_documents_delivery.sql` | `874d5d98b4c8fb9610a8965c1ed8c0f6f11b28a5a58981c9fbd096a41e44092f` |
| 18 | `018_service_communications.sql` | `e468db44006b9333c07a44e0c7219d10e17f189ba1c753a0be20e59a464d4a37` |
| 19 | `019_white_label_commercial.sql` | `7d6d33a4ae0afa7d9680cc29bcffea7b216abe8d7f4574fc16041f6d23e26afd` |
| 20 | `020_release_indexes.sql` | `a640317b9bd40abc84b96af3e3b5ef31bcc9d4d47c3a4339d5b1dbe9b83727a7` |
| 21 | `021_mobile_pin.sql` | `922c228d9442d2a58e8f9a39658e2d8f60d2dc3eb0276b4281bd956ad6e1ae29` |
| 22 | `022_marketplace_discovery.sql` | `1569595df94ccb169543a3ddf73b9cfab7332d662ea1fc66beb0c2e91b88fbc1` |
| 23 | `023_people_sales_controls.sql` | `a63eb795d26be12c9f5590c0857d0eadfd088a1a7742792fec553e5d7ce6441d` |
| 24 | `024_project_coordination.sql` | `6e16180262c6cb609ad807468233f1134d92822393a2b682b6edee2c2a04778b` |
| 25 | `025_operational_finance.sql` | `1f426b15bcd344541ef343985da9de1944f39295ad546fa58b70003bb7428342` |
| 26 | `026_installation_materials.sql` | `ddc7dda82efca458ce53f26d0b40c6415d44238f3d4343459b1bf06209f18f6d` |
| 27 | `027_financing_subsidy.sql` | `d586d7c57cfb398179f5583efb871637ce89afaa979ad57a77915d515a65246b` |
| 28 | `028_after_sales_retention.sql` | `02d69f8a1a8bd4ef095e96e2300262f6afab26a25175477611d86f75bacb268d` |
| 29 | `029_management_automation.sql` | `335108f0a2a952e58536fd4757ffb72dc65711c129b46703689b1984edd9519b` |
| 30 | `030_separate_account_channels.sql` | `a7083e3c5d2c04be1d0ee6ea2bc34df32402895d046a02617d883c068d828ace` |
| 31 | `031_password_reset_codes.sql` | `6140f4b647542fe55771ab8d2198312d3897c35adad75c823e0e887527581da8` |
| 32 | `032_verified_unique_email_signup.sql` | `31fdbed08f3454e8029f233e146536b05487b26df0884ed3ee49edf257eec02f` |
| 33 | `033_solar_os_workforce.sql` | `578a7fb0941ba75bd601836d0a760b8b331bd8f226a5efd3d541ef9e7503441b` |
| 34 | `034_quotation_sources.sql` | `9af3672955fc6573dd9c1df2ac79c55895b4b9003bbde7b55beb7ca9bf59f1f0` |

## Appendix B ? source DDL checklist for affected and supporting objects

Each block is a source definition, not live schema evidence and not SQL to execute. CREATE definitions include every original column and inline relationship/check/unique key. Subsequent ALTERs/indexes and public projections are listed in source order. Inherited business-flow dependencies outside these objects require the full manifest and the runtime checklist above; this appendix is not a replacement schema migration or a claim that every historical constraint has the same final definition.

### `server/db/migrations/001_identity.sql`

Source line 1:

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) <= 254),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Source line 29:

```sql
CREATE TABLE companies (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  city text NOT NULL CHECK (length(city) BETWEEN 1 AND 100),
  business_email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  storefront_description text NOT NULL DEFAULT '',
  storefront_published boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Source line 42:

```sql
CREATE TABLE company_memberships (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role_id text NOT NULL,
  role_scope text NOT NULL DEFAULT 'company' CHECK (role_scope = 'company'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(role_id, role_scope) REFERENCES roles(id, scope),
  UNIQUE (company_id, user_id)
);
```

Source line 54:

```sql
CREATE INDEX memberships_user_idx ON company_memberships(user_id, status);
```

Source line 63:

```sql
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  active_company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
```

Source line 71:

```sql
CREATE INDEX sessions_user_idx ON sessions(user_id);
```

Source line 72:

```sql
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
```

Source line 81:

```sql
CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id),
  company_id uuid REFERENCES companies(id),
  action text NOT NULL,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Source line 90:

```sql
CREATE INDEX audit_company_idx ON audit_events(company_id, created_at DESC);
```

### `server/db/migrations/003_company_setup.sql`

Source line 1:

```sql
ALTER TABLE companies ADD COLUMN lifecycle text NOT NULL DEFAULT 'draft' CHECK (lifecycle IN ('draft','onboarding','pending_review','active','suspended'));
```

Source line 2:

```sql
ALTER TABLE companies ADD COLUMN suspended_from text CHECK (suspended_from IN ('draft','onboarding','pending_review','active'));
```

Source line 3:

```sql
ALTER TABLE companies ADD COLUMN marketplace_status text NOT NULL DEFAULT 'not_requested' CHECK (marketplace_status IN ('not_requested','pending','approved','rejected','withdrawn'));
```

Source line 4:

```sql
ALTER TABLE companies ADD COLUMN revision integer NOT NULL DEFAULT 1;
```

Source line 10:

```sql
ALTER TABLE companies ADD CONSTRAINT company_lifecycle_consistent CHECK ((status='suspended')=(lifecycle='suspended'));
```

Source line 11:

```sql
ALTER TABLE companies ADD CONSTRAINT company_publication_gate CHECK (NOT storefront_published OR (status='active' AND lifecycle='active' AND marketplace_status='approved'));
```

Source line 13:

```sql
CREATE TABLE company_profiles (
  company_id uuid PRIMARY KEY REFERENCES companies(id),
  legal_name text NOT NULL DEFAULT '',
  business_type text NOT NULL DEFAULT 'distributor' CHECK (business_type IN ('distributor','installer','both')),
  primary_contact text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  pin_code text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','ml','ta')),
  website text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Source line 26:

```sql
CREATE TABLE company_branding (
  company_id uuid PRIMARY KEY REFERENCES companies(id),
  public_name text NOT NULL,
  logo_url text NOT NULL DEFAULT '',
  primary_color text NOT NULL DEFAULT '#601c2b' CHECK (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text NOT NULL DEFAULT '#292b29' CHECK (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color text NOT NULL DEFAULT '#d8ab55' CHECK (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  welcome_text text NOT NULL DEFAULT 'Good energy starts here.',
  public_email text NOT NULL DEFAULT '',
  public_phone text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  appearance text NOT NULL DEFAULT 'warm' CHECK (appearance IN ('warm','clean')),
  requested_domain text NOT NULL DEFAULT '',
  domain_status text NOT NULL DEFAULT 'not_connected' CHECK (domain_status='not_connected'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Source line 42:

```sql
CREATE TABLE company_business_profiles (
  company_id uuid PRIMARY KEY REFERENCES companies(id),
  services text[] NOT NULL DEFAULT '{}',
  rooftop_available boolean NOT NULL DEFAULT false,
  service_areas text[] NOT NULL DEFAULT '{}',
  preferred_contact text NOT NULL DEFAULT 'email' CHECK (preferred_contact IN ('email','phone')),
  marketplace_requested boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Source line 91:

```sql
CREATE TABLE company_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  actor_user_id uuid NOT NULL REFERENCES users(id),
  kind text NOT NULL CHECK (kind IN ('lifecycle','marketplace','submission')),
  previous_state text NOT NULL,
  new_state text NOT NULL,
  reason text NOT NULL DEFAULT '',
  revision integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Source line 102:

```sql
CREATE INDEX company_reviews_idx ON company_reviews(company_id,id DESC);
```

### `server/db/migrations/004_marketplace.sql`

Source line 1:

```sql
CREATE TABLE catalogue_categories (
 id uuid PRIMARY KEY, parent_id uuid REFERENCES catalogue_categories(id), slug text NOT NULL UNIQUE,
 name text NOT NULL, kind text NOT NULL CHECK(kind IN ('product','service')),
 attribute_schema jsonb NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true,
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,parent_id), CHECK(parent_id IS NULL OR parent_id<>id)
);
```

Source line 20:

```sql
CREATE TABLE catalogue_products (
 id uuid PRIMARY KEY, category_id uuid NOT NULL REFERENCES catalogue_categories(id), subcategory_id uuid,
 name text NOT NULL, brand text NOT NULL DEFAULT '', model text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
 attributes jsonb NOT NULL DEFAULT '{}', unit text NOT NULL, image_urls text[] NOT NULL DEFAULT '{}', warranty text NOT NULL DEFAULT '',
 source_note text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','inactive')),
 public_visible boolean NOT NULL DEFAULT false, schema_revision integer NOT NULL, revision integer NOT NULL DEFAULT 1,
 created_by uuid NOT NULL REFERENCES users(id), published_by uuid REFERENCES users(id), published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 search_document tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, name||' '||brand||' '||model)) STORED,
 FOREIGN KEY(subcategory_id,category_id) REFERENCES catalogue_categories(id,parent_id),
 CHECK(status<>'published' OR (published_by IS NOT NULL AND published_at IS NOT NULL))
);
```

Source line 32:

```sql
CREATE INDEX products_category_idx ON catalogue_products(category_id,subcategory_id,status);
```

Source line 33:

```sql
CREATE INDEX products_search_idx ON catalogue_products USING gin(search_document);
```

Source line 34:

```sql
CREATE INDEX products_brand_idx ON catalogue_products(lower(brand));
```

Source line 35:

```sql
CREATE INDEX products_name_model_idx ON catalogue_products(lower(name),lower(model));
```

Source line 37:

```sql
CREATE TABLE distributor_offers (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), product_id uuid NOT NULL REFERENCES catalogue_products(id),
 distributor_sku text NOT NULL DEFAULT '', price_mode text NOT NULL CHECK(price_mode IN ('price_available','request_quote','contact_distributor')),
 price_paise bigint CHECK(price_paise BETWEEN 0 AND 100000000000), currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
 price_unit text NOT NULL, estimated boolean NOT NULL DEFAULT false,
 tax_mode text NOT NULL DEFAULT 'unknown' CHECK(tax_mode IN ('unknown','inclusive','exclusive','exempt')), tax_rate numeric(5,2) CHECK(tax_rate BETWEEN 0 AND 100),
 availability text NOT NULL DEFAULT 'unknown' CHECK(availability IN ('unknown','in_stock','on_request','out_of_stock','service_available')),
 stock_maintained boolean NOT NULL DEFAULT false, stock_quantity integer CHECK(stock_quantity BETWEEN 0 AND 1000000000),
 minimum_order numeric(12,3) CHECK(minimum_order>0), coverage_labels text[] NOT NULL DEFAULT '{}',
 public_terms text NOT NULL DEFAULT '', terms_confirmed boolean NOT NULL DEFAULT false, private_notes text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected','inactive')), published boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1, approved_revision integer, approved_product_revision integer,
 reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz, created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,product_id), UNIQUE(id,company_id),
 CHECK((price_mode='price_available' AND price_paise IS NOT NULL) OR (price_mode<>'price_available' AND price_paise IS NULL)),
 CHECK((stock_maintained AND stock_quantity IS NOT NULL) OR (NOT stock_maintained AND stock_quantity IS NULL)),
 CHECK(public_terms='' OR terms_confirmed),
 CHECK(status<>'approved' OR (approved_revision IS NOT NULL AND approved_product_revision IS NOT NULL AND approved_revision=revision AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
 CHECK(NOT published OR (status='approved' AND approved_revision IS NOT NULL AND approved_revision=revision))
);
```

Source line 58:

```sql
CREATE INDEX offers_company_product_idx ON distributor_offers(company_id,product_id);
```

Source line 59:

```sql
CREATE INDEX offers_public_idx ON distributor_offers(product_id,company_id) WHERE published AND status='approved';
```

Source line 60:

```sql
CREATE INDEX offers_review_idx ON distributor_offers(status,updated_at);
```

Source line 93:

```sql
CREATE INDEX companies_public_idx ON companies(id) WHERE status='active' AND lifecycle='active' AND marketplace_status='approved' AND storefront_published;
```

Source line 96:

```sql
CREATE VIEW marketplace_vendors AS
 SELECT c.id,b.public_name AS name,c.city,p.business_type,b.description,b.logo_url,b.primary_color,b.secondary_color,b.accent_color,
 b.welcome_text,b.public_email,b.public_phone,b.appearance,s.services,s.rooftop_available,s.service_areas,s.preferred_contact
 FROM companies c JOIN company_branding b ON b.company_id=c.id JOIN company_profiles p ON p.company_id=c.id JOIN company_business_profiles s ON s.company_id=c.id
 WHERE c.status='active' AND c.lifecycle='active' AND c.marketplace_status='approved' AND c.storefront_published
 AND b.public_name<>'' AND b.description<>'' AND ((s.preferred_contact='email' AND b.public_email<>'') OR (s.preferred_contact='phone' AND b.public_phone<>''))
 AND EXISTS(SELECT 1 FROM company_reviews r WHERE r.company_id=c.id AND r.kind='marketplace' AND r.new_state='approved');
```

Source line 103:

```sql
CREATE VIEW marketplace_products AS
 SELECT p.id,p.category_id,p.subcategory_id,p.name,p.brand,p.model,p.description,p.attributes,p.unit,p.image_urls,p.warranty,p.revision,p.created_at,p.updated_at,
 c.name AS category_name,l.name AS specification_category,l.attribute_schema,c.kind
 FROM catalogue_products p JOIN catalogue_categories c ON c.id=p.category_id JOIN catalogue_categories l ON l.id=coalesce(p.subcategory_id,p.category_id)
 WHERE p.status='published' AND p.public_visible AND c.active AND l.active AND p.schema_revision=l.revision;
```

Source line 108:

```sql
CREATE VIEW marketplace_offers AS
 SELECT o.id,o.company_id,o.product_id,o.distributor_sku,o.price_mode,o.price_paise,o.currency,o.price_unit,o.estimated,o.tax_mode,o.tax_rate,o.availability,
 o.stock_maintained,o.stock_quantity,o.minimum_order,o.coverage_labels,o.public_terms,o.updated_at
 FROM distributor_offers o JOIN marketplace_vendors v ON v.id=o.company_id JOIN marketplace_products p ON p.id=o.product_id
 WHERE o.published AND o.status='approved' AND o.approved_revision=o.revision AND o.approved_product_revision=p.revision
 AND o.coverage_labels <@ ARRAY(SELECT a.label FROM company_service_areas a WHERE a.company_id=o.company_id);
```

### `server/db/migrations/005_enquiries_quotations.sql`

Source line 1:

```sql
CREATE TABLE customer_enquiries (
 id uuid PRIMARY KEY, customer_id uuid NOT NULL REFERENCES users(id), submission_key uuid NOT NULL,
 title text NOT NULL, requested_item text NOT NULL, category_id uuid REFERENCES catalogue_categories(id),
 product_id uuid REFERENCES catalogue_products(id), offer_id uuid REFERENCES distributor_offers(id),
 quantity numeric(12,3), unit text NOT NULL DEFAULT '', project_type text NOT NULL, requested_service text NOT NULL DEFAULT '',
 state text NOT NULL, district text NOT NULL, pin text NOT NULL, locality text NOT NULL DEFAULT '', address text NOT NULL,
 requirements text NOT NULL DEFAULT '', contact_method text NOT NULL CHECK(contact_method IN ('in_app','email','phone')),
 contact_snapshot jsonb NOT NULL, timeframe text NOT NULL DEFAULT '', distribution_mode text NOT NULL CHECK(distribution_mode IN ('direct','multiple','matching')),
 status text NOT NULL CHECK(status IN ('submitted','sent','discussion','quotation_received','preferred','closed','cancelled')),
 preferred_version_id uuid, revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(customer_id,submission_key), UNIQUE(id,customer_id), CHECK(pin ~ '^[1-9][0-9]{5}$'), CHECK(quantity IS NULL OR quantity>0)
);
```

Source line 13:

```sql
CREATE TABLE enquiry_recipients (
 enquiry_id uuid NOT NULL REFERENCES customer_enquiries(id), company_id uuid NOT NULL REFERENCES companies(id),
 vendor_snapshot jsonb NOT NULL, viewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(enquiry_id,company_id)
);
```

Source line 18:

```sql
CREATE TABLE enquiry_quotations (
 id uuid PRIMARY KEY, enquiry_id uuid NOT NULL, company_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(enquiry_id,company_id) REFERENCES enquiry_recipients(enquiry_id,company_id),
 UNIQUE(enquiry_id,company_id), UNIQUE(id,enquiry_id,company_id)
);
```

Source line 23:

```sql
CREATE TABLE quotation_versions (
 id uuid PRIMARY KEY, quotation_id uuid NOT NULL, enquiry_id uuid NOT NULL, company_id uuid NOT NULL,
 version integer NOT NULL CHECK(version>0), previous_id uuid,
 reference text NOT NULL, quote_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date, valid_until date NOT NULL,
 currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), tax_mode text NOT NULL CHECK(tax_mode IN ('unknown','exclusive','inclusive','exempt')),
 issuer_snapshot jsonb NOT NULL DEFAULT '{}', customer_snapshot jsonb NOT NULL DEFAULT '{}',
 included text NOT NULL DEFAULT '', excluded text NOT NULL DEFAULT '', warranty text NOT NULL DEFAULT '', timeframe text NOT NULL DEFAULT '',
 payment_terms text NOT NULL DEFAULT '', assumptions text NOT NULL DEFAULT '', installation_scope text NOT NULL DEFAULT '',
 delivery_paise bigint NOT NULL DEFAULT 0 CHECK(delivery_paise>=0), installation_paise bigint NOT NULL DEFAULT 0 CHECK(installation_paise>=0),
 charges_tax_rate text NOT NULL DEFAULT '', total_paise bigint NOT NULL DEFAULT 0 CHECK(total_paise>=0), totals jsonb NOT NULL,
 estimated boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','superseded','withdrawn')),
 request_type text NOT NULL DEFAULT '' CHECK(request_type IN ('','clarification','revision')), revision integer NOT NULL DEFAULT 1,
 sent_at timestamptz, viewed_at timestamptz, created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(quotation_id,enquiry_id,company_id) REFERENCES enquiry_quotations(id,enquiry_id,company_id),
 UNIQUE(quotation_id,version), UNIQUE(id,enquiry_id), UNIQUE(id,quotation_id),
 FOREIGN KEY(previous_id,quotation_id) REFERENCES quotation_versions(id,quotation_id),
 CHECK(status='draft' OR sent_at IS NOT NULL), CHECK(valid_until>=quote_date)
);
```

Source line 41:

```sql
CREATE UNIQUE INDEX quotation_one_draft_idx ON quotation_versions(quotation_id) WHERE status='draft';
```

Source line 42:

```sql
ALTER TABLE customer_enquiries ADD FOREIGN KEY(preferred_version_id,id) REFERENCES quotation_versions(id,enquiry_id);
```

Source line 43:

```sql
CREATE TABLE quotation_line_items (
 version_id uuid NOT NULL REFERENCES quotation_versions(id), position integer NOT NULL,
 product_id uuid REFERENCES catalogue_products(id), description text NOT NULL, brand text NOT NULL DEFAULT '', model text NOT NULL DEFAULT '',
 specifications text NOT NULL DEFAULT '', quantity text NOT NULL, unit text NOT NULL, unit_price_paise bigint NOT NULL CHECK(unit_price_paise>=0),
 discount_paise bigint NOT NULL CHECK(discount_paise>=0), tax_rate text NOT NULL DEFAULT '', amounts jsonb NOT NULL,
 PRIMARY KEY(version_id,position)
);
```

Source line 62:

```sql
CREATE TABLE enquiry_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, enquiry_id uuid NOT NULL REFERENCES customer_enquiries(id),
 company_id uuid REFERENCES companies(id), actor_id uuid NOT NULL REFERENCES users(id), action text NOT NULL,
 customer_visible boolean NOT NULL DEFAULT true, version_id uuid REFERENCES quotation_versions(id), created_at timestamptz NOT NULL DEFAULT now()
);
```

Source line 67:

```sql
CREATE TABLE workflow_notifications (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), company_id uuid REFERENCES companies(id),
 enquiry_id uuid NOT NULL REFERENCES customer_enquiries(id), version_id uuid REFERENCES quotation_versions(id),
 message text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
```

Source line 72:

```sql
CREATE INDEX enquiries_customer_idx ON customer_enquiries(customer_id,created_at DESC,id);
```

Source line 73:

```sql
CREATE INDEX enquiry_filter_idx ON customer_enquiries(status,category_id,created_at DESC);
```

Source line 74:

```sql
CREATE INDEX recipients_company_idx ON enquiry_recipients(company_id,created_at DESC,enquiry_id);
```

Source line 75:

```sql
CREATE INDEX quotations_company_idx ON enquiry_quotations(company_id,enquiry_id);
```

Source line 76:

```sql
CREATE INDEX quotation_expiry_idx ON quotation_versions(valid_until,status) WHERE status='sent';
```

Source line 77:

```sql
CREATE INDEX quotation_enquiry_idx ON quotation_versions(enquiry_id,company_id,version DESC);
```

Source line 78:

```sql
CREATE INDEX quotation_company_status_idx ON quotation_versions(company_id,status,created_at DESC,id);
```

Source line 79:

```sql
CREATE INDEX enquiry_timeline_idx ON enquiry_events(enquiry_id,company_id,id DESC);
```

Source line 82:

```sql
CREATE INDEX workflow_notifications_user_idx ON workflow_notifications(user_id,company_id,created_at DESC);
```

### `server/db/migrations/006_operations.sql`

Source line 2:

```sql
ALTER TABLE quotation_versions ADD UNIQUE(id,company_id);
```

Source line 3:

```sql
CREATE TABLE company_contacts (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), user_id uuid REFERENCES users(id),
 kind text NOT NULL CHECK(kind IN ('individual','business')), name text NOT NULL, email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '',
 billing_address text NOT NULL DEFAULT '', service_address text NOT NULL DEFAULT '', revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,company_id)
);
```

Source line 9:

```sql
CREATE UNIQUE INDEX contact_user_unique ON company_contacts(company_id,user_id) WHERE user_id IS NOT NULL;
```

Source line 10:

```sql
CREATE UNIQUE INDEX contact_email_unique ON company_contacts(company_id,lower(email)) WHERE email<>'';
```

Source line 11:

```sql
CREATE UNIQUE INDEX contact_phone_unique ON company_contacts(company_id,phone) WHERE phone<>'';
```

Source line 12:

```sql
CREATE TABLE crm_leads (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), contact_id uuid NOT NULL,
 enquiry_id uuid, title text NOT NULL, source text NOT NULL, interest text NOT NULL, location text NOT NULL,
 assignee_id uuid REFERENCES users(id), stage text NOT NULL DEFAULT 'new' CHECK(stage IN ('new','contacted','qualified','opportunity','won','lost')),
 priority text NOT NULL CHECK(priority IN ('low','normal','high','urgent')), next_action text NOT NULL DEFAULT '', follow_up date,
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(contact_id,company_id) REFERENCES company_contacts(id,company_id),
 FOREIGN KEY(enquiry_id,company_id) REFERENCES enquiry_recipients(enquiry_id,company_id), UNIQUE(id,company_id), UNIQUE(company_id,enquiry_id)
);
```

Source line 21:

```sql
CREATE TABLE business_orders (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), contact_id uuid NOT NULL, quotation_id uuid REFERENCES quotation_versions(id),
 reference text NOT NULL, terms jsonb NOT NULL, total_paise bigint NOT NULL CHECK(total_paise BETWEEN 0 AND 100000000000),
 billing_address text NOT NULL, service_address text NOT NULL, expected_date date, owner_id uuid NOT NULL REFERENCES users(id),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','awaiting_confirmation','confirmed','processing','partially_fulfilled','fulfilled','cancelled')),
 acceptance_mode text NOT NULL CHECK(acceptance_mode IN ('in_app','external')), customer_confirmed_at timestamptz,
 agreement_reference text NOT NULL DEFAULT '', agreement_notes text NOT NULL DEFAULT '', confirmed_by uuid REFERENCES users(id), confirmed_at timestamptz,
 fulfilment_reference text NOT NULL DEFAULT '', revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(contact_id,company_id) REFERENCES company_contacts(id,company_id), FOREIGN KEY(quotation_id,company_id) REFERENCES quotation_versions(id,company_id), UNIQUE(id,company_id), UNIQUE(company_id,reference), UNIQUE(company_id,quotation_id),
 CHECK(status NOT IN ('confirmed','processing','partially_fulfilled','fulfilled') OR (confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL AND ((acceptance_mode='in_app' AND customer_confirmed_at IS NOT NULL) OR (acceptance_mode='external' AND agreement_reference<>''))))
);
```

Source line 32:

```sql
CREATE TABLE business_order_items (
 id uuid PRIMARY KEY, order_id uuid NOT NULL, company_id uuid NOT NULL, position integer NOT NULL, product_id uuid REFERENCES catalogue_products(id),
 description text NOT NULL, quantity_milli bigint NOT NULL CHECK(quantity_milli>0), unit text NOT NULL, snapshot jsonb NOT NULL,
 FOREIGN KEY(order_id,company_id) REFERENCES business_orders(id,company_id), UNIQUE(id,company_id), UNIQUE(id,order_id,company_id), UNIQUE(order_id,position)
);
```

Source line 147:

```sql
CREATE TABLE operations_idempotency (
 company_id uuid NOT NULL REFERENCES companies(id), operation_key uuid NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(company_id,operation_key)
);
```

Source line 150:

```sql
CREATE INDEX crm_company_stage ON crm_leads(company_id,stage,follow_up);
```

Source line 151:

```sql
CREATE INDEX contacts_company_name ON company_contacts(company_id,lower(name));
```

Source line 152:

```sql
CREATE INDEX orders_company_status ON business_orders(company_id,status,created_at DESC);
```

Source line 153:

```sql
CREATE INDEX orders_company_contact ON business_orders(company_id,contact_id,created_at DESC);
```

Source line 154:

```sql
CREATE INDEX leads_company_contact ON crm_leads(company_id,contact_id,created_at DESC);
```

### `server/db/migrations/008_commercial.sql`

Source line 80:

```sql
CREATE OR REPLACE VIEW marketplace_vendors AS
 SELECT c.id,b.public_name AS name,c.city,p.business_type,b.description,b.logo_url,b.primary_color,b.secondary_color,b.accent_color,
 b.welcome_text,b.public_email,b.public_phone,b.appearance,s.services,s.rooftop_available,s.service_areas,s.preferred_contact
 FROM companies c JOIN company_branding b ON b.company_id=c.id JOIN company_profiles p ON p.company_id=c.id JOIN company_business_profiles s ON s.company_id=c.id
 WHERE c.status='active' AND c.lifecycle='active' AND c.marketplace_status='approved' AND c.storefront_published
 AND commercial_public_allowed(c.id,'storefront')
 AND b.public_name<>'' AND b.description<>'' AND ((s.preferred_contact='email' AND b.public_email<>'') OR (s.preferred_contact='phone' AND b.public_phone<>''))
 AND EXISTS(SELECT 1 FROM company_reviews r WHERE r.company_id=c.id AND r.kind='marketplace' AND r.new_state='approved');
```

Source line 88:

```sql
CREATE OR REPLACE VIEW marketplace_offers AS
 SELECT o.id,o.company_id,o.product_id,o.distributor_sku,o.price_mode,o.price_paise,o.currency,o.price_unit,o.estimated,o.tax_mode,o.tax_rate,o.availability,
 o.stock_maintained,o.stock_quantity,o.minimum_order,o.coverage_labels,o.public_terms,o.updated_at
 FROM distributor_offers o JOIN marketplace_vendors v ON v.id=o.company_id JOIN marketplace_products p ON p.id=o.product_id
 WHERE o.published AND o.status='approved' AND o.approved_revision=o.revision AND o.approved_product_revision=p.revision
 AND commercial_public_allowed(o.company_id,'catalogue')
 AND o.coverage_labels <@ ARRAY(SELECT a.label FROM company_service_areas a WHERE a.company_id=o.company_id);
```

### `server/db/migrations/011_pro_network.sql`

Source line 11:

```sql
ALTER TABLE company_memberships ADD COLUMN staff_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(staff_details)='object');
```

Source line 12:

```sql
ALTER TABLE company_memberships ADD COLUMN staff_revision integer NOT NULL DEFAULT 1 CHECK(staff_revision>0);
```

Source line 13:

```sql
CREATE INDEX memberships_territory ON company_memberships(company_id,role_id,(staff_details->>'state'),(staff_details->>'city'));
```

### `server/db/migrations/013_release_accounts.sql`

Source line 2:

```sql
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
```

Source line 3:

```sql
ALTER TABLE sessions ADD COLUMN mfa_verified_at timestamptz;
```

### `server/db/migrations/016_sales_tools.sql`

Source line 1:

```sql
CREATE TABLE quotation_templates (
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),name text NOT NULL,
 quote jsonb NOT NULL,items jsonb NOT NULL,created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(company_id,name)
);
```

### `server/db/migrations/020_release_indexes.sql`

Source line 5:

```sql
CREATE INDEX private_quotation_templates ON quotation_templates(company_id,created_at DESC);
```

### `server/db/migrations/022_marketplace_discovery.sql`

Source line 2:

```sql
ALTER TABLE catalogue_categories ADD COLUMN IF NOT EXISTS discovery_key text UNIQUE;
```

Source line 3:

```sql
ALTER TABLE catalogue_categories ADD COLUMN IF NOT EXISTS discovery_category_id uuid REFERENCES catalogue_categories(id);
```

Source line 4:

```sql
ALTER TABLE catalogue_categories ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
```

Source line 5:

```sql
ALTER TABLE catalogue_categories ADD COLUMN IF NOT EXISTS localized_names jsonb NOT NULL DEFAULT '{}';
```

Source line 6:

```sql
ALTER TABLE catalogue_categories ADD COLUMN IF NOT EXISTS localized_descriptions jsonb NOT NULL DEFAULT '{}';
```

Source line 7:

```sql
ALTER TABLE catalogue_categories ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 100;
```

Source line 11:

```sql
ALTER TABLE catalogue_categories ADD CONSTRAINT category_discovery_metadata_valid CHECK(
   jsonb_typeof(localized_names)='object' AND jsonb_typeof(localized_descriptions)='object'
   AND display_order BETWEEN 0 AND 10000 AND length(description)<=300
   AND (discovery_category_id IS NULL OR discovery_category_id<>id));
```

### `server/db/migrations/023_people_sales_controls.sql`

Source line 2:

```sql
ALTER TABLE company_memberships ADD CONSTRAINT membership_company_identity UNIQUE(id,company_id);
```

Source line 3:

```sql
CREATE TABLE company_role_profiles (
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),name text NOT NULL,
 base_role text NOT NULL REFERENCES roles(id) CHECK(base_role IN ('sales','supervisor','field_engineer','inventory_manager','accounts','part_time_sales')),
 permissions text[] NOT NULL,discount_limit_bps integer CHECK(discount_limit_bps BETWEEN 0 AND 10000),
 active boolean NOT NULL DEFAULT true,revision integer NOT NULL DEFAULT 1,
 UNIQUE(id,company_id),UNIQUE(company_id,name)
);
```

Source line 16:

```sql
ALTER TABLE company_memberships ADD COLUMN role_profile_id uuid,
 ADD COLUMN team_id uuid,ADD COLUMN reporting_manager_id uuid,ADD COLUMN people_revision integer NOT NULL DEFAULT 1,
 ADD FOREIGN KEY(role_profile_id,company_id) REFERENCES company_role_profiles(id,company_id),
 ADD FOREIGN KEY(team_id,company_id) REFERENCES company_teams(id,company_id),
 ADD FOREIGN KEY(reporting_manager_id,company_id) REFERENCES company_memberships(id,company_id),
 ADD CHECK(reporting_manager_id IS NULL OR reporting_manager_id<>id),
 ADD CHECK(role_id<>'owner' OR role_profile_id IS NULL);
```

Source line 30:

```sql
CREATE TABLE company_sales_controls (
 company_id uuid PRIMARY KEY REFERENCES companies(id),revision integer NOT NULL DEFAULT 1,
 require_review boolean NOT NULL DEFAULT false,discount_limit_bps integer NOT NULL DEFAULT 10000 CHECK(discount_limit_bps BETWEEN 0 AND 10000),
 qualification_required boolean NOT NULL DEFAULT false,
 pipeline jsonb NOT NULL DEFAULT '[{"code":"new","label":"New","category":"new","next":["contacted","lost"]},{"code":"contacted","label":"Contacted","category":"contacted","next":["qualified","lost"]},{"code":"qualified","label":"Qualified","category":"qualified","next":["opportunity","lost"]},{"code":"opportunity","label":"Opportunity","category":"opportunity","next":["won","lost"]},{"code":"won","label":"Won","category":"won","next":[]},{"code":"lost","label":"Lost","category":"lost","next":["new"]}]'::jsonb
);
```

Source line 40:

```sql
ALTER TABLE crm_leads ADD COLUMN pipeline_step text NOT NULL DEFAULT 'new',
 ADD COLUMN qualification jsonb NOT NULL DEFAULT '{}',ADD COLUMN lost_reason text NOT NULL DEFAULT '';
```

Source line 43:

```sql
ALTER TABLE quotation_versions ADD COLUMN review_status text NOT NULL DEFAULT 'none' CHECK(review_status IN ('none','pending','approved','rejected')),
 ADD COLUMN approval_revision integer,ADD COLUMN reviewed_policy_revision integer,
 ADD COLUMN reviewer_id uuid REFERENCES users(id),ADD COLUMN approval_override boolean NOT NULL DEFAULT false;
```

Source line 46:

```sql
CREATE TABLE quotation_review_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),
 version_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES users(id),action text NOT NULL,
 quote_revision integer NOT NULL,policy_revision integer NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(version_id,company_id) REFERENCES quotation_versions(id,company_id)
);
```

Source line 56:

```sql
CREATE INDEX company_role_assignment ON company_memberships(company_id,role_profile_id);
```

Source line 59:

```sql
CREATE INDEX company_team_assignment ON company_memberships(company_id,team_id);
```

Source line 60:

```sql
CREATE INDEX lead_pipeline_step ON crm_leads(company_id,pipeline_step);
```

Source line 61:

```sql
CREATE INDEX quote_review_pending ON quotation_versions(company_id,review_status) WHERE status='draft';
```

Source line 62:

```sql
CREATE INDEX quote_review_history ON quotation_review_events(company_id,version_id,id DESC);
```

### `server/db/migrations/030_separate_account_channels.sql`

Source line 6:

```sql
ALTER TABLE users ADD COLUMN account_type text CHECK(account_type IN ('customer','business'));
```

Source line 10:

```sql
ALTER TABLE users DROP CONSTRAINT users_email_key;
```

Source line 11:

```sql
CREATE UNIQUE INDEX users_email_account_type ON users(email,coalesce(account_type,'legacy'));
```

### `server/db/migrations/032_verified_unique_email_signup.sql`

Source line 5:

```sql
CREATE UNIQUE INDEX users_email_global_ci ON users(lower(email));
```

### `server/db/migrations/033_solar_os_workforce.sql`

Source line 7:

```sql
ALTER TABLE company_role_profiles DROP CONSTRAINT company_role_profiles_base_role_check;
```

Source line 8:

```sql
ALTER TABLE company_role_profiles ADD CONSTRAINT company_role_profiles_base_role_check CHECK(base_role IN ('sales','supervisor','field_engineer','inventory_manager','accounts','auditor','part_time_sales'));
```

### `server/db/migrations/034_quotation_sources.sql`

Source line 2:

```sql
ALTER TABLE crm_leads ADD CONSTRAINT crm_lead_enquiry_identity UNIQUE(id,company_id,enquiry_id);
```

Source line 3:

```sql
ALTER TABLE quotation_versions ADD COLUMN source_lead_id uuid;
```

Source line 4:

```sql
ALTER TABLE quotation_versions ADD CONSTRAINT quotation_source_lead_tenant FOREIGN KEY(source_lead_id,company_id,enquiry_id) REFERENCES crm_leads(id,company_id,enquiry_id);
```

Source line 5:

```sql
ALTER TABLE distributor_offers ADD CONSTRAINT offer_product_tenant_identity UNIQUE(id,company_id,product_id);
```

Source line 6:

```sql
ALTER TABLE quotation_line_items ADD COLUMN company_id uuid;
```

Source line 8:

```sql
ALTER TABLE quotation_line_items ALTER COLUMN company_id SET NOT NULL;
```

Source line 9:

```sql
ALTER TABLE quotation_line_items ADD CONSTRAINT quotation_line_tenant FOREIGN KEY(version_id,company_id) REFERENCES quotation_versions(id,company_id);
```

Source line 10:

```sql
ALTER TABLE quotation_line_items ADD COLUMN offer_id uuid;
```

Source line 11:

```sql
ALTER TABLE quotation_line_items ADD COLUMN offer_revision integer;
```

Source line 12:

```sql
ALTER TABLE quotation_line_items ADD COLUMN product_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(product_snapshot)='object');
```

Source line 13:

```sql
ALTER TABLE quotation_line_items ADD COLUMN offer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(offer_snapshot)='object');
```

Source line 14:

```sql
ALTER TABLE quotation_line_items ADD CONSTRAINT quotation_offer_tenant FOREIGN KEY(offer_id,company_id,product_id) REFERENCES distributor_offers(id,company_id,product_id);
```

Source line 15:

```sql
ALTER TABLE quotation_line_items ADD CONSTRAINT quotation_offer_reference CHECK((offer_id IS NULL AND offer_revision IS NULL) OR (offer_id IS NOT NULL AND product_id IS NOT NULL AND offer_revision IS NOT NULL AND offer_revision>0));
```

Source line 16:

```sql
CREATE INDEX quotation_source_lead_idx ON quotation_versions(company_id,source_lead_id) WHERE source_lead_id IS NOT NULL;
```

Source line 17:

```sql
CREATE INDEX quotation_line_offer_idx ON quotation_line_items(company_id,offer_id) WHERE offer_id IS NOT NULL;
```

## Final preservation check

347 initial tracked/untracked non-ignored files fingerprinted: 0 modified, 0 removed. HEAD unchanged: true. The audit-generated report is the only new non-ignored project file. No application, dashboard, logo or existing handoff file was edited. Ignored initial/final inventories are audit evidence only. No tests were executed.
