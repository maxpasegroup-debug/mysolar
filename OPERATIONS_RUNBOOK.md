# MY Solar staging release and recovery runbook

Scope: authorised staging only, 18 October 2026. This does not authorise production rollout, production backups/restores, DNS changes, live company-domain traffic, payments or real-customer onboarding.

## Fixed target and access

- Project: `b189e069-4956-40fb-aeec-8237b7347893`.
- Staging environment: `20d7716a-345d-4295-9cf4-3965c1aa50c9`.
- Application service: `b27efca8-cfe2-4a3c-9f8e-57f9f255408a`.
- PostgreSQL service: `058536fc-092b-4288-a48f-cb9cf8baae7d`.
- URL: `https://mysolar-staging.up.railway.app`.
- The service IDs are shared logical identities across environments. The **environment ID is mandatory on every command**. Database processes, credentials, private network, data and volume instances are separate.
- Production is `8e1cb532-b9d3-447a-aeca-60fd41ff06fb`; reject it for this runbook. No implicit-target command is safe.
- Staging uses `NODE_ENV=production`, exact HTTPS origin, secure host-only cookies, existing CSRF/permissions and an extra Basic access gate. Retrieve `STAGING_ACCESS_USER` and `STAGING_ACCESS_PASSWORD` privately from the staging app's Railway variables. Never place them in URLs, command arguments, logs, screenshots, Git or this document.
- `/healthz` and `/readyz` remain public GET/HEAD probes. Other pages/APIs/assets require private staging access. All staging responses carry a no-index header. Use fictional data only.

## Reproducible release

1. Inspect Git status and intended diffs. Preserve other work. Run appropriate local isolated regression/static checks.
2. Run `node scripts/prepare-staging.mjs`. Review its hash inventory and migration manifest. The script rejects unreviewed runtime changes and never deploys.
3. Confirm the artifact includes `server/staging.js`, the access gate and restricted mail wrapper. Do not roll staging back to an older candidate without those protections.
4. Check staging identity, fresh database isolation, secrets, approved mail recipients and service settings. Build `npm run build`, start `npm start`, pre-deploy `npm run db:migrate`, readiness `/readyz`, timeout 120 seconds, bounded on-failure restarts. Use explicit service settings; legacy JSON is not proof of effective configuration.
5. Upload only the reviewed artifact directory:

```powershell
railway.cmd up .verification/staging-releases/<reviewed-release-id>/app --path-as-root --project b189e069-4956-40fb-aeec-8237b7347893 --environment 20d7716a-345d-4295-9cf4-3965c1aa50c9 --service b27efca8-cfe2-4a3c-9f8e-57f9f255408a --detach --message <reviewed-release-id>
```

6. Record the returned deployment ID; detached upload does not prove success. Inspect build/pre-deploy/runtime logs and effective deployment metadata. Verify all eleven migration checksums and `/readyz` before acceptance. Use existing migration machinery; never apply SQL manually or edit historical migrations/tracking rows.
7. Run approved staging API/browser scenarios with credentials injected in memory. The staging acceptance/browser modules have an explicit hostname guard and never load `.env` or choose a production default. The acceptance module changes fictional business records and needs an independent fixture operator; do not run it casually against an already exercised fixture set without reviewing state. The local PostgreSQL integration suite remains loopback-only and must not be repointed at Railway.

## Code rollback

Keep the accepted artifact and deployment/image identifiers. If an unhealthy candidate is rejected, verify the earlier deployment continues serving `/readyz` and the private application. Restore any temporary health configuration to `/readyz`/120 seconds.

To roll back code, re-upload the retained, reviewed **staging-protected** artifact using the same explicit staging selectors. Confirm compatibility with the existing schema first. The pre-deploy migration runner is idempotent; this is not a down migration. Do not delete data, rewrite a checksum or assume an older image is compatible. Verify readiness, sessions, core workflows and logs after rollback.

## Backup and restore

Staging continuous archival and daily/weekly volume snapshots are configured. These are distinct mechanisms: a completed volume-snapshot restore does not by itself prove continuous archival is healthy afterward.

```powershell
railway.cmd postgres pitr status --project b189e069-4956-40fb-aeec-8237b7347893 --environment 20d7716a-345d-4295-9cf4-3965c1aa50c9 --service 058536fc-092b-4288-a48f-cb9cf8baae7d --json
railway.cmd postgres pitr backup list --project b189e069-4956-40fb-aeec-8237b7347893 --environment 20d7716a-345d-4295-9cf4-3965c1aa50c9 --service 058536fc-092b-4288-a48f-cb9cf8baae7d --json
```

