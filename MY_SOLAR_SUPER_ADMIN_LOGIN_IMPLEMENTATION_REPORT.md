# MY SOLAR — Super Admin Login Implementation

## Architecture inspected before implementation

The application uses vanilla JavaScript hash routes in `src/app.js`, `src/account.js` and `src/journey.js`. Public navigation is in `src/public-header.js`; the landing footer is in `src/landing.js` and other public pages use the footer in `src/app.js`.

Customer login is `/#/customer/login`; business login is `/#/distributor/login`. Both use the existing Express authentication services. Administrators are existing `users` with a separately assigned `platform_admin_grants` role; they are not a third account type. Session responses expose the resulting platform permissions. The existing dashboard is `/#/platform`, with review queues and company details implemented in `src/organization.js` and protected by `server/platform/routes.js`.

`POST /api/auth/login` already verifies Argon2 passwords, rate limits attempts, verifies enrolled authenticator/recovery codes, rotates sessions and records an audit event. Sessions use HttpOnly, SameSite cookies, hashed database tokens, absolute and idle expiry, CSRF protection, and existing logout/revocation endpoints. Platform actions recheck active users, grants, permissions and configured privileged security policies on the server. Public registration cannot assign platform grants.

## Result and scope

Implemented locally on 16 November 2026. The public landing footer now provides the existing Customer sign in and Business sign in links plus **Admin Login**. Other public-page footers also provide Admin Login. Existing customer/business header navigation is preserved.

Repository: `C:\Users\kkyad\OneDrive\Desktop\mysolar\mysolar`. Branch: `main`. Starting commit: `f607fecfb3609b2a4628ccd3de7e4107027b65ac`. The working tree was initially clean apart from two temporary browser-harness files left by the interrupted previous task. Those exact temporary files were archived under the ignored `.verification/browser-real/` directory and removed from `tests/`. No user files were reset. This implementation remains uncommitted.

No production authorization is implied. XYZ, production data, Railway, Razorpay and live billing were not accessed or changed. No email worker, production migration, deployment, commit or push was performed.

## Routes and behaviour

| Entrance or function | Existing/new route | Behaviour |
| --- | --- | --- |
| Customer | Existing `/#/customer/login` | Existing customer authentication unchanged |
| Business | Existing `/#/distributor/login` | Existing business authentication unchanged |
| Administrator | New `/#/admin/login` | Dedicated email/password form, existing enrolled MFA continuation |
| Administrator recovery | New `/#/admin/recover` | Reuses existing password-recovery service; does not grant privileges |
| Administrator dashboard | Existing `/#/platform` | Successful dedicated login redirects here |
| Pending applications | Existing `/#/platform?queue=onboarding` | Existing company activation queue |
| Marketplace reviews | Existing `/#/platform?queue=marketplace` | Existing listing review queue |
| Approved companies | Existing `/#/platform?queue=approved` | Existing active-company queue |
| Rejected/returned applications | Existing `/#/platform?queue=returned` | Existing review queue |
| Published listings | Existing `/#/platform?queue=published` | Existing published-company queue |
| Company details/history | Existing `/#/platform/company?id=<company UUID>` | Existing review details, decisions and audit history |

The new form posts to the **existing** `POST /api/auth/login`, adding `purpose: "platform"`. The server requires an existing platform grant and `platform.companies.read` permission before second-factor prompting or session issuance. Ordinary accounts are rejected with the same 401 code and message as unknown accounts or invalid passwords. A correct password alone does not grant admin access. A revoked grant also prevents new dedicated login and existing-session platform access.

No `admin` account type, user database, public signup route, grant assignment API or hardcoded administrator credentials were added. Changing/removing the login-purpose field cannot bypass platform API permission checks. Administrators can continue using the existing identity/session infrastructure; this is a dedicated entrance, not a second authentication system.

## UI implementation

The page displays **MY SOLAR — Administrator Login** and the requested subtitle, **Secure access for authorised MY SOLAR platform administrators.** The browser title also identifies Administrator Login. Email and password use existing validation, autocomplete, status feedback and form submission handling. Enrolled authenticator/recovery codes use the existing second-factor fields and verification.

