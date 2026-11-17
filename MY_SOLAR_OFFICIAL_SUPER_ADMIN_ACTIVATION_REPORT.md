# MY SOLAR — Official Super Admin activation

Date: 16 November 2026.

## Decision and authorisation status

**STOPPED BEFORE PRODUCTION MUTATION.** The target infrastructure has been verified, but the official account lookup remains blocked. No identity, password, administrator grant or company record was changed. Production activation and official-account login are **not verified**.

Designated identity: **mysolarsolutions2026@gmail.com**. Intended role: existing **`platform_admin`**. Login: `https://mysolar.solutions/#/admin/login`; dashboard: `/#/platform`.

The owner explicitly requires approval before any production mutation. This request authorises inspection and preparation, not execution of creation, credential reset or privilege assignment. No such command, signup or reset request was executed.

## Verified production target

Read-only Railway inspection returned:

| Item | Verified value |
| --- | --- |
| Project | `mysolar` |
| Project ID | `b189e069-4956-40fb-aeec-8237b7347893` |
| Environment | `production` |
| Environment ID | `8e1cb532-b9d3-447a-aeca-60fd41ff06fb` |
| Web service | `mysolar` |
| Web service ID | `b27efca8-cfe2-4a3c-9f8e-57f9f255408a` |
| Database service | `Postgres` |
| Database service ID | `058536fc-092b-4288-a48f-cb9cf8baae7d` |
| Public hostname | `mysolar.solutions` |
| Web deployment | `92bfc5e5-04fe-45cb-9281-5c34390c9f96`, `SUCCESS` |
| Web source commit | `c7d664759392a344fc93ccbf386b9dd69699052b` |

The web/database service connection settings were compared **in memory**. Database host, database name and port match. Only match booleans were output; no connection values or credentials were written to logs or this report. This verifies the intended service relationship, not the contents or migration state of the database, which could not be queried.

Evidence: [.verification/official-admin-activation-target.json](.verification/official-admin-activation-target.json), [.verification/official-admin-activation-target-match.json](.verification/official-admin-activation-target-match.json).

## Whether the account already exists

**Production: UNKNOWN.** The authorised metadata-only read could not connect:

- No Railway SSH key is available in this workstation's SSH directory; the previous direct Railway SSH attempt reported no available key.
- A fresh connection check found no available `DATABASE_PUBLIC_URL` or existing Railway TCP proxy in the selected production database service.
- The lookup stopped at target/connection validation, before a database query. No public proxy or SSH key was created, and no TLS protection was weakened.

Evidence: [.verification/official-admin-activation-readonly.log](.verification/official-admin-activation-readonly.log).

**Local:** earlier testing found no matching official identity in a fresh disposable schema. That schema was removed. All provisioned automated fixtures were fictional `.invalid` accounts. This does not establish whether an independently created production or persistent local identity exists.

A generic incorrect-credentials response does not establish account absence. No real password was requested, entered or tested.

## Existing mechanism — no new identity system

The application uses existing `users` identities and `platform_admin_grants`. The existing `platform_admin` role receives the dashboard, company activation, marketplace publication and audit permissions through the existing permission migrations. Public signup cannot issue an administrator grant.

The email-first Business signup verifies mailbox ownership and creates an ordinary Business **user identity** with its supporting profile, legal-acceptance/audit records and session. It does **not** create a company, company membership, solar business workspace, customer enquiry or subscription. The operator can stop before company setup. A new public administrator registration endpoint is unnecessary and must not be added.

Existing password creation/reset calls `hashPassword()` from `server/auth/security.js`: salted Argon2id, memory cost 65,536 KiB, time cost 3, parallelism 1. New passwords must satisfy the unchanged **12–128 character** creation/reset policy. Support for authenticating an already-stored ten-character password does not lower that policy.

The owner must choose a fresh compliant password and enter it directly into the existing trusted HTTPS signup/reset form. Do not reuse a password disclosed in chat. No password belongs in chat, source, terminal history, an environment variable, a temporary file, report or screenshot.

`server/admin.js grant` is the private existing database-operator mechanism. It requires one active eligible Business/legacy identity, grants the existing role, revokes that user's sessions and records a `platform.admin_grant` event. It accepts only email and reason on stdin, not a password. Its audit actor is not an authenticated application actor: include the real named authoriser/change reference in the reason and preserve the approved operator execution record.

## Missing read-only step

An operator with **existing authorised internal access to the verified database** must run this query and provide only the non-secret results:

```sql
BEGIN READ ONLY;

SELECT u.id AS account_id,
       u.status,
       u.account_type,
       u.email_verified_at IS NOT NULL AS email_verified,
       g.role_id,
       COALESCE(
         (SELECT array_agg(rp.permission_id ORDER BY rp.permission_id)
          FROM role_permissions rp WHERE rp.role_id = g.role_id),
         ARRAY[]::text[]
       ) AS permissions,
       EXISTS (
         SELECT 1 FROM account_security a
         WHERE a.user_id = u.id AND a.secret IS NOT NULL
       ) AS mfa_enrolled
FROM users u
LEFT JOIN platform_admin_grants g ON g.user_id = u.id
WHERE lower(u.email) = 'mysolarsolutions2026@gmail.com';

ROLLBACK;
```

The account ID identifies the exact identity for the approval record; it is not a credential. No password hash, reset token, MFA secret or unrelated user/company information is selected. Record the pre-operation status/grant and check that the intended identity is still the same immediately before an approved change.

