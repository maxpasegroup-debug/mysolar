# MY SOLAR — Official Super Admin login diagnosis

Date: 16 November 2026. Intended administrator: **mysolarsolutions2026@gmail.com**.

## Outcome

**The updated login system is deployed. The production account's existence and administrator grant could not be verified because the available read-only database access paths are blocked. No production account correction was performed.**

The previous work tested provisioning with fictional identities; it did not create the official administrator. Choosing a password or successfully testing fictional accounts does not create a live identity or grant. This work has never provisioned the official address. An account may nevertheless exist if it was created independently; that must be checked rather than assumed.

Consequently, an exact account-level cause cannot yet be stated. The evidence rules out a missing deployment of the dedicated login implementation. Missing identity, missing grant, inactive account, wrong password, a rate-limit response or an enrolled second-factor requirement remain distinct possibilities. The owner password was not requested or tried, and repeated live login attempts were avoided.

## Deployed version versus local code

Read-only Railway metadata identifies production web deployment `52294f63-c146-43e1-b6da-09f4fc8c61cd` as **SUCCESS**, created at 09:03:20 UTC / 14:33:20 IST on 16 November 2026. It uses repository `maxpasegroup-debug/mysolar`, branch `main`, commit `48c901f0616097eb37513f3561c5e95adf1c734d`, which is also the local HEAD at inspection.

That commit includes the administrator login implementation from `76e20f4`. Git comparison found no subsequent changes to `server/auth/routes.js`, `server/admin.js`, `src/account.js`, `src/app.js` or `src/organization.js`. Public HTTP GETs returned 200 for `src/app.js`, `src/account.js` and `src/public-header.js`; their served contents match local files after normalising line endings. No authentication API or live login was called for this public comparison.

Evidence: [.verification/official-admin-diagnosis-deployment.json](.verification/official-admin-diagnosis-deployment.json), [.verification/official-admin-diagnosis-public.json](.verification/official-admin-diagnosis-public.json).

## Authentication requirements

The existing page `/#/admin/login` submits email/password to `POST /api/auth/login` with `purpose: "platform"`. The existing server requires:

1. Exactly one matching active user and a valid existing Argon2id password hash.
2. An existing `platform_admin_grants` row with a role that includes `platform.companies.read`.
3. The enrolled authenticator or single-use recovery code, where applicable.
4. Existing CSRF, rate-limit and session controls.

Invalid passwords, missing/inactive identities and absent/insufficient administrator grants intentionally use the same generic credential error. That error cannot establish which condition applies. MFA and rate-limit errors have their own existing codes. No public signup or client-side flag can assign an administrator role.

After successful authentication, the existing browser code redirects to `/#/platform`. Protected administrator APIs recheck the user, session, grant and permissions on the server. Company activation requires `platform.onboarding.review`; marketplace approval/publication requires `platform.marketplace.review`. Decisions remain separately audited. Independent review restrictions remain in place for companies the administrator created or belongs to.

## Account lookup findings and access blocker

**Local:** the last authorised lookup of the corrected email found no matching identity in a newly created disposable test schema. That test schema was removed and its cluster stopped. This was not a persistent local official-account setup, and it says nothing about the production database. No unreviewed local DATABASE_URL was used.

**Production:** a narrowly scoped metadata-only SELECT was prepared and attempted. It excludes password hashes, passwords, reset tokens, MFA secrets and unrelated/company records. It specifies a read-only transaction.

- Railway SSH could not execute the lookup: this workstation has no SSH key available to the Railway CLI.
- The fallback process received the existing database service environment only in memory. Target validation found no available public database URL or configured TCP proxy connection; it stopped **before connecting to the database**.
- No SSH key, public proxy, connection setting or Railway configuration was created or changed. No weakened TLS policy was used. No production query result was obtained, and no production database record was read or changed by these failed attempts.

Evidence: [.verification/official-admin-diagnosis-readonly.log](.verification/official-admin-diagnosis-readonly.log), [.verification/official-admin-diagnosis-direct-readonly.log](.verification/official-admin-diagnosis-direct-readonly.log). These logs contain safe blocker metadata, not credentials.

## Exact next diagnostic action

An operator who already has authorised internal access to the **MY SOLAR production database** should run the following metadata-only query. This is the missing diagnostic step; there is no need to send the password or a hash to the assistant.

