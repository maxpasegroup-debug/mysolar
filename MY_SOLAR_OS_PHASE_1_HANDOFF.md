# MY Solar OS - Phase 1 foundation handoff

26 October 2026. Implemented in the existing root repository. Distributor workspace only; no deployment, commit, push, production data/configuration change, external provider resource or real invitation was performed. Phase 2 was not started.

## Scope and preserved architecture

The initial Git inspection was clean. The existing vanilla HTML/CSS/JavaScript hash router, Express ESM server, PostgreSQL migration runner, Argon2id authentication, HttpOnly sessions, origin/CSRF protection, existing tenant context, permissions, company profiles, memberships, invitations, operational modules and audit system were reused. No dependencies, duplicate employee/tenant system or competing permission framework were added.

Customer dashboard routes and presentation were preserved. Normalized content hashes match HEAD for src/customer-dashboard.js, customer-dashboard.css, src/customer-locale.js and src/solar-marketplace.js. The original assets/my-solar-solutions-logo.png matches HEAD byte-for-byte. Evidence: ignored .verification/solar-os-customer-preservation.json. Shared router changes are limited to distributor route metadata, the distributor OS body class and business-side labels; the CustomerDashboard shell branch remains unchanged.

## Capability inventory and implementation plan

| Area | Existing capability inspected | Phase 1 result / boundary |
| --- | --- | --- |
| Accounts | Verified-email signup, email/password sign-in, email-code password recovery, legacy PIN compatibility, MFA | Reused; no authentication or customer-signup changes |
| Company identity | companies, company_profiles, branding, business profiles and saved onboarding timestamps | Reused; no duplicate legal/company entity |
| Business selection | distributor, installer and both, exposed as two checkboxes | Preserved, including saved combined selection and unsupported-type rejection |
| Registered address | One company address, state, district, PIN and language | Reused; no invented branch entity |
| Operating coverage | Multiple saved services and published service-area records | Reused; service coverage does not confer employee access |
| Lifecycle | draft/onboarding/pending_review/active/suspended; independent marketplace review/publication | OS status presents recorded facts; setup remains resumable and incomplete companies retain permitted setup access |
| Daily work | Today endpoint with tenant/role-scoped records, assignments, collections, dates and activity | Retained as the core screen, with a new OS status surface and permission-filtered module entry points |
| Workforce | Individual accounts, expiring recipient-bound invitations, memberships, teams and reporting managers | Reused; template picker feeds existing owner-reviewed company role profiles |
| Restricted roles | company_role_profiles narrow database base-role grants; explicit quotation approval delegation | Reused; job-title templates never grant privileges by themselves |
| Auditor | No dedicated read-only base role before this phase | Added explicitly constrained company auditor with five read-only grants; invitation/profile constraints extended forward |
| Audit history | Existing company audit endpoint and sensitive-change audit records | New read-only distributor audit screen reuses the existing endpoint; no audit sign-off |
| Access revocation | Active membership and user status rechecked on every protected request; outstanding-work transfer safeguards | Reused and exercised, including revocation of the new auditor profile |
| Finance, stock, CRM, projects and service | Existing operational services and permission checks | Reused; no replacement ledger, task engine or fabricated dashboard metrics |
| SIA | Existing optional permission-controlled assistant | Remains optional; no autonomous action or compulsory onboarding |
| Mail / workers | Encrypted durable queue, retries, failure codes, mail/reminder/monitor processes | Inspected and locally regression tested; no claim of current production delivery or alert receipt |
| Release / restore | Root Railway configuration, /healthz, /readyz, sequential checksum migrations and isolated restore tests | Reused; no staging tools or remote environment created |

The implemented plan was: inspect and preserve; add distributor-scoped OS presentation; prepare restricted job-role templates over existing profiles; add a read-only auditor through the current permission system; ensure read-only members see no mutation forms; connect the existing company audit endpoint; run isolated database, browser and static checks; document live operational dependencies.

## Distributor OS presentation

The distributor workspace uses blue-and-white surfaces, burgundy primary actions and restrained gold statuses. All new OS CSS is scoped beneath body.distributor-os. Customer styling and assets were not changed.

Today retains its real data, dated priorities, quick actions, collections and activity. A compact operating-status surface shows the selected company role and actual lifecycle, and account email verification only when the session supplies that fact. It explicitly separates activation, listing and subscription access. Module links for Sales & customers, Work & service, Stock & purchases, Money and People & company appear only where the current permission model permits a real destination. No fake activity counts, paid states, dates or public verification badges were added.

New companies retain their setup-focused home, saved next step, company review history and existing three facilities. Navigation remains Today, Sales, Work, Customers and Company; company audit is added under Company. SIA remains optional. Existing company switching, language selector, mobile menu, focus indicators and error/loading/offline behavior remain.

