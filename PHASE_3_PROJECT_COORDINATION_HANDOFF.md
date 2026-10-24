# Phase 3 — Project coordination and work handoffs

Implemented locally on 24 October 2026. Earlier uncommitted Customer 360 and people/sales-control work is preserved. No production database, Railway settings, secrets, deployment, commit or push was changed.

## What staff can use

- **Work → Projects → Open record:** ordered timeline, current stage, responsible employee, dates, overdue indicators, blockers and supporting references. Managers can add stages or select **Edit stage and schedule** to prefill an existing stage.
- **Work → Tasks → Open record:** start date/deadline, stage association, prerequisite tasks, required/optional checklist items, blockers and completion evidence.
- **Project record → Transfer outstanding project work:** preview the employee, receiving employee and affected responsibilities; explicitly confirm the handoff with a reason.
- **Company → Team → Employee departure and work handoff:** transfer open project/team responsibilities, tasks, stages, service work, leads, orders, team management and direct reports; suspend or remove the departing membership in the same transaction.
- Activity history records previous/new assignee names and IDs, operator, timestamp and reason. Completed tasks retain their original assignee and history.

## Rules and boundaries

The existing authenticated company context, role/profile permissions, entitlements, CSRF protection, company locking, idempotency table, notifications, audit system and file controls remain authoritative. No new permission catalogue, tenant store or external service was introduced.

Task prerequisites must be complete before starting/completing dependent work. Circular and cross-company dependencies are rejected. Required checklist items and evidence references are enforced on completion. Managers can explicitly remove a dependency or retire a checklist item with a recorded reason; cancellation does not imply completion.

Stages cannot finish before earlier stages or their open stage tasks. Project closure is blocked while linked tasks remain open, including tasks linked through the project's order/service records. New tasks are blocked on closed projects. Historical open tasks on closed projects can be explicitly cancelled by an authorised task manager; completed task history remains read-only.

Handoff confirmation is tied to the actor, company, current work, membership revisions and recipient permissions. Changed work requires a fresh preview. Company locking serializes concurrent claims; operation keys prevent duplicate execution and reject changed retries. A receiving employee must already be active and capable of every transferred duty. An employee's own reporting chain cannot receive their departure handoff, avoiding management cycles. Ownership transfer is excluded.

Older membership removal, project removal and role/profile restriction paths reject changes that would strand open responsibilities. Employee departure revokes company membership; project transfer removes project membership. Broad company permissions remain valid: removing a project assignment does not revoke an owner's or supervisor's independently authorised company-wide access. Completed task access remains governed by its original assignment until company membership is revoked.

Custom stages are private by default in the form. Existing eight stages retain customer visibility. Customer progress, exports, handover records, SIA tracking context and milestone reminder eligibility filter private stages. Internal blocker and assignment-history details are not automatically shared with customers.

Evidence references are staff-entered text, not independent certification. Supporting files continue through existing protected project upload/download controls. This phase does not implement offline syncing, automatic external approvals, critical-path forecasting or bulk historical data repair.

## Database and release

New migration: `024_project_coordination.sql`.

It extends existing milestones/tasks/events; adds dependency and checklist tables, composite tenant foreign keys, date/order constraints and indexes; and backfills the original eight stage titles/order/evidence rules while preserving existing notes/status/references. Historical migrations were not edited. Migration `023_people_sales_controls.sql` from Phase 2 is also still part of the uncommitted release.

Use the existing checksum-aware `npm run db:migrate` release mechanism. The repository Railway configuration already specifies this pre-deploy command and `/readyz`; its effective production state was not inspected or changed in this task. Do not deploy new code against a database missing its required migrations. Apply through 024 only during a separately authorised release with a recovery point.

## Files for this phase

- New: `server/db/migrations/024_project_coordination.sql`, `server/operations/project-coordination.js`, `server/operations/work-handoffs.js`.
- Extended: `server/index.js`, `server/operations/core.js`, `server/operations/delivery.js`, `server/operations/read.js`, `server/people-sales.js`, `server/tenancy/routes.js`.
- Customer privacy integration: `server/operations/customer.js`, `server/customer/experience.js`, `server/customer/records.js`, `server/solar-delivery.js`, `server/sia/tools.js`, `server/automation/engine.js`.
- UI: `src/operations.js`, `src/organization.js`, `operations.css`.
- Verification: `tests/project-coordination.integration.test.mjs`, `tests/project-coordination-upgrade.test.mjs`, `tests/automation.integration.test.mjs`, `tests/pro-network.integration.test.mjs`, `scripts/browser-check.mjs`.

## Verification evidence

Local only: disposable loopback PostgreSQL, fictional records, and intercepted browser fixtures. No production credentials or customer records were used.

Final results: **312 automated tests passed, 0 failed, 0 skipped; 609 browser checks passed, 0 failed; 1,124 static checks passed, 0 failed.** `git diff --check` passed. The full automated run includes the populated 023-to-024 upgrade, checksum/repeat-run and composite constraint test.

Commands: `node scripts/verify-postgres.mjs`, `node scripts/browser-check.mjs`, `node scripts/check.mjs`, `git diff --check`. Results are recorded in `.verification/phase-3-integration.log`, `.verification/phase-3-static.log`, `.verification/phase-3-browser.log` and `.verification/phase-3-upgrade.log`. Browser fixtures do not execute real business writes; actual write behaviour is exercised through PostgreSQL integration tests.

The browser run covers 360, 390, 768, 1024, 1280 and 1440px, stage-edit prefilling/focus, truthful failures, typed payloads, scoped headers and explicit handoff approval. Screenshots were reviewed at desktop/mobile sizes. One earlier browser run timed out in the employee Today fixture without an uncaught exception; the standalone repeat passed. Do not interpret local verification as production acceptance.

Next milestone: an explicitly authorised release through migration 024, followed by owner/employee acceptance of project coordination. Phase 4 was not started.
