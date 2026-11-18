# Locality matching release readiness — 18 November 2026

## Final production safety check — latest results

**Overall NO-GO.** Here FAIL/BLOCKED means the prerequisite is not satisfied; it does not imply an observed production defect. No production mutation, import, coverage change, live quotation, deployment, commit or push occurred. Local changes are this report and deterministic regression coverage in `tests/locality-coverage.integration.test.mjs`.

| Requirement | Result | Evidence / remaining action |
|---|---|---|
| 1. Raw production 051/checksum verification | FAIL — BLOCKED | Same successful deployment `01230676-48a5-45a1-9fcb-7cd30842b460`, SHA `813e44b...`, and live ready response confirmed. These establish application-level manifest compatibility, but raw database/service-linked checksum evidence is unavailable. Operator must run the read-only snapshot query below. |
| 2. Current production backup plus disposable restore | FAIL — BLOCKED | No verified production backup identifier, timestamp, archive or restore access. No production-data backup was downloaded or restored. Synthetic migration tests are not a production restore drill. An authorised operator must verify a current backup and restore it into a separately approved isolated environment with email/billing/workers/network delivery disabled and production credentials removed. Keep restored personal data restricted; record aggregate checks only. |
| 3. Tested 051-compatible application rollback | FAIL — BLOCKED | No independently reviewed fallback artifact available. Current-code migration repeat/preservation passes, which does not prove rollback. Older pre-051 artifact is unsafe. A compatible fallback must preserve 051/history and strict eligibility; test it against a disposable migrated database before naming it as a rollback target. No code rollback was deployed. |
| 4. Simultaneous coverage withdrawal and final routing | PASS — LOCAL | New deterministic two-connection tests observe actual PostgreSQL blocking via `pg_blocking_pids`: uncommitted coverage deletion blocks real final HTTP submission, then commits and submission returns 409; final routing's company lock blocks the actual owner HTTP coverage-save endpoint until routing commits, after which the old locality fails; shared reference lock blocks the operator's audited deactivation until routing commits, after which submission returns 409. Routing-first uses the actual `eligibleRecipients` server function inside a real transaction, not a mocked HTTP response; it does not create an enquiry in that branch. |
| 5. Safe reference rollback/deactivation | FAIL — PARTIAL | Audited locality deactivation and subsequent routing rejection pass, including overlapping routing. Full postal rollback remains unsupported by existing API: postal import always sets active=true and offers no audited deactivation. Also inspect before-images/dependencies before restoring an existing shared locality. No direct SQL deletion or unaudited workaround is approved. |
| 6. Existing independent operators identified | FAIL — BLOCKED | Existing platform-admin accounts cannot be enumerated through available public access. Required: active user, existing platform_admin grant, catalogue.manage, valid session and privileged protection; nominate an independent reviewer with no target creator/membership conflict. No role grant performed. |
| 7. Proposed payload accuracy and execution readiness | FAIL — PARTIAL | Official directory and owner confirmation support the prepared Kerala/Kannur/670307 and Payyanur reference payloads, bounded to the named locality/PIN; geographic boundaries are not modeled. Payloads below remain unchanged and accurate for that stated scope. Execution readiness awaits 1,2,3,5,6 and before-images. |

Fresh local evidence `.verification/final-production-safety-db.log`: **10 tests, 10 passed, 0 failed, 0 skipped**, new loopback-only PostgreSQL cluster stopped afterward. Includes 051 populated-record preservation and fictional customer/distributor quotation journey. `.verification/final-production-safety-lint.log`: **1,882 checks passed, 0 failed**. Initial sandbox run could not launch Node syntax subprocesses; the permitted rerun passed. `git diff --check` passed. These results do not constitute production acceptance or a backup/restore drill. New tests are uncommitted and undeployed.

