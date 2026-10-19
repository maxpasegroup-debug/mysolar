# MY Solar release operations runbook

This runbook covers the eight-phase local development programme. It does not authorize deployment, production migrations, messages, domain changes or paid services. No staging application was added. Historical acceptance reports retain their original scope; local verification is not live acceptance.

## Before an approved live release

1. Review the intended diff and immutable release identifier. Inspect the actual Railway service source branch, root directory, build/start commands, pre-deploy command and readiness path. Checked-in `railway.json` specifies `npm run db:migrate` and `/readyz`; effective Railway overrides were not verified here.
2. Confirm a recoverable database backup and the current migration manifest. Preserve the previous application revision and worker revisions. Do not rewrite migrations 001–012 or previously applied checksums. New migrations 013–020 are additive; only the supported runner may apply them to an explicitly approved target.
3. Put a separate 64-hex-character `DATA_ENCRYPTION_KEY` in the operator's secret manager and approved service variables. Back it up separately and securely. It protects MFA secrets, queued email and uploaded content. Losing it can make MFA accounts inaccessible and files/mail unreadable. Key rotation requires a controlled re-encryption implementation; it is not implemented by changing the variable.
4. Confirm existing Resend/SMTP configuration and the sender's verified status. Intended sender: `noreply@mysolar.solutions`, subject to actual provider verification. The app reads `MAIL_FROM`. `RESEND_API_KEY` selects the existing Resend SMTP defaults only when an unrelated SMTP host/user is not configured. An API key alone is insufficient without a sender, encryption key and running mail worker. Never paste credentials into chat or commit them.
5. Configure an approved alert recipient before enabling alerts. No recipient was invented or contacted. Use `APP_RELEASE`, `OPS_ALERTS_ENABLED`, `OPS_ALERT_RECIPIENT` and `DB_WARNING_BYTES` as described in `.env.example`.
6. Deploy and supervise the web, reminder, mail and monitoring processes under separate approved process configuration. Do not replace the web start command with a worker command. All processes must use the correct approved database and encryption key. This programme did not provision Railway services or modify remote variables.
7. Keep custom-domain traffic/provisioning disabled until a routing/TLS provider and actual client hostname/DNS authorization are approved. Client delivery sequence: verify and connect the domain through that boundary, tailor the brand page, review and publish. Current `/sites/:companyId` publication works on the central platform only.

## Supported process commands

| Process | Command | Purpose |
| --- | --- | --- |
| Web | `npm start` | HTTP application; does not drain mail/reminder jobs |
| Supported migrations | `npm run db:migrate` | Checksums, sequential transactions and advisory locking |
| Reminders | `npm run worker:reminders` | Discover/revalidate approved in-app reminders and eligible email jobs |
| Mail | `npm run worker:mail` | Lease, revalidate and retry durable queued messages |
| Monitor | `npm run worker:monitor` | Database size/connections, recorded errors, reminder health and exhausted mail alerts |
| Scheduled cleanup | `npm run db:cleanup` | Expired auth records, mail payloads, terminal queue/event retention and abandoned previews |

Each worker also has a `:once` script for an explicitly approved controlled execution. Do not run these commands against production merely to inspect configuration: workers and cleanup write records and mail workers can send messages. Run one monitoring process; transaction-level locking also prevents overlapping monitor ticks. Schedule cleanup through the approved hosting scheduler. A local process starting is not proof a hosted supervisor is configured.

## Health, alerts and delivery triage

