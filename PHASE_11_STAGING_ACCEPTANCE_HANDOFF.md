# Phase 11 staging acceptance — current execution, 18 October 2026

> Historical acceptance record. On 19 October 2026 the owner requested a single root application and removal of staging tools. See [ROOT_DEPLOYMENT.md](ROOT_DEPLOYMENT.md). Prior observations below are preserved; they neither authorize execution of removed tools nor verify today's remote environment state. No Railway environment was deleted during consolidation.

## Current decision: PASS WITH BLOCKERS

The controlled staging release, actual snapshot restore and recorded technical checks below passed. **The overall safe-operations milestone and real-onboarding readiness are NOT complete:** approved Resend sender/recipient/key, real email receipt, continuous alert configuration and verified alert receipt remain blocked. Some extended Phase 11 scenarios still have local integration evidence only. Do not interpret this decision as production or real-customer onboarding approval.

The user subsequently authorised creating isolated staging and executing the operations-foundation milestone. That authorisation supersedes the missing-resource-creation approval noted in the historical 17 October section below. Production changes, DNS, company-domain traffic, payments, real onboarding, commits and pushes remain outside this execution.

## Executed release and isolation evidence

| Item | Verified result |
| --- | --- |
| Project | `b189e069-4956-40fb-aeec-8237b7347893` |
| New empty staging environment | `20d7716a-345d-4295-9cf4-3965c1aa50c9`; created without duplicating production |
| Staging URL | `https://mysolar-staging.up.railway.app`; Railway-generated HTTPS, no customer DNS |
| App / database logical service IDs | `b27efca8-cfe2-4a3c-9f8e-57f9f255408a` / `058536fc-092b-4288-a48f-cb9cf8baae7d`; instances/configuration scoped by staging environment |
| Isolated database | `mysolar_staging`, role `mysolar_staging`, fresh random password, environment-private network, no production records copied |
| Source baseline | `24f3970b5189f1780e633b0b95dca658d0e74ddc` plus preserved Phase 10 fixes and reviewed staging safeguards |
| Deployed candidate | `phase11-aea3eceba4f349ef9a63`, 122 runtime/config/asset files; hash manifest retained under `.verification/staging-releases/` |
| First accepted app deployment | `9ded0eba-2bca-4697-bc00-4d867b9d3e5d` |
| Intentional failed health-gate candidate | `cb7814be-9651-404d-8eb1-34ea9a2381c2`, FAILED as expected |
| Accepted app after restoring normal configuration | `785dff31-7502-4a8b-b1ad-25d32bf92da6`, SUCCESS |
| Current staging database deployment | `49c7680b-bb48-4a7a-a9e8-9a4a7fa140a9`, SUCCESS |
| Current recovered volume | `50569938-4093-404c-aea4-b7caf60a98b4`, instance `b6e23df6-571b-4165-a988-d20a4bc3b299` |
| Retained original staging volume | `29f7bcda-4090-428a-b6f8-a193895a11e6`, instance `e6c77a46-445d-4b51-8c55-c99ce1f878b3`, detached/retained |

Independent staging session and access secrets were generated in memory and stored directly in staging variables. No secret values were printed or included in artifacts. SMTP and AI credentials were not copied from production. There is no staging application upload volume or production media-storage credential. Database TLS is disabled only on Railway's environment-private network; public access remains HTTPS with production cookie/CSRF rules. Proxy trust is set to the single Railway ingress hop for this direct service-domain deployment; adding another proxy requires review.

Initial and final remote inventory checks show production unchanged: app deployment `c422b82b-9dec-42b5-be60-a146912217c1`, database deployment `68693702-d600-42d6-9cc4-898267dc5c26`, volume `d1ee8621-0a54-4241-9d78-c4896fafbe2a` / instance `766ec467-444f-478f-964c-0f476ee2a48e`. No production database connection/query, migration, configuration, credential or data change was performed. The Railway CLI's broad service-creation path was deliberately avoided; environment-scoped patches instantiated staging services.

## Configuration discrepancy resolved for staging

