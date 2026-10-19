# MY Solar Solutions — company onboarding and login acceptance

19 October 2026. **Local API/database rehearsal passed; live company provisioning and owner browser acceptance are not complete.** This report concerns company onboarding, not a passed real business pilot. Preserve the separate pilot evidence gates.

## Audit findings and actual creation process

The existing application is a plain HTML/CSS/classic-JavaScript hash-route frontend (`index.html`, `src/account.js`, `src/onboarding.js`, `src/organization.js`) served by Express ESM (`server/index.js`) over PostgreSQL. No separate tenant application or identity system is needed. The public brand and a company tenant remain separate concepts.

1. `POST /api/auth/register` creates a personal account and customer profile, hashes the password with Argon2id, rotates the session and signs in. It accepts name/email/password only; a role in the signup payload is not trusted. Duplicate emails are rejected. Password length is 12–128 characters, with a 512-byte ceiling.
2. `POST /api/companies` requires name, city, email and phone (the initial phone may be blank). It atomically creates the company, owner membership and selected session context. No separate initial-tenant flag exists. Do not change IDs or globally reserve the platform hostname to make this the “first” company.
3. Save profile, brand and business steps through `/api/companies/current/onboarding/profile`, `/branding` and `/onboarding/business`; then submit `/onboarding/submit`. An incomplete company cannot submit.
4. A separately authorized platform operator uses `/api/platform/companies/:id/actions` to approve a pending review. Company owners do not acquire platform approval privileges. Activation does not publish a storefront, verify a domain or record payment.
5. The owner creates recipient-bound invitations through `/api/companies/current/invitations`. The employee registers or signs in with the invited address, then accepts `/api/invitations/accept`. Tokens expire after 48 hours, are stored hashed and cannot be replayed after acceptance. Private sharing produces a link without sending a message; email delivery is a separate configured choice. Neither was used against real recipients here.

`server/permissions.js` defines the immutable original roles; migrations extend permission grants. `server/tenancy/context.js` revalidates the authenticated account/session, selected company, active membership and authoritative database permissions. Expected company/account headers detect stale context; they do not grant authority. Role permission, entitlement, company status and assigned-record restrictions remain independent. There is no PostgreSQL RLS substitute for the existing repository scopes.

Relevant schema: `users`, `sessions`, `customer_profiles`, `roles`, `role_permissions`, `companies`, `company_memberships`, `company_profiles`, `company_branding`, `company_business_profiles`, `company_onboarding`, `company_reviews`, `company_invitations`, password-reset records, commercial snapshots and `audit_events`. Migrations 001–012 include the virtual 002 role entry. `server/db/migrations.js` applies ordered, checksum-tracked entries. No historical migration was edited.

## Company definition and mandatory live inputs

Approved identity: **MY Solar Solutions**, brand **MY Solar Solutions**, intended website **https://mysolar.solutions/**. “Solar solutions and services” is a description; the actual business-type field accepts `distributor`, `installer` or `both`, requiring owner selection. Recording a website or requested domain does not bind traffic or prove domain ownership. No domain was registered, verified or connected in this task.

The owner has now confirmed the owner identity/login email, legal/company name, business phone, address, city/district, state, PIN and business type. Business type maps to `both`. The exact personal/contact details are recorded in Git-ignored `.pilot/owner-confirmed-onboarding-2026-10-19.json`; no passwords or credentials are stored there. This is a local preparation record, not a seed or proof of an existing account. The file is not encrypted and must not be force-added to Git.

Language must still be selected from English/Malayalam/Tamil. Official GST/registration identifiers are not mandatory in this setup schema and must not be invented. Confirm actual services, service areas, public description and preferred public contact before submission. An owner's login email must not automatically become a published contact without choosing that setting. A logo can be omitted; a supplied remote logo must pass configured HTTPS hostname/type validation. No further legal/address details need to be requested unless the owner changes them.

No legal/phone/address data from the local fixture should be copied into live setup. Use the owner-confirmed private record only after duplicate and authorization checks. No contact value has been placed in a seed, test fixture, public asset or tracked report by this update.

## Supported roster and proposed coverage