Cards and templates adapt from three to two to one column. Status panels stack on narrow screens; buttons retain existing touch-target sizing. Checked widths: 360, 390, 768, 1024, 1280 and 1440 pixels. The existing partial-translation notices remain; no new claim of complete language support is made.

## Business types and honest limitations

| Business model | Supported now | Limitations |
| --- | --- | --- |
| Distributor/dealer | Existing distributor type, sales, offers, stock, purchases and collections | No automatic activation, publication or payment claim |
| Installer/EPC | Existing installer type, surveys, project/install/service workflows | Existing checks, evidence and permissions remain mandatory |
| Combined distributor and installer | Existing both value, selected via both checkboxes | Services and role grants remain separate from the selected label |
| Equipment seller / wholesaler / retailer | Existing distributor workflow can represent equipment sales and stock | No distinct supplier/wholesaler/retailer onboarding classification or specialist workflow is advertised |
| Standalone service company | Existing service capabilities remain available to an approved supported company | No new standalone service-company onboarding type |
| Manufacturer | A manufacturer may use existing supported distribution operations where appropriate | No manufacturing type, production planning, BOM or factory workflow added |

Other business-type values remain rejected until their taxonomy, marketplace implications and required workflows are implemented. This avoids silently misclassifying businesses or modifying customer discovery while preserving the existing schema. Dedicated branches and branch-scoped permissions are not implemented; company teams and reporting managers are not represented as branches.

## Role/permission matrix

Sixteen job-role starting points are presented. Every available template resolves its permissions as an intersection with the authoritative database grants of its base role. The actual resolved list is returned in the existing protected company controls response. Choosing a template loads an unsaved draft; saving and assigning it require the existing owner-only controls, explicit reason and audit record.

| Job template | Base role | Default scope and restrictions |
| --- | --- | --- |
| Owner/director | Existing protected owner workflow | Unavailable as a template grant; no owner or platform authority from a title |
| Operations manager | supervisor | Existing project/service/task management; no finance, workforce administration or ownership |
| Telecaller | sales | Customer/lead contact and follow-up; no quotation approval or finance |
| Sales executive | sales | Permitted sales/customer/quotation/order work; existing review and discount controls remain |
| Site-visit engineer | field_engineer | Assigned project/task work only |
| Feasibility engineer | field_engineer | Assigned work and existing evidence/checklists; no engineering certification implied |
| Electricity-board coordinator | field_engineer | Internal assigned utility tracking; no official approval or board integration |
| Installation engineer | field_engineer | Assigned installation work with existing checks |
| Service technician | field_engineer | Assigned service and own tasks; no unrestricted customer records |
| Storekeeper | inventory_manager | Existing stock management and purchase viewing; confirmations and stock rules retained |
| Inventory staff | inventory_manager | Stock viewing by default, plus own tasks if already granted |
| Procurement coordinator | inventory_manager | Existing purchase coordination; no supplier payment authority |
| Accounts staff | accounts | Existing financial permissions only; owner-only refunds/adjustments and confirmation rules still apply |
| HR coordinator (basic access) | supervisor | Workspace/company basics only; no HR records, payroll or attendance feature implied |
| Office administrator (basic access) | supervisor | Workspace/company basics only; no permission, account-status or platform administration |
| Read-only auditor | auditor | Exactly workspace.read, company.read, company.setup.read, members.read, audit.read |

Auditors have no finance/customer/stock operational access, company mutation, role administration or sign-off grant. Company-specific profiles can further narrow them. Owner/platform privileges cannot be obtained through a profile name. HR/payroll and full financial audit access require a separately designed later phase.

Read-only members now receive readOnly=true from the existing team service. Their team/company pages show saved facts without invitation, role/status or setup mutation forms. The new /distributor/audit route requires audit.read and consumes /api/companies/current/audit. No write endpoint or parallel audit store was added.

## Migration and files

New migration: server/db/migrations/033_solar_os_workforce.sql. It adds the auditor company role and five explicit read-only grants, then extends existing invitation/profile base-role constraints to accept that role. Historical migrations were not edited. It creates no new tenant, employee or permissions system.

New application module: server/workforce-templates.js. Existing changed services: server/people-sales.js, server/permissions.js, server/setup/routes.js. UI: src/workspace.js, src/operations.js, src/organization.js, src/account.js and src/app.js. Styling: organization.css. Static cache identity: sw.js advanced to v25 to serve the changed static assets while preserving private-data cache exclusions. No new frontend asset dependency or global customer CSS rule was introduced.

Tests: new tests/solar-os-foundation.integration.test.mjs and tests/solar-os-ui.test.mjs; updated supported-role assertions in tests/business-access.test.mjs and tests/company-onboarding-acceptance.integration.test.mjs; extended scripts/browser-check.mjs with OS surfaces, template review and read-only auditor coverage. This handoff and README identify the new milestone.

