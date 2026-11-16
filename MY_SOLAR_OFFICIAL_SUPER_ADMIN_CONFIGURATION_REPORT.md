# MY SOLAR — Official Super Admin configuration

Date: 16 November 2026.

## Result

**A secure existing provisioning procedure has been verified locally. The official account is not claimed to be created, activated or verified in production.**

The sole intended administrator address for this request is **mysolarsolutions2026@gmail.com**. The previous setup report has been prominently marked superseded because its earlier address was incorrect. No lookup, account creation or promotion using that earlier address was performed for this task.

The corrected address was checked using a parameterised SELECT in a newly created, verified disposable local PostgreSQL schema: **no matching identity existed there**. This describes only that fresh test environment. It does not establish whether an account exists in a persistent local or production database. No persistent local database was assumed safe or silently selected, and no production account/database lookup was performed.

All identities created by automated tests use fictional `.invalid` addresses and random passwords held only in process memory. The corrected official address was used only for the scoped existence check, not as an automated account fixture. The owner must enter the actual new password privately when the account is provisioned in its intended environment.

## Existing authentication architecture

| Component | Existing implementation |
| --- | --- |
| Identity | `users`, existing Business/Customer account channels; no separate administrator user database |
| Platform role | `platform_admin`, labelled Platform Administrator; this supplies the requested Super Admin capabilities |
| Grant | `platform_admin_grants`, separate from company membership/ownership |
| Runtime permissions | `roles`, `permissions`, `role_permissions`; queried on the server |
| Password hash | Existing `hashPassword()` / `verifyPassword()` in `server/auth/security.js`, Argon2id with a generated salt, memory cost 65,536 KiB, time cost 3, parallelism 1 |
| Login | Existing `POST /api/auth/login`; admin page supplies `purpose: "platform"` and requires an existing grant plus dashboard permission |
| Sessions | Database-backed hashed session tokens; HttpOnly/SameSite cookies, production Secure cookies, CSRF, rotation, absolute/idle expiry and logout/revocation |
| MFA | Existing enrolled authenticator and single-use recovery-code verification; configured privileged-action policies still apply |
| Provisioning | Existing email-first Business signup plus private `server/admin.js grant` operator command |
| Recovery | Existing `/#/admin/recover` → recovery email → `/#/reset-password`; recovery changes the password without replacing the identity or grant |

Source: `server/auth/business-signup.js`, `server/auth/registration.js`, `server/auth/routes.js`, `server/auth/security.js`, `server/auth/sessions.js`, `server/auth/protection.js`, `server/admin.js`, `server/platform/routes.js`, and existing migrations 001/003 and later permission extensions.

No new authentication system, role, registration endpoint, dependency, application schema, migration or application-code change was necessary.

## Provisioning method

The existing Business signup verifies mailbox ownership before creating an ordinary Business identity. It requires a password through the existing browser form and stores only its salted Argon2id hash. Signup does not create an administrator grant.

The private database-operator command grants the existing platform role to exactly one active eligible Business/legacy identity. It does not accept passwords and cannot create an identity. It revokes that user's existing sessions and writes a `platform.admin_grant` audit event with the reason and a random operator-event ID.

The grant tool's audit event has no authenticated application actor. A real named authoriser and actual change reference must be included in the operator reason and retained in the approved execution record. A random event ID is not proof of the human operator's identity.

If an account already exists, it must be preserved. Inspect it first; use recovery for password setup, and skip granting if the required grant already exists. Re-running the grant command unnecessarily updates its reason/time and revokes sessions. A Customer, suspended or ambiguous account must be reported and resolved under separate authorisation; the operator tool must not be bypassed to promote it.

## Local verification

All database-backed checks used the existing disposable runner: a fresh workspace-local PostgreSQL 16.16 cluster, loopback-only listener, random database credentials, a `mysolar_test_*` database and isolated schemas. The provisioning test additionally checked the server address and workspace data directory before migration/application operations. No production DATABASE_URL, customer data or credentials were copied.

The new test exercised the actual existing private CLI in a child Node process with only the isolated test connection. It did not simulate a successful grant or mock database/API responses. Its stdin contained only a fictional email and reason. No `.env` file was loaded by the operator command.

