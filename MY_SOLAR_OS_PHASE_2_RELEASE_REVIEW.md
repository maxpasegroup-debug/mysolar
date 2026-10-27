# MY Solar OS Phase 2 — migration 034 release safety review

26 October 2026. Decision: **BLOCKED — NOT READY for explicit production release approval.**

Local source and the retained test outputs support the Phase 2 implementation. They do not establish current production migration prerequisites, a recent recoverable production backup, or a safe rolling deployment. No production connection, database/backup creation or restoration, commit, push, deployment, configuration change or migration was performed in this review. No application code change was necessary from the inspected evidence.

## Repository and change inventory

Branch `main`, HEAD `a6ee999` (`Establish distributor Solar OS workspace and workforce foundation`), matching the locally stored `origin/main`. No fetch was performed; this does not establish remote freshness. Initial state: nine modified tracked files, seven untracked files, no staged files and no merge conflicts. All were preserved.

The sixteen files already present at review start are:

| File | Scope and attribution |
| --- | --- |
| `MY_SOLAR_OS_PHASE_1_REVIEW.md` | Existing Phase 1 review/evidence, not Phase 2 application implementation |
| `MY_SOLAR_OS_PHASE_2_PLAN.md` | Existing Phase 2 implementation plan |
| `MY_SOLAR_OS_PHASE_2_HANDOFF.md` | Existing Phase 2 handoff |
| `server/db/migrations/034_quotation_sources.sql` | Phase 2 provenance schema |
| `server/purchase/sources.js` | Source capture, own-company offers and qualification |
| `server/purchase/company.js` | Draft/create/edit/send and source endpoint |
| `server/purchase/service.js` | Shared source reads, customer privacy and audit metadata |
| `server/purchase/validation.js` | Validated optional offer references |
| `server/operations/orders.js` | Agreed-order source capture and quotation snapshot preservation |
| `src/purchase.js` | Distributor quotation editor and source picker |
| `src/operations.js` | Enquiry-linked lead quotation action |
| `src/release-tools.js` | Inline template loading/error handling |
| `tests/os-phase2-sales.integration.test.mjs` | Source, qualification, privacy and order tests |
| `tests/os-phase2-sources-upgrade.test.mjs` | Pre-034 upgrade and data integrity |
| `tests/people-sales.integration.test.mjs` | Explicitly reopen fixture lead before qualification-controlled quotes |
| `scripts/browser-check.mjs` | Mixed: Phase 1 wait correction plus Phase 2 quotation browser coverage |

Attribution is supported by the inspected diffs and handoffs, not separate Phase 2 commits. The Phase 2 handoff says its initial checkout was clean at this HEAD. This review cannot independently reconstruct every earlier editing session. All sixteen changes were pre-existing to this review.

Only this report was added to reviewable project files. Ignored evidence was written under `.verification/`: `os-phase2-release-static.log`, `os-phase2-release-browser.log`, `os-phase2-release-targeted.log`, and `os-phase2-release-inventory.json`. The inventory records SHA-256 hashes of the sixteen starting files and the current manifest. A first inventory attempt hit Git subprocess's default output buffer limit on the logo; rerunning with a 16 MiB limit succeeded. This was an evidence-script failure, not an application defect.

Fresh comparison against HEAD confirms that `src/customer-dashboard.js`, `customer-dashboard.css`, `src/customer-locale.js`, `src/solar-marketplace.js` and `assets/my-solar-solutions-logo.png` remain unchanged (normalized text comparison; exact PNG bytes).

## Migration behavior and prerequisites

Current manifest: **34 entries**, including the generated role catalogue entry. Migration 034 SHA-256:

`9af3672955fc6573dd9c1df2ac79c55895b4b9003bbde7b55beb7ca9bf59f1f0`

The SQL:

