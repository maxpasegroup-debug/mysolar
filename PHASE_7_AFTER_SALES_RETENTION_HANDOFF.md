# Phase 7 - After-sales retention

## Scope and release status

Implemented in the existing Express/PostgreSQL application and plain JavaScript customer/distributor interfaces. Earlier uncommitted Phases 1-6 work was preserved. No production database, Railway configuration, secrets, external messages, deployment, commit or push was performed. Phase 8 was not started.

## Connected service journey

- Customers can report service against their own completed installation, including a standalone project without an order. Requests retain the actual company, customer, project and order relationships. Existing confirmed-order service reporting remains available.
- Staff move requests through the existing triage, assignment and work stages. Proposing a resolution now requires private work notes, an explicit customer-visible repair summary and an evidence reference. Outstanding service tasks must be completed or cancelled first.
- `resolved` means technician work was proposed for review; it does **not** mean the customer confirmed it. The current linked customer can accept or reject that exact resolution cycle and optionally rate the service from 1 to 5. Rejection requires feedback and reopens the work.
- Acceptance closes the request with `customer_confirmed`. Managers can instead record a reasoned `administrative_exception`; this is visibly distinguished from customer approval. Existing closures remain `legacy`, with no fabricated feedback or dates.
- Customers and authorised managers can explicitly reopen resolved/closed requests. Previous proposals and feedback remain unchanged. Reopening after employee departure removes an ineligible assignee and returns the request to triage rather than orphaning the work.
- Resolved work is frozen pending customer review; additional maintenance requires reopening. Resolved requests remain open for Today counts, follow-up reminders, Customer 360 next actions and employee handoff checks until actually closed.
- The actual customer record renderer now displays the shared after-sales panel before the older record details, with a clear next-action explanation. This renderer was separate from the distributor Operations renderer; the browser checks caught and verified the integration fix.

## Escalation, warranty and maintenance

- Service managers can escalate to levels 1-3 with a reason and review deadline, and explicitly record the escalation review outcome. Customers see the level/deadline and a generic shared update; private escalation reasons remain private. Responsibility continues through the existing service assignment and handoff system. No response-time guarantee or automatic supplier contact is implied.
- Warranty history follows claim recorded -> submitted -> supplied approval/rejection -> actual replacement. Each entry has an actual date, supporting reference and description. Replacement requires a different actual serial. Claims must reference an equipment passport belonging to this service order and company; database relationships reinforce this boundary.
- Recorded warranty decisions are supplier/distributor-provided records, not independent verification of eligibility. A replacement entry preserves the original equipment passport and does not silently alter stock, issue a credit, make a refund or establish new warranty terms. Use existing authorised inventory/finance workflows for those separate consequences.
- Actual maintenance work records include performed date, evidence and an optional suggested next visit. A suggested date does not schedule a contractual appointment or complete a future visit. Existing maintenance agreement visits are linked on service records; the agreement's next visit can advance only after actual service closure, rather than technician resolution alone.
- Communication history records channel, direction, actual reported outcome, summary and optional evidence. Phone/email/WhatsApp/site-visit/in-app entries are explicitly staff-recorded. Logging does not send a message or prove delivery. Prepared, unsent messages cannot be shared as customer communication records.
- Maintenance, communication and warranty entries are private unless staff explicitly choose to share their details and references. Stored in-app notifications announce relevant shared updates. No new outbound provider or mail configuration was introduced.

## Security and historical integrity

- All staff endpoints reuse authenticated company context, effective role permissions, assigned-only service scope, commercial service entitlement checks, company locking, CSRF and origin protections.
- Customers use existing ownership checks and session-derived identity, never a submitted customer/company ID. Customer feedback and reopening remain available for owned historical service records; a subscription restriction does not manufacture customer confirmation or remove owned history.
- New consequential operations bind idempotency keys to the actor, service ID and exact payload. Revision checks reject stale operations. Feedback is unique per resolution; concurrency and repeat submissions cannot produce multiple responses to one proposal.
- Resolution proposals, customer feedback and retention entries are append-only. Database foreign keys constrain company/service/equipment relationships; feedback also checks the linked customer and exact service/resolution relationship.
- Private technician resolutions, internal notes and private escalation reasons are excluded from customer responses. Only explicit shared summaries/records are returned. Existing protected document workflows remain in use.
- No automatic deletion or assumed customer acceptance is implemented. The UI shows the latest 20 resolution cycles; all persisted cycles remain retained. Retention entries are paginated through the existing page controls. The equipment selector is limited to 100 recent assets on the service order.

