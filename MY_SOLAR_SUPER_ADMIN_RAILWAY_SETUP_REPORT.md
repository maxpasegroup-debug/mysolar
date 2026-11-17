# MY SOLAR — Super Admin local verification and Railway setup

Date: 16 November 2026

## Outcome

**Local verification: PASS. Production activation: BLOCKED and not authorised.**

The existing authentication system works with fictional administrators in a fresh disposable local PostgreSQL database. No new administrator authentication system, password environment variable, schema change or deployment is required for the existing provisioning procedure.

The intended production identity is **mysolarsolutions2026@gmail.com**, with the existing **platform_admin** role. Its production existence and grant remain **unknown**. It was not created, reset, granted privileges or tested with a real password. The real selected password was never requested or used locally.

## Existing architecture

- `server/auth/routes.js`: existing login, recovery, password reset, session and logout endpoints. Dedicated administrator login sends `purpose: platform` to the same authentication API; ordinary Customer/Business identities without a platform grant are rejected.
- `server/auth/security.js`: salted Argon2id hashing, memory cost 65,536 KiB, time cost 3, parallelism 1. Creation/reset requires 12–128 characters. No policy was weakened.
- `server/admin.js`: private database-operator CLI, `grant` and `revoke`. It accepts email and an authorisation reason on stdin, never a password. It requires exactly one active eligible Business/legacy identity, changes that identity's platform grant, revokes its sessions and records an audit event. No public endpoint can issue these grants.
- `server/platform` and existing platform route guards enforce server-side permissions independently of the login page. Enrolled MFA remains enforced.
- `src/account.js`: `/#/admin/login`, recovery at `/#/admin/recover`, and successful platform-purpose login navigation to `/#/platform`. Existing company review modules are reused.
- Core tables: `users`, `sessions`, `platform_admin_grants`, `roles`, `role_permissions`, `audit_events`, `account_security`, `password_reset_tokens`, `registration_challenges`, `mail_jobs`, and existing company/review tables. The password hash belongs to the user identity, not Railway configuration.
- Verified email-first Business signup can create the eligible **user identity without a company**. Stop before company setup; do not create an unnecessary business workspace. Supporting identity/profile/acceptance/session/mail/audit records are normal signup effects.

## Local evidence

The existing `scripts/verify-postgres.mjs` created new workspace-local clusters using the available portable PostgreSQL installation. Each cluster listened only on `127.0.0.1`, used fresh random database credentials and a fresh database named `mysolar_test_phase1`, and was stopped afterward. Test helpers verified the loopback server and workspace cluster path, used isolated schemas and applied existing migrations there. No production database URL or real business records were used. External providers were disabled; the provisioning fixture used inert loopback SMTP with no mail worker and no live delivery.

Commands executed:

```text
node scripts/verify-postgres.mjs admin-provisioning.integration.test.mjs admin-login.integration.test.mjs admin-marketplace-acceptance.integration.test.mjs
node scripts/verify-postgres.mjs admin-login.integration.test.mjs
```

The second run enabled the existing local Chrome browser adapter through `MYSOLAR_ADMIN_BROWSER_SCRIPT`; it did not use production. Fictional random passwords stayed in memory, browser network requests were limited to localhost, and screenshots do not show passwords.

| Verification | Result and evidence |
| --- | --- |
| Real signup and salted Argon2id verification | PASS; actual signup APIs and hash verification, including different salts for the same fictional password |
| Existing private operator grant | PASS; actual CLI, expected role, audit record, session revocation and unchanged password |
| Secure recovery | PASS; actual reset API, same identity/grant preserved, new hash and single-use reset token |
| Admin login and review queues | PASS; authoritative session permissions and all five existing queues |
| Activation approval | PASS; fictional submitted company approved through real API/database operations |
| Separate marketplace approval and publication | PASS; activation alone did not approve or publish the listing; free listing publication verified |
| Customer discovery, enquiry and quotation | PASS; complete existing 15-step HTTP/PostgreSQL journey, including isolation and unpublished visibility restrictions |
| Invalid password and non-admin rejection | PASS; generic errors, no authorised session, existing rate limiter |
| Customer/Business regression checks | PASS; ordinary login succeeds, platform access is denied |
| Logout, CSRF, expiry, enrolled MFA and grant revocation | PASS |
| Browser login redirect and desktop/mobile screens | PASS; 13 browser checks, no page errors, including `/#/platform` redirect and ordinary Customer/Business login |

First run: **33 passed, 0 failed, 0 skipped**. Browser-enabled second run: **8 passed, 0 failed, 0 skipped**, including the browser subtest containing 13 checks. These counts overlap; they are not 41 distinct behaviours. Migration installation/repeat checks and the existing upgrade-from-033 check passed within the marketplace suite; this does not verify the actual production migration history or production data compatibility.