1. Adds unique `crm_lead_enquiry_identity(id,company_id,enquiry_id)` and nullable `quotation_versions.source_lead_id`; composite FK binds the optional lead to the same company and enquiry.
2. Adds unique `offer_product_tenant_identity(id,company_id,product_id)` on seller offers.
3. Adds `quotation_line_items.company_id`, backfills it only from its version parent, then requires NOT NULL and a `(version_id,company_id)` FK to quotation versions.
4. Adds optional `offer_id` and `offer_revision`; the company/product-qualified offer FK and paired-reference check require a product and positive revision whenever an offer is selected.
5. Adds NOT NULL JSON-object `product_snapshot` and `offer_snapshot`, default `{}`. Existing facts, prices, lead IDs and seller availability are not invented. These checks establish object shape, not snapshot authenticity; trusted application capture remains necessary.
6. Adds partial indexes on `(company_id,source_lead_id)` and `(company_id,offer_id)` when the optional reference exists. Unique constraints also create supporting unique indexes.

Constraints are added normally, not `NOT VALID`, so existing data is checked immediately. A missing version parent would leave an unfilled company and fail NOT NULL; conflicting data or missing prior schema also fails. Existing referenced IDs/keys must satisfy the complete preceding manifest, especially quotations/CRM and marketplace tenant relationships. Production prerequisites are **NOT VERIFIED**: no production schema, counts or ledger was queried.

`server/db/migrations.js` applies each missing migration inside BEGIN/COMMIT, including its checksum ledger insertion. An error runs ROLLBACK; 034 changes/backfill/ledger insertion roll back together. Earlier committed migrations remain applied if a later migration fails. Advisory locks serialize cooperating runners. The CLI in `server/db/migrate.js` adds an outer lock and reports failure with a nonzero exit code.

The supported runner checks previously applied checksums and skips an already applied matching migration. Thus a supported-runner retry is safe after resolving the actual failure. Re-running the raw SQL is not idempotent. Do not manually mark a migration applied or alter historical SQL/checksums.

Large backfills, FK validation and unique index creation need table locks and can take time. The pool sets a 15-second statement timeout; production table sizes, competing transactions and actual migration duration are unmeasured. A timeout should roll back 034, not justify disabling checks. Rehearse representative scale under separate permission before scheduling the outage.

There is no reviewed down migration. Dropping the added fields/constraints would destroy or detach recorded lead, seller and product provenance. Dropping columns is not an acceptable routine rollback. Prefer a compatible roll-forward; a recovery restore requires separate authorization, an isolated verification target and explicit handling of transactions since the recovery point.

## Quotation and order writer inventory

Repository search covered `server/`, `scripts/`, API routes, workers and SIA entry points. Test-only direct SQL is separated from application writers.

| Entry point | Verified source behavior / compatibility |
| --- | --- |
| POST `/api/companies/current/enquiries/:id/quotations` | Shared `insertItems` supplies company, product/offer references and trusted snapshots; derives optional linked lead; enforces qualification policy, received-enquiry scope and revision rules. Creates a private draft only. |
| PUT `/api/companies/current/quotations/:id` | Same source resolver; reads previous captured items before replacement, keeps allowed historical snapshots, recalculates/validates input, rechecks qualification and resets review. Runs in the company transaction. |
| POST `/api/companies/current/quotations/:id/actions` | Send rechecks qualification, validity, publication, review and draft state; captures lead if not already stored. Withdraw changes status and preference only; does not rewrite source facts. |
| Review/approval (`server/purchase/review.js`) | Changes review metadata/revisions, with existing permissions/policy. Does not insert or replace lines. |
| Customer quotation actions (`server/purchase/customer.js`) | Ownership-scoped view/message/request updates only. Cannot create drafts, choose trusted sources or approve company operations. |
| POST `/api/companies/current/operations/orders`, issued quotation | Reads source-bearing items through `purchase/service.js`; retains them in immutable order terms and item snapshots. `business_orders.quotation_id` preserves lineage to its version and hence the stored lead. The internal lead ID is deliberately absent from customer quote serialization. |
| Same endpoint, agreed manual order | Uses the source resolver for explicitly chosen actual product/own-offer sources; no fictitious enquiry/lead is manufactured. Has its own authorization/agreement requirements, not a lead-based quotation exemption. |
| Quotation templates (`server/sales-tools.js`) | Saves a template, not a quotation. Subsequent quotation creation goes through the validated quotation endpoints; caller snapshot JSON is not trusted. |
| SIA, reminder/mail/monitor workers, admin scripts | No additional direct quotation-version/line INSERT writer was found. SIA draft proposals route to existing human workflows; reminder workers send/update workflow delivery records rather than replacing quotation lines. |
| Tests | The upgrade test deliberately uses the historical pre-034 line shape before applying 034. This is not a production writer. Other fixtures are not alternate live entry points. |