- `/healthz`: process responds. `/readyz`: expected migration names and checksums are present. Neither proves business acceptance or email delivery.
- Protected UI: `/#/platform/operations`, `/#/platform/mail`, `/#/platform/costs`, `/#/platform/white-label-requests`, `/#/platform/locations`. Existing platform roles remain mandatory at the API boundary.
- Monitoring queues generic alerts with no private business records. Accepted mail means SMTP accepted the submission, not inbox receipt. Verify actual recipient receipt and record redacted evidence separately.
- Configure an approved external uptime monitor for `/readyz`; an internal monitoring worker cannot detect the loss of its own host. No external monitor or database-host alert integration was provisioned here.
- Mail failures keep bounded attempts and safe codes. An authorized operator may retry an unexpired pending/retry job or cancel it with a recorded reason. Exhausted/expired security jobs have their payload removed; request a fresh verification, invitation or recovery link through the original authorized workflow. Never resend stale credentials or manufacture delivery records.
- SMTP delivery is at-least-once. Stable message IDs and leases reduce duplicates, but SMTP does not provide an atomic transaction with PostgreSQL. Do not promise exactly-once external receipt.

## Security-policy rollout

`AUTH_REQUIRE_VERIFIED_EMAIL` and `AUTH_REQUIRE_PRIVILEGED_MFA` default to false for a controlled rollout. Enrolled MFA is always checked on login; successful password changes revoke sessions. The optional privileged policies gate owner/platform mutations, with MFA freshness of 15 minutes. They do not replace company permissions, subscriptions or customer ownership.

Before enabling the policies, verify real delivery, enrol each relevant operator/owner, store their one-time recovery codes privately, rehearse recovery and retain an authorized recovery route. No unaudited backdoor or hardcoded admin account was added. MFA secret displays and recovery codes are not saved in browser storage.

## Secure uploads

Uploads are deliberately blocked without `FILE_SCAN_URL`, `FILE_SCAN_KEY` and the encryption key. The scanning gateway must be an already approved HTTPS endpoint with no embedded credentials/query/hash. The server posts bytes with `X-Content-SHA256` and a Bearer key. A bounded JSON response must contain `clean: true` and the exact `sha256`; any other result fails closed. This interface is not a supplied scanning service.

Only PDF/PNG/JPEG up to 2 MB are accepted after content-signature checks. The default company quota is 100 MB. Encrypted content is in PostgreSQL, suitable for a bounded pilot, not an unlimited file platform. Company record permissions and customer ownership are rechecked on access. Customer sharing is explicit; deletion removes content and keeps minimal audit metadata. No public asset link exposes a private document. Large-scale object storage and a full scanning-provider integration require a separate reviewed implementation.

## Recovery and rollback

The local suite actually dumped a fictional schema, restored it into a separate disposable database, compared migration checksums and a sentinel record, and removed the restored database. This proves that local exercise only. It does not prove Railway backups are enabled, retained, restorable or timely.

For an approved remote exercise: identify the target and last recoverable point; stop or fence writes and workers; restore into a separate approved recovery target; verify record counts, checksums, ownership and application access; obtain a cutover decision; record the recovery point/time and redacted evidence. Do not overwrite live customer data or replay reminder/mail jobs blindly. Revalidate queued work before restarting delivery.

On release failure: capture the release ID/request reference, pause affected workers, inspect `/readyz` and safe logs, and prefer a forward fix. Roll code back only to a revision compatible with the applied schema and mail protocol. A pre-programme web release can send email immediately while this release has queued messages: stop delivery and reconcile pending work before switching versions. Do not reverse migrations, delete migration history or restore over newer transactions as a routine rollback.

## Retention and known boundaries

Scheduled cleanup removes expired verification/pending-MFA material, scrubs expired mail, removes terminal mail jobs/attempts and operational error events after 30 days, and removes abandoned preview imports one day after expiry. It must actually be scheduled; no automatic hosting schedule was installed. Completed import/audit history, business data, saved website versions and service history are retained. SIA keeps its existing user/scope deletion behavior. No blanket account-deletion scheduler or retention-compliance certification is claimed.

Legal policy pages remain explicitly marked draft/noindex until the operator approves final responsibilities, contacts and retention terms. Reviewed postal mappings require a legitimate source/import; no national dataset was invented. SMS/WhatsApp automatic delivery, billing checkout, autonomous finance, production capacity certification and client-domain provisioning are not enabled. Manual real-company/customer acceptance remains the owner's responsibility.