Evidence:

- `.verification/super-admin-railway-local.log`
- `.verification/super-admin-railway-browser.log`
- `.verification/admin-login-browser/results.json`
- Screenshots in `.verification/admin-login-browser/`, including `login-desktop.png`, `login-mobile.png`, `dashboard-desktop.png`, `dashboard-mobile.png`, and `pending-queue.png`.

The official address was absent only in the newly created disposable schema. This is expected and says nothing about production. No persistent local official administrator account was created.

## Railway variables: names and purposes

The explicitly selected production web-service environment was inspected read-only. Only presence booleans and non-secret effective configuration booleans were output. Configuration was parsed locally in memory with those existing service variables; this did not start the server, connect to the database or send email.

| Existing variable | Purpose | Read-only finding |
| --- | --- | --- |
| `NODE_ENV` | Production security behaviour, including secure session cookie | Present; effective production mode true |
| `APP_ORIGIN` | Trusted origin for CSRF and generated links | Present; matches `https://mysolar.solutions` |
| `DATABASE_URL` | Existing application database connection | Present; never output |
| `DATABASE_SSL` | Database TLS policy (`disable` or `require`) | Present; configuration parses; production transport was not tested |
| `SESSION_SECRET` | Existing session/CSRF/private digest protection | Present; existing validation passes; do not rotate for account setup |
| `SESSION_ABSOLUTE_HOURS`, `SESSION_IDLE_HOURS` | Existing session expiry limits | Present; no changes |
| `TRUST_PROXY_HOPS` | Trusted proxy count for correct request/IP handling | Present; topology correctness not independently verified |
| `DATA_ENCRYPTION_KEY` | Encrypts queued recovery/verification mail and MFA material | Present; format validation passes; preserve existing value |
| `MAIL_FROM` | Verified sender address for mail | Present; sender ownership/delivery not tested |
| `RESEND_API_KEY` | Existing optional Resend SMTP credential fallback | Present; value never output |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PORT`, `SMTP_SECURE` | Existing SMTP transport selection and TLS settings | Present; effective mail configuration true |
| `SMTP_PASSWORD` | SMTP credential when not using a valid Resend fallback | Absent; effective existing mail configuration still true through the existing fallback, so absence alone is not a defect |
| `AUTH_PIN_PEPPER` | Existing separate PIN/email-OTP rollout secret | Present; not a platform-role grant or admin password; preserve it |
| `AUTH_REQUIRE_VERIFIED_EMAIL` | Optional verification policy | Absent; effective false |
| `AUTH_REQUIRE_PRIVILEGED_MFA` | Optional additional privileged-action MFA policy | Absent; effective false; enrolled MFA is still enforced by existing authentication |

Sources: `.env.example`, `server/config.js`, `server/mail-config.js`, `server/auth/business-signup.js`, and `.verification/super-admin-railway-variable-presence.json` (presence list followed by effective configuration summary).

**Required administrator-specific new variables: none.** Do not add `SUPER_ADMIN_PASSWORD`, public-prefixed credentials, password hashes or automatic startup provisioning. No temporary provisioning secret is needed, so none should be installed and later removed. Use existing secrets without copying them into a local `.env` or report.

Mail configuration and recovery report available, but actual provider acceptance, running worker, queue health and inbox delivery are **unverified**. Signup/recovery requires the existing mail worker (`server/mail-worker.js`, existing `worker:mail` script) with matching database/encryption/mail configuration. Do not create or change a Railway worker without separate approval. No live email was sent in this task.

`railway.json` retains `npm run db:migrate` as a pre-deploy command and `/readyz` as the healthcheck. This task did not deploy or invoke that migration command. Account provisioning does not require a deployment or migration.

## Production target and account lookup

The previously verified target is Railway project `mysolar` (`b189e069-4956-40fb-aeec-8237b7347893`), environment `production` (`8e1cb532-b9d3-447a-aeca-60fd41ff06fb`), web service `mysolar` (`b27efca8-cfe2-4a3c-9f8e-57f9f255408a`) and database `Postgres` (`058536fc-092b-4288-a48f-cb9cf8baae7d`). Earlier in-memory comparison confirmed matching web/database host, database name and port. The current variable audit explicitly selected the same web service; the current account lookup explicitly selected the same database service.

The scoped read-only lookup was retried and stopped **before database connection** with `PUBLIC_CONNECTION_UNAVAILABLE`. No public database URL/TCP proxy is available to that lookup; an existing internal access path is needed. Earlier checks also found no available Railway SSH key on this workstation. No key, proxy or public access was created.

Evidence: `.verification/super-admin-railway-account-lookup.log`; previous target evidence is recorded in `MY_SOLAR_OFFICIAL_SUPER_ADMIN_ACTIVATION_REPORT.md`.

An authorised operator with existing internal access must execute the scoped `BEGIN READ ONLY` query in that activation report. It returns only the designated identity's account ID, status/type, email verification, platform grant/permissions and MFA-enrolled boolean. Do not return password hashes, tokens or unrelated customer/company records. An incorrect-credentials message is not an account-existence check.

## Production provisioning procedure — not executed

1. Reconfirm exact project/environment/service/database and connection relationship at execution time. Run the scoped read-only query and record the exact existing account ID and grant state.
2. Present the applicable operation below, its expected writes and rollback to the owner. **Obtain explicit approval before any signup, recovery request, password reset or role grant.** This report is not that approval.
3. If absent, the owner completes the existing email-verified Business identity signup on the official HTTPS site and privately enters a fresh policy-compliant password. Stop before company creation. Verify exactly one active eligible verified identity, mailbox ownership and its ID, then perform the specifically approved operator grant.
4. If an eligible ordinary identity exists, preserve it. Verify ownership and obtain explicit approval to promote that exact account; an email match alone must never trigger privilege assignment. If a Customer/suspended/ambiguous account is found, stop for a separate decision rather than convert or replace it.
5. If an administrator already exists, preserve it and skip granting again. After recovery approval, the owner uses `https://mysolar.solutions/#/admin/recover`, receives the one-time link and privately enters the password on the existing reset page. Argon2id hashing, reset-token consumption and session revocation are handled by the existing backend; MFA is not bypassed.
6. For a missing approved grant, an authorised operator runs `node server/admin.js grant` **inside the verified production service context** using stdin JSON containing only the corrected email and an actual named authoriser/change reason (10–300 characters). No password is passed. Avoid the npm wrapper on a workstation because it can load an unintended local `.env`. Record the command outcome and audit event. The CLI audit actor is null, so the reason and approved operator execution record must identify the real authoriser; its random operator-event ID does not independently authenticate a human.
7. Re-query the exact identity/grant and audit result. Owner privately signs in at `/#/admin/login`; verify redirect to `/#/platform`, pending company applications, company detail/history, `platform.companies.read`, `platform.onboarding.review`, `platform.marketplace.review`, `platform.lifecycle.manage` and `platform.audit.read`. Read production queues only: do not approve a real company merely to test permissions.
8. Verify logout. Use fictional disposable fixtures for repeated invalid-password, expiry and destructive review tests. Do not use the real password in scripts, fixtures, logs or screenshots.

