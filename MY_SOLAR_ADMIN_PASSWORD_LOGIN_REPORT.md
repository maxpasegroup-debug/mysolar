# MY SOLAR — Existing ten-character administrator password login

Date: 16 November 2026.

## Result

**Implemented and verified locally.** The dedicated administrator login now submits an existing ten-character password without HTML minimum-length validation blocking it. Its server path verifies that credential using the existing password hash and requires the existing administrator grant/permissions.

No stored production password, administrator identity, grant or company record was changed. Nothing was committed, pushed or deployed. The live website has not received these local changes.

## Cause and change

There were two independent minimum-length checks:

1. `src/account.js`, `adminLoginPage()`, specified `minlength="12"` on the administrator password field.
2. `server/auth/routes.js` used the creation/reset password validator for every password login. That validator also rejected ten-character input before password-hash verification.

Removing the browser restriction alone would have resulted in a server-side validation error.

Changes:

| File | Change |
| --- | --- |
| `src/account.js` | Removed `minlength="12"` only from the dedicated administrator login field; `required`, password masking, autocomplete and `maxlength="128"` remain |
| `server/validation.js` | Added `loginPassword()` for a non-empty string, maximum 128 characters and 512 bytes; no trimming or credential rewriting |
| `server/auth/routes.js` | Uses `loginPassword()` only when the existing validated login purpose is `platform`; ordinary Customer/Business login retains the previous validator |
| `tests/security.test.mjs` | Tests login bounds and confirms the existing new-password validator still rejects ten characters |
| `tests/admin-password-login.integration.test.mjs` | Real disposable PostgreSQL coverage for existing ten-character credentials, invalid passwords, grants, reset-policy rejection, optional browser checks and unchanged stored hash |

The new validator does not enforce a new-password strength policy during administrator authentication: the submitted value must actually verify against an existing salted hash. Empty, non-string and oversized input is still rejected. No new authentication dependency, role, schema, migration or environment setting was introduced.

## Policies and security preserved

- Password creation, reset and change still use the unchanged `password()` validator: **12–128 characters**, with the existing byte limit.
- Customer/Business password login forms and their server validation retain their previous 12-character minimum. Mobile/PIN authentication is unchanged.
- Existing Argon2id hashing/verification, generic credential errors, rate limiting, active-account checks, MFA, CSRF, session rotation/expiration, logout and server-side platform permission checks remain in place.
- Specifying `purpose: "platform"` does not grant privileges: a correct password for an ordinary account is still rejected by that entrance.
- Authentication does not change or rehash the stored password. The integration test compared the fictional identity's stored hash before and after HTTP/browser logins and found it unchanged; no hash is included in this report.

**This supports an already-stored ten-character password. It does not permit setting a new ten-character password through signup or reset.** If the owner-selected value has never been stored, this change cannot create it or activate an account. Lowering creation/reset minimums would be a separate policy change, explicitly excluded from this request.

## Verification

All database-backed tests used newly created workspace-local PostgreSQL clusters, loopback listeners, random database credentials and isolated test schemas. No production DATABASE_URL was used. Fictional `.invalid` identities used random in-memory passwords. A ten-character fixture was seeded only to simulate an existing credential; public password-creation policy was not bypassed or changed in application code.

| Check | Result |
| --- | --- |
| Desktop form accepts ten characters | PASS, actual browser `checkValidity()` and HTTP submission |
| Mobile form accepts ten characters | PASS, actual browser `checkValidity()` and HTTP submission |
| Correct existing ten-character admin credential | PASS, HTTP 200 and existing administrator session |
| Incorrect ten-character credential | PASS, generic HTTP 401 `INVALID_CREDENTIALS`, rather than creation-policy HTTP 400 |
| Successful redirect | PASS, `/#/admin/login` → `/#/platform` in desktop and mobile Chrome |
| Administrator dashboard access | PASS, real protected company-directory API and existing dashboard |
| Ordinary user using administrator entrance | PASS, rejected despite a matching ten-character fixture credential |
| Reset with ten-character password | PASS, HTTP 400 from unchanged 12-character policy |
| Creation/change policy | PASS, unchanged validator rejects ten characters; existing provisioning/reset regressions pass |
| Empty/non-string/oversized login inputs | PASS, rejected |
| Customer/Business authentication | PASS, existing HTTP login regressions and unchanged browser field minimums |
| Stored hash unchanged | PASS, verified before/after login and browser operations |
| Logout, expiry, MFA, revoked grant and rate limits | PASS, existing administrator and provisioning suites |

Commands and results:

- `node scripts/verify-postgres.mjs admin-password-login.integration.test.mjs admin-login.integration.test.mjs admin-provisioning.integration.test.mjs`, with the temporary local Playwright module: **22 passed, 0 failed, 0 skipped**. [Database/browser log](.verification/admin-ten-character-db.log).
- Chrome at 1440 × 1000 and 390 × 1000: valid/invalid ten-character submission, dashboard redirect, logout and Customer/Business form checks passed; **no page errors**. [Browser results](.verification/admin-ten-character/browser-results.json).
- Existing unit runner: **186 passed, 0 failed, 0 skipped**. [Unit log](.verification/admin-ten-character-unit.log).
- Focused platform administrator suite: **19 passed, 0 failed, 0 skipped**. [Platform log](.verification/admin-ten-character-platform.log).
- `npm run build`: **1,822 static checks passed, 0 failed**. [Build log](.verification/admin-ten-character-build.log).
- `git diff --check`: PASS.

Screenshots show the local fictional environment with the password field empty:

- [Desktop administrator form](.verification/admin-ten-character/form-1440.png)
- [Mobile administrator form](.verification/admin-ten-character/form-390.png)
- [Desktop dashboard after authentication](.verification/admin-ten-character/dashboard-1440.png)
- [Mobile dashboard after authentication](.verification/admin-ten-character/dashboard-390.png)

All disposable clusters stopped after testing; final process inspection found no running PostgreSQL processes. No live email was sent.

## Official account — not verified

Intended address: **mysolarsolutions2026@gmail.com**.

**Requirement to confirm the real account exists and is correctly provisioned remains BLOCKED / UNVERIFIED.** No official identity was automatically created, promoted, reset or used as an automated fixture. Previous production diagnosis found that the available workstation had no Railway SSH key and no available public database connection. A scoped account/grant lookup could not execute. This task did not change that access boundary or retry the owner's credentials.

See [the account diagnosis and exact read-only query](MY_SOLAR_OFFICIAL_SUPER_ADMIN_LOGIN_DIAGNOSIS.md). An authorised operator with existing internal production database access must confirm identity status, `platform_admin` grant and required permissions. A local test login is not proof that the official account exists or that its stored password is ten characters.

No confirmed application defect beyond the two length checks was addressed. Local success does not make the still-undeployed change available on the live website. Production account changes and any future release require their own explicit authorisation. XYZ and all production records, Railway settings and Razorpay settings were untouched.
