# PRO partner network and part-time sales team

Implemented locally on top of the pending business-access and domain-foundation changes. No commit, push, deployment, database migration, production-data change, environment-variable change or external-service configuration was performed.

## Architecture and commercial policy

Reuses the plain JavaScript frontend, Express routers, PostgreSQL migrations, existing sessions, CSRF, locked company context, database permissions, subscription agreements, team capacity, private invitation delivery, tasks and audit events. No new subscription system, employee table or cross-company data access mechanism was added.

The repository has operator-created plan records and immutable agreement snapshots, but no seeded FREE/ELITE/PRO catalogue or fixed canonical tier IDs. `server/commercial/growth.js` centralizes the reserved plan code `pro`; it does not fabricate a database plan ID. Runtime plans were not inspected or renamed. If an existing operator-configured PRO plan uses another code, review and explicitly map its canonical code in this resolver before rollout; a public name containing PRO grants nothing.

Eligibility requires the company's **current assigned subscription**, code `pro`, active company/lifecycle, status active or trial, start reached, and end strictly in the future. Pre-billing defaults, FREE, ELITE, unassigned, pending, past-due, suspended, cancelled and expired subscriptions cannot grant these growth actions. These two derived capabilities are separate from the 13 historical base feature flags; historical JSON contracts and agreement snapshots remain unchanged. Existing base entitlements, role permissions and team limits still apply independently.

New PRO plan versions require INR 5,999/month, tax exclusive. The existing operator plan directory has a **Prepare PRO** shortcut that fills an ordinary draft form. It does not save, publish, assign or charge automatically. The operator must confirm the applicable GST rate, features, limits, effective dates and reason before publication, then use the existing audited subscription assignment flow. Other plan codes and historical prices are unchanged. Existing subscription snapshots are never rewritten.

## Files

New tracked candidates:

- `server/commercial/growth.js`: one PRO resolver and pricing validation.
- `server/setup/staff.js`: bounded invitation/membership business-detail validation.
- `server/partners/routes.js`: private partner registry, consent, updates and audit projections.
- `server/db/migrations/011_pro_network.sql`: forward schema/permission migration.
- `src/growth.js`: partner, executive, upgrade and acceptance screens.
- `tests/pro-growth.test.mjs`: focused tests using pure functions, mocked data and frontend rendering.
- `PRO_NETWORK_HANDOFF.md`: this report.

Extended:

- `server/commercial/policy.js`, `server/commercial/routes.js`: mutation guard, owner growth status, new-version price checks.
- `server/permissions.js`: assignable role list only; immutable `roleDefinitions` remains unchanged, preserving migration 002's checksum.
- `server/setup/invitations.js`, `server/setup/routes.js`: invitation creation/acceptance checks, profile transfer, team projection and detail editing.
- `server/tenancy/routes.js`: prevent direct membership bypass and unsafe broad-role conversion; reactivation requires PRO.
- `server/operations/core.js`, `server/operations/read.js`: assignment eligibility and executive read-only state.
- `server/index.js`: routes and exact public script allowlist.
- `src/account.js`, `src/app.js`, `src/organization.js`, `src/commercial.js`, `src/operations.js`: navigation, role labels, private invitation handling, read-only task actions and existing plan UI integration.
- `index.html`, `commercial.css`, `sw.js`: script inclusion, responsive burgundy/ivory/gold presentation and static cache version.

Earlier dirty files remain in place. Ignored `.verification/` editing/check helpers are local development artifacts, not application modules.

## Migration 011 (not executed)

- Adds `part_time_sales` to the existing roles and company invitation allowlist. Grants only `workspace.read` and `tasks.own` via a new migration, not edits to the original role catalogue.
- Adds `staff_details` JSON objects to existing invitations/memberships and a membership `staff_revision`. Records optional business name, phone, state, city, territory and the fixed part-time employment type. Account email/name/password remain controlled by existing account workflows.
- Adds `company_partner_relationships` with source/accepted partner company foreign keys, invitation recipient/hash/expiry, acceptance identity/time, lifecycle, internal contact, private notes and revision.
- Composite membership foreign key prevents an assignment to an employee outside the source company. Partial unique indexes prevent duplicate pending recipients and concurrent accepted/suspended company pairs. Directory/location indexes support scoped reads.
- Uses the existing transactional, checksum-tracked sequential migration runner. Do not edit or rerun historical SQL manually. Pending migrations 009 and 010 are also still present and must be reviewed as part of the complete migration chain.

## B2B partner relationships

Route `#/distributor/partners` uses `partners.read` / `partners.manage`, initially owner-only. The dashboard shows source relationships, accepted incoming relationships, internal relationship contacts, private source notes, recent scoped audit activity, empty states, pagination and an upgrade presentation.

APIs:

- `GET/POST /api/companies/current/partners`: read retained records / create a 48-hour private invitation.
- `PATCH /api/companies/current/partners/:id`: revision-checked relationship update, suspend, revoke or decline.
- `POST /api/invitations/preview` with kind `partner`: authenticated invited email receives only the inviting company name, expiry and relationship-only role description.
- `POST /api/companies/current/partners/accept`: explicit checkbox, authenticated invited email, currently selected authorized recipient company, current inviter authority, token validity and both companies' PRO access are checked on the server. The sender is revalidated after its company lock is acquired.

