# Reminder worker operations

This worker delivers approved operational reminders **inside MY SOLAR**. It sends no email, SMS or WhatsApp messages and does not request payments or change orders, milestones, stock, collections or service status. Existing transactional email and SIA approvals remain separate workflows.

## Release and start

1. Release the reviewed application changes using the established procedure. Apply migration `012_automation.sql` through the existing migration runner. Historical migrations remain unchanged. The web readiness endpoint and worker both require the complete current checksum-verified chain.
2. Run a separate persistent worker process from the same release and authorized database configuration:

   ```powershell
   npm run worker:reminders
   ```

   A single bounded pass, suitable for an operator-controlled scheduler, is:

   ```powershell
   npm run worker:reminders:once
   ```

   Run these only in the intended environment. The commands use the existing application environment loading convention. No new secret is required. Never use production settings for local tests.
3. If using Railway, configure an explicitly identified worker service/process with the same intended release and database context. Its start command is the worker command above; it is not an HTTP service and cannot use the web service's `/readyz` HTTP health check. The repository's web deployment configuration remains unchanged. Do not give the worker a public domain. Infrastructure creation and deployment require their own authorization; neither was done by this implementation.
4. Start workers only after the supported web/application migration step completes. Avoid simultaneous migration execution by multiple services. The worker itself never applies migrations.
5. As an authorized company owner, open **Today → Review reminders and delivery failures**, or **Company settings → Reminders & automation**. Verify a recent completed worker check. Each rule starts paused and requires explicit review of timing, recipients and a reason before approval.
6. Validate with approved trial data and personal preferences before enabling customer recipients. Those recipients are off by default for every rule.

## Scheduling rules

- India calendar dates and `Asia/Kolkata` scheduling; configurable daily hour from 08:00 to 18:00.
- Lead follow-up: an open lead's saved follow-up date is due; owners and the assigned employee only. No customer-facing follow-up text is sent automatically.
- Quotation expiry: a currently issued quotation for an open enquiry is within the configured 0–14 day window and has not expired. Authorized owner/creator, plus the enquiry customer only if approved.
- Installation milestones: a pending/active/on-hold project has a saved schedule within the configured 0–14 day window and unfinished milestones. Authorized owners, manager and assigned project staff; linked customer only if approved. Individual milestone due dates are not stored and are not invented.
- Collection follow-up: an issued invoice is due and its net recorded collections leave a positive balance. Authorized owners; linked customer only if approved. The reminder is not a payment request or proof of payment.
- Service follow-up: an unresolved/unclosed service request's saved follow-up date is due. Authorized owners/assignee; linked customer only if approved.
- Missing dates are not guessed. Maintain the dates in existing business screens.
- At most one job per company, reminder kind, record, recipient, channel and India calendar day. Overdue eligible work may receive a new daily occurrence until resolved or paused.
- An approved hour is the earliest scheduled processing time, not a guarantee of exact-time delivery. Worker outages can delay a same-day reminder. Old-day occurrences are skipped; the next day receives its own eligible occurrence.
- Rule edits/pause cancel unfinished jobs from the earlier approval. Existing same-day identities are not recreated by repeatedly changing the rule. Review changes carefully; the next daily occurrence uses the new settings.

## Preferences and authorization

Personal preferences are available from **Notifications → My reminder preferences** and the reminder centre. They cover optional automated in-app reminders only. They do not disable account/security messages or explicit business updates.

In-app reminders are allowed by default after the company's explicit rule approval; each user can disable all automated reminders or individual kinds. No email/SMS/WhatsApp opt-in is implied. Customer recipients additionally require the owner's per-rule choice, actual ownership and the current customer module grant.

Delivery rechecks the company lifecycle, current subscription feature allowance, approver's active membership and permissions, recipient's active account/membership, PRO restrictions where applicable, assignments, preferences, current source status/date and current rule revision. A queued job is not authority to access a record. Company suspension, entitlement loss, opt-out, source completion or revoked access prevents delivery.

## Recovery and duplicate protection

- PostgreSQL persists rules, jobs, claims, attempts, deliveries and worker heartbeat. Restarting a process loses no committed queued work.
- A claim is leased for two minutes and uses a random token. Concurrent claimers use row locks and `SKIP LOCKED`.
- An expired lease becomes retryable; a stale worker token cannot execute the replacement claim.
- Notification insertion, delivery record, audit event and delivered status commit together. A failed transaction rolls all of them back. The notification uses the job's stable UUID, and the delivery ledger has one row per job.
- Automatic retries use 30, 60, 120 and 240 second delays, up to five attempts per cycle. The status becomes **dead** after exhaustion. No external delivery provider is involved, so the database transaction can protect this channel's effect from duplicates.
- A reviewed manual retry is available only for an exhausted occurrence from the current India day and current approved rule. It keeps the original delivery identity and records the operator/reason in the existing audit system. Delivered, skipped or cancelled jobs cannot be replayed through this action.
- The worker scans up to 20 enabled rules per pass, 100 source records per rule, with a persisted cursor; delivery is bounded to 50 claims per default pass. It pauses 30 seconds between passes. Large backlogs need capacity observation and tuning; no thousands-company throughput benchmark is claimed.

## Failure visibility

The owner centre shows job states, attempt counts, safe error codes, recent attempts and the last completed worker check. “Delivered” means a notification was stored, not that it was read. A worker heartbeat older than two minutes is shown as needing attention.

- `DELIVERY_FAILED`: transaction failed; inspect worker/database operational logs without exposing private data. Automatic retry remains bounded.
- `WORKER_LEASE_EXPIRED`: a claim was abandoned; recovery rechecks all eligibility.
- `APPROVAL_CHANGED`: approval was edited/paused; unfinished work was cancelled.
- `SOURCE_CHANGED`: source status/date no longer matches the occurrence.
- `PREFERENCE_OR_ACCESS`, `ACCESS_UNAVAILABLE`, `STALE_OR_DISABLED`: safely skipped; inspect source access/preferences/lifecycle and the day. A skip is not a successful delivery.

Worker console events contain fixed names and aggregate counts, not record bodies, customer contacts, tokens or credentials. A failed pass records a failed worker state where the database is available. The web app remains usable while the worker is stopped.

No alert email or external alert-receipt result is claimed by this phase. Operators should connect the worker's failed/stale state to the already authorized monitoring system as a separate verified operational action.

## SIA boundary

Authorized owner business summaries include actual waiting/exhausted reminder counts and a link to the reminder centre. SIA can point to existing records; rule changes and retries require the human confirmation controls. Existing SIA customer-follow-up proposals still require their exact session/payload-bound approval and execute the existing enquiry-message service. There is no background model execution, autonomous financial operation or AI-generated permission decision.

## Retention

Rules, jobs, attempt/delivery history, preferences and audit entries persist in PostgreSQL. This implementation does not automatically delete them or claim an enforced retention period. Define and authorize an archival/deletion policy before high-volume expansion; preserve delivery identities and relevant audit history when implementing it.
