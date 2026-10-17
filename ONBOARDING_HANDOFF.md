# MY Solar Solutions — separate customer and distributor onboarding

## Result and original cause

The Get Started selector previously linked both choices to `/register`, differing only in `journey=customer` versus `journey=distributor`. The registration page ignored that parameter when choosing its heading, form copy and login link. Only the post-registration navigation read it, so both audiences saw the same generic signup presentation.

The selector now opens independent customer/distributor modal experiences. Their underlying personal-account model and API remain shared because that is the existing supported backend architecture. They have explicit audience-specific presentation, submit entry points and continuation destinations. Direct `/register?journey=...` routes remain functional fallbacks and now also display audience-specific copy.

This handoff supersedes the direct-registration-link behavior described in `PUBLIC_HEADER_HANDOFF.md`. The logo, approved burgundy Get Started button styling and wider landing page are preserved.

## Files created or modified

| File | Change |
| --- | --- |
| `src/onboarding.js` | Shared native-dialog primitives with explicit customer/distributor configurations, separate submit dispatch, validation, busy/error/confirmed states, cleanup and focus management. |
| `onboarding.css` | Warm ivory/burgundy modal themes, sunrise versus grid details, responsive layouts, sticky close controls and reduced-motion effects. |
| `src/public-header.js` | Connect audience choices to the modal experiences; keep existing route links as fallbacks; mount/clean up the modal and return to audience selection. Signed-in choices keep their existing destinations. |
| `src/account.js` | Reuse one personal-account registration operation for existing pages and modal entry points. Add `registerCustomer` and `registerDistributor` wrappers; preserve modal drafts during same-context session refresh; allow a quiet session refresh until the registration result is displayed. Add explicit distributor-onboarding continuation to the existing login route. Make direct registration page copy audience-specific. |
| `src/marketplace.js` | Avoid rebuilding the public page on window focus while an onboarding form is active. Existing catalogue/vendor refresh otherwise remains. |
| `index.html` | Load onboarding CSS and JavaScript using the established script order. |
| `server/index.js` | Add only the new CSS/JS to the existing explicit public static-asset allowlist. No backend business logic changes. |
| `sw.js` | Add those public assets and advance the static cache version. API/session/private-data caching exclusions remain unchanged. |
| `ONBOARDING_HANDOFF.md` | Implementation, route, review and manual-verification notes. |

The prior burgundy button change in `public-header.css` remains in the working tree and is included in the suggested commit commands. Unrelated pending launch work in README, package configuration and database verification files was left untouched.

## Customer experience

Heading: **A brighter beginning.** Supporting copy: “Start your solar journey with MY Solar Solutions. Create your account and discover the possibilities.”

The customer composition uses a welcoming serif headline, subtle gold sunrise/rings and warm ivory surfaces. Fields are name, email and password, using the existing length/autocomplete rules. The burgundy submit action reads **Create customer account**. Existing-account login and Explore solar first remain available.

`Account.registerCustomer()` calls the shared registration operation with an explicit customer continuation. Once the backend confirms registration and the refreshed session confirms sign-in, a real confirmation state offers **Continue your solar journey**. Its destination is the existing safe `Journey.destination()` if present, otherwise `/customer/dashboard`. Existing invitation handling still takes precedence where applicable.

No company, business role or platform privilege is created by this path. Already signed-in users are directed to their existing customer journey rather than offered another account form.

## Distributor experience and company separation

Heading: **Build your solar business with us.** Supporting copy: “Create your account to begin setting up your distributor business on MY Solar Solutions.”

The distributor composition uses the same palette with a structured sans-serif headline, burgundy top accent, restrained geometric gold grid and **DISTRIBUTOR ONBOARDING** badge. The two-step explanation identifies **Personal account → Company setup**; it is a process explanation, not a fabricated completion indicator. The form explicitly states: “Your personal account is the first step. Company setup follows after you sign in.” The primary action reads **Create distributor account**.

`Account.registerDistributor()` creates the same supported personal account, then returns `/distributor/onboarding` as its authenticated continuation, subject to existing invitation handling. A confirmed success screen offers **Continue to company setup**. That route displays the existing, separate company-creation form. Registration does not submit company data, create a company automatically, approve a distributor, publish a storefront or grant distributor permissions.

The modal's login link is `/distributor/login?journey=distributor`. Successful login through this explicit, allowlisted journey continues to `/distributor/onboarding`. Ordinary `/distributor/login` behavior remains company selection; arbitrary return URLs are not accepted through the new parameter.

## Exact APIs and fallback behavior

Both audiences use existing **`POST /api/auth/register`**, through `Account.api()`, sending only `{name, email, password}` with the existing CSRF header, same-origin credentials and HttpOnly-session-cookie mechanism. The audience is a frontend navigation choice and is never sent as a trusted role or tenant claim.