These are role slots, not invented employees. The owner identity/email is now confirmed in the private record. All employee display names and login addresses remain **owner-supplied / unassigned**. Proposed association is MY Solar Solutions, but its live tenant UUID and memberships remain unknown. No live account was provisioned by this task. One person per role slot is enough for the rehearsal; do not create multiple sales identities without a real assignment need.

| Role slot / proposed display label | Actual application role | Intended coverage and boundaries | Local test login address |
| --- | --- | --- | --- |
| Owner (replace with real name) | `owner` / Distributor Owner | Company/team administration, sales, operational approvals, finance and partner management, subject to plan rules; not a platform administrator | `acceptance-owner@example.invalid` |
| Sales employee | `sales` | Leads/CRM, company customers, enquiries, quotations and order drafts; no accounting or employee administration | `sales@example.invalid` |
| Operations supervisor | `supervisor` | Company projects, installation progress, task assignment and service management; no finance/team administration | `supervisor@example.invalid` |
| Field employee | `field_engineer` | Assigned project/service work and own tasks; not unrestricted company-wide project or financial access | `field_engineer@example.invalid` |
| Inventory employee | `inventory_manager` | Inventory, maintained stock adjustments, procurement preparation/receipts and own tasks; not finance or team administration | `inventory_manager@example.invalid` |
| Accounts employee | `accounts` | Finance records/collections and own tasks; no team management, procurement approval or owner-only financial reversal permission | `accounts@example.invalid` |
| Optional part-time executive | `part_time_sales` | Own assigned tasks only; requires eligible PRO subscription and relevant assignments, not general CRM access | `part_time_sales@example.invalid` |

All employee accounts use the same personal-account name/email/password requirements, then invitation email/role. There is no separate employee username or mandatory salary/attendance/tax field. Part-time staff may additionally store optional name, phone, state, city and territory metadata; these do not establish identity or permission. A company owner is created by the atomic company-creation flow, not by an employee invitation. Existing owner transfer is not implemented here.

No dedicated company-admin, sales-manager, CRM-agent, surveyor, solar-designer, HR/payroll, customer-support or partner-manager role exists. Use the supported owner/sales/supervisor/field roles according to actual required access, rather than suggesting unsupported fine-grained permissions. Owner handles employee/partner administration; supervisors handle service coordination. Technical survey/design coverage is not proof of an implemented dedicated survey/design module. Customer is a separate own-data scope, not an employee role. Platform Administrator is a separately bootstrapped operator grant, not part of a company pilot roster.

For every live employee: owner supplies the real name/address, creates a private recipient-bound invitation, and the person chooses their own password at signup. Existing users sign in with their own password; password recovery is only needed when forgotten. There is no forced first-login change or direct authenticated password-change endpoint; use the supported recovery flow. Do not send shared default passwords.

## Provisioning and verification environments

| Environment | Actual action/result |
| --- | --- |
| Disposable local PostgreSQL | One `[LOCAL TEST] MY Solar Solutions` tenant, one owner, six role-specific employee accounts, one separate fixture platform reviewer, six accepted invitations and one manually assigned fictional PRO trial were created and verified through normal HTTP business endpoints. Fixture-only reviewer bootstrap and rate-limit state are confined to the generated schema. No real contact information used. Schema removed and cluster stopped after the run. |
| Persistent local application | No `.env` exists in the repository. No persistent tenant, running owner-login server or reusable password was provisioned. |
| Railway/staging/production | No connection, account/company creation, configuration change, migration or release performed in this task. Earlier authorized Railway read attempts remained Unauthorized; no current live records have been confirmed. |
| Real email delivery | Not performed. No invitation/recovery emails sent to real people. Existing recovery regression uses an explicitly in-memory transport; that proves application behavior, not Resend delivery. |
| Browser | Existing responsive/browser suite is separate from database-backed API login. Do not count intercepted fixture UI responses as real owner browser login. See final check results below. |

The new regression `tests/company-onboarding-acceptance.integration.test.mjs` uses `tests/helpers/isolated-app.mjs` and `scripts/verify-postgres.mjs`. It rejects remote/non-test database targets, uses a unique schema and starts the application only on loopback. Test credentials are random, memory-only and discarded. No usable live or local credential is handed off because no persistent login environment was established.