For verified signup and recovery, an inert `127.0.0.1:9` mail transport allowed normal encrypted jobs to be queued. Tests read their genuine encrypted fictional OTP/reset payloads in memory. No mail worker ran, no `sendMail` was invoked, and no live email was sent. This proves queue/token/application behaviour, not external delivery.

| Requirement | Local result and evidence |
| --- | --- |
| Corrected official-address lookup | Absent in the newly created disposable schema only; no official identity created by tests |
| Secure identity creation | PASS: real email-first signup, mailbox-code verification and ordinary Business identity |
| Salted hash storage | PASS: Argon2id verifies the random fictional password; a second hash of the same value differs |
| No public self-assignment | PASS: signup produces no platform grant; dedicated admin login rejects that identity before private granting |
| Private role assignment | PASS: actual `server/admin.js grant`, correct existing role, audit reason/event and session revocation |
| Existing identity/password preservation | PASS: grant leaves the password unchanged; recovery preserves user ID and role while changing the password; reset token cannot be reused |
| Unrelated accounts | PASS: existing-account signup protection, Customer promotion refusal and absent-account grant refusal; no unrelated administrator grant created |
| Login and wrong password | PASS: provisioned fictional admin signs in; invalid credentials remain generic and do not issue a user session |
| Server permissions | PASS: company read, onboarding review, marketplace review, lifecycle management and audit permissions returned from authoritative grants |
| All review queues | PASS: pending, approved, rejected/returned, marketplace and published queues accessible |
| Company details/history | PASS: real API access to a separate fictional owner's company and both review/activity arrays |
| Separate activation/publication | PASS: existing full customer-to-business PostgreSQL acceptance verifies activation, marketplace review and publication as separate steps; existing focused platform suite also covers rejection/correction transitions |
| Logout, expiration and MFA | PASS: existing dedicated admin integration/browser suite verifies revocation, expiry, CSRF, MFA and single-use recovery-code handling |
| Existing rate limits | PASS: signup cooldown remains active and repeated invalid administrator login reaches the existing 429 `RATE_LIMITED` response |
| Customer/Business regression | PASS: existing real browser login reaches each separate dashboard and ordinary users cannot use administrator access |

The first provisioning test attempt expected an immediate duplicate-signup rejection but correctly received the existing cooldown response. The test now asserts that cooldown explicitly and tests duplicate-identity rejection against a separate existing fictional address with no prior signup bucket. No limiter or application protection was weakened.

### Commands and evidence

- `node scripts/verify-postgres.mjs admin-provisioning.integration.test.mjs`: **8 passed, 0 failed, 0 skipped**, including the parent test; covers the final detail/history and explicit login-rate-limit assertions. [Final provisioning log](.verification/official-admin-provisioning-final.log).
- Provisioning plus existing marketplace acceptance run: **25 passed, 0 failed, 0 skipped**, before the additional rate-limit assertion and detail-access coverage. This includes all **15 existing customer-to-business journey steps**, migration installation/repeat and empty historical upgrade checks. [Combined log](.verification/official-admin-provisioning.log).
- Existing admin suite with the temporary local Playwright module: **8 passed, 0 failed, 0 skipped**, including the browser subtest and parent test. [Browser/integration log](.verification/official-admin-configuration-browser.log).
- The browser module recorded **13 passing checks and no page errors**, with additional footer and ordinary-account assertions. [Browser results](.verification/admin-login-browser/results.json).
- Existing unit suite: **185 passed, 0 failed, 0 skipped**. [Unit log](.verification/official-admin-configuration-unit.log).
- Existing focused platform administrator suite: **19 passed, 0 failed, 0 skipped**. [Platform log](.verification/official-admin-configuration-platform.log).
- `npm run build`: **1,814 static checks passed, 0 failed**. [Build log](.verification/official-admin-configuration-build.log). This project's build checks JavaScript syntax/imports/assets/dependencies; no separate TypeScript compiler is configured.
- `git diff --check`: PASS. No commit, push or deployment.

## Admin Login route and browser evidence

The public footer's **Admin Login** link opens `/#/admin/login`. The existing dedicated page posts through the existing authentication API; an authorised fictional operator is redirected to `/#/platform`. The browser tests use the loopback application and fictional accounts, not the real administrator password.