Staging has explicit service settings for `npm run build`, `npm start`, pre-deploy `npm run db:migrate`, `/readyz`, 120 seconds and bounded restart retries. The accepted deployment's **effective serviceManifest contains those actual values**, and logs show the pre-deploy command and all eleven applied entries before startup. The database ledger independently matches the source manifest. This resolves the staging release gate with execution evidence; it does not repair or claim to explain production's historical null metadata. Legacy JSON remains in the candidate for compatible services; new service settings are explicit, as current Railway documentation requires.

The intentional health-check path `/phase11-deliberately-invalid-health` with a 30-second timeout caused a FAILED candidate. During that rejection the preceding successful release continued serving `/readyz` with HTTP 200. Correct `/readyz` / 120-second configuration was restored, producing accepted deployment `785dff31-7502-4a8b-b1ad-25d32bf92da6`. No invalid health setting is intentionally left in staging. This proves deployment rejection/retention, not an independently delivered uptime alert or a down migration.

## Exact staging migration ledger

All eleven entries were applied by the supported **pre-deploy runner**, never manual migration SQL. Their checksums matched the source manifest. After the real restore, each checksum and original application timestamp remained unchanged:

| Entry | Applied at (UTC, 18 October 2026) |
| --- | --- |
| 001_identity.sql | 16:29:19.955 |
| 002_role_catalogue_v1 | 16:29:19.977 |
| 003_company_setup.sql | 16:29:20.004 |
| 004_marketplace.sql | 16:29:20.030 |
| 005_enquiries_quotations.sql | 16:29:20.055 |
| 006_operations.sql | 16:29:20.078 |
| 007_sia.sql | 16:29:20.124 |
| 008_commercial.sql | 16:29:20.134 |
| 009_shared_invitations.sql | 16:29:20.155 |
| 010_domain_registry.sql | 16:29:20.162 |
| 011_pro_network.sql | 16:29:20.178 |

The exact 009–011 checksums in the historical source table below remain current; all eleven checksums are also in the accepted candidate manifest. Subsequent configuration redeploys used the unchanged migration chain. No historical SQL or virtual role definition was rewritten.

## Backup and actual recovery evidence

- Enabled staging PITR and its dedicated Railway-managed archive storage. Configured daily and weekly snapshot schedules, including reapplying schedules to the current recovered volume.
- Completed real snapshot `5e025a72-f5b4-4d7c-85e0-1c29180b1713`, labelled `phase11-staging-recovery`, created `2026-10-18T16:32:12.862Z` from the original staging volume instance.
- Before backup, the isolated `staging_rehearsal.restore_marker` value was `fictional-phase11-recovery-marker`. After backup it was deliberately changed to `post-backup-fictional-change`.
- Restore workflow `createVolumeFromSnapshot/e6c77a46-445d-4b51-8c55-c99ce1f878b3/5e025a72-f5b4-4d7c-85e0-1c29180b1713/WDyBNq7R3xd7_4WW0prZp` reported Complete. It created a **detached** recovered volume. Merely accepting that workflow was not reported as recovered data.
- Switched the staging database to the recovered volume, retaining the original. Queried the recovered original marker and all eleven unchanged migration entries; readiness and subsequent business tests passed against the recovered database.
- An immediate second volume mutation initially raced the first detach commit; provider validation rejected attaching two volumes. After inspecting the completed detach, attaching the recovered volume succeeded. Controlled staging downtime occurred; production was unchanged.
- Recovery exposed WAL archive conflicts against the pre-restore history. Configured a fresh staging `WAL_ARCHIVE_PATH=/pgbackrest/phase11-restored-20261018` without deleting the original archive. A new base backup was recorded at `2026-10-18T16:47:53Z`; the subsequent live probe reported `archiverHealthy:true`, successful WAL archival and a new restore window. The final probe must remain healthy before any next release.
- Initial live capacity sample: database 12,629,695 bytes, max connections 500, one connection. This is a sample, not a load/capacity certification. Scheduled automatic job execution has not yet been observed over a daily/weekly cycle. The exercised restore was a real manual snapshot through the configured backup mechanism, not a PITR-to-timestamp drill. An end-to-end recovery-time objective was not measured; no RTO/RPO guarantee is claimed.

## Executed checks, fixtures and corrections

