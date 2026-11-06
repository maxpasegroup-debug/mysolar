# MY SOLAR — Razorpay webhook inbox implementation report

**Date:** 6 November 2026  
**Scope:** Local code and mock tests only. The migration was created but **NOT EXECUTED**. No database, Railway setting, Razorpay account, production webhook, payment, deployment, commit, or push was used.

## 1. Migration created

`server/db/migrations/047_razorpay_webhook_inbox.sql`

The repository uses numbered SQL migrations registered from `server/db/migrations.js`; it has no Prisma schema. The migration creates a dedicated `razorpay_webhook_inbox` table with:

- Mode-scoped provider event ID and raw-payload hash uniqueness.
- Event type, provider subscription ID, optional contract association, UUID correlation ID, and receipt time.
- AES-GCM encrypted original raw payload, using the app's existing `DATA_ENCRYPTION_KEY` envelope helper.
- `pending`, `processing`, `retry`, `processed`, `dead`, and `review_required` states.
- Attempt count, availability time, claim time/token, lease expiration, safe last error code and completion time.
- Partial indexes for ready work, expired leases, event history, and linked contract history.

The migration has **not** been run. The worker refuses to start until the full migration manifest is present and current.

## 2. Inbox and acknowledgement architecture

### Before

The raw-body route verified the signature, looked up the contract, checked prior processed-event rows, called Razorpay synchronously (one read for most events, up to three serial reads for a charge), then performed billing state and entitlement work before responding.

### After

`POST /webhooks/razorpay/` is still registered before the normal JSON parser and keeps Express raw-body capture with a 256 KB cap. It verifies the HMAC over those exact bytes, validates the event type and required identifiers, encrypts the verified raw body, and inserts the inbox row in a short transaction. The route returns HTTP 200 only after that transaction commits. It performs no contract lookup and no Razorpay API request before acknowledgement. A database failure propagates as an error response so Razorpay can retry.

Exact duplicate deliveries return 200 after finding the durable original inbox row. Reusing an event ID with different content returns a conflict and is not treated as a duplicate. Signed but unsupported event types continue to receive an explicit ignored response and are not sent to the billing worker.

## 3. Worker, retries and leases

New worker: `server/commercial/razorpay-webhook-worker.js`.

- `worker:razorpay-webhooks` polls every second; `worker:razorpay-webhooks:once` supports a one-tick operational run.
- Claims are committed in a DB transaction using `FOR UPDATE SKIP LOCKED`, a unique claim token and a 120-second lease. Multiple workers cannot claim the same locked row.
- Expired leases are reclaimable. A crashed worker therefore does not strand an event. When the maximum attempt count has been reached, an expired or due job is marked dead.
- The worker decrypts the preserved raw bytes and checks their hash, obtains the current provider subscription state, then fetches payment and invoice details for charge events.
- Entitlement changes and the inbox completion marker are committed together in one transaction. Existing plan/mode/revision checks remain in effect. Only a captured INR payment with the matching paid invoice can grant a paid period. Older paid periods cannot replace a later recorded period. Pause, resume, update, pending, halted, cancel and complete observations do not themselves grant a new paid period.
- Transient errors use bounded exponential retry (5 seconds doubling to a one-hour ceiling) with at most eight attempts. Integrity/provider-context failures move to `review_required`; exhausted retries move to `dead`. The latest error is a fixed safe code, not provider/database text.
- Authorized platform operators with `platform.commercial.subscriptions` can inspect event metadata through `GET /api/platform/billing/webhook-inbox` and requeue dead/review-required records through `POST /api/platform/billing/webhook-inbox/:id/retry` with a reason. Events already recorded in the processed billing journal cannot be replayed from this endpoint; they require payment/entitlement reconciliation instead.
- Structured logs include event ID, inbox ID, event type, mode, attempt/status and request correlation where applicable, including distinct received, persisted, claimed, started, completed, retry-scheduled, failed and permanently-failed events. Payloads, payment content, customer details and secrets are not logged. The worker updates the existing `process_heartbeats` record; the operations monitor now raises a stale-worker incident when billing is configured and its heartbeat is older than two minutes.