Access investigation: existing Railway CLI can read deployment metadata and registered public-key presence, but SSH attempt returned “No SSH keys found in your SSH agent or ~/.ssh/”; `ssh-add -l` found no agent. No key was generated, added or exposed. Railway metadata access alone is not database or backup access. Required operator action is to use the owner's already authorised production PostgreSQL viewer/session for the read-only queries, and an approved internal backup/operator host for the restore drill; do not change production networking or credentials just to unblock this check.

To identify eligible existing reviewers without retrieving hashes, tokens, contact details or credentials, an authorised operator can execute the following in the positively identified production database. Returned UUIDs identify accounts; owner must map the chosen UUID to a trusted human privately and explicitly nominate them. Query does not grant privileges or prove session/MFA readiness.

```sql
BEGIN READ ONLY;
SELECT u.id AS operator_user_id,u.status,g.role_id,
 EXISTS(SELECT 1 FROM role_permissions rp WHERE rp.role_id=g.role_id AND rp.permission_id='catalogue.manage') AS catalogue_manage,
 (SELECT count(*) FROM company_memberships m WHERE m.user_id=u.id AND m.company_id='821518ce-91b6-8aa5-a7ff-7ca5bb751c90' AND m.status<>'removed') AS target_affiliations,
 (SELECT count(*) FROM companies c WHERE c.id='821518ce-91b6-8aa5-a7ff-7ca5bb751c90' AND c.created_by=u.id) AS created_target
FROM platform_admin_grants g JOIN users u ON u.id=g.user_id
WHERE u.status='active' AND g.role_id='platform_admin';
ROLLBACK;
```

No final production execution approval is requested while these prerequisites fail. **Next exact operator action:** run the existing read-only migration/reference snapshot query in this package plus the operator eligibility query above in the verified production viewer and return only non-sensitive results. Expected migration checksum is recorded below. Separately supply the backup identifier/restore evidence and tested compatible rollback artifact. Then a final two-import approval can be issued; business coverage/publication remain separate permissions. The earlier commercial baseline failures also remain unresolved and require separate disposition; concurrency tests do not waive them.

## Final postal-reference approval package — fresh check 09:30 UTC

**NO-GO for import execution until the operator, before-images, backup and rollback checks below are completed.** No imports, company changes or deployment were executed in preparing this package. The owner has now confirmed that Shamin&Company serves Payyanur town. That is business evidence, separate from independent postal review.

Fresh evidence supersedes the earlier deployment-unknown statement below: Railway project mysolar / production / web service `b27efca8-cfe2-4a3c-9f8e-57f9f255408a` reports successful deployment `01230676-48a5-45a1-9fcb-7cd30842b460`, created 2026-11-18 09:20:51 UTC, repository `maxpasegroup-debug/mysolar`, main, SHA `813e44b250856073d7308a893dabefd9ae5bce32`. Metadata specifies one replica, Node 22.23.4, `npm start`, pre-deploy `npm run db:migrate`, readiness `/readyz`. This deployment already existed and was not triggered by this review.

At 09:30:49–50 UTC live GET `/readyz` returned ready, postal GET returned `location:null`, and locality GET for Kerala/Kannur/670307 returned `items:[]`. The deployed revision's readiness checks the full installed migration manifest against its source manifest, which includes 051. Together these provide strong application-level evidence that 051 is installed and compatible. A raw production catalog/checksum snapshot and production database-service linkage remain to be independently captured; no private database connection was available in this review. Public absence does not distinguish absent rows from inactive ones.

Official source checked afresh: https://cee.kerala.gov.in/pgmonline2020/public/pdf/postoffices.pdf page 12, row 515, explicitly lists PAYYANUR / KANNUR / 670307. `Payyanur` preserves that spelling with title case; the matching key is `payyanur`. This historical government post-office directory establishes the name/postal association, not a town boundary or current delivery guarantee for every street. Keep the source copy and SHA256 in the independent review record. Do not silently add the different spelling `Payyannur`: current normalization changes case/whitespace, not spelling aliases.

