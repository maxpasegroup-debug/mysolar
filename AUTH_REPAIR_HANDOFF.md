# Signup and authentication repair - latest update 20 October 2026

## Authorized production migration and Git release preparation (2026-10-20T16:47:18.071Z)

The owner explicitly authorized all required migrations plus committing/pushing this release. Verified the existing approved Railway backup pre-signin-migrations-2026-10-20 (03c813d5-485c-4e9d-8e0f-dee4cd6cc318) remains listed without expiry. No additional paid backup/resource was created and no restore exercise is claimed. The production target is mysolar / production, using its existing Postgres service.

Applied only 021_mobile_pin.sql through the existing npm run db:migrate runner in the running application container, after transferring the exact new release migration with a checksum guard. No historical migration was rewritten. Before: 20 entries; after: **21 entries, all committed-release checksums match, zero unvalidated constraints**. The initial guard safely stopped because the local Windows copy of migration 020 has CRLF whereas committed/deployed bytes have LF; comparison was corrected to exact Git release bytes without changing that historical file. Public /readyz returned 200 ready and /api/auth/session returned 200 with an anonymous security session after migration.

Production configuration inspection (presence only) found AUTH_PIN_PEPPER unset, DATA_ENCRYPTION_KEY unset, mail credential/sender present, and no recorded mail-worker heartbeat. Variables, secrets, mail services, DNS and domain traffic were not changed. Therefore mobile/PIN activation and real email delivery remain blocked even after this code is released; existing email/password access stays available. Effective Railway deployment metadata still lacks the pre-deploy command/readiness health check; remote deployment settings were not altered. No account was registered, private workflow tested or email sent live. Git push may trigger the existing Railway GitHub deployment integration; code-release verification is separate from the successful schema migration.

## 20 October: mobile number and six-digit PIN (local implementation)

This section supersedes the older sign-in presentation when optional PIN configuration is enabled. Existing account IDs, memberships, permissions, sessions, CSRF/origin rules, audit records and encrypted mail delivery are reused. No production configuration, deployment, migration, account or outbound message was changed in this work.

### User journeys

- New customer/business signup: name, recovery email and Indian mobile; request an email code; enter it and choose a six-digit PIN. No account is created before email proof. Company setup/activation remains separate. Existing invitation destinations are retained and registration grants no company membership or administrator role.
- Sign in: mobile and masked PIN. Email/password remains available for existing accounts. An enrolled authenticator/recovery code is requested only after primary validation. Back clears credentials and the stale MFA message.
- Existing account: sign in, verify its email in Account Security, prove current password/PIN and enrolled MFA, choose mobile and confirm an emailed code/new PIN. Enrollment signs out all sessions. Contact phone fields are never automatically promoted to login identities. Duplicate users/phones are not merged.
- Forgot PIN: submit sign-in mobile; generic response does not disclose account/email existence. A valid recovery-email code changes the PIN and revokes all sessions. It never signs the user in or removes MFA. Next login still requires enrolled MFA.
- Initial scope is Indian mobile numbers beginning 6 through 9, normalized to +91. Ten-digit local numbers or country-prefixed numbers with formatting are accepted. **Mobile ownership is not verified by SMS.** No SMS/WhatsApp provider was added; number disputes/recycling still need an operator policy.

### Security and storage

Forward migration **021_mobile_pin.sql** adds unique user-linked mobile_credentials, session-bound pin_challenges, constraints/indexes and the pin_otp mail kind. Historical migrations are untouched. Signup/invitation context and queued messages are encrypted. PINs are HMAC-peppered then Argon2id-hashed. OTP hashes are keyed and bound to purpose/challenge. PIN-only accounts store an inaccessible random legacy password verifier to preserve the existing NOT NULL schema; this is never exposed/delivered. Verified email recovery may explicitly establish a legacy password later.

Email codes expire in ten minutes, permit five comparisons and are single-use. Resending invalidates the older code. Challenge/session/purpose binding, current verified email, credential revision and authenticated ownership are checked where relevant. Failure counters commit on rejected comparisons. Five incorrect PIN/MFA attempts lock that credential for fifteen minutes across IPs/restarts. Additional IP/mobile/email/user budgets and request cooldown buckets remain; per-account reauthentication throttling covers existing security endpoints. New PINs reject identical/consecutive digits. Role/tenant authorization and MFA remain authoritative.

The worker cancels invalid jobs, scrubs terminal message payloads and may deliver at least once; duplicate email does not allow duplicate redemption. db:cleanup deletes expired/consumed challenges. Until cleanup runs, those rows remain stored; no automatic deletion is claimed. Existing audit retention is unchanged. Audit metadata excludes PINs, OTPs and personal message contents.

