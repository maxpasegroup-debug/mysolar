# Mandatory signup email verification and global email uniqueness

Owner correction, 2026-10-25: a customer email cannot also register a business account. Both account types must verify an email code before an account is created. This policy supersedes shared-email descriptions in earlier handoffs.

## Implemented behavior

- Customer and business signup retain name, email and password. The supported account type comes from the chosen journey/invitation; unsupported roles and extra privilege fields are rejected.
- POST /api/auth/register now queues a verification challenge and returns 202. It creates no user, customer profile, company membership or signed-in identity.
- The user enters an eight-digit email code, valid once for 15 minutes in the requesting browser. POST /api/auth/register/confirm accepts only challenge and otp; it cannot replace the password, account type, identity or invitation after proof was requested.
- Successful confirmation creates the verified account and rotates into an authenticated session, atomically. Business company setup and employee invitation acceptance remain separate protected workflows.
- Existing email addresses are rejected with EMAIL_UNAVAILABLE (409), regardless of customer/business purpose or case submitted through normalized API inputs. Sign in or use a genuinely different email. The response does not reveal the existing account's purpose or private records.
- The database enforces global email uniqueness. Legacy mobile/PIN signup also checks email globally and still requires its existing email proof. Existing logins/PIN compatibility and existing accounts are preserved.
- Forgotten passwords continue to use the previously added single-use email-code reset flow. Account purpose remains explicit for the chosen login/recovery journey, but an email can belong to only one account.
- Unconfigured email/encryption causes a safe 503 with no account created and no invented delivery claim. A displayed OTP screen means a job was queued, not that the inbox received it.

## Security and atomicity

Registration challenges bind email, browser session, encrypted registration context and a cryptographically generated code. The context contains an Argon2id password hash, name, validated account purpose and optional invitation token; no plaintext password is retained. Code hashes use the existing server HMAC secret. Context is cleared on successful verification or replacement by a newer request from the same browser.

Limits: five ordinary signup requests/IP/hour; valid invitation holders use the existing separate 30/IP/hour allowance. Each email is limited to three requests/hour and one/minute. Confirmation permits 20 attempts/IP/15 minutes, ten/challenge/15 minutes and at most five persistent wrong-code guesses. Wrong-code counters commit on rejection. OTP/credentials never enter URLs, browser storage, audit metadata or unencrypted queued payloads.

Signup uses an email-scoped advisory transaction lock plus the unique index. Two valid challenges from different sessions/account choices can race, but only one account can be created. Expired, used, exhausted, cross-browser or malformed proof is rejected. Invitation validity is checked both when requesting and confirming. No membership is granted by registration alone.

CSRF is attached specifically to the registration POST handlers so existing GET security/session routes continue to work. Existing same-origin and session checks remain authoritative. The worker revalidates challenge, requesting session, attempt limit, expiry and email availability before sending signup mail; it cancels obsolete jobs. Existing encrypted queue, retries and safe failure diagnostics are reused.

## Database and release

New migration: server/db/migrations/032_verified_unique_email_signup.sql.

It checks for shared historical addresses first, stops with 23514 if any exist, then creates global normalized-email uniqueness and the registration challenge table, indexes and allowed registration_otp mail kind. It does not merge/delete identities, reassign records or change anyone's email. A reviewed owner-approved separation must resolve historical duplicates before release. Existing migration 030 mixed-identity protection remains in force. Historical migration files were not rewritten.

Production was previously observed at migration 029. This local branch requires the supported migration chain through 032 with matching web and mail-worker code and a verified recovery point. Nothing in this task modified production data, configuration, DNS, services or deployment. No real emails were sent. A source push alone is not proof the migrations or mail worker are updated.

Challenge records have no automatic retention purge in this change. Expired challenge contexts remain encrypted until reviewed cleanup; completed/replaced context is cleared. Mail payload retention follows the existing queue's terminal-state clearing. Do not claim automatic account-record deletion.

## Relevant files

- server/auth/email-registration.js: verified registration request and confirmation.
- server/db/migrations/032_verified_unique_email_signup.sql: global uniqueness, preflight and challenges.
- server/auth/routes.js: replaces immediate public account creation with the verified registration router.
- server/auth/pin-routes.js: global email eligibility for legacy verified PIN registration.
- server/mail-queue.js: registration OTP delivery eligibility.
- src/account.js, src/mobile-auth.js, src/onboarding.js: both signup journeys request proof, remove password fields from confirmation, and show success only after actual account creation.
- server/auth/account-type.js: separate-account guidance now requires a different email.
- tests/email-signup.integration.test.mjs and tests/unique-email-upgrade.test.mjs: mandatory verification, global uniqueness, upgrade blocker and concurrency.
- tests/helpers/identity.mjs: explicit disposable database identity fixtures and mocked verified-signup helper. Fixture seeding is not an application endpoint. Authentication and full-company acceptance tests exercise the real signup OTP flow; unrelated operational fixtures seed identities and authenticate through normal login.
- Existing account-channel/password-recovery tests now use distinct emails; shared-email success assertions were removed because the owner reversed that policy.
- README.md and previous handoffs identify this policy as current.

## Checks actually run

- Complete disposable localhost PostgreSQL regression suite: 392 passed, zero failed/skipped.
- Additional focused registration run after adding the opposing-channel concurrency case: seven passed, zero failed. This overlaps the full suite; it is not seven extra distinct full-suite tests.
- Static checks: 1317 passed, zero failed.
- Browser checks: 901 passed, zero failed; fictional intercepted accounts only, not live delivery proof.
- Logs are local/ignored under .verification/verified-signup-*.log. No production credentials are written there.

## Manual acceptance after an authorized release

Use an inbox you control. Register a customer, confirm that no account exists before code verification, receive/enter the actual code, then sign in. Attempt business signup using that customer email: it must reject it. Register the business using a different inbox and complete its own verification/company setup. Test expiry, resend, incorrect code and forgotten-password recovery without sharing codes/passwords in chat. Real inbox delivery and release migration status still require evidence after release.