## Migration and files

New migration: `server/db/migrations/028_after_sales_retention.sql`. Historical migrations and the original role catalogue were not rewritten for this phase. The current manifest contains 28 entries, including virtual role-catalogue entry 002, through 028.

New tables: `service_resolutions`, `service_feedback`, `service_retention_records`. Extended service fields record resolution cycle, closure basis, escalation level, reason and review deadline. Added company-safe equipment relationships, history/confirmation/escalation indexes and append-only/scope triggers. Existing service statuses are retained.

Created:

- `server/operations/retention.js`
- `server/db/migrations/028_after_sales_retention.sql`
- `tests/after-sales-retention.integration.test.mjs`
- `tests/after-sales-retention-upgrade.test.mjs`
- This handoff.

Modified for this phase:

- `server/index.js`
- `server/operations/customer.js`, `delivery.js`, `read.js`, `customer-360.js`, `work-handoffs.js`
- `server/automation/catalogue.js`, `server/service-contracts.js`
- `src/operations.js`, `src/experience.js`
- `scripts/browser-check.mjs`
- `tests/helpers/operating-flows.mjs`, `tests/helpers/connected-journey.mjs`

## Verification

Focused retention/upgrade run: 12 passed, zero failed or skipped, using disposable loopback PostgreSQL. Coverage includes exact-cycle feedback, rejection/reopening, concurrent retry, private/shared records, escalation, warranty sequencing, real-serial evidence, role/tenant boundaries, CSRF/origin enforcement, immutable history, employee departure and historical upgrade preservation.

Final verification:

- Complete automated suite: **360 passed, 0 failed, 0 skipped**, in 116.6 seconds. Evidence: .verification/phase-7-postgres-final.log. The disposable PostgreSQL cluster was stopped afterward.
- Browser checks: **778 passed, 0 failed**, with no uncaught JavaScript exceptions. Evidence: .verification/phase-7-browser-final.log. Checked 360, 390, 768, 1024, 1280 and 1440 pixel widths, including customer pending/closed requests and manager/assigned-employee controls, payload binding, sharing defaults and failed-write messaging. Customer screenshots at 390 and 1440 pixels were also inspected.
- Static checks: **1,219 passed, 0 failed**. Evidence: .verification/phase-7-static-final.log.
- git diff --check: exit 0, no whitespace issues. Git emitted existing line-ending/global-ignore access warnings.
- Fresh installation plus upgrade from 027, exact current 28-entry migration manifest/checksum equality and no-op repeat execution passed locally. Historical closed requests retain their original fields with closure basis legacy; no customer feedback is manufactured.

Local integration tests use randomly credentialled disposable databases and fictional data. Browser checks intercept fictional responses and reject business writes; they do not establish live delivery, real-company acceptance or production readiness.

Evidence files are local ignored artifacts under `.verification/`. No production configuration was loaded by the disposable PostgreSQL runner.

## Release and owner acceptance

No new environment variables, worker processes or paid services are required. Before releasing the combined earlier phases and this phase, take and verify an appropriate database backup and use the repository's checksum-aware migration runner to apply **all pending migrations through 028** against the explicitly chosen release database. Do not run only copied SQL fragments or rewrite already-applied migrations. Deploy matching backend/frontend code together. This task did not perform that release.

Owner acceptance remains: complete a real installation, report an issue from its customer account, assign and perform work, share the repair summary, reject once, escalate/review, record actual maintenance or warranty evidence where relevant, then confirm the final resolution and feedback as the customer. Check both accounts' shared/private views and notifications. External communications require their separate approved delivery workflows; a logged WhatsApp message is not proof it was sent.

The next milestone is owner acceptance of this connected after-sales journey after an authorised release, before starting the next development phase.