The production 5/IP/hour signup guard remains unchanged. The rehearsal first asserts a sixth registration is rate-limited, then clears only the disposable schema's rate-limit fixture state to model another registration window for the rest of the team. This is not a live bulk-provisioning bypass. A real team registering from the same shared IP must respect the actual limit; coordinate invitation acceptance across windows. Existing authenticated users can accept without creating another account.

## Environment and deployment configuration

Required server settings: explicit `DATABASE_URL`, randomly generated `SESSION_SECRET` of at least 64 characters, correct `APP_ORIGIN`, `NODE_ENV`, `PORT` and appropriate `DATABASE_SSL` (`disable` or verified `require`). Never embed SSL override parameters in the connection URL. Production requires HTTPS; set `TRUST_PROXY_HOPS` to the actual trusted proxy topology. PostgreSQL pooling uses a maximum of 10 connections and statement/connection timeouts.

For automatic mail: `RESEND_API_KEY` plus verified `MAIL_FROM` (intended `noreply@mysolar.solutions`), or a complete independent `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_PORT`, `SMTP_SECURE` configuration plus `MAIL_FROM`. The Resend fallback is SMTP host `smtp.resend.com`, user `resend`, implicit TLS port 465 unless explicitly overridden. Do not copy `.env.example` port 587/secure=false unthinkingly when intending the automatic fallback. Production `INVITATION_DELIVERY=email`; a per-invitation `share` action remains supported without SMTP. Development-only manual mode is refused in production. `LOGO_ALLOWED_HOSTS` is required only for permitted external logo hosts.

Recovery issues a single-use, hashed 30-minute token, revokes existing sessions on successful reset, does not log in automatically, and exposes a safe unavailable state if mail is unconfigured. Delivery is currently best-effort/in-process, not the durable in-app reminder worker. Host-only HttpOnly SameSite=Lax session cookies and exact configured Origin/CSRF protections remain in force. Production uses the Secure `__Host-mysolar_session` cookie.

`railway.json` declares supported pre-deploy `npm run db:migrate` and readiness `/readyz`; this is checked-in configuration, not evidence of the effective live deployment. No live secrets were inspected or printed. No seed automatically creates an MY Solar Solutions tenant or employee roster. Existing tests are disposable fixtures; `server/admin.js` is a separate operator-only privilege bootstrap, not a public signup path or a company-employee seed command.

## Owner login handoff and live provisioning procedure

The implemented routes are `/#/distributor/login`, `/#/register?journey=distributor`, `/#/distributor/onboarding`, `/#/distributor/team`, `/#/recover` and `/#/reset-password`. Verify the frontend route names before using any external environment URL; no environment-specific URL is represented as successfully logged in here.

1. The owner uses the actual configured application origin, opens Get Started → Distributor, registers their own approved email and chooses their own password. If already registered, sign in instead; do not create a duplicate company. Registration is an account, not company activation.
2. Complete the real company/profile/brand/business details, submit and have the independently authorized platform reviewer approve. No self-approval or arbitrary SQL edits.
3. Review actual plan access. Add only real approved employees with the least appropriate supported role; invite part-time sales only if PRO eligibility exists. Share each private invitation only with its recipient after explicit sending approval.
4. Each employee signs up/signs in with that exact email, accepts and verifies their own workspace. Use Today for the first real tasks. Financial/installation/task visibility must match actual role and assignment.
5. Forgotten password: use recovery, open the actual privately delivered reset link within 30 minutes, choose a fresh password and sign in again. No old or new live password should be sent in chat. If mail is unavailable, report it; do not invent a reset link or overwrite a password directly.

**Current owner credential status: owner name/login email confirmed by the owner; account existence, live membership and successful authentication remain unverified. No persistent test credential is available.** The only server URL used for the earlier database/API test was a dynamically allocated loopback address and it is no longer running. Intended owner login: `https://mysolar.solutions/#/distributor/login`, using the confirmed email from the private record. That URL is constructed from the specified website and verified route; it has not been successfully logged into by this task. Athira must choose/retain her own password; no password or reset link has been generated.

## Current state audit and duplicate prevention