| Check | Result / evidence |
| --- | --- |
| Full local suite against newly isolated PostgreSQL | **177 passed, 0 failed/skipped/cancelled**; `.verification/phase11-local-tests.log` |
| Final repository static/build validator | **706 passed, 0 failed**; `.verification/phase11-final-static.log` |
| Focused new staging safeguard tests | **3 passed**, included in 177 |
| Actual staging HTTPS API acceptance | **64 passed, 0 unresolved failures**; `.verification/phase11-staging-api-results.json`, API and finish logs |
| Actual staging Chromium across 360/390/768/1024/1280/1440 | **55 passed, 0 failed**, no uncaught browser exceptions; `.verification/staging-browser/results.json` and six landing screenshots |
| Pre-deploy migrations/readiness/effective configuration | PASS; provider metadata, startup/pre-deploy logs and actual ledger |
| Real snapshot restore and data/ledger verification | PASS; recovered marker and original ledger, subsequent application checks |
| Failed-release gate with previous release retained | PASS; intentional candidate FAILED, old readiness 200, corrected release SUCCESS |
| Resend delivery and actual recipient receipt | **NOT RUN — blocked** |
| Continuous error/uptime/capacity alert notifications and receipt | **NOT CONFIGURED / NOT VERIFIED — blocked** |

The 64 API observations exercise startup/readiness, private access, no-index headers, static/private-file handling, secure sessions, signup/login, CSRF/origin rejection, organisation setup and independent activation, owner/customer dashboards, company substitution and foreign selection denial, private employee/customer invitations and explicit acceptance, recipient binding/replay/role enforcement, CRM record isolation, operator-only commercial access, draft/published PRO fixtures/manual access, PRO denial in pre-billing, concurrent partner acceptance, replay denial, disabled domain entitlement, suspension preserving reads while blocking new actions, and logout. Recovery correctly reports unavailable while mail is unconfigured.

The five accounts, two companies, contact, invitations, plan and subscriptions are labelled fictional. The PRO plan is an isolated test fixture, not published commercial pricing or a payment record. No real purchase, email or WhatsApp message occurred. Temporary platform grants for the fictional owner/operator were revoked through the existing audited operator command after the rehearsal; both revocations succeeded. Fictional business records remain behind private staging access for review. No user-facing signup rate limit or permission check was changed.

Initial harness failures were corrected without weakening the app: refreshing a revoked session must omit a stale account header; company approval must use an independent operator; a subscription mutation must read the revision from the operator API, not the reduced owner view. The suite resumed against its existing fictional records. Earlier signup checks passed before resumption; the final result combines the recorded main run and corrected lifecycle continuation rather than claiming a single uninterrupted run. An isolated local startup attempt was blocked by the sandbox; rerunning the existing disposable-cluster runner with approved local execution passed all 177 tests and stopped its cluster.

The browser scope covers real staging public discovery and customer/distributor login pages, overflow and mobile menu/Escape behaviour. It does not claim all authenticated screens were browser-tested on staging. Expired/revoked PRO invitation variants, opposing company-lock contention, part-time executive task/expiry scenarios, full domain proof/lifecycle cases and deeper quote/order/finance/service flows retain the **local** Phase 10/177-test evidence; their complete deployed staging matrix remains to finish. No company-domain traffic or real DNS proof was enabled.

## Files and operations delivered

- New `server/staging.js`: validates staging deployment settings, private access with bounded failure throttling, no-index headers, narrow health exceptions and fail-closed mail recipient enforcement.
- `server/index.js` and `server/mail.js`: integrate the optional safeguards; normal application behaviour is retained when staging mode is disabled. Existing permissions and tenant context remain authoritative.
- `.env.example`: documents optional staging variables without values.
- `scripts/prepare-staging.mjs`: explicitly includes reviewed staging safeguards in hash-inventoried candidates and records required service settings.
- New `scripts/staging-acceptance.mjs`, `scripts/staging-browser.mjs` and `tests/staging.test.mjs`: bounded explicit-staging rehearsal and meaningful safeguard tests.
- New `OPERATIONS_RUNBOOK.md`: exact target, release/rollback, backup/restore, incident handling, mail setup and outstanding monitor acceptance.
- Updated this handoff, README and deployment runbook. All earlier Phase 10 modifications/untracked tests were preserved. Package dependencies, historical migrations and production configuration were not changed. No commit or push occurred.