The minimal branded panel uses the existing burgundy colour, typography and controls. Its CSS is scoped to `.admin-login`, with responsive spacing, visible focus outlines and wrapping text. It deliberately avoids the customer mobile-login modal, account-type selector, registration dialogs and Get Started buttons. The admin header has the existing logo and a Back to website link. Recovery has a return link to Administrator Login and no registration options.

A signed-in ordinary account sees an access explanation and a Sign out button instead of an administrator login form. This preserves its session until the person explicitly signs out. The existing platform navigation now includes Sign out, using the existing logout API. Platform/admin logout returns to `/#/admin/login`; other logout destinations remain unchanged. Anonymous or expired-session access to a platform URL displays the administrator login form without loading privileged records.

## Files changed

| File | Change |
| --- | --- |
| `server/auth/routes.js` | Optional platform login purpose and existing-grant/permission check inside the login transaction |
| `src/account.js` | Dedicated login/recovery views, existing submit/MFA reuse, redirect and logout destinations, anonymous platform login view |
| `src/app.js` | Hash routes, administrator browser title and general public-footer link |
| `src/landing.js` | Discreet landing-footer Admin Login link |
| `src/public-header.js` | Minimal admin-page header and safe mounting without registration dialogs |
| `src/organization.js` | Existing platform navigation exposes existing logout action |
| `accounts.css` | Scoped responsive administrator panel styling |
| `tests/helpers/isolated-app.mjs` | Optional loopback listen port for real-browser fixtures; existing default remains an ephemeral port |
| `tests/admin-login.integration.test.mjs` | Real PostgreSQL authentication/security regression tests and optional real-browser hook |
| This report | Architecture audit, implementation and verification evidence |

No application schema, migration, environment file, dependency, package lock or deployment configuration changed.

## Verification evidence

The disposable runner creates a fresh workspace-local PostgreSQL 16.16 cluster, random credentials and a `mysolar_test_*` database. The test additionally checks loopback server identity and the workspace cluster directory before applying migrations. Fixtures are fictional `.invalid` accounts in an isolated schema. Platform-grant bootstrap occurs only in that disposable schema. No existing DATABASE_URL or .env file is used as a target.

| Check | Result | Evidence |
| --- | --- | --- |
| Unknown/customer/business credentials through admin entrance | PASS | Identical generic 401 rejection; no authenticated session issued |
| Existing authorised operator login | PASS | Same user/grant, rotated HttpOnly/SameSite session and existing dashboard permission |
| Server platform access control | PASS | Anonymous requests denied; ordinary accounts denied; grant revocation blocks access |
| CSRF | PASS | Invalid logout token rejected; normal logout succeeds |
| Session expiry | PASS | Expired token cannot access platform; stale account header triggers existing 409 context guard, followed by anonymous 401 after refresh |
| Existing enrolled MFA | PASS | MFA required; existing recovery code accepted once and replay rejected |
| Logout | PASS | Token revoked; administrator returns to dedicated login and protected API returns 401 |
| Desktop/mobile footer entrance | PASS | Existing footer link is visible and navigates to dedicated page |
| Desktop/mobile administrator form | PASS | Correct title, no account selector/signup controls, no page-width overflow |
| Dashboard redirect and pending queue navigation | PASS | Browser signs in and opens existing dashboard/queue |
| Signed-in ordinary account visiting admin entrance | PASS | Access explanation replaces login form; protected API remains 403 |
| Customer/Business login regression | PASS | Real browser login reaches each existing dashboard; account types remain correct |
| Password recovery UI | PASS | Existing service is reused, no signup/type selector, return-to-admin link works |
| External recovery email receipt | UNVERIFIED | No live email was sent; SMTP/inbox delivery is outside this local verification |

Commands and results:

- `node scripts/verify-master-local.mjs`: **185 passed, 0 failed, 0 skipped**. Log: [.verification/admin-login-unit.log](.verification/admin-login-unit.log).
- `node --test --test-isolation=none tests/platform-admin.test.mjs`: **19 passed, 0 failed, 0 skipped**. Log: [.verification/admin-login-platform.log](.verification/admin-login-platform.log).
- `node scripts/verify-postgres.mjs admin-login.integration.test.mjs`, with the optional temporary browser module: **8 passed, 0 failed, 0 skipped**, including the parent test. Log: [.verification/admin-login-db-browser.log](.verification/admin-login-db-browser.log).
- `node scripts/verify-postgres.mjs admin-marketplace-acceptance.integration.test.mjs`: **18 passed, 0 failed, 0 skipped**, including all 15 existing customer-to-business journey steps and migration checks after these login changes. Log: [.verification/admin-login-marketplace-regression.log](.verification/admin-login-marketplace-regression.log).
- Real Chrome browser module: **13 recorded checks passed**, plus footer assertions, ordinary-account access assertions and exact browser-title validation; **no page errors**. Results: [.verification/admin-login-browser/results.json](.verification/admin-login-browser/results.json).
- `npm run build`: **1,804 static checks passed, 0 failed**. This repository's build is its JavaScript syntax/import/asset/dependency checker; there is no separate TypeScript compiler or bundling build. Log: [.verification/admin-login-build.log](.verification/admin-login-build.log).
- `git diff --check`: PASS. No staged changes, commit or push.

Early test attempts found fixture/timing issues: stale account headers correctly trigger the existing expiry context guard; screenshots must wait for initial rendering and image decoding; a temporary Windows-generated selector lost its em dash. The final tests retain the explicit security assertions, wait for the real UI/assets, and pass. No application protection was weakened to pass them.

## Screenshots

Chrome desktop viewport: 1440 × 1000. Mobile viewport: 390 × 844. Screenshots use fictional accounts and contain no passwords or production records. Local `.verification` artifacts are ignored by Git and remain on this machine.

- [Footer — desktop](.verification/admin-login-browser/footer-desktop.png)
- [Footer — mobile](.verification/admin-login-browser/footer-mobile.png)
- [Administrator login — desktop](.verification/admin-login-browser/login-desktop.png)
- [Administrator login — mobile](.verification/admin-login-browser/login-mobile.png)
- [Generic rejected-login message](.verification/admin-login-browser/unauthorised-error.png)
- [Existing dashboard — desktop](.verification/admin-login-browser/dashboard-desktop.png)
- [Existing dashboard — mobile](.verification/admin-login-browser/dashboard-mobile.png)
- [Pending activation queue](.verification/admin-login-browser/pending-queue.png)
- [Expired-session login view](.verification/admin-login-browser/expired-session.png)
- [Administrator recovery](.verification/admin-login-browser/recovery.png)

Visual evaluation passed after fully decoded mobile logos were recaptured. An independent agent evaluated the supplied screenshots; a different-provider evaluator was unavailable. This is a visual review, not an accessibility certification.

## Remaining boundaries and deployment recommendation

**GO for local review of this implementation. Deployment has not been performed or authorised.** No new migration or environment variable is needed for the feature. An existing explicitly authorised administrator grant is necessary; public registration must never create one.

Before any separately authorised release, review the final diff and immutable release commit, verify the intended Railway service/source and production migration ledger, confirm backups and recovery of existing authentication/encryption secrets, and verify actual email recovery delivery and configured administrator MFA policy. Existing session cookie/HTTPS/proxy settings must remain correct. These live settings were not read or changed here.

Chrome desktop/mobile checks do not certify Safari, Firefox, physical-device touch behaviour, screen readers, every staff role or live email delivery. All 15 existing customer-to-business journey steps also passed the post-change real HTTP/PostgreSQL regression. No paid service or billing readiness is implied.

All disposable PostgreSQL clusters used for this task were stopped. Final inspection found no running PostgreSQL processes. The Git index is empty; only the listed local implementation/test/report changes remain.