The latest read-only `railway status --json` attempt on 19 October still returns `Unauthorized. Please login with railway login`. No repository `.env`, process `DATABASE_URL` or process `TEST_DATABASE_URL` is configured. Therefore no available connection establishes the existing account or tenant state. Neither existence nor absence is inferred; no registration, account-existence probing via recovery, password reset, invitation or production write was attempted.

After authenticated read access is available, confirm the exact Railway project/environment/service first. In a read-only transaction, check the confirmed normalized owner email, account status, associated company IDs/names, active/inactive memberships, roles and lifecycle/setup state. Search potentially matching company legal/display names and the confirmed website to identify ambiguous duplicate candidates; names alone do not prove ownership. Select no password hashes, reset/session tokens or unrelated personal records. If an account exists, reuse its normal login/recovery flow. If a matching tenant exists without an authorized membership, stop for ownership review rather than granting access from a name match. Resume setup using the existing current revision and lifecycle.

Account emails are unique, but `POST /api/companies` does not deduplicate company names: repeating company creation can create another tenant. Do not create one until existing memberships and candidate companies have been reviewed. If no account/tenant exists, use supported signup/company creation after the applicable live-write authorization; no direct SQL provisioning or owner privilege injection. Do not grant company owners platform review powers. Employee records require real approved names/emails and explicit invitation scope.

## Next action

The confirmed owner/company details are ready. **Single next action: run `railway login` in the terminal used for this workspace so the authorized read-only duplicate/account/tenant audit can proceed.** Do not put any key, password or reset token in chat. If that access cannot be established, Athira can try her existing login personally and report the result, but should not create another company without checking her existing authorized workspaces. A failed login or generic recovery response does not establish that an account is absent. Production configuration, paid resources, invitation sending and deployment remain outside this task's authorization. No public company record or payment is fabricated to fill the access gap.

This follow-up changed only the handoff/README and the ignored owner-confirmation file. Existing application code and all user changes were preserved. Lightweight checks confirmed field mapping, routes, supported roles, ignored-file protection and the current authentication blocker. Earlier passing local test counts below are retained historical evidence; tests/build/browser workflows were not rerun for this data/documentation-only update.

## Check results

Focused isolated rehearsal: **12 tests passed, zero failed/skipped**. Company creation, incomplete submission, all three setup steps, independent approval, no automatic publication/payment, PRO-gated invitation, six independent employee login/acceptance paths, duplicate protection, membership association, company selection denial, CSRF/Origin rejection, role permission lists, financial read restrictions, owner re-login, hashed passwords and unconfigured recovery were exercised. The expected 503 from disabled local recovery appears as a safe error log; it is not a claim of real delivery.

`node scripts/verify-postgres.mjs`: **229 automated tests passed, zero failures/skips** against a new disposable database, including the 12 focused checks above, existing tenant/customer/business regressions, password recovery with in-memory mail, expiry/replay and session revocation. All 12 migration entries were applied in isolated fixtures; existing migration-chain/checksum tests passed. The local cluster was stopped. Private local evidence: `.verification/company-acceptance-full.log`.

`npm run build`: **809 static checks passed, zero failures**. This is the repository's syntax/import/asset validation command, not a bundled frontend or production release. Log: `.verification/company-acceptance-static.log`.

The first `npm run test:browser` attempt and an ordinary retry failed before UI scenarios with `Browser command timed out: Runtime.enable`: **0 passed, 1 failed per attempt**. Diagnostics show Chrome GPU-process access-denied crashes under the execution sandbox. Running the same existing script outside that execution sandbox, without changing browser security flags, passed **160 browser checks, zero failures**, across six existing screen widths. Log: `.verification/company-acceptance-browser-unrestricted.log`. This covers frontend forms, navigation, explicit demos, offline fallback and intercepted read-only role fixtures; it does not prove database-backed owner browser login or real email receipt. No production deployment or readiness claim follows from local results.

Task changes: added the acceptance integration test and this report; updated README with these results. Existing pending pilot documentation and historical-price test changes remain preserved. No runtime business-code defect was confirmed by this rehearsal, so no business implementation, role grant, schema or security policy was changed.