## 4. Files changed

- `server/db/migrations/047_razorpay_webhook_inbox.sql` — new inbox schema and indexes.
- `server/commercial/webhook-inbox.js` — raw-signature validation, event validation, encrypted durable insert, duplicate handling and payload integrity check.
- `server/commercial/razorpay-webhook-worker.js` — claims, leases, provider verification, transactional processing, retry/dead-letter behavior and worker entry point.
- `server/commercial/os-routes.js` — fast durable acknowledgement plus protected event inspection/manual recovery endpoints.
- `server/operations-health.js` — stale webhook-worker heartbeat alert condition.
- `package.json` — continuous and one-shot worker commands.
- `tests/razorpay-webhook-inbox.test.mjs` — focused mock/unit coverage.

`server/commercial/os-billing.js` continues to enforce the existing captured-invoice and plan rules; it was not changed as part of this implementation.

## 5. Tests and acknowledgement measurement

- Focused command: `node --test tests/razorpay-webhook-inbox.test.mjs tests/business-subscription.test.mjs tests/business-subscription.integration.test.mjs` — **39 passed, 0 failed, 1 skipped**. The skip is database-backed and remained skipped; `TEST_DATABASE_URL` was unset so no test could apply a migration.
- New focused tests cover valid/invalid signatures, exact raw-byte integrity, encrypted payload storage, persistence failure, duplicate delivery and event-ID collision, mocked fast acknowledgement, `SKIP LOCKED` claim/reclaim SQL, exponential retry, permanent/review failures, pause/resume/update/pending/halted/cancel/complete behavior, verified payment entitlement, unverified payment rejection, delayed older renewal protection and migration file contents.
- Mocked acknowledgement measurement: **32.0 ms** from signature parsing through a test persistence callback delayed by 25 ms. This is simulated storage timing, not PostgreSQL commit timing or production performance. The test also confirms the helper does not depend on a Razorpay client.
- Database-backed timing and actual concurrent-worker behavior remain unverified because the migration was not applied. The unit fixtures inspect claim SQL and lease transitions but cannot prove PostgreSQL locking behavior.
- `npm.cmd run check` — **1,773 passed, 0 failed**.
- Full suite — **231 passed, 5 failed, 59 skipped** (295 total). The same five previously reported failures remain: Boss dashboard's old Sales Booster “Coming soon” expectation, commercial team-cap invitation assertion, legal proposal amount assertion, and two SIA orb assertions. No failures were suppressed.

## 6. Migration and infrastructure requirements

The database must eventually apply migration 047 before the new ingress route and worker are released together. Configure a separate persistent worker process using `npm.cmd run worker:razorpay-webhooks`; it needs the same database and `DATA_ENCRYPTION_KEY` as the app, plus the mode-appropriate server-side Razorpay API credentials. The normal app/webhook process continues to use its webhook secret. Operational alert delivery still depends on existing monitoring/mail configuration.

**Exact eventual migration command:**

```powershell
npm.cmd run db:migrate
```

That command applies all pending migrations, including 047. It was **not run**. Wait for separate authorization before executing it against any database.

## 7. Remaining launch blockers

- Apply migration 047 only after separate authorization, then run database-backed inbox, duplicate, lease-recovery and concurrent-claim tests in an explicitly disposable database.
- Set and approve a retention period for encrypted raw webhook payloads while retaining the event metadata needed for billing audit and reconciliation.
- Measure real local PostgreSQL acknowledgement p50/p95/p99 with committed inbox writes and delayed-provider simulation; the current 25.6 ms figure is only a mock.
- Configure and supervise a separate worker service only after schema is available; verify its heartbeat/alerts and recovery after a forced worker stop.
- Perform Razorpay test-mode end-to-end checkout/webhook tests. No external Razorpay test or live credentials were used.
- The earlier subscription readiness blockers remain: legal/tax approval, final commercial terms and verified Razorpay plan mappings. Live billing remains disabled and no deployment was performed.
