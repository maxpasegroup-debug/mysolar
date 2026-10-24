# Phase 8 - Management reporting and automation

## Scope

Extended the existing Express/PostgreSQL backend, JavaScript frontend, operational ledgers, reminder queue and SIA trusted-data layer. Earlier uncommitted phase work was preserved. No production migrations, environment changes, Railway changes, external messages, deployment, commit or push were performed. No following development phase was started.

## Management reports

New workspace route: `/distributor/reports`, available from Today and the Company navigation group. Protected API: `GET /api/companies/current/operations/reports?report=...&from=YYYY-MM-DD&to=YYYY-MM-DD&page=...`.

The seven report families are:

1. **Sales:** created leads by current configured pipeline step code, quotation-version/enquiry counts, and currently confirmed orders by actual confirmation date. Agreed order value is explicitly distinct from cash received.
2. **Workload:** current open tasks by responsible employee, with blocked/overdue counts. Managers use their existing company task scope; other employees see only assigned work. Counts are not hours or productivity scores.
3. **Delays:** current blocked/overdue tasks and individual project milestones, with actual deadlines and recorded blockers. Project assignment scope remains authoritative. One project can have several delayed milestones; the report does not present this as a count of unique projects.
4. **Ageing:** open leads by age since creation, and issued receivables by recorded due-date bands. Receivable amounts come from the existing balance view after credits, settlements and refunds. Financial sections require finance read permission.
5. **Expenses:** signed project expense entries by posting date/category, including reversals. Unknown tax yields unavailable net cost. Supplier bills and stock consumption are not added again; this is not company profit or statutory accounting.
6. **Procurement:** current purchase statuses and outstanding approved receipt quantities, grouped by maintained unit. Receipt does not imply payment, stock consumption or project completion.
7. **Service:** current status/closure-basis groups, escalations, actual pending resolution proposals and customer response/rating activity. Legacy/administrative closure is not counted as customer acceptance. Repeated resolution cycles are separate responses.

Date semantics are explicit: sales, expense and feedback activity uses selected India-calendar dates; current workload, delays, receivables, purchases and service states span all saved dates. Choosing an old activity window cannot hide an older current debt or unfinished task. The default activity window is the current month to today; valid windows are bounded to 367 inclusive dates.

Aggregates cover all permitted matching rows. Source records are paginated in groups of 20 and link only to record types the user can read. A unique source-row key stabilises pagination when entries share a project, category, label and date. Monetary arithmetic remains in integer paise on the server, and financial source rows are not multiplied by joins to unrelated child records.

The directory and each section are permission-controlled on the server. Reporting does not grant a module permission. Existing read access survives commercial expiry, while new business actions continue to use their existing entitlement and role gates. No new administrator/employee roles or permission catalogue were introduced.

## Durable reminders

Extended the same approved-rule, planning, lease, retry, idempotent-notification, delivery-record and audit system. New reminder kinds are:

- `task`: assigned task deadlines; staff only.
- `stage`: individual milestone deadlines; staff only; notification opens the parent project.
- `funding`: internal loan/subsidy follow-ups; staff only; no official decision or receipt is implied.
- `procurement`: outstanding expected purchase receipts; staff only.
- `escalation`: recorded service escalation review dates; staff only.
- `resolution`: an actual current repair proposal awaiting customer review; customer reminders need explicit rule approval and existing customer permissions/preferences.

No new rule is automatically created or enabled. Owners must review the recipient audience, sending hour, advance days where allowed, email choice, confirmation and reason. Existing saved user preferences are preserved; new kinds are not silently inserted into an existing user's chosen list. Dates must be maintained on source records; the worker does not invent a deadline or schedule.

Planning and delivery both enforce the current company lifecycle, feature access, approver permission, recipient role/assignment, ownership and communication preference. The existing once-per-record/recipient/day identity, claim token, leases, retry exhaustion and explicit retry approval remain in use. New reminders only create notifications and optionally enqueue an approved email; they do not progress projects, receive purchases, approve claims, close service requests or move money.

Fixed two earlier maintenance issues: source permission checks now query the authorised order table rather than looking for an order ID in service contracts; source links now resolve contract reminders to their actual order. The same target mapping opens milestone reminders on their actual project. The database now permits the maintenance/renewal advance days already offered by the interface.

The reminder console continues to show in-app attempts, failure codes, exhausted jobs and worker status. It now also exposes the related email queue status/attempt count/safe failure code, without exposing recipients, encrypted content or credentials. `accepted` means provider acceptance, not inbox delivery. Actual email delivery was not exercised in this local phase.

## Contextual SIA and mobile field work