For a recovery drill: record a fictional marker and migration ledger, create a real backup, verify completion, change the marker, restore the backup to a separate retained volume, then switch the **staging** database to that volume during a controlled outage. Verify exact marker rollback, migration checksums/timestamps, database identity, readiness and application reads. Retain the original volume until recovery is accepted. Never detach a volume by service name alone; verify volume and environment IDs immediately before reassignment.

Railway's snapshot restore API returned a detached recovered volume in this rehearsal. Do not claim recovery until it is attached and the recovered data is queried. Sequential detach/attach operations require waiting for the first environment change to finish; immediately attaching the second volume can fail validation while the first change is still applying. On any attach failure, inspect both volumes and restore a known staging attachment before proceeding.

A physical snapshot restore caused WAL archive conflicts with the original history. Recovered staging uses a new `WAL_ARCHIVE_PATH`, preserving the old archive. Verify a new base backup and successful archival after the switch. Do not clear WAL, reset checksums, disable validation or assume a healthy pre-restore archive proves current protection. A snapshot restore is not a PITR-to-timestamp drill; the latter remains separate.

Current retained volumes and evidence are in `PHASE_11_STAGING_ACCEPTANCE_HANDOFF.md`. Backup schedules must be verified against the **currently attached** volume after any switch. No automated deletion of old snapshots/volumes was configured by this task; retained resources incur storage usage until explicitly reviewed and cleaned up.

## Monitoring and incident response

The staging Railway Observability dashboard is created. Existing request-error logs use fixed categories/request IDs without SQL, credential values or full conversations. Health endpoints and database readiness gating are active. Metrics/readiness are not proof of notification delivery.

Required alert acceptance, still pending: independent HTTPS readiness checks every 60 seconds, alert after three consecutive failures; deployment failures/crashes immediately; application 5xx sustained above 1% over five minutes with a minimum request volume; database disk warning 80%, critical 90%; database connections warning 70%, critical 85%; backup/archiver failures immediately. These are proposed initial thresholds, not configured native monitor claims or measured service-level objectives. Measure pilot behaviour before adjusting them.

Railway's public GraphQL interface inspected in this task exposes dashboard creation but no monitor creation mutation. Browser access approval timed out, so native monitor thresholds and notification channels were not configured. Finish those in the staging Observability console using an approved alert destination, then deliberately trigger a safe staging-only failure and confirm actual receipt and recovery notification. Public uptime probes should also be operated outside this Railway deployment's failure boundary; no separate external monitoring account was created.

On an incident: confirm target, retain request/deployment IDs, assess readiness and dependency health, stop further rollout, roll back compatible code or follow the approved data recovery path, and verify recovery. Do not log credentials or private records while investigating. Production incident procedures, restore time objectives and on-call ownership need explicit acceptance before launch.

## Resend staging email

Configured public transport settings: `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER=resend`. This uses the existing nodemailer transport, with no new dependency. See [Resend SMTP](https://resend.com/features/smtp-service).

The operator must provide an approved mailbox and verified sender. Store a staging-only Resend key privately in the staging app's `SMTP_PASSWORD`; set `MAIL_FROM` to the verified sender and `STAGING_EMAIL_RECIPIENTS` to exact approved recipient addresses. No Resend key or sender/recipient was supplied during this execution. The empty allowlist blocks all outbound staging email even if credentials are later added. Hidden cc/bcc, envelope overrides and recipient arrays are rejected by the staging wrapper.

After authorised configuration, redeploy staging deliberately. Test invitation and recovery flows, recipient rejection, link hostname/expiry/single-use, provider failure cleanup and actual mailbox receipt. Record redacted provider identifiers and delivery events; SMTP acceptance alone is insufficient. No real email was sent by this task.

## Source control

No commit or push has been performed. `main` is connected to production deployment; pushing it needs a separate release authorisation. Commands for a future reviewed release branch only:

```powershell
git add --interactive
git diff --cached
git commit -m "Establish isolated staging release and recovery foundation"
git push -u origin <approved-release-branch>
```

Do not execute these commands until the intended release branch and approval are established.