- [Desktop footer](.verification/admin-login-browser/footer-desktop.png)
- [Mobile footer](.verification/admin-login-browser/footer-mobile.png)
- [Administrator login — desktop](.verification/admin-login-browser/login-desktop.png)
- [Administrator login — mobile](.verification/admin-login-browser/login-mobile.png)
- [Existing platform dashboard](.verification/admin-login-browser/dashboard-desktop.png)
- [Pending review queue](.verification/admin-login-browser/pending-queue.png)
- [Expired-session view](.verification/admin-login-browser/expired-session.png)

No live website authentication was attempted for the corrected official address. Prior public-site investigation is documented separately in `MY_SOLAR_ADMIN_LOGIN_BUTTON_INVESTIGATION_REPORT.md`; it must not be mistaken for official-account verification.

## Exact production activation steps — instructions only, not executed

1. Obtain explicit authorisation for this corrected address and the exact production target, operator and scope. Current instructions prohibit production account/database modifications.
2. An authorised operator identifies the exact database/environment and performs a parameterised, scoped read-only account/grant lookup for `mysolarsolutions2026@gmail.com`. Retrieve status, account type, email-verification state, grant and permission names only; do not export password hashes, tokens, MFA secrets or unrelated records. Do not assume an existing local `.env` is the correct target.
3. **If the identity exists:** preserve it. For a compatible active Business account, the owner opens the official HTTPS `/#/admin/recover`, enters the corrected email, receives the real reset link and sets a **new password privately in the existing reset form**. Do not send it to the assistant or put it in a command, environment variable, file, report or screenshot. If recovery delivery fails, stop and diagnose the existing mail service. Do not directly overwrite the password or disable MFA. If the account is incompatible/suspended, stop for an owner decision.
4. **If the identity is absent:** the owner uses the existing Business account-registration flow, proves control of the corrected mailbox using the emailed code and enters a new password directly in the existing HTTPS browser form. Stop before company setup; no company or XYZ change is required. For an owner-controlled local rehearsal, use the trusted loopback browser instead. Do not create a separate public administrator signup endpoint or a seeded permanent password.
5. Verify exactly one active, email-verified Business identity. If it already has the required `platform_admin` grant and permissions, skip granting. Otherwise, after explicit grant authorisation, use the approved operator process environment and run **`node server/admin.js grant`** from the project root. Provide JSON on stdin with only `email` set to the corrected address and `reason` containing the actual named authoriser/change reference (10–300 characters), then finish input with EOF. **No password belongs in this JSON.** This command is documented here, not authorised for production by this report. Avoid blindly using `npm run admin:grant`, which can load an unintended local `.env`.
6. Confirm the target grant and `platform.admin_grant` audit event. Existing sessions were revoked; the owner must sign in again. Do not change other administrator accounts, company ownership or business applications.
7. The owner signs in through `/#/admin/login` with the new password and existing second factor, confirms `/#/platform`, and checks queue/detail/history access. Verify required permissions from the real session. Do not approve or reject XYZ to produce evidence. Keep negative/repeated-login/destructive tests on fictional local accounts.
8. Verify logout and the configured expiry/security policy, mailbox receipt, MFA enrolment and recovery readiness. Record redacted owner acceptance. Only then state that the official account is active and verified in that environment.

Approval authority remains independent of ownership: a platform administrator cannot approve/reactivate/publish a company they created or belong to. Activation, marketplace approval and publication remain separate decisions. No automatic approval of XYZ or any other business is part of provisioning.

## Changes and readiness

Added `tests/admin-provisioning.integration.test.mjs` and this report; marked the earlier incorrect-address setup report superseded. Existing application authentication/provisioning code was reused without modification. No migration, new runtime dependency, environment setting or deployment change is required for the procedure itself.

**GO for the tested local procedure. Production activation remains NOT PERFORMED and NOT VERIFIED.** External email delivery, the production account/grant, production MFA policy and owner password entry still require the separately authorised production activation above. No broad production-release, browser-family or accessibility certification is claimed.

Production records/accounts, XYZ, Railway and Razorpay were not accessed or modified. No production migrations, live billing, live email, commit, push or deployment occurred. Local test schemas were cleaned up and disposable clusters stopped by the existing runner.