Do not enable a public database proxy or provision SSH keys merely to bypass this boundary. Those are separate access/configuration changes requiring their own explicit authorisation. The read-only query is already within the requested diagnosis scope; the missing requirement is a working approved access path.

## Production operation to approve after the result

### A. No matching user

Request approval to create **only the corrected designated identity**, then grant `platform_admin` after ownership verification:

1. Owner completes existing email-first Business signup on the verified official HTTPS website.
2. Owner proves control of the corrected mailbox and enters the new compliant password privately.
3. Stop before company setup. Verify exactly one active, email-verified eligible identity and record its account ID. No grant is inferred from an email match alone.
4. With the explicit approval covering this identity and role, an authorised operator runs `node server/admin.js grant` in the verified production service context, using stdin JSON with the corrected email and the actual authoriser/change reason (10–300 characters). Never load an unreviewed local `.env` or include a password in the command or JSON.
5. Verify the expected grant and audit event, then require a fresh login because the command revokes existing sessions.

Expected writes are limited to normal signup/verification/session/mail/acceptance/audit records for the new identity, followed by that identity's grant/session/audit records. No company or schema creation is required.

### B. Existing eligible identity, no administrator grant

Preserve the identity. First verify owner control and the pre-operation account ID/status. Request explicit approval to grant `platform_admin` to that specific identity using the existing operator mechanism. Do not automatically promote an ordinary account merely because its email matches.

If password recovery is also needed, obtain approval for that additional operation. A Customer, suspended or ambiguous identity is not a candidate for a silent conversion, reactivation or replacement; stop for a specific owner decision.

### C. Existing administrator with the correct grant

Preserve the user and grant; skip granting again. With approval for recovery/reset, the owner opens `https://mysolar.solutions/#/admin/recover`, enters the corrected address, receives the real one-time recovery link, and enters a fresh password privately. The existing reset flow hashes it, consumes the reset proof and revokes sessions while retaining the identity/grant. Enrolled MFA remains in effect.

This requires actual working email delivery and owner mailbox access. Queuing or SMTP acceptance does not prove inbox receipt. No recovery request or email was sent by this task.

## Rollback and limits

- The existing grant tool uses a transaction. A failed command rolls back its changes. Do not claim a grant succeeded without checking its result and audit event.
- To undo **a newly issued grant from this approved operation**, an authorised operator can use the existing `node server/admin.js revoke` with the same designated email and an actual rollback reason. It removes that identity's platform grant, revokes sessions and records an audit event. This is itself a production mutation requiring approval.
- Do not use revoke to undo a password reset on a pre-existing administrator, and do not remove a grant that existed before this operation without separate approval.
- Signup is not undone by deleting a user: it may have acceptance/mail/audit dependencies. If activation is abandoned, revoke a new grant if appropriate and retain the identity pending a separately reviewed retention/deactivation decision. Do not bulk-delete records or restore the entire database.
- A password reset cannot safely restore the previous unknown password; no previous hash should be copied for this report. Recovery from an erroneous reset is a fresh approved reset to another owner-entered password. Revoked sessions cannot be restored; users must sign in again.
- No migration or deployment is needed for the existing provisioning mechanism. Preserve other administrators, authentication/encryption keys and all business data.

## Verification after an approved operation

Official-account verification is **NOT RUN** because production mutation is not authorised and lookup is blocked. After explicit approval and successful configuration:

1. Owner privately signs in at `/#/admin/login` with the corrected email, fresh password and enrolled second factor.
2. Verify redirection to `/#/platform` and authoritative permissions including `platform.companies.read`, `platform.onboarding.review`, `platform.marketplace.review`, `platform.lifecycle.manage` and `platform.audit.read`.
3. Read pending/approved/rejected company queues, marketplace review queue, company detail and decision history. Do not make a real review decision merely to test access.
4. Verify logout revokes access. Perform repeated invalid-password, expiry, unauthorised-access and destructive tests using fictional disposable identities, not the official account or other real users.
5. Confirm XYZ's current state read-only at that time and leave it pending until an explicit authorised review. Independent reviewer protections must remain intact.

**XYZ was not read or modified in this task.** Its current database state could not be independently confirmed. No activation/publication action was taken; this report is not approval to change it.

The unchanged mechanisms already have real disposable PostgreSQL/browser evidence in `MY_SOLAR_OFFICIAL_SUPER_ADMIN_CONFIGURATION_REPORT.md` and `MY_SOLAR_ADMIN_PASSWORD_LOGIN_REPORT.md`. Those fictional local successes are not production official-account verification. No application code changed here, so those suites were not unnecessarily repeated.

## Exact next action and approval boundary

**Next action: have an authorised operator with internal production access run the read-only query above and return its non-secret result.** Once the exact identity/grant state is known, present the applicable A, B or C operation, account ID, expected writes and rollback to the owner and obtain explicit approval before execution. Do not treat this report or a successful local test as that approval.

Authorisation status: inspection/preparation only. Account activation result: **not executed**. Official login result: **unverified**. Remaining blockers: internal lookup access, account/grant determination, target-specific mutation approval, private owner password entry, actual recovery/verification email receipt and post-change owner acceptance.

Only this report and ignored diagnostic metadata were created. No production account, role, credential, database record, schema, XYZ, Railway setting or Razorpay setting was changed. No password/hash/token/database credential is included. No commit, push or deployment occurred.
