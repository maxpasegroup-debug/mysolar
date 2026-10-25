CURRENT POLICY UPDATE: Emails are now globally unique across customer/business identities, and signup requires email OTP verification before creating a user. See VERIFIED_EMAIL_SIGNUP_HANDOFF.md; earlier shared-email descriptions below are superseded.

# Email/password authentication and email recovery codes

Implemented locally on 2026-10-25. No production migrations, deployment, variable changes, live mail sends, commit or push were performed.

## Owner-approved experience

Both customer and business signup now use name, email and password (existing 12-128 character policy). Configured PIN support no longer switches signup into mobile/PIN or hides the password field. Sign-in defaults to email/password inside the existing accessible popup. The account-type selector distinguishes customer and business identities sharing one email. Business signup does not grant company privileges; existing company setup, activation, membership, tenant and permission rules still apply. Supplier roles are not introduced.

Forgot password requests an eight-digit, single-use email code for the selected account type. In the same browser, enter that code plus a new password and its confirmation. Codes expire after 15 minutes and allow at most five incorrect guesses. A successful reset signs out all sessions for that identity and returns to its corresponding login. It does not automatically sign in, modify another identity sharing the email, alter memberships, disable MFA or change a mobile PIN.

Existing mobile/PIN users retain an explicitly selected compatibility login and PIN recovery route. They may instead use email password recovery to set a known password. Existing token-based password links/API remain compatible for outstanding older requests. Older handoff documents describe previous defaults and should not override this document.

## Files and architecture

- server/auth/password-reset.js: dedicated code request/confirm adapter using existing CSRF, validation, rate limits, Argon2id, sessions, audit and encrypted mail queue.
- server/db/migrations/031_password_reset_codes.sql: reset challenges, indexes and additional allowed password_otp mail kind. Historical migrations are unchanged.
- server/auth/routes.js: mounts new adapter; existing email password authentication retained.
- server/mail-queue.js: existing worker validates code eligibility immediately before send and keeps retry/failure diagnostics.
- src/account.js: email/password signup, account-specific recovery screens, confirmation and navigation; recovery state only in memory.
- src/mobile-auth.js: email default and existing-account PIN compatibility; existing popup accessibility remains.
- src/onboarding.js: both audience modals use email/password regardless of PIN configuration.
- server/auth/account-type.js: separation guidance updated for email-based identities.
- tests/password-codes.integration.test.mjs and scripts/browser-check.mjs: recovery/security and browser-flow coverage.
- README.md and SEPARATE_ACCOUNTS_RECOVERY_HANDOFF.md: current-default documentation links.

All preceding uncommitted separate-account changes were preserved; they include migration 030 and account-purpose/authorization protections.

## Security and mail handling

POST /api/auth/password-reset/request accepts only email and accountType (customer/business). Both are required. A known active account queues mail; an unknown account receives the same message and an opaque random challenge without queuing mail. No response promises delivery. Account purpose is validated on the server, not inferred from the selected UI alone.

Limits: 20 requests per IP/hour, three per email plus account purpose/hour, one per email plus purpose/minute. Confirm allows 20 attempts/IP/15 minutes and ten/challenge/15 minutes, with a persistent maximum of five incorrect code guesses. Global session/origin/CSRF protections remain in force.

The code is cryptographically generated, HMAC-hashed using the existing SESSION_SECRET, and bound to its challenge, user, requesting session and current password hash. No plaintext password or OTP is stored in the challenge table. Mail payloads remain encrypted using DATA_ENCRYPTION_KEY and are cleared by the existing queue on terminal states. OTPs, password values and challenges are not placed in browser storage or URLs. The user must request/enter a code in the same browser; after navigation away from recovery, request a fresh code.

Confirm locks the user before the challenge, checks expiry and credential snapshot, changes the password via existing Argon2id hashing, invalidates all outstanding codes and legacy reset tokens for that user, revokes that user's sessions and clears the browser's session. Wrong-code counters are committed even when confirmation is rejected. Concurrent confirmation succeeds at most once; the competing request is rejected by code validation or session/CSRF revocation.

The mail worker revalidates active user, email, unexpired request session, unused/unexhausted challenge and credential snapshot before sending. Existing retries, safe failure codes and delivery visibility are reused. SMTP acceptance is not inbox receipt; no external delivery was exercised here. Existing Resend SMTP configuration and mail worker are required; no new provider or secret is introduced.

Challenge records and safe audits have no automatic retention purge in this change. Only code hashes and metadata remain there; encrypted delivery payload retention follows the existing queue lifecycle. No new deletion claim is made.

## Migration and release requirements

Production was last observed at migration 029 in the previous read-only investigation. This change requires migration 030 for account separation and 031 for reset codes, using the supported runner with matching web and mail-worker code. Verify a recovery point before an authorised production release. Migration 030 deliberately blocks existing mixed customer/business identities pending reviewed separation. Its earlier read-only preflight is not a guarantee of current state.

New endpoints cannot run against an old schema. Deploying source alone is insufficient. A code rollback must not delete reset/account data or rewrite migration history. No production readiness or real email delivery is claimed.

## Verification actually performed

- Complete disposable localhost PostgreSQL suite: 385 passed, zero failed/skipped. This includes the full migration chain through 031, checksum/repeat checks, existing account-purpose upgrade checks, shared-email purpose selection, reset expiry, attempts, session binding, CSRF/origin, credential changes, one-time concurrent use, session revocation and old workflows.
- Browser suite: 899 passed, zero failed. Includes both signup purposes at six widths, preserved modal sign-in/MFA, existing PIN fallback, purpose-aware password recovery, eight-digit input, confirmation mismatch, safe restart and existing business/customer screens. Fictional intercepted browser data only.
- Static checks: 1285 passed, zero failed.
- Evidence: ignored .verification/email-password-postgres.log, email-password-browser.log and email-password-static.log. These contain local fixture verification, not production delivery proof.

The browser count differs from the preceding run because obsolete PIN-first signup assertions were replaced by email/password and password-code assertions; existing PIN login/reset compatibility remains exercised.

## Owner acceptance after an authorised release

Create a customer and separate business account using the same controlled email with their respective account types. Sign in to each with its password. Request a password code for each type separately, verify actual inbox receipt and sender, complete reset in the requesting browser, then confirm the other account remains unaffected. Confirm old passwords fail, new ones work, replay is rejected and required MFA remains active. Do not send OTPs or passwords in chat.