**Representation limit:** Named locality can represent the exact reviewed `Payyanur + 670307` selection. It will not match Kokkanisseri or another separately named locality solely because its PIN is 670307. It also cannot prove geographic town membership, handle neighbourhood-to-town hierarchy, or cover town addresses under other PINs through this one entry. Approval must acknowledge this label-and-PIN scope; broader street-boundary guarantees require a separately reviewed product/data model change. No whole-PIN coverage is authorised by the business confirmation.

### Independent operator

No particular human operator has been identified or verified from authorised production account evidence. Do not assume the owner's account is independent. Owner must nominate an existing active `platform_admin` with `catalogue.manage`, valid session and required privileged/MFA protection. For independence, verify the nominated operator did not create Shamin&Company and has no non-removed membership. Reference import endpoints enforce role/permission/privileged authentication but do NOT enforce a second independent reviewer or company conflict checks themselves; independent review here is an explicit operating procedure. Later company approval independently enforces its existing creator/membership restrictions. Do not grant new privileges as part of this package.

### Final requests, in order — NOT EXECUTED

Use the nominated operator's private authenticated session and existing CSRF mechanism. Do not put cookies/tokens in command history or reports. Re-imports are UPSERTs and update review metadata; check the snapshot before deciding whether either request is necessary.

`POST https://mysolar.solutions/api/platform/locations/import`

```json
{"rows":[{"pin":"670307","state":"Kerala","district":"Kannur"}],"source":"https://cee.kerala.gov.in/pgmonline2020/public/pdf/postoffices.pdf","reason":"Independent review of Kerala Government postal directory page 12 row 515: Payyanur, Kannur, PIN 670307. Geographic reference only; no company coverage change."}
```

Expected success: HTTP 200, imported 1; active postal row with canonical fields, normalized keys and nominated reviewer. Only then:

`POST https://mysolar.solutions/api/platform/localities/import`

```json
{"rows":[{"pin":"670307","name":"Payyanur","active":true}],"source":"https://cee.kerala.gov.in/pgmonline2020/public/pdf/postoffices.pdf","reason":"Independent review of Kerala Government postal directory page 12 row 515: Payyanur locality/postal association 670307. Named locality only; no whole-PIN or company coverage approval."}
```

Expected success: HTTP 200, imported 1, one active `payyanur` key with stable ID, source and reviewer. Requests are individually transactional, not one atomic pair. If postal succeeds and locality fails, stop and inspect; do not claim completion or automatically undo legitimate postal data.

### Required before-image and operator checks

Authorised operator must confirm correct Railway production database service `058536fc-092b-4288-a48f-cb9cf8baae7d` privately before executing read-only SQL. Save restricted, timestamped output of the following, including zero rows. Substitute only the nominated operator UUID; no passwords/hashes are queried.

```sql
BEGIN READ ONLY;
SELECT current_database(),current_schema(),current_setting('server_version');
SELECT name,checksum FROM schema_migrations WHERE name='051_reviewed_locality_coverage.sql';
SELECT to_regclass('postal_localities');
SELECT column_name,data_type,is_nullable FROM information_schema.columns
 WHERE table_schema=current_schema() AND table_name='company_service_areas' AND column_name='locality_reference_id';
SELECT * FROM postal_locations WHERE pin='670307';
SELECT * FROM postal_localities WHERE pin='670307' AND locality_key='payyanur';
SELECT scope,label,state,district,pin,locality,locality_reference_id
 FROM company_service_areas WHERE company_id='821518ce-91b6-8aa5-a7ff-7ca5bb751c90';
SELECT id,revision,lifecycle,marketplace_status,storefront_published
 FROM companies WHERE id='821518ce-91b6-8aa5-a7ff-7ca5bb751c90';
SELECT coalesce(max(id),0) AS audit_high_water_mark FROM audit_events;
SELECT u.status,g.role_id,
 EXISTS(SELECT 1 FROM role_permissions rp WHERE rp.role_id=g.role_id AND rp.permission_id='catalogue.manage') AS catalogue_manage,
 (SELECT count(*) FROM company_memberships m WHERE m.user_id=u.id AND m.company_id='821518ce-91b6-8aa5-a7ff-7ca5bb751c90' AND m.status<>'removed') AS affiliations,
 (SELECT count(*) FROM companies c WHERE c.id='821518ce-91b6-8aa5-a7ff-7ca5bb751c90' AND c.created_by=u.id) AS created_target
 FROM users u LEFT JOIN platform_admin_grants g ON g.user_id=u.id WHERE u.id='<NOMINATED_OPERATOR_UUID>'::uuid;
ROLLBACK;
```

