# MY SOLAR — Official Super Admin setup

> **Superseded — do not execute the account instructions below.** The owner corrected the designated address to **mysolarsolutions2026@gmail.com**. Use [the current configuration report](MY_SOLAR_OFFICIAL_SUPER_ADMIN_CONFIGURATION_REPORT.md). The earlier address in this historical report is not the intended Super Admin and must not be provisioned or promoted for this request.

Date: 16 November 2026. Designated address: **mysolutions2026@gmail.com**.

## Current status

**NOT CONFIGURED OR VERIFIED by this task.** The designated account's existence, account type, status, platform grant and credentials remain **UNKNOWN**. No target account database has been selected or queried. Public login/recovery responses intentionally cannot establish whether a specific account exists.

The owner has been asked to select either a read-only lookup in live MY SOLAR or a disposable local environment. No existing DATABASE_URL is assumed safe. Production account creation, password reset and privilege changes require explicit authorisation for the identified target; none have been performed.

No password was requested in chat, received, printed, written to source/configuration/report/logs, or stored in Git.

## Verified existing architecture

- Existing identities are in `users`; there is no separate administrator user database.
- The existing platform role is `platform_admin`, labelled Platform Administrator. This is the role to use for the requested Super Admin responsibilities; no new role is needed.
- `platform_admin_grants` associates a user with that role. Public registration cannot assign it.
- Migration `003_company_setup.sql` extends the existing role with `platform.companies.read`, `platform.onboarding.review`, `platform.lifecycle.manage` and `platform.marketplace.review`, among other permissions. Runtime permissions come from the database, not just the initial catalogue in `server/permissions.js`.
- `server/platform/company-review.js` maps company activation approval to `platform.onboarding.review`; marketplace approval/publication requires `platform.marketplace.review`.
- Approvals require an independent reviewer: a platform administrator cannot approve/reactivate/publish a company they created or belong to. Giving the designated user a role must not bypass this protection or automatically approve XYZ.
- `server/admin.js` is the existing database-operator grant/revoke tool. It accepts email and reason through stdin, requires exactly one active Business/legacy account, grants the existing role, revokes that user's sessions and writes `platform.admin_grant` audit metadata with reason and a random operator-event ID.
- The existing operator audit has no authenticated application actor attached. The operator must include the real named authoriser/change reference in the reason and preserve the approved operator execution record. Do not describe its random event ID as proof of operator identity.
- Password creation/reset uses `hashPassword()` from `server/auth/security.js`: Argon2id, memory cost 65,536 KiB, time cost 3, parallelism 1. The application stores the hash in `users.password_hash`.
- Dedicated entrance: `/#/admin/login`; existing password endpoint: `POST /api/auth/login` with `purpose: "platform"`. Valid credentials require an existing grant plus dashboard permission before a session is issued.
- Successful dedicated login redirects to `/#/platform`. Existing MFA, rate limits, HttpOnly/SameSite session cookies, CSRF, expiration and logout remain in place.

## Secure procedure after target identification

### 1. Establish the target and inspect only necessary account metadata

An authorised operator must identify the exact environment/database and confirm the selection before connecting. Do not paste database credentials into chat, commands, reports or shell history. Use the approved secret manager/operator environment, not an unreviewed local `.env`.

Run a parameterised SELECT in a read-only transaction for the designated email. Retrieve only: account ID, account type, active/suspended status, whether email verification exists, existing platform role and its permission names. Do not retrieve the password hash, reset tokens, MFA secrets, customer records or company data. Return a short finding such as: absent / active business account without grant / existing authorised administrator / incompatible or suspended account.

No such lookup was performed in this task because the target selection is pending.

### 2. If an account already exists

