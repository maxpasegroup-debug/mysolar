# Customer login focus fix

17 November 2026. Local implementation only; not deployed.

## Cause and change

`src/mobile-auth.js` mounted the sign-in dialog and focused its first input, which is the country calling code. Customer Login now selects Mobile as the initial focus target before opening the dialog. India remains `+91`, and the country field remains editable.

Tab naturally moves from country code to Mobile and from Mobile to the six-digit PIN. Enter on a valid country code returns focus to Mobile without submitting. A country-code change returns focus only while that field still owns focus; unrelated controls retain their focus. Dialog redraws restore the previously focused control on the same route, including buttons, instead of unexpectedly selecting a telephone input. Saved focus from another route is ignored.

The existing PIN design uses one accessible password input underneath six visual cells. Its native typing, Backspace, cursor editing and complete six-digit paste remain intact; no six separate identity fields or custom PIN verification were introduced. Existing telephone/numeric keyboard hints, labels and CSS focus indicators are preserved. There is no automatic jump based on phone length, which would be unreliable for international numbers; Tab or touch proceeds to PIN.

Only `src/mobile-auth.js` changed in application code. No authentication APIs, credential verification, sessions, database schema, production records, configuration or dependencies changed. Business and Admin credentials and login routes are unchanged.

## Verification

Final results are recorded below. Logs are local ignored verification artifacts. Browser accounts and database records were fictional and isolated in disposable local PostgreSQL. External browser requests were blocked. No production sign-in or mutation occurred.

- Regression: 261 passed, zero failed, 65 skipped (skips are not verification).
- Lint: 1,840 passed, zero failed.
- Build: 1,840 passed, zero failed.
- Targeted desktop/mobile Chrome acceptance: PASS; one database-backed integration test, zero failures/skips. Disposable cluster stopped cleanly.
- Broader browser run: desktop focus assertions passed, but the previously recorded registration-confirmation timeout recurred. This unrelated registration scenario remains a reliability concern and is not represented as passed.
- Initial sandbox checks encountered subprocess `EPERM`; checks were rerun with authorised local process permissions.

Browser focus assertions cover initial Mobile focus, telephone keyboard hint, intentional country editing, Enter/Tab to Mobile, Tab to PIN, typing and Backspace, native clipboard paste, preserving a button's focus during redraw, logout/repeat login and expired sessions. The same run checks Business and Admin login/logout. Mobile means Chrome touch/viewport emulation, not a physical device or proof of a physical keyboard opening. Screen-reader announcements were not manually tested.

Evidence: `.verification/customer-focus-targeted-browser.log`, `.verification/customer-focus-browser.log`, `.verification/customer-focus-regression.log`, `.verification/customer-focus-lint.log`, `.verification/customer-focus-build.log`. Browser adapter: `%TEMP%/playwright-test-customer-focus-targeted.mjs` using the existing `tests/customer-login-session.integration.test.mjs` disposable-database harness.

Screenshots: `.verification/customer-login-focus/desktop-focus.png` and `.verification/customer-login-focus/mobile-focus.png` (local artifacts, not production).

No deployment, commit or push performed. Owner deployment approval is required. Rollback for this local UI change is to restore the previously deployed `src/mobile-auth.js`; no database rollback or credential operation is necessary.
