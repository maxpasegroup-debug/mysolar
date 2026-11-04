# Final foundation Phase 1 — release and recovery

Updated: 30 October 2026 (India).

## Decision

LOCAL IMPLEMENTATION AND VERIFICATION COMPLETE — LIVE RECOVERY/RELEASE GATES OPEN. This is not production release approval. Implementation, disposable-database verification, live recovery evidence and deployment are separate gates. No new production operation is implied by this report.

## Verified production baseline

Read-only inspections on 29 and 30 October confirmed release `2cf589433ee2d38cb0b54dc94ae0b2c8ef9b00b4`, PostgreSQL 18.6 and **43 migration entries through `043_no_mandate_trial.sql`**. All checksums match the source manifest, with no missing or unexpected entries or unvalidated constraints. `/healthz` and `/readyz` returned HTTP 200. The migrations were already installed; this task did not apply them. Older reports describing production as schema 33 are historical.

Web pre-deploy uses `npm run db:migrate`; deployment health uses `/readyz`. Mail and monitoring have fresh heartbeats. The previous worker-binding inspection confirmed matching database/encryption/provider configuration and approved operational-alert recipient. A stale reminder-worker incident remains: starting that worker could send real customer messages and was not authorized here. Billing is disabled.

Mandatory verified-email and privileged-MFA configuration flags remain false. Tests with those flags enabled prove the guards locally, not that existing production owners have enrolled or that production enforces step-up. Do not blindly enable flags and lock owners out. New-account signup email verification and these additional privileged-action guards are separate controls.

The 29 October backup inspection found physical backups from 20 and 26 October and **no backup schedules**. Current PITR availability was not established. An earlier isolated production restore covered schema 33; it is not current schema-43 recoverability evidence. Existing encrypted private recovery archives were not opened or modified.

Sanitized evidence: ignored `.verification/final-foundation-production-readonly.json`, `final-foundation-production-metadata.json`, `final-foundation-worker-config.json`, `final-foundation-backup-status.json` and `final-foundation-oct30-production-check.log`. No secrets, customer records or connection strings are included in this handoff.

## Local implementation

- `server/auth/cleanup.js`: removes expired/consumed registration and password-reset proofs, preserving active verified signup proofs and account/audit records.
- `server/auth/maintenance.js`: advisory transaction lock and shared five-minute cooldown prevent duplicate cleanup across mail-worker replicas.
- `server/mail-worker.js`: runs cleanup through the existing mail worker; failures are safely logged and do not stop normal delivery. No new service is needed.
- `server/db/cleanup.js`: reuses challenge cleanup in the existing explicit maintenance transaction.
- `server/auth/password-reset.js`: safely rejects a challenge removed between its initial lookup and row locking rather than returning an internal error.
- `server/db/readiness.js`, `server/index.js`: readiness requires the exact migration manifest, including rejecting unexpected newer history.
- `server/db/migrations.js`: rejects unknown migration history before applying pending application migrations. Historical migrations/checksums remain unchanged.
- `server/config.js`: valid Railway commit SHA supplies release identity when no explicit APP_RELEASE exists.
- `scripts/verify-postgres.mjs`: disposable test subprocesses strip additional payment/scanner/alert credentials alongside existing mail/AI credentials.
- `scripts/verify-master-local.mjs`: includes release-readiness tests.

New tests: `auth-cleanup.integration.test.mjs`, `business-email-first.integration.test.mjs`, `privileged-auth.integration.test.mjs`, `release-readiness.test.mjs`, `trial-billing-upgrade.test.mjs`.

Existing fixture/test updates: `tests/helpers/isolated-app.mjs`, `tests/helpers/connected-fixture.mjs`, `business-access.test.mjs`, `business-presets.integration.test.mjs`, `company-onboarding-acceptance.integration.test.mjs`, `config.test.mjs`, `database.test.mjs`, `domains.integration.test.mjs`, `password-codes.integration.test.mjs`, `practical-setup.integration.test.mjs`, `pro-network.integration.test.mjs`, `recovery-restore.integration.test.mjs`, `release-accounts.integration.test.mjs`.

