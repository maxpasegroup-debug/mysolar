# Boss dashboard setup-state fix

28 October 2026. Local fix; not deployed.

## Cause

The screenshot shows the existing company-setup summary for a draft company, not an active operations dashboard. `BossDashboard.enabled()` previously required `lifecycle === 'active'`, while `Account.page()` correctly sent inactive companies to `Organization.summary()`. That combination retained the older blue setup screen and old brand presentation for newly created owners.

## Fix

- `src/boss-dashboard.js`: use the approved Boss shell for real company owners regardless of lifecycle; add a setup-specific presentation using actual saved company/onboarding data. Draft, onboarding, review-pending and suspended states retain truthful status/actions. No financial totals or operational access are fabricated.
- `src/organization.js`: render that setup presentation on the owner dashboard. Existing detailed setup/settings routes and employee behavior remain unchanged.
- `boss-dashboard.css`: compact burgundy/gold setup layout matching the active Boss design, responsive panels and viewport sizing. Removed duplicated explanatory copy; no overflow is hidden to force a fit.
- `tests/boss-dashboard.test.mjs`: cover all four inactive owner states, actual saved-step progress, no activation/payment claim, no operational creation links and review-only actions when locked.
- `scripts/browser-check.mjs`: check the new setup shell across six widths and un-clipped desktop layouts at 1366×768, 1440×900 and 1536×864.

The backend activation, subscription, publication, permission, tenant and authentication rules were not changed. A company must still complete setup and receive the existing authorized activation before operations become available. The official logo and protected customer dashboard/locale/marketplace files are unchanged.

## Actual checks

- `node --test tests/boss-dashboard.test.mjs tests/workspace-ui.test.mjs`: exit 0, **25 passed**, 0 failed/skipped; mocked/in-memory tests.
- `node scripts/browser-check.mjs`: exit 0, **1,133 passed**, 0 failed; local browser with fictional intercepted API data, not real database persistence.
- `node scripts/check.mjs`: exit 0, **1,473 passed**, 0 failed; static checks.
- Desktop screenshot reviewed: `.verification/browser/boss-setup-1366x768.png`. The initial 1366×768 panel-height failure was corrected and the complete browser run then passed.
- `git diff --check`: no whitespace defects at final review.

Initial Git state was clean on `main`, HEAD `5935414` (Final Solar OS polish). Five implementation/test files changed and this report was added. No user changes were discarded; no staging, commit, push, merge or deployment occurred.

## Live-release boundary

This repository correction does not change the live website until released. No Railway setting, database, migration, production service or secret was accessed/modified. The existing master directive's database/recovery/migration-034/coordinated-release gates still apply; do not assume a hard refresh alone can install unpublished source changes. Once the matching approved release is deployed, an owner in setup receives the new Boss setup design; activation switches it to the existing daily operations view.