Raw tokens are displayed once through the existing private sharing interface, never stored in the relationship table or audit metadata. Sharing opens the user's WhatsApp/email application; it does not send a message itself. The recipient signs in/registers with the invited email, chooses their own company and explicitly accepts. Company selection returns to the pending invitation.

No membership is created by accepting a partnership. There is no automatic company switch, shared CRM, quotation, finance, customer or dashboard grant. The company switcher still lists only actual authorized memberships. An internal relationship assignment names a contact; it does not grant permissions or expose notes to that contact automatically. Incoming companies see only the consensual relationship status/name and can suspend/decline, not read/change the source company's private notes or assignments.

Lifecycle: pending -> active only by valid acceptance. Active may be suspended/revoked by the source; the recipient can suspend/decline. A suspended source relationship must be revoked before a fresh invitation/acceptance can restore it. Closed records are retained. An expired unaccepted invitation cannot be accepted. New notes/assignment changes require PRO even when a closure action is also submitted; revocation/closure can preserve existing details after downgrade.

## Part-time executive management

Route `#/distributor/team` keeps normal employees and adds a dedicated **Part-Time Sales Executive · PRO** invitation section. FREE/ELITE/ineligible companies see disabled creation controls and the upgrade explanation. Owners can filter the executive list by state, city and territory, edit bounded business details using optimistic revisions, invite/share, revoke invitations, suspend/remove access, and reactivate only with valid PRO access.

Creation and acceptance both check PRO; team capacity still counts pending invitations and active employees. Direct membership creation and role conversion into/out of the restricted type are blocked, so the existing generic membership endpoint cannot bypass invitation consent or turn the executive into an administrator.

Executives receive only their own assigned task list, task detail/instructions and progress transitions allowed by existing task rules. Company managers assign sales follow-up activities with the existing task form; links filter by the executive's **user ID**, not membership ID. Assignment/reassignment validates active membership, permission and current PRO access. Read scopes and every mutation enforce company boundaries. No organization-wide CRM, enquiry, quotation, customer, inventory, finance, report, team-management or partner-management permission is granted to this role.

After PRO expiry, assigned task records remain readable, new executive progress mutations are denied server-side and the record screen shows a read-only explanation. Owners retain ordinary authorized records and can revoke access. No records, owners or memberships are silently deleted/changed on downgrade.

Supported activity tracking is **existing assigned tasks, due dates, statuses, completion notes and recorded event history**. Direct enquiry/lead ownership for this narrower role, location tracking, automated productivity scoring, commissions, payroll and cross-company collaboration are not implemented or advertised.

## Pricing and upgrade experience

Owner plan-status, team and partner screens explain “Build Your B2B Partner Network” and “Build Your Pan-India Sales Team” at ₹5,999 + GST/month. SIA is described as assistance with recorded activity within permissions, not autonomous execution. No provider keys, internal AI costs or model configuration are shown.

Upgrade links use the existing `#/distributor/subscription` contact-administrator path. No checkout or payment promise is added. There was no public FREE/ELITE pricing grid in this repository; none was invented or repriced. The new operator shortcut is a draft-only extension to the existing plan directory.

## Verification and limits

Focused results: `node --test tests/pro-growth.test.mjs` passed **9 tests, 0 failures, 0 skipped**. Syntax parsing passed for **19 changed JavaScript files**, and the application module imported successfully without starting a server or requesting a database connection. Tests cover PRO state/date boundaries, FREE/ELITE denial, trusted subscription selection, price/details validation, restricted role SQL/catalogue preservation, direct mutation guards, base entitlement checks, escaped rendering, disabled controls and real task links. No database integration, migration execution, live account creation, browser viewport verification, comprehensive suite, build, lint or deployment-readiness claim is made here.

Phase 10 must verify the complete 009–011 migration chain in isolated PostgreSQL, permission grants, invitation email matching/replay/expiry/revocation, overlapping memberships, concurrent partner acceptances and opposite company-lock ordering, duplicate pair conflicts, subscription transitions and mid-request authorization changes, plan limits, all direct endpoint bypass attempts, task assignment scoping, public static asset delivery and responsive keyboard workflows. The sender company is locked with `NOWAIT` because the recipient lock is already held; contention returns a safe `PARTNER_BUSY` retry response instead of waiting on an opposite company lock. Verify this behavior with real concurrent transactions before a pilot. No fake successful acceptance is returned on a failed transaction.

There is no new environment variable, dependency or external service requirement. Private share invitations work without SMTP; choosing automatic employee email requires the existing real SMTP configuration. The domain provider remains unconfigured and unchanged.

**Recommended next development step:** run the isolated PostgreSQL integration verification for migrations 009–011 and these two-company invitation/downgrade scenarios before any production rollout or real-company pilot.