### Duplicate protection and safe retries

Existing signup checks/locks the email and enforces uniqueness; duplicate creation is rejected. The grant table has one row per user and the existing CLI uses an upsert, so it does not create duplicate grants. **The CLI is not a no-op on retry:** it rewrites grant reason/time, revokes sessions and adds another audit event. Therefore the operator procedure must recheck state and **skip** signup/grant steps already completed. If an execution result is uncertain, read the current identity/grant/audit state before retrying; never run the whole procedure blindly. No new automatic provisioning mechanism was introduced.

### Expected writes and rollback

- New identity branch: only normal verification/signup/profile/acceptance/session/mail/audit records for the approved identity, followed by that identity's grant/session/audit records. No company or schema creation.
- Existing grant branch: that identity's grant, session revocation and audit records only.
- Recovery branch: recovery-mail/token, password hash, session revocation and audit records for that identity; existing roles preserved.
- Grant failure rolls back its transaction. With separate rollback approval, revoke **only a newly added grant from this operation** using the existing `node server/admin.js revoke`; sessions are revoked and the rollback is audited. Do not revoke a pre-existing grant to undo a password reset.
- Do not delete the identity to reverse signup. Retain its acceptance/audit dependencies for a separately reviewed retention decision. A reset cannot restore an unknown previous password: use another approved owner-entered reset if necessary. Revoked sessions cannot be restored.
- Do not change encryption/session/PIN keys, schema, Railway configuration or unrelated accounts. No temporary credential variable or startup hook is required.

## Exact next owner action and readiness

**Have an authorised operator with existing internal access run the report's scoped read-only account query and provide its non-secret result.** Once the exact account/grant state is known, approve the specific creation/grant or recovery operation for that identity. A blind production mutation approval is not requested while its prerequisite lookup is unavailable.

Local implementation readiness: **PASS for the tested workflows**. Production official-account activation/login: **BLOCKED**, pending internal lookup, target-specific approval, private owner password entry, actual verification/recovery email receipt and post-setup acceptance. Existing mail configuration does not prove delivery or that a worker is running. No Railway variable change has been demonstrated necessary for this account setup.

XYZ and all existing customer/business accounts were not modified or inspected. Production records, Railway settings and Razorpay were not changed. No commit, push or deployment occurred. Only this report and ignored local diagnostic/test artifacts were added or refreshed; application code was unchanged.
