# Phase 4 — Dependable automation

Implemented locally on 19 October 2026. Existing uncommitted work was preserved. No production connection, production migration, deployment, environment/DNS change, infrastructure creation, real message, commit or push was performed.

## Delivered

- PostgreSQL-backed reminder rules, durable jobs, leased claims, attempt history, delivery ledger and worker heartbeat.
- Owner-approved rules for lead follow-ups, quotation expiry, unfinished installation milestones against project schedules, outstanding issued invoices and service follow-ups. Rules start paused. Customer recipients start disabled.
- A separate bounded background worker with restart recovery, concurrent-worker locking, retry delays and five-attempt exhaustion. Explicit manual retry retains the delivery identity and requires a reason and current approval.
- In-app notification creation and its delivery/audit/completion records commit together. A crash before commit leaves no partially delivered notification. Unique job/delivery identities and claim tokens protect against replay and duplicate execution.
- Current company lifecycle, commercial feature allowance, approver authority, recipient role, current assignment, customer ownership, personal preferences and source date/status are checked again at delivery. Continuing to possess read access after reassignment is insufficient to remain an intended recipient.
- Personal reminder preferences and a protected owner reminder centre with rule confirmation, queued/delivered/skipped/dead states, recent attempts, safe failure codes and worker freshness.
- Today/notification navigation links to reminder management/preferences. Authorized SIA business summaries include real waiting/exhausted reminder counts and source links. Existing session/payload-bound SIA follow-up approval remains the only SIA execution path; no autonomous business mutation was added.

## Delivery scope and exactness

This phase delivers **in-app reminders**. It does not send reminder emails, SMS or WhatsApp messages. Existing invitation/recovery email remains separate. No external provider delivery, read receipt, reminder email delivery, financial action or exact external-delivery-once guarantee is claimed.

Within this database-backed channel, each company/kind/record/recipient/channel/India-day occurrence has one delivery identity. A delivered notification is not proof it was read. Overdue work may produce another daily occurrence until resolved, paused or opted out. Editing a rule cancels unfinished prior-approval jobs and does not recreate already-used same-day identities.

Recipient reminder preferences default to allowing optional in-app reminders after company rule approval. Users can disable all or individual types. The owner's customer-recipient choice and current customer ownership/permissions are additional requirements. Essential explicit business/security updates are unaffected.

Individual milestone deadlines are not stored in the existing schema; this implementation uses the project's actual schedule and unfinished milestones without inventing milestone dates. Missing source dates are not guessed.

## New migration and files

- `server/db/migrations/012_automation.sql`: new owner-scoped automation permissions; preferences, rules, jobs, deliveries, attempts and heartbeat tables; constraints, tenant foreign keys, uniqueness and queue indexes. Migrations 001–011 remain unchanged.
- `server/automation/catalogue.js`: fixed supported kinds, messages, source tables and date/status rules.
- `server/automation/engine.js`: bounded planning, recipient authorization, claims, delivery, retries and tick orchestration.
- `server/automation/routes.js`: owner approval/history/retry APIs and authenticated personal preferences.
- `server/automation/worker.js`: migration-checked worker command, single-pass mode and graceful shutdown.
- `src/automation.js`: owner and personal-preference screens.
- `tests/automation.integration.test.mjs`: durable-worker, authorization, delivery and recovery regressions.
- `tests/helpers/connected-fixture.mjs`: existing fictional customer journey fixture extracted for reuse; business logic remains in application services.
- `AUTOMATION_RUNBOOK.md`: activation, scheduling, failure handling, retention and SIA boundaries.
- This handoff.

## Existing files extended

`server/index.js`, `server/sia/tools.js`, `src/account.js`, `src/app.js`, `src/workspace.js`, `src/operations.js`, `index.html`, `experience.css`, `sw.js`, `package.json`, `scripts/browser-check.mjs`, `scripts/prepare-staging.mjs`, `tests/connected-journey.integration.test.mjs`, `tests/domains.integration.test.mjs`, `tests/fixtures/migration-checksums.json` and `README.md`.

The migration fixture appends 012's checksum; historical entries are retained. The existing domain integration's upgrade coverage now includes 012 and compares the actual manifest length rather than assuming exactly 11 entries. No dependency was added.

## Interfaces

- `GET /api/companies/current/automation?page=1`: company rules, bounded delivery/attempt history and worker freshness; requires `automation.read`.
- `PUT /api/companies/current/automation/rules/:kind`: exact settings, expected revision, confirmation and reason; requires `automation.manage` and the relevant module permission/feature for enabling.
- `POST /api/companies/current/automation/jobs/:id/retry`: reviewed current-day exhausted job only; requires current company authority/entitlement and approval.
- `GET|PUT /api/reminders/preferences`: authenticated user's own optional reminder choices, derived from the session.
- Worker: `npm run worker:reminders` or `npm run worker:reminders:once`.

State-changing requests reuse session, same-origin and CSRF protections. Company identity comes from the authenticated current-company context. Queue data cannot supply trusted role/permission claims. The worker derives all authority from current database records. No HTTP endpoint runs an arbitrary background command.

## Local verification

- `node scripts/verify-postgres.mjs`: **213 tests passed, zero failures/skips**. Disposable loopback PostgreSQL only; stopped afterwards.
- `node scripts/browser-check.mjs`: **160 checks passed, zero failures or uncaught browser exceptions**, including six widths from 360 to 1440 pixels. New browser scenarios use explicitly fictional read-only responses; PostgreSQL integrations exercise real services separately.
- `npm.cmd run build`: **787 static checks passed, zero failures**. This project's build is the syntax/import/assets/dependency check runner. The final assignment recheck also received direct syntax checks.
- Existing fresh/upgrade/checksum/repeat-run coverage verifies the full **12-entry migration chain**, including migration 012's constraints and owner grants. Historical migration checksums remain intact.
- Worker entry point was actually run with `--once` against the isolated schema. It succeeded with the complete migration chain and refused to start when its migration tracking was temporarily absent. No `.env` file or production settings were loaded for that subprocess.
- Integration evidence covers concurrent claimers, duplicate execution, transactional rollback after notification insertion, bounded retries/exhaustion, expired leases/stale tokens, audited manual retry, foreign-company denial, CSRF rejection, stale rule revisions, opt-out, completed sources, paused approvals, customer ownership, assignment removal, CRM read access retained after reassignment, company suspension, removed module/approver authority and commercial access restrictions.
- Initial expanded fixtures hit the existing publication and one-project-per-order constraints. Fixtures were corrected; those constraints were preserved.
- Logs: `.verification/phase4-tests.log`, `.verification/phase4-browser.log`, `.verification/phase4-static.log`. Screenshots/results: `.verification/browser/`. These artifacts are ignored by Git.

## Activation and remaining acceptance

No new environment variable or credential is required. Live automation remains inactive until the authorized release applies migration 012, a separate worker process is configured/running and owners approve appropriate rules. The current web Railway configuration was not changed; an HTTP health check must not be applied to a non-HTTP worker process. See the runbook before operator setup.

For the manual trial, approve a staff-only rule against maintained fictional/trial dates, observe one notification and delivery row, restart the worker, verify no duplicate, then test opt-out, rule pause, source completion and a reviewed failure retry. Enable customer recipients only after their experience/preferences are reviewed. No real external message is necessary for this acceptance test.

History persists; automatic retention/deletion is not implemented. Worker capacity, alert integration/receipt and real production acceptance need operational evidence. No production-readiness or thousands-company throughput claim is made.

## Next milestone

Release the reviewed code/migration and configure the authorized worker process, then complete the reminder acceptance trial. Do not begin Phase 5 automatically.