- Reuse it. Do not recreate it, change its account type or overwrite its password directly.
- If it is an eligible Business account and already has the required grant, skip granting again: the existing grant tool would otherwise update the grant reason/time and revoke sessions unnecessarily.
- The owner should open `/#/admin/recover` and enter the designated address privately. After receiving the real one-time recovery email, the owner should enter the new password directly into the existing reset form. No password needs to pass through the assistant or terminal.
- Recovery currently uses the existing 30-minute reset-link mechanism. The server stores a token hash; the reset form hashes the new password, invalidates reset tokens and revokes existing sessions. Recovery does not itself grant administrator privileges or automatically sign in.
- Recovery requires the actual configured sender, encryption key and running mail worker. Queue acceptance is not proof of inbox receipt. If recovery is unavailable or delivery fails, stop and diagnose the existing service; do not bypass it by writing a plaintext password or disabling security policies.
- If the existing account is a Customer account, suspended, ambiguous or otherwise incompatible, stop and report that exact condition. The existing grant tool deliberately refuses ordinary Customer accounts. Do not silently convert it or create a duplicate.

### 3. If the account does not exist

Use this one-time, supervised procedure; no administrator signup endpoint is required:

1. The owner uses the existing Business account-registration flow and enters the designated email.
2. The owner proves mailbox control using the existing emailed verification code.
3. The owner enters their name and password privately into the existing browser form. The existing `/api/auth/business-signup/complete` flow creates an ordinary Business identity using Argon2id. It does not grant administrator access.
4. Stop before company setup; administrator provisioning does not require creating a business company or touching XYZ.
5. Verify exactly one active, email-verified Business identity for the designated address. Then obtain/record the explicit target-specific grant authorisation.
6. An authorised database operator runs the existing grant tool once, as described below.

For a local setup, enter credentials only in an owner-controlled loopback browser. For a live setup, use the verified official HTTPS domain. Never put a password in an environment variable, stdin JSON for the grant tool, a temporary file, a command argument or a screenshot.

### 4. Grant the existing role, only after explicit authorisation

Use the already approved operator process environment for the positively identified target. Execute **`node server/admin.js grant`** from the project root. Supply one JSON object on stdin containing **only**:

- `email`: `mysolutions2026@gmail.com`
- `reason`: a real reason of 10–300 characters including the named authoriser and actual approval/change reference.

Finish stdin with EOF. **Do not execute this instruction against production without target-specific authorisation.** No password belongs in this input. The operator must not use a placeholder approval reference or regenerate existing authentication/encryption secrets. Avoid blindly using `npm run admin:grant`, which can load an unintended local `.env`.

The existing tool performs the grant, session revocation and audit in a transaction. A new login is required afterward. Verify the resulting role, permissions and audit event through a scoped authorised lookup. This task did not execute the grant command.

### 5. Verify the designated identity

The owner signs in through `/#/admin/login`, enters their own password and any enrolled second factor privately, and confirms redirection to `/#/platform`. Check that the platform queues are accessible and permissions contain:

- `platform.companies.read`
- `platform.onboarding.review`
- `platform.marketplace.review`
- `platform.lifecycle.manage`

Verify logout and session expiration. Use fictional disposable identities for invalid-password, ordinary-user rejection, revocation and review-action tests; do not repeatedly fail login against the official account or mutate real company applications just to produce test evidence. Do not disable MFA or rate limits. Enable/enrol privileged security policies only through the existing approved security/recovery procedure.

Only after the scoped lookup, grant verification and owner-observed successful login may this account be described as configured and verified.

## Verification completed in this task

`node scripts/verify-postgres.mjs admin-login.integration.test.mjs` passed **7 tests, 0 failed, 0 skipped**, including the parent test. All operations used fictional accounts and a newly created disposable loopback PostgreSQL cluster. The tests cover generic invalid/ordinary-account rejection, existing operator login, session rotation, protected dashboard access, CSRF, logout, absolute expiration, ordinary Customer/Business login regression, enrolled MFA/recovery-code replay and grant revocation.

Evidence: [.verification/official-admin-safe-regression.log](.verification/official-admin-safe-regression.log). The test cluster stopped afterward. This proves the existing mechanism, **not the designated account**. Previous browser verification also established the footer entrance and redirect; no live login was attempted here.

## Boundary and next action

Select the target environment and authorise the narrowly scoped account lookup. Until that answer arrives, account existence and official-account readiness remain unverified. No application code, schema, production account, XYZ, Railway setting or Razorpay configuration changed. No production migrations, email, grant, commit, push or deployment were performed.