Grandfathered-company regression fixtures explicitly represent the existing pre-trial cohort. New-company tests retain OS activation restrictions; no production guard was weakened. The cooldown test now pins its own clock rather than assuming previous requests remain within the same fixed minute. Fictional restore tests compare all restored table counts/content digests and the migration ledger.

## Verification

- Static checks: **1,620 passed, 0 failed** (`final-foundation-static-rerun.log`). This repository's build/lint scripts invoke the same static checker; these are not three independent checks.
- Earlier focused regression run: **111 passed, 0 failed**, before the final readiness/maintenance additions.
- Earlier complete run: **519 passed, 2 failed**: one cooldown subtest and its parent. The test's fixed-minute assumption was corrected; this result is not represented as a pass.
- An interrupted complete run had no final result and is not counted as passed.
- A sandboxed retry could not start PostgreSQL. Subsequent process-approval attempts timed out; these are execution failures, not PostgreSQL business assertion results.
- **30 October complete run: 522 passed, 0 failed, 0 cancelled, 0 skipped; exit 0**, duration 192000.1352 ms. Command: `node scripts/verify-postgres.mjs` (stdout/stderr captured in `.verification/final-foundation-oct30-postgres.log`). The local cluster was stopped successfully. This supersedes the earlier failing/interrupted runs for the current candidate.
- The successful run verified all 43 matching migration entries, repeat-run no-op, migrations 042/043 transactional failure rollback/retry and unknown-history rejection. The fictional backup restored 139 tables with matching counts/content digests and matching migration history.
- `git diff --check` passed with line-ending warnings only. Protected dashboard, marketplace and logo files have no diff.

Database integration uses generated loopback-only credentials and a disposable local cluster. SMTP is mocked in those tests, while authentication, transactions, constraints, tenant checks and migration failure/retry checks use PostgreSQL. Fictional local restore results do not prove production-backup recovery. No new real inbox receipt is established by this run.

## Release and recovery procedure

1. Finish the complete local suite; retain exact command, exit status and final counts. Resolve any critical failure before release.
2. Obtain explicit approval for ONE temporary private Railway PostgreSQL service/volume and labelled test emails only to the approved inbox. Verify target identity, independent credentials and isolation before writing anything. Do not add a public domain/proxy. Read-only logical export must be restored only to that target, compared against the captured source snapshot and cleaned up with the approved scope. Do not retain plaintext production data locally. Physical-snapshot restoration is a different claim.
3. Record current inbox receipt of delivery and alert checks. Provider acceptance is insufficient. Do not change a real user's password or create production test accounts without separate approval.
4. Agree ongoing backup retention, schedule, recovery objectives and alert ownership. Do not configure recurring paid services under one-off recovery approval.
5. Confirm privileged owners' verification/MFA enrolment and recovery access before proposing an explicit configuration rollout. Never request private OTPs, passwords or MFA secrets in chat.
6. Obtain separate approval for release. Use the existing migration runner and reviewed deployment mechanism. This candidate requires no new migration; do not duplicate pre-deploy migration execution on workers.
7. Verify exact release identity, health/readiness, mail/monitor heartbeats, the new auth-cleanup heartbeat and safe error logs after deployment. Perform approved registration/recovery acceptance without exposing private codes.
8. For code rollback with schema 43 unchanged, the current known baseline is `2cf589433ee2d38cb0b54dc94ae0b2c8ef9b00b4`, subject to compatibility review. Do not use a pre-042 artifact, delete migration ledger entries or run reverse SQL. Unknown newer schema history must fail readiness. A production restore/cutover requires separate maintenance authorization and verified recovery evidence first.

## Remaining gates and boundaries

- Final local PostgreSQL verification: CLOSED, with the successful result above.
- Current production backup restore/comparison in an approved isolated target.
- Current real delivery/alert receipt.
- Ongoing backup policy and privileged-access rollout decisions.
- Separately authorized deployment and post-release verification of local fixes.

No staging was created; no production records, variables, migrations, DNS or deployments were changed. No Git staging, commit, push, merge or history changes occurred. Customer dashboard and official brand assets remain unchanged. Stop at Phase 1 until these gates are supported by evidence.