SIA business assistance now reuses the same permission-scoped workload, delay and service report functions. Facts include the report's activity window, snapshot time, bounded source-record labels, actual due dates/blockers and links to authorised workflows. Removed the outdated statement that individual milestone due dates are not stored.

These additions are read-only suggestions. Existing follow-up proposals retain their current user/company/session binding, exact-payload confirmation token, expiry, permission/entitlement rechecks and explicit approve/reject workflow. No new autonomous executor or consequential financial/operational AI action was added.

The existing `/distributor/field` screen now uses `GET /api/companies/current/operations/field?view=open|today|overdue|blocked|all&page=...`. Even managers receive only their own assigned tasks from this endpoint. It shows actual blockers, overdue status, remaining required checklist items/prerequisites and evidence requirements, and links to the established protected task progress screens. Existing completion guards, revisions and customer/company permissions remain intact. Internet access is required; offline submissions are not queued.

## Schema and changed files

New immutable migration: `server/db/migrations/029_management_automation.sql`. It adds stable UUID identities to existing milestone rows, extends reminder kind/audience/advance-day constraints and adds deadline/reporting indexes. It preserves existing milestone values, rule approval state and user preferences. No historical SQL migration was rewritten.

Created:

- `server/operations/reporting.js`
- `server/db/migrations/029_management_automation.sql`
- `tests/management-automation.integration.test.mjs`
- `tests/management-automation-upgrade.test.mjs`
- This handoff.

Modified in this phase:

- `server/index.js`
- `server/automation/catalogue.js`, `engine.js`, `routes.js`
- `server/sia/tools.js`
- `src/account.js`, `app.js`, `automation.js`, `experience.js`, `operations.js`, `workspace.js`
- `scripts/browser-check.mjs`
- `tests/after-sales-retention-upgrade.test.mjs` (expect the current manifest after upgrading from 027, including later migrations).

## Verification

Final results:

- **372 automated tests passed; 0 failed, 0 skipped.** Complete final run took 100.9 seconds. Evidence: .verification/phase-8-postgres-final.log. The isolated cluster was stopped afterwards.
- **881 browser checks passed; 0 failed**, with no uncaught JavaScript exceptions. Evidence: .verification/phase-8-browser-final.log. Report screens, filters, source links, unknown-tax presentation and mobile field requirements were checked at 360, 390, 768, 1024, 1280 and 1440 pixels, alongside earlier workflow regressions. Report screenshots at 390 and 1440 pixels were visually inspected.
- **1,238 static checks passed; 0 failed.** Evidence: .verification/phase-8-static-final.log.
- git diff --check returned 0 with no whitespace issues; Git emitted existing line-ending/global-ignore access warnings.
- Fresh installation, upgrade from 028, stable existing milestone identities after repeat runs, preservation of opted-out preferences and rule approvals, exact current migration manifest/checksum equality and no-op repeat application passed locally. The current manifest has **29 entries through 029**, including virtual role catalogue entry 002.

Focused coverage includes all new reminder sources, rule approval/CSRF, private-audience rejection, replay/deduplication, revoked assignment and preference rechecks, true project/order notification targets, expense reversals and unknown tax, receivable reconciliation, stable same-date pagination, field-only reads, SIA scoped facts and safe email-failure visibility. Earlier suite coverage also verifies retries, worker leases, failure recovery, subscription expiry and SIA proposal approval boundaries.

Tests use disposable loopback PostgreSQL with fictional records; the runner does not load production credentials or Railway data. Browser checks intercept fictional responses and reject business writes. These checks do not establish real-company acceptance or production readiness.

Verified concerns addressed include missing report refresh caused by an incompatible loader key, stable pagination for same-date expense entries, source-table/target mismatches in maintenance reminders, outdated SIA deadline information, and missing email queue failure visibility.

## Release and remaining boundaries

No new dependencies, environment variables, paid services or worker types are needed. The existing reminder worker and, for opted-in email, the existing mail worker must run matching release code. Source dates, company rule approval, verified email and recipient preferences are still required; missing dates or unavailable delivery infrastructure are not simulated.

Before release, verify an appropriate backup and run the existing checksum-aware migration runner against the explicitly selected release database for **all pending entries through 029**. Release matching application and worker code. This phase did not perform that production release.

New reporting/field labels use English; this phase does not claim complete Malayalam/Tamil translation coverage. Report downloads, statutory accounts, payroll calculations, employee productivity scoring, offline write synchronisation and new autonomous SIA workflows were not added. Existing authorised source-record exports remain available through their established workflows.

The next milestone is owner acceptance of the connected daily-work, management reporting and approved reminder flows after an authorised release, using the real company/customer pilot the owner will perform. No real-company records or invitations were created here.