Expected local 051 SHA256 is `68a8b9a712149f1b922fc2dcab75e8c3be4c13167de485982927644f56e677b6`. Stop on mismatch, missing column/table, wrong identity, wrong existing tuple, unconfirmed operator or unexpected dependencies. Raw source/reference snapshot includes reviewer IDs only and no credentials. Capture dependent service-area counts for any existing reference ID; do not overwrite a currently active conflicting tuple under this approval.

### Post-import checks

Repeat the two reference SELECTs and public GETs; expect Kerala/Kannur/670307 and a selectable Payyanur with stable reviewed ID. Compare company revision/status and coverage before/after: imports must not change them. Reference imports alone must leave legacy unbound coverage ineligible. Confirm separate audit events after the saved high-water mark:

```sql
BEGIN READ ONLY;
SELECT id,actor_user_id,action,metadata,created_at FROM audit_events
 WHERE id > <SAVED_AUDIT_HIGH_WATER_MARK>
 AND action IN ('catalogue.postal_mappings_reviewed','catalogue.localities_reviewed')
 ORDER BY id;
ROLLBACK;
```

Match actor to nominated operator, reason/source, postal imported count and exact locality row. Postal audit metadata records count/source/reason, not a complete postal before-image; preserve the external snapshot. Only later, separately authorised business coverage save and independent marketplace review can enable Shamin delivery. No live enquiry/quotation is included in this approval.

### Rollback and remaining blockers

Preserve all IDs, reviews and audit events. If a NEW locality is wrong, the audited locality import can deactivate that exact `{pin:"670307",name:"Payyanur",active:false}` with a separately approved reason; do not delete it. This suppresses that locality in selectors/routing, including future use by other companies. If an existing entry was changed, choose compensating action from its actual before-image; re-import changes review metadata and does not erase history. Do not deactivate a previously valid shared entry blindly.

The postal import API always activates its row and exposes no audited postal-deactivation action. Therefore exact reversal of a newly added postal mapping to absence/inactive status has no verified existing operator API. Do not use direct SQL DELETE or invent a rollback command. A reviewed compensating postal workflow or explicitly approved safe retention of the true postal mapping must be settled before import. Deactivating Payyanur alone is not a rollback of the postal row and can leave broad-scope matching affected by the new postal mapping.

Other unresolved blockers: fresh backup and disposable restore proof; tested application rollback compatible with 051 (old pre-051 release unsafe); deterministic simultaneous submission/reference-withdrawal and publication-withdrawal tests; baseline commercial failures require separate fixture fix or documented scope/risk acceptance. Previous local focused test run: 9 passed, 0 failed, 0 skipped, isolated PostgreSQL; no concurrent lock-interleaving acceptance was claimed. Production data-import rollback and application rollback are separate concerns.

### Exact approval text — only after prerequisite evidence is complete

“I approve the two exact reference-data POST requests above in MY SOLAR production, executed once as needed by [NAMED VERIFIED INDEPENDENT OPERATOR / USER ID], after the pre-import snapshots, backup/restore evidence and agreed compensating rollback are verified. I accept Payyanur as the reviewed locality label under PIN 670307, without whole-PIN or geographic-boundary inference. This authorises no company coverage changes, publication approvals, deployment, role grants or live customer transactions.”

**Next owner action now:** nominate that existing independent operator. Production execution remains NO-GO until their eligibility, snapshots and recovery checks are documented; business confirmation alone is not execution approval.