```sql
BEGIN READ ONLY;

SELECT u.status,
       u.account_type,
       u.email_verified_at IS NOT NULL AS email_verified,
       g.role_id,
       COALESCE(
         (SELECT array_agg(rp.permission_id ORDER BY rp.permission_id)
          FROM role_permissions rp
          WHERE rp.role_id = g.role_id),
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

Share only the row count and the returned non-secret status/role/permission flags. An empty result confirms the account is absent; a null role confirms no platform grant. Do not query/export passwords, password hashes, tokens, MFA secrets or XYZ to investigate login.

Alternatively, establishing an approved SSH access method would enable the already prepared read-only query. Creating access keys or changing Railway/network configuration is a separate authorised operation and was not performed here.

## Corrective action after the lookup

| Result | Exact corrective action; production writes require explicit owner approval |
| --- | --- |
| No user | After approval to create the designated identity, owner completes the existing Business email-first signup with the corrected address, proves mailbox ownership and enters a new password privately in the existing HTTPS form. Stop before company setup. Then an approved operator grants the existing platform role. |
| Active Business user, no platform grant | Preserve the identity. Obtain explicit approval for this user's platform grant; use the existing private operator command. Do not automatically promote it merely because its email matches. |
| Existing administrator, password unknown/failing | Preserve identity/grant. With authorised reset approval, owner uses `/#/admin/recover`, receives the real email and enters a new password privately in the existing reset form. Do not overwrite the hash directly or remove MFA. |
| Suspended/incompatible Customer/ambiguous identity | Stop and request a specific owner decision. Do not change account type, reactivate, create a duplicate or bypass the operator tool. |
| Grant exists but permission missing | Verify the actual approved migration/role-permission state. Do not invent a new role or run production migrations as a login workaround. |
| MFA enrolled | Use the enrolled authenticator/recovery procedure. A password alone is insufficient. Do not disable MFA. |
| Rate-limited | Stop repeated attempts and let the existing limit expire. Do not clear production rate-limit records. |

The existing private grant command is **`node server/admin.js grant`**, executed only by an approved operator in the positively identified target environment. Its stdin JSON contains only the corrected email and a real reason identifying the named authoriser/change reference. **It takes no password.** Avoid automatically loading an unrelated local `.env`. It grants `platform_admin`, revokes that user's sessions and records `platform.admin_grant`. If the appropriate grant already exists, skip this command; unnecessary repetition changes grant metadata and revokes sessions.

The owner-selected/new password must be entered directly into the authorised signup/reset browser form, never into chat, a command argument, terminal history, environment variable, report, source file or screenshot. Existing signup/reset already use salted Argon2id; no new authentication system or public administrator signup endpoint is required.

## Dashboard verification and XYZ

Local evidence already demonstrates that an appropriately provisioned fictional administrator can read all review queues, company details and review/activity history. The existing full PostgreSQL acceptance verifies separate activation, marketplace approval and publication. These tests do not prove the official live account works.

After authorised correction, the owner must verify login through `/#/admin/login`, redirection to `/#/platform`, pending/approved/rejected queues, marketplace queue and review history. Use permission inspection rather than changing a real business to test capabilities.

**XYZ was not accessed or modified.** Its current pending states were supplied by the owner, not freshly verified from production in this diagnosis. No activation, marketplace approval or publication action was taken. It must remain awaiting an explicit authorised review.

## Evidence retained, not re-labelled as live verification

Existing tests against the unchanged authentication code:

- Private provisioning/recovery/rate-limit suite: **8 passed**, real disposable PostgreSQL and the actual existing operator command.
- Dedicated admin integration/browser suite: **8 passed**, including desktop/mobile route, redirect, ordinary-account denial, logout and expiry checks; **13 recorded browser checks**, no page errors.
- Combined provisioning/marketplace run: **25 passed**, including all 15 existing marketplace journey steps.

Logs: [.verification/official-admin-provisioning-final.log](.verification/official-admin-provisioning-final.log), [.verification/official-admin-configuration-browser.log](.verification/official-admin-configuration-browser.log), [.verification/official-admin-provisioning.log](.verification/official-admin-provisioning.log). These results were inspected from the prior local verification; they were not rerun or represented as production-account tests in this diagnosis.

## Approval boundary

Read-only diagnosis was attempted under this request. Manual operator access is needed to complete the blocked account lookup. **Explicit owner approval is still required before any production identity creation, administrator grant, credential reset, reactivation or configuration change.** Obtain that approval for the concrete result of the lookup rather than silently choosing a mutation.

No application code change or redeployment is indicated by current evidence. Only this report and ignored diagnostic artifacts were created. No production account/role/credential/record, XYZ, Railway setting or Razorpay setting was changed. No production migration, deployment, commit or push occurred.