`withCompany` derives membership/company/permissions from the authenticated session, locks the company row (`FOR UPDATE OF c`) and preserves commercial guards. `operations/core.js:once` stores a payload fingerprint and result in the same transaction; mismatched replay fails. Orders additionally check the quotation thread, use company/version and company/reference uniqueness, and preserve explicit customer/external confirmation. Existing PostgreSQL log evidence covers same-key concurrent retries, competing order keys, source preservation and confirmation; this review did not rerun those database cases.

Source capture uses allowlisted published product/offer projections, own-company offer ID/product/revision checks, row locks, and INR/unit validation. Prior genuine captured snapshots can survive listing changes without claiming current stock. Caller-supplied trusted JSON is rejected by input validation. Customer serializers remove private lead/review fields. No source price-floor or technical verification guarantee is introduced.

## Compatibility and deployment strategy

**A normal rolling deployment is unsafe.** The checked-in `railway.json` runs `npm run db:migrate` before candidate activation, while old replicas may still serve traffic:

- Old quotation create/edit code omits the new mandatory line `company_id` and fails after 034.
- Old order code can read only the former item projection and omit newly captured provenance when creating orders.
- New code reads columns that do not exist before 034.
- Old `/readyz` only checks its own expected manifest entries; it does not reject additional migrations. Therefore an old process may still look ready after 034. Health gating is not a write fence.

Migration and code release can be separate operator steps only inside a verified maintenance/write-fenced interval. They cannot be independent availability-preserving rollouts in the current design. No compatibility bridge, maintenance control or remote traffic fence was implemented or claimed by this review.

After the blockers below close and a separate release is approved:

1. Identify exact deployment/database targets, reviewed immutable artifact, prior artifact and worker versions, release owner and recovery owner. Privately verify effective Railway overrides; source configuration alone is insufficient.
2. Establish a recent verified recovery point covering the actual target database/schema and required encryption/file dependencies. Record recovery timestamp and demonstrated restore duration.
3. Fence public writes and drain **all** old web instances, in-flight requests and any integrations able to create quotes/orders. Pause relevant workers and prevent old-version automatic restarts. Do not use `/readyz` as the fence. If no proven selective fence exists, plan full maintenance downtime.
4. Inside that fence, invoke **only** `npm run db:migrate` through the approved deployment mechanism for the exact reviewed artifact. Avoid an additional unsupervised migration job. Capture safe applied-entry/exit evidence and privately compare ledger/checksums, constraints and legacy-row integrity.
5. Start only matching new web/worker versions. Verify `/healthz` and `/readyz`, then authorized quotation create/edit/send, captured source integrity, qualification rejection, customer privacy, quote-to-order lineage, replay/concurrency and confirmation. Restore traffic only after acceptance; supervise relevant workers afterward.
6. If 034 fails: keep the fence, check whether its ledger entry is absent and changes rolled back, identify the safe error/lock/timeout cause, and use the supported runner for a reviewed retry. Earlier migrations may have committed. If 034 succeeded but the candidate fails: retain the fence and use a schema-compatible forward fix. Do not automatically reactivate the old writer or drop the new fields. Any restore/cutover is a separate authorized recovery decision.

## Backup and recovery evidence