## Tenant and security evidence

All protected operations continue through lockedUser, withCompany, current active-company session context, X-Account-ID/X-Company-ID protections, active membership, effective role/profile grants and commercial guards. Domain resolution and selected job titles remain non-authoritative. Existing public marketplace and approved PRO workflows were preserved.

New integration scenarios demonstrate: template permissions are subsets of base grants; no template grants platform authority or quotation approval; profile saves use the existing owner-only audited service; foreign company profiles cannot be assigned; auditors cannot read customer/inventory/invoice operations or create invitations/profiles; foreign customer and stock IDs return 404; foreign company quotation IDs return 404; stale/foreign company headers return 409; audit results contain no other-company private fixtures; membership suspension blocks the next protected request and clears the revoked company selection.

Company acceptance now includes real mocked-OTP signup, invitation acceptance, independent login and correct permissions for the auditor alongside every existing supported staff role. The dedicated auditor profile save/assignment and subsequent revocation passed an additional focused run.

## Operational requirements inspected

No new environment variables are required by Phase 1.

- Startup validation requires DATABASE_URL, valid DATABASE_SSL, SESSION_SECRET with at least 64 characters and an HTTPS APP_ORIGIN in production. Existing proxy/session duration settings remain.
- Encrypted mail requires the existing 64-hex DATA_ENCRYPTION_KEY, MAIL_FROM and either RESEND_API_KEY with the supported Resend SMTP adapter or complete SMTP_HOST/SMTP_USER/SMTP_PASSWORD settings. The existing mail worker must run separately via npm run worker:mail. Never rotate the encryption key without a data-compatibility/recovery plan.
- AUTH_PIN_PEPPER remains relevant only to existing mobile/PIN compatibility; Phase 1 does not change it or force it into email/password signup.
- Reminders require the existing npm run worker:reminders process and configured preferences/authorised rules. Monitoring uses npm run worker:monitor plus OPS_ALERTS_ENABLED, OPS_ALERT_RECIPIENT, DB_WARNING_BYTES and actual mail configuration. Setting a variable does not prove a worker is running, an alert arrived or a provider delivered email.
- Safe errors, structured operational events, process heartbeats, request-size/rate limits, retry/dead-letter records and protected operational/mail views already exist. No logs containing credentials or OTPs were added.
- Checked-in railway.json specifies npm run db:migrate as pre-deploy and /readyz with a 120-second timeout. /healthz is process health; /readyz requires the expected migration history. This is repository configuration, not fresh evidence of effective production overrides.
- Existing disposable restore regression passed in the full suite. Current production backup availability, actual restore recovery time, mail receipt, alerts and capacity are not reverified here. Historical reports are not proof of current live conditions.
- The root deployment policy remains in force. No staging tools, environment or infrastructure were recreated, and no historical staging acceptance claim was promoted into current production acceptance.

## Tests and visual review

- Complete isolated PostgreSQL suite: 403 tests passed, zero failures or skips. Includes fresh/upgrade/checksum/repeat migration checks, company multi-type onboarding, invitations, revocation, permissions, authentication/recovery, operational/financial/customer workflows and local recovery tests.
- Focused auditor-profile extension after the full run: six passed, zero failed. This overlaps the full suite and is not six additional distinct tests.
- Browser: 938 checks passed, zero failed, no uncaught JavaScript exceptions. Fictional intercepted fixture records only. Includes customer regressions and OS/auditor checks at six widths.
- Static: 1323 passed, zero failed.
- Visual inspection: ignored .verification/browser/owner-today.png and people-controls-360.png show the new desktop OS surface and readable narrow-screen team forms. The company/logo shown in those browser fixtures is fictional, not production provisioning.
- Evidence: ignored .verification/solar-os-postgres.log, solar-os-auditor-profile.log, solar-os-browser.log, solar-os-static.log and solar-os-customer-preservation.json. No production credentials were used for local verification.

## Remaining risks and dependencies for Phase 2

The local Phase 1 foundation is implemented and verified, but this is not a production-readiness or real inbox-delivery claim. An authorised matching release must apply migration 033 using the supported runner and a verified recovery point; earlier pending migration blockers, if any, remain authoritative. Effective deployed migration history, web/worker versions, SMTP sender status, actual email/alert receipt, production backup/restore evidence and real owner/employee usability acceptance still need current evidence.

Additional business taxonomies, manufacturing, branch-specific access, payroll/attendance/HR records, official utility integration and autonomous SIA operations remain unimplemented and are not advertised as working. Existing missing monitoring or live deployment configuration must not be bypassed to claim acceptance.

Single next milestone: owner review of this Phase 1 handoff and an explicitly authorised release/acceptance rehearsal using the supported company and employee journeys. Do not start OS Phase 2 automatically.