### Operator rollout (not executed)

1. Review/commit the release. Verify a current recoverable backup before authorizing schema deployment. Earlier production authorization covered 009-020, not this new migration.
2. Apply through the supported **npm run db:migrate** runner on the explicitly approved target, never manual SQL. The manifest now expects 21 entries. Verify effective Railway pre-deploy/health-check settings against repository configuration; the prior discrepancy has not been changed. Keep PIN configuration empty initially for legacy access.
3. Configure an independent random 32-byte hexadecimal **AUTH_PIN_PEPPER** via the operator secret manager and back it up. Never reuse session/encryption secrets. Rotation invalidates existing PIN verifiers and outstanding codes, requiring a planned recovery process.
4. OTP signup/reset also require **DATA_ENCRYPTION_KEY**, existing Resend/SMTP credentials, verified **MAIL_FROM**, and a supervised **npm run worker:mail** process. Do not rotate an existing encryption key without migrating encrypted data. Resend uses the existing server-only SMTP adapter.
5. With separate authorization, verify actual inbox receipt and signup/reset/MFA/session revocation using an approved recipient. Mock SMTP acceptance is not evidence of Resend inbox delivery. Strong owner/platform MFA policies require a working recovery procedure.

Without the pepper, the default remains email/password and PIN endpoints safely report unavailable. Missing mail/encryption blocks PIN setup/reset, while already-enabled PIN login still works with the pepper. Removing the pepper is only an emergency legacy-UI fallback: PIN-only users may need verified email password recovery or restored PIN configuration. Do not drop credential tables during app rollback.

### Files and verification

Backend: server/auth/pin-routes.js, pin-security.js, shared registration.js, existing auth routes/protection, config, mail queue, cleanup and migration 021. Frontend: src/mobile-auth.js, account/security/onboarding integration, index.html, accounts.css, static server allowlist and service-worker cache v18. Configuration/tests: .env.example, isolated secret scrubbing, PIN integration, authentication/config tests and browser scenarios. No dependencies added.

Final local checks: **257 automated tests passed, zero failed/skipped**, using a disposable PostgreSQL cluster; **336 browser checks passed** across six widths with fictional API fixtures. Coverage includes concurrent normalized mobile claims, email proof, expiry/replay/resend/attempt budgets, durable lockout, existing email/password, disabled configuration, session revocation, retained MFA and correct company-role restoration. An inherited stale MFA feedback issue was fixed. Browser screenshots include .verification/browser/mobile-pin-390.png. **1,033 static checks passed.** Protected deep-link sign-in also preserves its conditional MFA step. These results are not production readiness, real email delivery or mobile ownership verification.

## 20 October: simple sign-in and production schema repair

The initial customer and distributor sign-in form now contains registered email (the existing account identifier), password, Sign in and Forgot password only. Removed the marketing side panel, account-creation/demo links, unconditional authenticator field and duplicate setup error. Accounts with enrolled MFA receive a separate, focused code step only after the backend verifies the password. Back clears the password. No password or MFA material is stored in browser storage. Recovery, role guards and safe journey destinations remain in use. Static cache version is v17.

Read-only inspection of the running production service confirmed only migrations 001–008 were applied although deployed commit 91f0ab12acd3eae21db4814c1c57363e5f7e6a97 expected 20 entries. The users.email_verified_at/sessions.mfa_verified_at columns and account_security table were absent. This caused the screenshot's SERVICE_NOT_READY response after signup; the account should not be registered again to repair it.

The owner explicitly authorized checking backups/applying migrations, then separately authorized one new backup when none existed. Production PITR was disabled and the initial backup list was empty. Created one approved backup on the existing Postgres volume: pre-signin-migrations-2026-10-20, ID 03c813d5-485c-4e9d-8e0f-dee4cd6cc318, listed by Railway at 2026-10-20T15:13:49.337Z (20:43 IST), referenced size 869 MB. No restore exercise or PITR enablement is claimed. Manual backup storage may be billed by Railway.

Existing 001–008 checksums matched before the change. Ran the existing npm run db:migrate through the running production mysolar container, applying 009–020 without rewriting historical migrations. Post-check: 20 entries, all expected checksums matched and zero unvalidated constraints. Public https://mysolar.solutions/readyz returned 200 ready, and /api/auth/session returned 200 with a valid anonymous security session. No private token/cookie values were printed. No user or company account was created, no password was changed, no invitation/recovery mail was sent, and no code deployment, environment-variable, DNS or domain-routing change was made.