**Decision: NO-GO for production release.** Local functional evidence is positive; operational rollback, production preflight and approved reference/business data are incomplete. This review executed no production queries, mutations, deployment, migration, commit or push. Only this report was added. Existing screenshots and disposable-database logs were inspected, not rerun.

## Code review

**Verdict: NEEDS DISCUSSION. Confidence: medium.** No confirmed authentication bypass or final-submission eligibility bypass was found in the reviewed paths. Release blockers below prevent approval.

Current local branch HEAD is `813e44b250856073d7308a893dabefd9ae5bce32` (`feat: implement reviewed locality coverage and enhance locality selection`). Working tree was clean at review start. This commit already existed; this review did not create it. Earlier implementation is `ee8e8c66f8a8c616c79f07484f5a60e8de4fac8e`. Current deployed revision and Railway source-branch linkage have NOT been freshly verified. Do not equate local HEAD with live code.

## Migration 051

`server/db/migrations/051_reviewed_locality_coverage.sql` creates `postal_localities`, its unique PIN/locality key and active index, and adds nullable `company_service_areas.locality_reference_id` referencing that table. References also enforce existing postal PIN and reviewer user identity. It neither inserts reference data nor updates existing company declarations, approvals, users, enquiries or quotations. Existing service rows receive NULL references, not inferred approval.

PostgreSQL 16.16 disposable evidence: migration application, second application through the manifest runner, and populated pre-051 preservation test passed. Historical user/company/review/enquiry/recipient/quotation snapshots were unchanged. PostgreSQL constructs are conventional and add no extension dependency. Production version, privileges, table sizes, search path and lock pressure remain unverified.

The runner applies each migration transactionally, records its checksum, and uses a database/schema advisory lock. Failure rolls back that migration. Repeating through the runner skips an identical recorded migration; running the raw SQL twice is NOT supported. Do not edit checksummed migrations after application.