The inspected backend creates a user and personal customer profile, issues a signed-in session and responds **201**. It currently has no signup email-verification step. No fictional verification step was added. Backend CSRF protection, password validation/hashing, registration rate limits, duplicate-email handling and audit behavior are unchanged.

The existing **`GET /api/auth/session`** confirms current authenticated state after registration. If creation succeeds but session confirmation fails, the modal explains that the account was created and offers login rather than another signup. Customer login uses the existing safe return-intent wrapper. Distributor login preserves the explicit company-setup journey.

Login remains **`POST /api/auth/login`**. Company creation remains the separate existing **`POST /api/companies`**, invoked only when the signed-in user submits the existing company form. This task does not introduce or execute a parallel company API, account table or authentication provider.

## States, animation and accessibility

- Real idle, submitting, inline-validation, backend-failure and confirmed-registration states. A success message is never generated before the registration API succeeds.
- Duplicate-account and ordinary validation/server errors retain the current form values and display text safely. Invalid inputs have associated inline errors and `aria-invalid`; backend feedback is an alert and receives focus.
- Submission is guarded by both the modal's busy state and the existing account-operation lock. Inputs become read-only and exit/switch/navigation controls are disabled during an active request. A live status explains why the user should wait. Escape and backdrop dismissal are blocked until it settles. External route teardown clears modal content; late UI callbacks are invalidated and do not reopen a discarded modal.
- Closing, switching audience and returning to selection clear the modal form; credentials are never placed in URLs, browser storage or application logs. After success the input elements are removed.
- Native semantic dialog with labelled heading/description, background interaction prevention, visible close, Escape, backdrop hit testing, focus return and explicit Tab/Shift+Tab boundary handling. Clicking inside the modal does not dismiss it.
- Both modals scroll internally at limited viewport heights. The top close/back controls stay reachable; mobile input text uses 16px sizing to avoid unnecessary browser zoom. Layout was reviewed at 360, 390, 768, 1024 and 1440 pixels, plus a 390 × 500 short viewport.
- Short fade/rise/scale opening, staggered heading/form presentation, finite decorative glow/grid entrance, restrained button states, and a short fade/scale closing with backdrop fade. No decorative looping animation. A spinner runs only during a real pending request.
- Reduced-motion preferences disable CSS effects and prevent/cancel Web Animations API motion, including preference changes while open.
- Shared listener/animation cleanup follows router rendering. Same-user/same-permission session refresh can preserve an active draft; existing session/context comparisons still trigger re-render and credential teardown when authorization context changes.

## Lightweight review and limits

The final isolated Chromium review completed **35 focused UI observations successfully**, including both audience presentations, boundary focus handling, empty validation, same-context refresh, duplicate-email/error retention, personal-only request fields plus CSRF, clear-on-switch, back navigation, responsive fit, short-viewport close access, duplicate-submit prevention, pending dismissal prevention, confirmed customer/distributor continuations, separate company setup, existing distributor login, direct-registration fallback copy, unavailable-session recovery, customer return intent, reduced motion, close/focus cleanup and no uncaught JavaScript exceptions.

Evidence is in ignored `.verification/onboarding/review.json` and five local screenshots: customer/distributor desktop, customer/distributor mobile and a clearly fixture-based confirmed customer state. These artifacts are not deployment assets. The review used an isolated loopback browser/server with intercepted session/register/login responses; **no real account was created and no database write was performed**. Its success-state scenarios validate UI handling of supplied responses, not production registration correctness. A real device keyboard opening was not simulated; the short-height viewport checks are a layout approximation.

The initial review identified a close control scrolling out of reach in short viewports. Its sticky placement was corrected and the final local observation passed. The review harness was also corrected to distinguish already-authenticated navigation from opening an anonymous modal and to refresh its in-memory session fixtures between scenarios.

No comprehensive suite, lint, audit, build, migrations, persistent environment changes, production requests or deployment were performed. No backend capability or missing route blocked implementation. Backend registration, session, permission, tenant and company-creation logic was preserved.

## Remaining planned verification

During Phase 10 / authorized manual verification, exercise real registration and duplicate-email responses against a configured non-production database, email/password rules and rate limiting, real HttpOnly session-cookie rotation, CSRF expiry/context-change handling, customer safe returns/invitations, personal account → separate distributor company setup → approval, and normal login behavior. Review actual Safari/iOS/Android keyboard resizing, a screen reader, focus restoration, and route changes during an in-flight request. Confirm existing regression checks are updated for the new modal choices rather than assuming direct navigation to a generic registration page.

The confirmation screen intentionally requires an explicit Continue action. Registration alone does not perform company setup, business activation or any financial operation.