Local checks: 18 authentication/recovery/MFA integration checks passed against disposable PostgreSQL; 317 browser checks passed across six widths, including two-field login, conditional MFA and back navigation; 993 static checks passed. Screenshots are ignored local evidence: .verification/browser/signin-390.png and signin-1440.png. A browser-fixture race was corrected by draining a pending focus refresh before changing fictional roles; backend permissions were not relaxed.

Remaining operational issues: effective production deployment metadata still shows no pre-deploy migration command or readiness health check, whereas railway.json specifies npm run db:migrate and /readyz. Remote configuration was not changed; resolve that discrepancy before future schema releases. DATA_ENCRYPTION_KEY is unset in production, so queued recovery/verification/invitation mail and MFA enrolment still need the key and supervised mail worker. This is separate from the repaired schema failure and was not bypassed. The simplified sign-in code is local and needs the owner's commit/push/release; no commit or push was performed here.

## Historical incident record

# Signup and authentication repair — 17 October 2026

## Confirmed cause and live repair

The linked Railway `mysolar` application pointed to the correct existing Postgres service and had its HTTPS origin and session secret configured. Read-only inspection from inside the deployed app confirmed that the database's public schema had no application tables. `/healthz` returned 200, while `/readyz` returned 503 and `/api/auth/session` returned 500. API rate limiting and sessions both need database tables, so requests failed before either customer or distributor signup could proceed. This was not an audience-selector or registration-form failure.

Applied the repository's existing migration command inside the deployed app:

```text
railway ssh --service mysolar -- npm run db:migrate
```

All tracked migrations completed: 001 identity, 002 role catalogue, 003 company setup, 004 marketplace, 005 enquiries/quotations, 006 operations, 007 SIA and 008 commercial. No historical migration was changed; no existing business data was deleted. No production test accounts, companies, products or payment records were created. Migration-defined taxonomy/configuration is initialization data, not live inventory.

Afterward, read-only inspection confirmed migration records and application tables. Live HTTPS observations:

- `/healthz`: 200.
- `/readyz`: 200, `ready`.
- `/api/auth/session`: 200, anonymous session with a CSRF token and Secure/HttpOnly session cookie.

The live database repair takes effect immediately without a code redeploy. A browser retaining the earlier session-loading error should reload the page before registering. No environment variables or credentials were changed.

## Repository changes

- `railway.json`: run `npm run db:migrate` before future deployments and use `/readyz` as the deployment health check. Railway blocks a deployment when its pre-deploy command fails. This configuration takes effect when committed and deployed; it has not been deployed in this task. Documentation: https://docs.railway.com/config-as-code/reference and https://docs.railway.com/deployments/pre-deploy-command.
- `server/errors.js`: return a safe 503 setup response for missing/outdated database objects. Log only fixed diagnostic categories and the existing request ID for server errors. No raw exception messages, queries, request bodies, emails, passwords or secrets are added to logs.
- `tests/authentication.test.mjs`: isolated PostgreSQL registration/login/logout and separate company-setup regression coverage.
- `tests/errors.test.mjs`: safe setup-error and diagnostic redaction coverage.
- `AUTH_REPAIR_HANDOFF.md`: this record.

Authentication, cookie security, CSRF, roles, customer ownership and tenant enforcement remain in force. Both signup journeys still use `/api/auth/register`; signup alone grants no distributor company or platform privileges. Distributor company creation remains an explicit signed-in `/api/companies` operation, followed by existing onboarding/approval requirements.

## Focused checks

Ran only the focused authentication/database checks and existing security checks against a new temporary local PostgreSQL cluster: **13 passed, 0 failed, 0 skipped**. The local cluster stopped afterward. No comprehensive suite, build, lint or broader launch audit was run.

Coverage includes customer profile creation, anonymous-to-user session rotation, HttpOnly cookie, customer login/logout and old-session revocation; distributor personal registration, explicit company creation, owner membership and subsequent login; customer/company separation; platform privilege denial; wrong passwords, missing CSRF, duplicate email and injected role rejection; Argon2 password verification, origin checks and safe error diagnostics.

Local checks use fictional accounts in a disposable schema and do not prove a real person's completed production onboarding. Live checks intentionally stop before account creation. Operational scripts under ignored `.verification/` retain credentials only in process memory and are not deployment assets.

## Manual follow-up

Reload the live site, register the intended real distributor account, continue to company setup and check sign-out/sign-in. In a separate browser/private session, register a real customer and check their dashboard and login. An existing email should use login rather than repeated registration. Password recovery/email delivery still depends on the existing SMTP configuration; this task does not add a mail provider or bypass recovery controls.

Commit/push the repository changes to enable the future deployment safeguard. No code was pushed or deployed by this task. Remaining launch verification is separate from this confirmed database initialization repair.