## Outstanding blockers and next action

1. **Resend:** provider chosen by the user. Public SMTP settings are configured on staging (`smtp.resend.com`, 465, TLS, username `resend`). No approved recipient, verified sender or staging key has been supplied. Set a staging-only key privately as `SMTP_PASSWORD`, verified sender as `MAIL_FROM`, and exact approved addresses as `STAGING_EMAIL_RECIPIENTS`. Empty allowlist currently blocks all sending. Verify actual invitation/reset delivery and receipt; API acceptance alone is insufficient. No SMTP key value should be sent in chat.
2. **Alerts:** staging Railway Observability dashboard was created successfully. Existing structured error logs, metrics, health endpoints and deployment gating are available. Native monitor creation is not exposed by the inspected public API. The computer-use browser access approval timed out; no browser monitor setting was changed. Finish approved uptime/error/capacity thresholds and alert destinations, then prove actual alert and recovery receipt. No external monitoring account or paid monitoring subscription was purchased. See the runbook for proposed initial thresholds and outside-provider uptime coverage.
3. **Acceptance completion:** finish the extended deployed scenarios listed above, mail failure/expiry/replay boundaries with Resend, alert simulation and a timed recovery acceptance. Verify a scheduled automatic backup execution when due. Operational ownership, retention/cleanup and RTO/RPO acceptance remain necessary before real onboarding.

**Single next milestone:** finish this same operations-foundation/staging acceptance gate once the approved Resend addresses/key and Railway browser monitoring access are available. Do not advance to real onboarding or production release.

## Historical preparation report — 17 October 2026

The following records the pre-authorisation state. Its missing-staging claims and NOT RUN rows are historical and superseded only by the explicit current evidence above.

## Decision

**FAIL — BLOCKED / NOT EXECUTED.** Local release preparation succeeded, but staging acceptance has not run. This is an environment/approval blocker, not evidence of a newly failing business test. Do not begin a real-company/customer onboarding trial or claim production readiness.

The linked Railway project contains only **production**. No confirmed staging application, isolated staging database, staging URL, approved email account or approved recipient list is available. No release, remote migration, email, production query, environment change, resource creation, DNS change, commit or push was performed.

## Verified target evidence

Read-only Railway CLI 5.44.1 inspections succeeded with the existing authorization:

- `railway.cmd status --json`
- `railway.cmd environment list --json`
- `railway.cmd environment config --environment 8e1cb532-b9d3-447a-aeca-60fd41ff06fb --json` (processed in memory; only deployment fields/field names printed, not variables).
- CLI help for environment, deployment listing and explicit-target uploads.

| Observed object | Evidence |
| --- | --- |
| Linked project | `mysolar`, `b189e069-4956-40fb-aeec-8237b7347893` |
| Environment inventory | Exactly one accessible environment: `production`, `8e1cb532-b9d3-447a-aeca-60fd41ff06fb` |
| Production application | `mysolar`, `b27efca8-cfe2-4a3c-9f8e-57f9f255408a`; public hostname `mysolar.solutions` |
| Active application deployment | `c422b82b-9dec-42b5-be60-a146912217c1`, status SUCCESS, created `2026-10-17T10:36:38.650Z` |
| Deployed source | `main`, commit `24f3970b5189f1780e633b0b95dca658d0e74ddc` |
| Runtime metadata | Railpack 0.41.0; resolved Node 22.23.3 |
| Database service | One production `Postgres` service, `058536fc-092b-4288-a48f-cb9cf8baae7d`, PostgreSQL 18 image and its own production volume |
| Storage inventory | One production database volume; no application volume; no project buckets reported |
| Staging target / release deployment ID | **None / none** |

This inventory concerns the linked project only; it does not prove that no staging project exists elsewhere in the account. If another project is intended, supply its explicit project/environment/service identifiers. No production credentials were exported, compared with an invented target or used to connect to a database. No production customer records or application logs were fetched.

## Deployment configuration discrepancy

