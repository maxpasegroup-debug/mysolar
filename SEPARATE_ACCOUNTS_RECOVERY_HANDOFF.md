CURRENT POLICY UPDATE: Emails are now globally unique across customer/business identities, and signup requires email OTP verification before creating a user. See VERIFIED_EMAIL_SIGNUP_HANDOFF.md; earlier shared-email descriptions below are superseded.

# Separate customer/business accounts and recovery investigation

Current default authentication has subsequently changed to email/password; see EMAIL_PASSWORD_AUTH_HANDOFF.md. The mobile-specific account contract below describes the preceding implementation. Separate account purposes remain enforced.

Date: 2026-10-25. Implemented locally; NOT deployed, committed or migrated in production.

## Account contract

- A mobile number remains globally unique and identifies exactly one account.
- One customer identity and one business identity may share the same recovery email. Two accounts of the same purpose cannot reuse it.
- The customer and business signup journeys send an explicit account purpose. Invitation purpose is validated by the server; confirmation uses encrypted server-held signup context.
- Customer accounts cannot create/join companies. Business accounts cannot use protected customer journey records. Company membership, permissions, tenant context and subscription checks remain authoritative; business purpose grants no company privilege by itself.
- UI guards explain how to use the separate account and offer explicit sign-out. They do not convert customer identities into business identities.
- Business staff can still manage their own communication preferences through the neutral /account/reminders route.
- Shared-email legacy password login/recovery requires an explicit account type when ambiguous. Unscoped requests never select an arbitrary matching user.
- Signup/reset challenges are bound to mobile, email, purpose, authenticated/anonymous session and user where relevant. Resetting one account revokes only its sessions. Email text identifies the account purpose and mobile's last four digits without including the PIN.

## Migration and release boundary

New migration: server/db/migrations/030_separate_account_channels.sql. Historical migrations were not edited.

Migration classifies existing accounts from company ownership/membership and platform grants, preserves existing IDs and records, replaces global email uniqueness with purpose-scoped uniqueness, and adds account-purpose immutability and company-membership constraints.

The migration deliberately stops if an existing business identity also owns customer enquiries or linked customer contacts. A reviewed separation is required in that case; no automatic record reassignment is performed. Existing imported/null-purpose records are classified by the server's effective-purpose query; public registration always writes a validated explicit purpose.

Production remains through migration 029. The read-only preflight found zero mixed identities at the observation time; rerun before release because this can change. Deploy matching application/web and mail-worker code using the supported migration runner and a verified recovery point. Do not deploy this code against the old schema. No production migration, resend, data change, configuration change or deployment was performed during this task.

## Live investigation: verified facts

Railway production web and mail-worker were inspected read-only after the owner's CLI authorization. The production hostname maps to the production web service. Database queries used an explicit read-only transaction with a timeout and rollback. No private mail payloads, OTPs, recipients or credentials were printed.

Observations at 2026-10-25 15:34 UTC and 15:40 UTC (21:04 and 21:10 IST):

- No recovery/OTP queue jobs or mail attempts in the preceding hour, two hours or 24 hours.
- Exactly two historical mail jobs: password recovery created 2026-10-22 18:01:28 UTC and accepted 18:01:32 UTC; PIN OTP created 2026-10-23 06:19:52 UTC and accepted 06:19:58 UTC. Both had one attempt and SMTP_ACCEPTED.
- Worker heartbeat was fresh and idle. Web/worker SMTP credentials, sender and encryption configuration matched, compared only in memory.
- Read-only Resend message-list request returned 401 restricted_api_key. The configured key cannot inspect delivery history. SMTP acceptance alone does not prove inbox delivery.

Owner clarified: clicking Send opened the OTP entry screen, but no OTP arrived. The pre-change signup implementation returns a generic challenge without queuing email when the email or mobile already exists. Therefore an OTP screen does not prove queueing or delivery. The owner's reported second signup reused an existing customer recovery email, making this duplicate-email path a plausible explanation. There is no request-specific evidence proving that these exact attempts followed that path; no SMTP failure was recorded for them. Provider bounce/delivery evidence remains unavailable with the configured key. No test emails were sent.

The new shared-email account contract addresses that duplicate-email restriction across purposes. Same-purpose duplicate registration and unknown reset numbers intentionally retain non-enumerating responses.

## Mail diagnostics

The worker now stores safe failure categories: authentication, timeout, connection, sender/recipient rejection, temporary/permanent SMTP rejection and unreadable encrypted payload. Raw provider exceptions and message content are not logged. Fifth failed attempts correctly return the terminal dead state. This improves future diagnosis and does not establish a historical delivery cause.

## Verification

- Full disposable localhost PostgreSQL suite: 379 passed, zero failed/skipped. Includes fresh migration chain through 030, checksums/repeat run, mixed-account upgrade stop/rollback, identity preservation, shared-email signup, independent resets, concurrent mobile claims, account access boundaries, existing tenant/security/business workflows and safe mail diagnostics.
- Static checks: 1266 passed, zero failed.
- Browser checks: 907 passed, zero failed; evidence in ignored .verification/separate-accounts-browser-final.log. Browser uses fictional intercepted account data; it is not live delivery verification.
- git diff --check passed.

Existing tests that previously used a buyer as company staff now use separate business identities. Historical retention upgrade checks remain scoped through migration 029; the new dedicated account upgrade test covers migration 030 and explicitly tests its mixed-identity blocker.

## Remaining acceptance

After an authorised release/migration, owner should sign out and register the other account using a different mobile and the same recovery email, confirm inbox receipt and complete signup. Test independent PIN reset for both accounts and verify the other login remains usable. Do not treat local mocked SMTP tests as real inbox delivery proof.
