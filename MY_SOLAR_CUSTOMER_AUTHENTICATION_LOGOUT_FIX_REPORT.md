# Customer authentication after logout

17 November 2026 — local implementation; not deployed.

## Cause and correction

The logout handler in `src/account.js` explicitly selected `MobileAuth.useEmail()` for every account. Customer login then chose between email/password and mobile/PIN using that shared mutable mode. Thus a customer who initially authenticated with mobile/PIN saw the email/password modal after logout. This was reproduced locally in desktop and mobile Chrome using a fictional registered customer. It was a presentation/mode-selection regression; it was not evidence of a missing or damaged production customer identity.

Customer login now selects the existing mobile/PIN view explicitly, independently of stale email-mode flags or legacy email query parameters. This applies to direct `/#/customer/login` visits and the login view shown on an unauthenticated customer route. Customer logout selects mobile mode. Customer login presents country calling code, registered mobile number, six-digit PIN, Sign in, Forgot PIN and New customer registration. It does not present email/password fields, an account-type selector or an email-mode switch. Missing PIN configuration disables submission and reports unavailable service instead of silently switching authentication methods.

Forgot PIN links to the existing `/recover` route with `method=pin`, keeping recovery on the existing verified-email-code/PIN flow even if another screen previously selected email mode. Business email/mobile switching and the separate Super Admin email/password page remain supported; neither has a new authentication system.

## Security and existing accounts

Existing `/api/auth/pin/login`, registration, reset and session APIs are reused. PIN hashing/pepper, PIN strength, durable failed-attempt lockout, rate limits, MFA, CSRF/origin checks, identity separation, session rotation/revocation and expiry are preserved. Customer dashboard routing still follows the authenticated account's authoritative identity. No phone/email-based automatic linking, merging or enrollment was added.

An additional recovery compatibility defect was found by the integration suite: `/auth/pin/reset/request` accidentally required a `countryCode` property although the existing number parser supports an already international or legacy Indian mobile number without it. Its validator now requires `mobile` and validates `countryCode` when supplied. The normal customer form still sends both. No proof, PIN rule or rate limit was removed.

Legacy email/password customer identities and their credentials are not deleted or converted. Their existing backend login and authenticated, proof-based mobile/PIN enrollment remain intact. This UI change does not automatically enroll an account without `mobile_credentials`; such an account needs the existing verified enrollment/support process. A profile phone number alone is not a mobile login identity.

## Files

- `src/account.js`: force customer login presentation and correct customer logout mode.
- `src/mobile-auth.js`: route-specific customer mobile/PIN view, PIN recovery selection, registration entrance and fail-closed configuration handling.
- `server/auth/pin-routes.js`: preserve optional country-code compatibility for recovery.
- `tests/customer-login-ui.test.mjs`: route/mode regression and unavailable-configuration cases.
- `tests/customer-login-session.integration.test.mjs`: fictional registration, identity preservation, repeat login, expiry, generic failures and browser adapter.
- `tests/privileged-auth.integration.test.mjs`: replace obsolete free-trial endpoint fixture with a supported protected company write; retain verified-email, fresh-MFA and one-use recovery assertions, and check the allowed write persisted.

## Verification evidence

The test runner uses fresh loopback-only disposable PostgreSQL clusters, unique schemas and fictional identities. Existing migrations execute only there. Browser requests are restricted to localhost. The new browser fixture reads encrypted queued fictional email codes locally and does not run a live mail sender. Existing mail-security tests stub only the external transport; authentication and database operations remain real.

Confirmed results:

- Before reproduction: desktop/mobile customer logout selected email/password and account-type form.
- Customer UI unit checks: 4 passed.
- Full default regression: 261 passed, 0 failed, 65 skipped (explicit database/browser prerequisites not enabled in that run).
- Isolated PIN security integration: 8 passed, 0 failed, 0 skipped.
- Clean final security integration run: **21 passed, 0 failed, 0 skipped**, covering Customer/Business recovery isolation, existing PIN security, administrator authentication and verified-email/fresh-MFA protection.
- Final lint and production build: each 1,840 passed, 0 failed.
- Final browser-enabled database run: **1 passed, 0 failed, 0 skipped**; both desktop and mobile variants completed all scenarios, with no page errors.

| Acceptance requirement | Final local result |
| --- | --- |
| New registration and initial sign-in | PASS — real three-step UI, email proof, PIN creation and customer dashboard in both browser variants |
| Existing mobile/country-code/PIN login | PASS |
| Logout followed by login | PASS — actual customer profile-menu Sign out action; mobile/PIN modal remains selected |
| Session expiration followed by login | PASS — fictional database session expired; PIN login retains the same customer ID |
| Direct customer URL and stale email-mode selection | PASS — no email/password or account-type selector |
| Wrong PIN and unknown mobile number | PASS — generic failures and no authenticated session; durable lockout covered separately |
| PIN recovery | PASS — real reset endpoints with fictional queued email code and a fresh PIN; existing MFA/isolation protections verified |
| Customer dashboard routing | PASS |
| Business and Super Admin login | PASS in browser and database-backed security checks |
| Desktop and mobile layout | PASS — Chrome desktop and touch/device emulation; no horizontal overflow |

The initial security run exposed the recovery-validator compatibility defect and obsolete trial fixture described above. A first browser test attempted to use a profile-page logout control that was not present in the rendered customer dashboard; the adapter was corrected to use the actual customer profile-menu Sign out action. Early browser attempts also encountered asynchronous redraw/submit timing, and combined browser/security runs timed out. The adapter now waits for dashboard requests to settle and retries a detached menu click within a bounded limit, keeping all authentication assertions. Failed/cancelled attempts are not counted as passes. Clean final security and browser runs passed separately.

Evidence logs: `.verification/customer-login-before.log`, `customer-login-browser-final.log`, `customer-login-security-final.log`, `customer-login-pin-security-final.log`, `customer-login-regression-final.log`, `customer-login-lint-final.log`, `customer-login-build-final.log` (all under `.verification/`). The earlier `customer-login-after-integration-final.log` retains the cancelled combined run and is not the final passing evidence.

## Screenshots

- [Desktop before](.verification/customer-login-browser/desktop-before.png)
- [Desktop after](.verification/customer-login-browser/desktop-after.png)
- [Mobile before](.verification/customer-login-browser/mobile-before.png)
- [Mobile after](.verification/customer-login-browser/mobile-after.png)

Before screenshots were captured against the actual pre-fix local frontend. Their test harness triggered the existing delegated logout handler. After acceptance uses the existing profile-menu Sign out control. Only fictional accounts were used; no password, PIN or recovery code is displayed in the report. Mobile checks use Chrome touch/device emulation; physical devices, private browser autofill profiles and live email delivery are not verified.

## Final status and release boundary

**Local acceptance PASS; not deployed.** Both browser variants and the separate security suite passed; disposable clusters were stopped. No production data, credentials or sessions were accessed or modified. No migrations or environment changes are required for the fix. No Railway/Razorpay configuration changes, commit, push or deployment occurred. Production release requires owner approval.