The repository `railway.json` declares `preDeployCommand: ["npm run db:migrate"]`, `/readyz` and a 120-second readiness timeout. The observed active deployment has:

- `meta.propertyFileMapping` entries referencing those three configuration-file fields;
- an empty `meta.fileServiceManifest`;
- `meta.serviceManifest.deploy.preDeployCommand`, `healthcheckPath`, `healthcheckTimeout` and `startCommand` all **null**;
- environment-level app configuration with no explicit pre-deploy/health/start/build commands (build contains builder/buildEnvironment; deploy contains regional/network settings).

Thus the file's presence and deployment SUCCESS are **not evidence that migrations or readiness gating ran**. Remote metadata confirms the discrepancy persists; it does not establish a root cause or prove what the runtime executed. No migration-log or database evidence was gathered from production, intentionally. Do not assume a dashboard override, fix production settings, or redeploy production to investigate.

Current [Railway Config as Code documentation](https://docs.railway.com/config-as-code), checked during this task, says legacy config files are deprecated, unavailable for new service opt-in, and supported for existing adopters only until 1 December 2026. It also explains why dashboard settings and file settings may differ. A new staging service must therefore use **explicit service settings or separately approved IaC**; relying on the candidate JSON alone is insufficient. The application needs no new infrastructure dependency merely to configure service settings.

Required staging settings are recorded in the local candidate manifest: install `npm ci --no-audit --no-fund`, build `npm run build`, start `npm start`, pre-deploy `npm run db:migrate`, health path `/readyz`, timeout 120 seconds. Only the existing supported migration runner may apply schema changes. It uses an advisory lock, ordered per-entry transactions and recorded checksums. See [Railway pre-deploy procedure](https://docs.railway.com/deployments/pre-deploy-command).

Resolution gate: configure these settings on an authorized staging service, inspect the resulting deployment details, observe migration execution logs and read the staging migration ledger. If metadata remains inconsistent, stop and obtain provider/deployment-detail evidence before acceptance. This gate remains blocked, rather than being reported resolved by assumption.

## Protected source and prepared candidate

Initial branch `main`, HEAD `24f3970b5189f1780e633b0b95dca658d0e74ddc`, index empty. Preserved all nine modified tracked files and five untracked Phase 10 files. Reviewed the Phase 10 integration, domain and PRO handoffs, tracked diffs, migration runner/manifest, deployment configuration, environment validation, mail transport and supported commands. No applicable repository/ancestor instructions were found in the inspected locations.

New `scripts/prepare-staging.mjs` is strictly local: it does not load `.env`, contact Railway, connect to PostgreSQL, install anything, generate credentials or deploy. Run:

```powershell
node scripts/prepare-staging.mjs
```

It selects tracked runtime files only, rejects unreviewed runtime modifications/untracked runtime files, rejects non-regular files, checks the ten SQL checksums against the existing fixture and records all eleven migration entries, including virtual role migration 002. It copies the four reviewed Phase 10 runtime edits (operations employee choices, PRO task/team controls and service-worker cache revision), preserving source bytes. Candidate-only `railway.json` explicitly includes build/start/migration/health commands; source/deployed configuration is untouched. Existing candidates with differing bytes are never overwritten. A candidate's generated JSON is a compatibility aid, not configuration proof for a new Railway service.

- Candidate ID: **`phase11-f392cc6a0f55c1208883`**.
- Artifact: `.verification/staging-releases/phase11-f392cc6a0f55c1208883/app/`.
- SHA-256 inventory and required service settings: adjacent `manifest.json`.
- 121 runtime/config/asset files, content-derived identifier, eleven migration entries.
- No `.env`, secrets, Git/CLI profiles, tests, handoff documents, database clusters, node_modules or verification evidence in the upload directory. Dependencies must be installed from its lockfile by staging.
- Repeated final preparation returned the same identifier. An earlier draft artifact remains ignored locally and must not be selected.
- Manifest target remains null and deployment status remains `NOT_DEPLOYED`.

This is a workspace-byte candidate, not a committed release. No commit/push is necessary for a future explicitly targeted CLI staging upload. Recheck its hashes and target isolation immediately before upload. The script intentionally requires review when runtime scope changes. Do not upload the entire workspace or use an implicit linked environment: it currently points at production.

## Exact migration status

**Staging ledger: unavailable — no staging database exists in the inspected environment inventory. Zero migrations executed in Phase 11.** No applied timestamp, staging readiness result or production schema version is claimed.

| Manifest entry | Phase 11 source/candidate status | Staging applied status |
| --- | --- | --- |
| 001_identity.sql | Included; pinned SQL checksum matched | NOT RUN |
| 002_role_catalogue_v1 | Included virtual checksum | NOT RUN |
| 003_company_setup.sql | Included; pinned SQL checksum matched | NOT RUN |
| 004_marketplace.sql | Included; pinned SQL checksum matched | NOT RUN |
| 005_enquiries_quotations.sql | Included; pinned SQL checksum matched | NOT RUN |
| 006_operations.sql | Included; pinned SQL checksum matched | NOT RUN |
| 007_sia.sql | Included; pinned SQL checksum matched | NOT RUN |
| 008_commercial.sql | Included; pinned SQL checksum matched | NOT RUN |
| 009_shared_invitations.sql | Included; checksum `aaa630b02ade28916b96ebb9b215381f52e4297f72724da0c88c163d8c232da6` | NOT RUN |
| 010_domain_registry.sql | Included; checksum `3080052aa75a4128cea62ffc924ca0d285857242c1b2d38064b9552e80a0c05e` | NOT RUN |
| 011_pro_network.sql | Included; checksum `8a24af7e8e8bdefef2d8e2ca604f555ec899bd81e8812af273b506db376b0ad0` | NOT RUN |

All eleven checksums are recorded in the candidate manifest. Prior fresh/upgrade/repeat/checksum PostgreSQL results are in `PHASE_10_INTEGRATION_HANDOFF.md`; those disposable schemas were removed. They are local evidence, not staging results.

## Checks and evidence

| Check | Phase 11 result |
| --- | --- |
| Read-only Railway access and environment inventory | PASS; only production found |
| Isolated staging application/database/credentials/storage | BLOCKED; no staging target |
| Approved staging SMTP/sender/recipient restrictions | BLOCKED; no approved configuration/recipient list supplied or inspected |
| Candidate preparation and repeatability | PASS; same final candidate ID on repeated preparation |
| Candidate file hashes, exact inventory, exclusions, source-byte equality and identifier | PASS; 121 files; only declared candidate JSON differs from source |
| Candidate JavaScript syntax | PASS; 83 files, zero syntax failures |
| Repository static/build validator | PASS; 687 passed, zero failed; `.verification/phase11-static.log` |
| Staging startup, health/readiness, migration logs, errors and runtime/native dependencies | NOT RUN |
| Staging authentication, sessions, CSRF, permissions, recovery and cross-tenant isolation | NOT RUN |
| Staging organisation setup, employee/customer invitations, membership | NOT RUN |
| Staging subscription/PRO expiry/downgrade and lifecycle transitions | NOT RUN |
| Staging partner acceptance, expiry, replay, revocation, concurrent acceptance | NOT RUN |
| Staging part-time executive eligibility, assignment, task boundaries and expiry | NOT RUN |
| Staging domain registry/verification/suspend/remove and fail-closed traffic | NOT RUN; no DNS/provider resources created |
| Staging existing customer/business workflows and six responsive widths | NOT RUN |
| Actual staging email delivery, links, expiry/restrictions/failures | NOT RUN; zero messages sent |

The pre-existing Phase 10 log was inspected and records 174 passed, zero failed/skipped/cancelled tests. Its report records 72 browser checks, 680 static checks and zero known dependency vulnerabilities. These remain **prior local evidence**; the comprehensive suite/browser run/audit were not repeated or relabelled as staging acceptance. The existing PostgreSQL integration helpers intentionally refuse remote databases; do not point them at Railway or remove their guard. A staging rehearsal must use explicitly approved fixture accounts and controlled API/browser scenarios.

## Required setup and execution gate

The operator must either identify an existing isolated staging project or authorize creation of a new Railway staging application and **fresh** PostgreSQL service/volume. Creation can incur Railway usage charges; no new resources were created under this task. Do not duplicate production data or inherit production service variables blindly.

Before any release, record and verify:

1. Exact project, environment, application, database and volume IDs; independently confirm they differ from production. Fresh database, dedicated role/password and no imported customer data. No production bucket/media credentials, shared writable volume or production external-service endpoints.
2. A staging-only Railway-provided HTTPS URL (no company DNS), exact `APP_ORIGIN`, `NODE_ENV=production`, independent random `SESSION_SECRET` (at least 64 characters), staging `DATABASE_URL`, reviewed `DATABASE_SSL` and proxy-hop settings. Set `INVITATION_DELIVERY=email`. Never put values in a ticket/report or shell arguments. No missing secret may be replaced with a dummy to force readiness.
3. Keep `SIA_PROVIDER=disabled` and its external credentials absent. Keep the unconfigured domain adapter and company-domain traffic disabled. No payment integration or billing. Use fixture-only accounts and an access restriction/private preview until email restrictions are established.
4. Explicit staging build/start/pre-deploy/readiness settings from the manifest. Disable production-branch autodeploy linkage for this isolated rehearsal or establish an approved staging-only release source. Inspect the effective target immediately before every mutating command.
5. A staging-only SMTP account/provider, approved sender and explicit approved test recipients/mailboxes. The current app mail transport does not implement a staging recipient allowlist: enforce a provider-level recipient restriction or add/review a staging-only delivery guard before enabling it. Do not reuse production SMTP credentials or send to real customers. Until then leave SMTP unconfigured; recovery/automatic invitation delivery must remain honestly unavailable.
6. Isolation verification compares credentials/configuration privately without printing values; distinct URL strings alone are not evidence of distinct databases. Check the selected database identity, service references and storage IDs before any fixture write. Confirm access/retention/cleanup owner and staged-data deletion procedure.

After these gates, upload the exact reviewed artifact with explicit project/environment/service IDs. Use the configured pre-deploy migration mechanism, not manually executed SQL. Record provider deployment ID and source/candidate identifier. Inspect safe build/pre-deploy/runtime logs, staging-only `schema_migrations` names/checksums/timestamps and `/readyz`. Stop on any mismatch or missing migration/health evidence.

Rehearse every NOT RUN row above against staging with two fictional companies, customer/owner/staff accounts and PRO/non-PRO/expired fixtures. Use no real company-domain DNS: keep verification assertions controlled without claiming ownership of a live domain. Any direct real-DNS proof exercise needs a separately authorized hostname; do not relax activation gates to manufacture success.

Real email evidence must include workflow, redacted provider message identifier/time, delivery event, actual receipt confirmed in the approved mailbox, exact staging hostname in links, correct recipient/role, authenticated acceptance, expired/replayed/revoked denial, reset-session revocation and controlled provider failure behaviour. SMTP acceptance or a queued/sent API response alone is insufficient. Record identifiers with personal data/token links removed.

## Defects, changed files and retained work

- Corrected stale runbook guidance by adding a current Phase 11 notice; historical procedures remain below it.
- Added `scripts/prepare-staging.mjs` and this report. Linked this report from README without removing the Phase 10 account.
- No new business-code defect was established against staging, because staging is unavailable. All existing Phase 10 fixes and tests remain untouched.
- Root `railway.json`, package scripts/dependencies, environment files, historical migrations, authentication, tenant permissions and production settings were not changed.

No automatic approval rejection occurred. Railway read-only access succeeded; the blocker is missing staging infrastructure and approved email configuration. Initial CLI invocation encountered Windows PowerShell script-policy restrictions; using the installed `.cmd` wrapper resolved that without changing execution policy.

## Single next milestone

**Establish and verify the isolated Railway staging target and approved email recipients, then complete this same Phase 11 staging release and acceptance rehearsal.** Do not advance to real onboarding or production rollout until its acceptance evidence supports a new decision.

No commit or push was executed. The current `main` source is production-connected, so a future push can trigger production deployment and needs a separate release authorization. After that authorization only, review changes interactively and use the intended release branch:

```powershell
git add --interactive
git diff --cached
git commit -m "Prepare controlled staging release and acceptance evidence"
git push -u origin <approved-release-branch>
```

Do not execute this block now or substitute `main` without explicit authorization.