Adding the column can take an ACCESS EXCLUSIVE table lock. Additive does not mean lock-free. Measure production table sizes and active transactions; rehearse on a representative disposable restore and choose an approved quiet window and bounded lock/statement timeouts. The checked-in pre-deploy command has no explicit lock timeout. See [PostgreSQL ALTER TABLE documentation](https://www.postgresql.org/docs/16/sql-altertable.html).

**Rollback warning:** rolling Railway back to pre-051 code is unsafe. Its migration manifest rejects the new migration entry; its older matching rules also cannot safely interpret newly configured locality rows. No tested schema-compatible rollback artifact is currently evidenced. Do not drop 051 tables/column, remove migration history, or restore the whole production database merely to roll back application code.

## Exact reference and business data required

The postal tuple to independently review is `670307 / Kerala / Kannur`, normalized keys `kerala / kannur`. [India Post](https://www.indiapost.gov.in/sites/PostalCircles/Kerala/Lists/PostOffices/KL_Pincode_12Nov2020.pdf) lists Payyanur SO with this PIN, and [Payyannur Block Panchayat](https://payyannurblockpanchayat.lsgkerala.gov.in/en/page/address) corroborates the postal address and district. These establish postal association, not Shamin's service commitment or an exhaustive locality boundary dataset.

**The exact selected locality names are NOT yet known or approved.** Before release, obtain the distributor's actual served locality list within Payyanur, independently establish each locality/PIN association, resolve spelling and boundary ambiguity, and obtain an independent operator review. Do not import fictional test names, treat post-office names as complete neighbourhood coverage, or use a broad `Payyanur` entry if the business only serves particular smaller places.

Required records, separately approved:

1. Postal mapping: `{pin:"670307",state:"Kerala",district:"Kannur"}`, with documented source and review reason, through existing `POST /api/platform/locations/import`.
2. One `postal_localities` entry per independently reviewed real locality: PIN, canonical name, normalized locality key, source reference, active flag, reviewer and review timestamp. Existing `POST /api/platform/localities/import` accepts `{rows:[{pin,name,active}],source,reason}` under `catalogue.manage`. This publishes geographic reference choices, not business coverage.
3. One explicit company declaration per actually served locality: `scope=locality`, State Kerala, District Kannur, PIN 670307, canonical locality, meaningful unique coverage label; the owner-save endpoint binds the reviewed reference ID. Never choose Exact PIN or Whole district merely to remove the mismatch. Preserve all other legitimately declared areas when submitting the complete area list.
4. Independent marketplace review and publication of the changed company revision. Existing conflict-of-interest checks remain applicable. Reference-data review is not a substitute for business confirmation.

The last saved public diagnostic, `.verification/quotation-district-recheck-public.json`, is dated 2026-11-18 08:17:04 UTC: company `821518ce-91b6-8aa5-a7ff-7ca5bb751c90`, Shamin&Company, locality Payyanur, state kerala, district kannur, empty coverage PIN. This is historical public projection evidence, NOT a fresh raw production database lookup. Migration 051 leaves this row's new reference NULL. `areaMatch` requires full State/District/PIN/locality plus active bound reference for Named locality. Consequently that legacy declaration remains ineligible even if a reference entry is imported; explicit confirmed owner configuration is still required. Fresh production status/coverage must be read before any release approval.

Saving coverage uses the existing replace-list operation: operational area IDs are regenerated, company revision advances, storefront is unpublished and marketplace review is renewed. Preserve a complete before-image and offer coverage-label associations. Historical company identity, approvals and quotation records are not deleted by this operation. No such save was executed in this review.

## Server enforcement and concurrency

`server/marketplace/service.js:areaMatch` supplies the shared SQL predicate to public discovery, recipient preview and `server/purchase/service.js:eligibleRecipients`. Scopes are exclusive: Whole district cannot carry a locality restriction; Exact PIN covers its explicit PIN; Named locality requires its reviewed bound locality. No address-PIN fallback or fuzzy expansion occurs.

`POST /api/customer/enquiries` in `server/purchase/customer.js` requires authenticated Customer access and CSRF, validates the submitted tuple, then calls `eligibleRecipients` inside `withCustomer`'s transaction before inserting recipients. Client preview results are not trusted. Selected company IDs are bounded explicitly; no substitute companies are silently added. A private unsent enquiry with no recipients can be saved by the existing direct-request behavior; this is NOT successful delivery.

Final routing holds shared locks on active postal/locality references and ordered update locks on selected companies, then checks `marketplace_vendors`, service and offer/category eligibility. Company publication/review actions lock the company row, so they serialize with routing. Definition/category locks protect product-based requests. Customer user/session locking plus submission-key lookup serializes same-customer retries. Customer reads are scoped by owner; business reads require recipient/company membership and permissions.

Frontend material-change signatures invalidate reviews for location/service/category changes; unrelated notes preserve them; stale asynchronous preview results are discarded. Server revalidation still rejects a recipient withdrawn since preview. A withdrawal that commits after a correctly serialized submission does not retroactively undo a legitimately routed historical enquiry.

Tests verify withdrawal between preview and submit, invalid references, cross-company reads and the real quotation journey. They do NOT establish exhaustive simultaneous transaction scheduling, deadlock/load behavior or production performance. Add deterministic two-connection lock-interleaving tests for withdrawal and reference deactivation before claiming concurrency acceptance is complete. A 500-locality per-PIN selector response cap should also be checked against the reviewed dataset size.

## Three reported database failures

Evidence: `.verification/locality-coverage-final-db.log`: 84 tests, 81 pass, 3 fail. `.verification/locality-baseline-database.log`: earlier unmodified `ee8e8c6` archive, independent disposable PostgreSQL, 29 tests, 26 pass, the same 3 fail.

| Failure | Cause | Relationship to locality change |
|---|---|---|
| `tests/database.test.mjs:47`, manual trial test | Expects HTTP 201 assigning `status:trial`; existing `server/commercial/routes.js:31` permits only pending_commercial_activation or active and returns 400 | Reproduced before locality implementation; billing code unchanged |
| `tests/database.test.mjs:48`, expired entitlement test | Dereferences missing subscription ID because the preceding trial was never created | Cascading baseline fixture failure |
| Parent database suite | Node test runner counts failed parent in addition to two failed children | Aggregate, not a third independent application defect |

This establishes that they are unrelated regressions, not that billing is fully accepted. Correct the commercial fixture in a separately reviewed change or obtain explicit documented scope/risk acceptance; do not weaken the production policy or assertions to get green results.

Other retained evidence: ordinary regression 265 passed, 0 failed, 68 skipped (333 total); focused database/browser/migration 9 passed, 0 failed; lint 1,880 checks passed; build 1,880 checks passed. The build command is the repository static checker, not a separate bundler or TypeScript compile. Skipped database tests in the ordinary run are not counted as DB acceptance. Desktop/mobile Chrome screenshots are under `.verification/locality-coverage-browser/`; physical-device and assistive-technology acceptance remain unverified. No new test executions were required for this read-only evidence review.

## Proposed controlled release sequence — NOT AUTHORISED OR EXECUTED

1. Re-identify Railway project mysolar, production environment, web service mysolar and Postgres service `058536fc-092b-4288-a48f-cb9cf8baae7d`; verify linked repository, branch, live revision, all replicas/workers and database identity privately. Pin the reviewed release SHA; any additional change requires review. Production access/runtime and current metadata are not verified by this review.
2. Obtain the real reviewed locality dataset and business-approved declaration list. Rehearse the complete import/save/review/publish sequence in disposable PostgreSQL with those reviewed geographic names and fictional identities. Rehearse rollback and concurrent withdrawals.
3. Complete the read-only SQL preflight below. Compare installed migration checksums against the reviewed manifest, including all migrations through 050. Confirm compatible PostgreSQL and migration-role privileges without exposing credentials. Do not run 051 manually in the viewer.
4. Obtain and verify a fresh production backup through an authorised operator. Verify Railway volume-backup availability, retention and recovery point in the correct Postgres service. Where authorised tooling is available, take an encrypted, access-controlled logical dump as well. Perform restore verification into a positively identified disposable database. Record backup identity, timestamp and restore results without customer data or secrets. No production restore is part of release. [Railway backup documentation](https://docs.railway.com/volumes/backups) describes availability and restore actions, but does not prove this project's backups are enabled.
5. Prepare and test a schema-051-compatible rollback release before approval. It must retain migration manifest and strict matching; a proposed emergency design is to disable new Named-locality routing while retaining history and explicit broader scopes. That artifact does not yet exist as a verified rollback target. Never use the pre-051 deployment as the fallback.
6. Present separate owner approvals for code plus 051, reference import, exact business declarations plus renewed publication, and any live acceptance transaction. Include affected rows, before-images, labels and reversibility. Schedule the controlled availability window: the new customer form requires reviewed locality options, so an empty dataset blocks form completion. The current implementation has no staged feature gate; deployment and data publication must be coordinated or a separately reviewed gate added first.
7. Only after those approvals, release the pinned reviewed artifact to the verified Railway web service through its confirmed source integration. Its checked-in `preDeployCommand` is `npm run db:migrate`; this is the exact schema-changing step requiring approval. Observe 051 completion, bounded lock waits and `/readyz`. Do not independently run a second migration command or change database secrets. Verify every serving instance uses the new matcher before configuring locality-bound company coverage.
8. Separately authorised operator imports postal/locality references through existing audited APIs; verify public selector output. Separately authorised business owner saves confirmed full coverage list using current revision; independent administrator reviews and publishes. No automatic Shamin update or automatic approval.
9. Read-only live matching checks can follow. A real enquiry/quotation creates data and notifications: only run under separate explicit transaction approval. Otherwise retain disposable end-to-end acceptance as local evidence and mark live delivery pending.

### Read-only database preflight (authorised operator, correct production viewer)

```sql
BEGIN READ ONLY;
SELECT current_database(), current_schema(), current_setting('server_version');
SELECT name, checksum FROM schema_migrations ORDER BY name;
SELECT relname, pg_total_relation_size(oid) AS bytes
FROM pg_class WHERE oid IN ('company_service_areas'::regclass,'postal_locations'::regclass);
SELECT pid, state, wait_event_type, wait_event, xact_start
FROM pg_stat_activity WHERE datname=current_database() AND xact_start IS NOT NULL;
SELECT scope,label,state_key,district_key,pin,locality_key
FROM company_service_areas WHERE company_id='821518ce-91b6-8aa5-a7ff-7ca5bb751c90';
ROLLBACK;
```

Database name alone is not proof of Railway identity: corroborate the selected project/environment/service privately. Do not include query text from unrelated sessions, credentials or customer records in evidence.

### Backup commands (conditional operator template, not executed)

If an approved operator host has PostgreSQL tools and securely preconfigured service aliases, the following avoids credentials in command arguments. `mysolar_prod_verified` must identify the verified production database; `mysolar_restore_disposable` must be a fresh, separately verified disposable target. File destination must be encrypted and restricted. These aliases/tool access do not currently have verified availability.

```sh
pg_dump --dbname=service=mysolar_prod_verified --format=custom --file=/secure-backups/mysolar-pre-051.dump
pg_restore --list /secure-backups/mysolar-pre-051.dump
pg_restore --dbname=service=mysolar_restore_disposable --exit-on-error --no-owner --no-acl /secure-backups/mysolar-pre-051.dump
```

Restore validation must check migration history, constraints, counts and isolated application reads, not just archive listing. Do not install tools in production or paste connection strings to make this template runnable. If no authorised backup/internal operator path exists, stop: backup readiness is BLOCKED.

### Post-release read-only verification commands

```sh
curl --fail --silent --show-error https://mysolar.solutions/readyz
curl --fail --silent --show-error https://mysolar.solutions/api/public/locations/670307
curl --fail --silent --show-error 'https://mysolar.solutions/api/public/locations/670307/localities?state=Kerala&district=Kannur'
```

Use authorised read-only SQL to verify 051 checksum, foreign key definitions and exact approved reference/declaration values; compare preserved record counts with backup/preflight while accounting for legitimate concurrent production writes. Verify a covered and uncovered locality sharing the PIN, direct and general matching, withdrawal behavior and historic quotation reads. Never equate HTTP 200 with matching/delivery success. Authenticated preview tests require the owner's private session and CSRF; no credentials belong in commands or this report.

### Rollback sequence

If pre-deploy 051 fails, its transaction rolls back: stop rollout and inspect the failure without editing checksums. If 051 succeeded but application acceptance fails, halt new writes via a pre-approved operational control and release the TESTED schema-compatible fallback; leave 051 installed. No such fallback/control is yet verified, so this is a release blocker rather than an executable rollback claim. Railway image rollback alone is insufficient; see [deployment actions](https://docs.railway.com/deployments/deployment-actions).

If a reviewed reference is wrong, separately authorised operator deactivates that exact entry through the audited locality API; preserve reference ID/history. If coverage is wrong, separately authorised owner corrects only the confirmed area list, with a fresh revision and renewed independent review/publication. Keep before-images, but do not automatically re-approve a historical revision. Neither rollback should delete enquiries or rewrite historical quotations. Whole-database restore requires a distinct incident decision because it can lose subsequent legitimate business activity.

## Required approvals and next action

NO-GO until: actual locality list and business scope confirmed; fresh production preflight complete; backup restore drill evidenced; schema-compatible rollback artifact/control tested; concurrent interleaving tests completed; baseline commercial failures corrected or formally accepted; coordinated selector-data availability and source deployment target verified.

**Exact next owner action:** obtain Shamin&Company's explicit list of the actual independently named localities it serves within Payyanur, with confirmed PINs, and nominate an independent operator to review their geographic sources. This is not approval to widen coverage. Then complete the backup/rollback rehearsal and present the pinned release, reference-data payload and complete business coverage payload as separate approval items. No production approval is presumed from this report.