| Question | Evidence and decision |
| --- | --- |
| Recent production backup? | **NOT VERIFIED.** No current provider backup inventory/log or production recovery point was supplied or queried. |
| Correct database/schema coverage? | **NOT VERIFIED for production.** Historical Phase 11 documents a staging snapshot and eleven-entry migration history on 18 October, not today's target through 033/034. |
| Documented procedures? | **YES.** `ROOT_DEPLOYMENT.md` and `RELEASE_OPERATIONS_RUNBOOK.md` document approved runner, compatible rollback and separately authorized restore. Older `RAILWAY_DEPLOYMENT.md`/`OPERATIONS_RUNBOOK.md` are marked historical and must not be used as current staging tooling. |
| Tested restore? | **Historical/local evidence only.** `PHASE_11_STAGING_ACCEPTANCE_HANDOFF.md` records an actual staging restore. The retained 411-test log includes `disposable database backup restores migration history and fictional records`; its test uses pg_dump/pg_restore against a separate disposable target. Neither proves today's production backup. No restore was performed here. |
| Recovery point/time known? | Historical staging snapshot timestamp is documented; current production recovery point, current restore duration and accepted RPO/RTO are **unknown**. The historical report explicitly makes no RPO/RTO guarantee. |
| Enough to authorize 034? | **NO.** Require current target-specific backup status, scope, retention/access, verified isolated restore evidence, recovery ownership and acceptable data-loss/downtime bounds. Do not overwrite live data to obtain that evidence. |

## Checks and actual outcomes

| Evidence | Actual result / limits |
| --- | --- |
| Existing `.verification/os-phase2-postgres.log` inspected | `tests 411`, `pass 411`, `fail 0`, `skipped 0`; includes 033-to-034 upgrade preserving every old version/line field, parent-derived tenant, empty legacy snapshots, checksum/repeat checks, source/qualification/privacy/order cases, and fictional restore. This is retained real database evidence, **not a newly executed database run**. No original complete source hash manifest binds this old log to every current byte. |
| Existing final browser/static logs inspected | 955/0 and 1333/0, matching handoff. An older `os-phase2-focused-final.log` has 12 passed/1 failed; it is superseded by later full-suite results and is not relabelled a pass. |
| `node scripts/check.mjs` | Newly executed: **1333 passed, 0 failed**. Static/syntax/assets validation, not database verification. |
| `node scripts/browser-check.mjs` | Newly executed: **955 passed, 0 failed**, including no uncaught exceptions. Local browser plus fictional/intercepted responses; helper replaces database settings with a non-listening loopback test target and clears email credentials. No database/production business operations performed. |
| `node --test tests/purchase.test.mjs tests/migrations.test.mjs tests/os-phase2-sales.integration.test.mjs tests/os-phase2-sources-upgrade.test.mjs` with TEST_DATABASE_URL unset | Newly executed: **13 tests; 11 passed, 0 failed, 2 skipped**. The two integration scenarios were skipped; none is counted as a new PostgreSQL pass. |
| Fresh disposable migration/upgrade/failure rehearsal | **BLOCKED in this review** by the explicit prohibition on creating/restoring databases. The normal local runner creates a database; it was not invoked. No isolated existing approved target was supplied. Failure-midway rollback is confirmed from runner code, not newly fault-injected here. |
| `git diff --check` | Passed; only Git CRLF notices. No staged files. |
| Current source inventory / protected files | Recorded successfully in `.verification/os-phase2-release-inventory.json`; protected files unchanged. |

## Required evidence to close the release gate

1. Explicit permission for a fresh isolated database rehearsal (including failed-034 rollback/retry), or an identified existing disposable target suitable for the supported tests. Do not infer permission for a backup restore.
2. Target-specific production migration/checksum/schema prerequisite evidence, without customer data or secret disclosure.
3. Recent target-specific backup and verified recovery evidence with agreed RPO/RTO and named owner.
4. Proven maintenance/write-fence/drain procedure and effective Railway pre-deploy/readiness/replica/worker configuration, plus a compatible failure plan. Do not push the auto-deploy branch before these are established.

**Recommendation: NOT READY.** Local visual/static checks pass and historical PostgreSQL evidence is present; production release approval remains blocked by the four evidence requirements above. No commit/push/deployment commands were run or recommended for execution during this review.
