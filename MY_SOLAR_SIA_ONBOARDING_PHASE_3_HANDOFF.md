# Phase 3 — shared SIA and onboarding

Date: 30 October 2026 (India).

## Scope and release boundary

Local implementation of shared SIA presentation and customer/business signup. Existing uncommitted Phase 1 and Phase 2 work was inspected and preserved. No production configuration, records, migration, deployment, commit, merge or push was authorised or performed here. This phase does not close the earlier live recovery or professional legal/tax review gates.

## User journeys

Both public signup popups use one controller:

1. SIA introduces the journey and asks for name, email and a 12–128 character password.
2. The existing backend hashes the password and queues browser-bound email verification. The popup removes the password field, identifies the requested email, and asks for the eight-digit OTP.
3. Valid OTP confirmation creates the identity and rotates the authenticated session. After the session and expected account identity are confirmed, the popup closes and opens the customer dashboard or business welcome dashboard directly. There is no intervening success card or compulsory company wizard.

Invalid/expired proofs remain errors; entering an OTP or opening its screen does not imply email delivery. Delivery status is read through the new `/api/auth/register/status` endpoint, restricted to the original anonymous security session and an active proof. Its messages distinguish queue/retry/provider acceptance from actual inbox receipt. Editing/restarting preserves name/email only and asks for a password again; credentials are not persisted to browser storage.

Invitations retain their existing review/acceptance journey instead of auto-granting a company membership. A signed-in user is directed to their existing account/workspace. Customer and business accounts remain separate, with globally unique registered email checks and no dashboard conversion.

The legacy business email-first and PIN APIs remain available for compatibility with in-progress/old clients; the new normal signup UI uses the shared email/password APIs. Existing MFA, password recovery, OTP attempt/expiry, CSRF/origin, invitation and legal-acceptance checks remain authoritative.

## SIA orb

`src/sia-orb.js` and `sia-orb.css` provide one reusable CSS-rendered orb in the approved burgundy/gold palette. It supports idle, guiding, working, success and error states, escaped accessible labels, system reduced motion and a keyboard-accessible pause control. Status also appears in text/alerts, not colour alone. No microphone, automatic speech, live model operation, image generation or external asset is implied.

The shared popup, pre-company welcome, company setup and existing SIA assistant use this component. SIA remains optional assistance; the orb itself executes no business operation. Dialogs keep native semantics, focus management and Escape support. Policy links retain normal safe navigation rather than being converted to broken hash routes.

## Business welcome and setup

An authenticated business account without an active company now has a useful welcome screen at `/distributor/dashboard`, with Welcome, Company setup, Account security and Legal/privacy navigation. It uses actual account name/email verification and company membership state, with no fabricated KPI, published listing, activation, trial or payment status.

The owner opens `/distributor/onboarding` inside the workspace when ready. Existing supported presets, company details, location selection, product/service choices and team planning are reused. Existing companies are offered before a new one; creating another company remains explicit.

`/api/auth/setup-draft` GET/PUT supports explicit **Save and finish later** for incomplete pre-company setup. It is authenticated, business-account-only, CSRF/origin protected and rate-limited. Allowed fields contain company details and selected products/team plans only; credential or identity-override fields are rejected. Data is sealed with the existing server encryption key and retained in existing actor-scoped audit storage, so no migration or additional store/service is needed. Missing encryption configuration fails safely.

Revision checks under the existing locked-user transaction prevent stale tabs from overwriting a saved draft. Restoring a draft restores its step, contact choices, location, selected products, editable role counts and retry operation key. It does not create a company, membership, published offer or subscription.

The existing atomic company-creation path validates final data and creates ownership. Completing or replaying that same operation marks only its matching private draft complete in the transaction. Retrying an older company operation does not clear a newer draft. Existing profile/company-plan services persist subsequent setup progress. Customer profile setup remains in the existing customer settings journey.

Saved draft history follows existing audit retention; marking a draft complete does not erase historical encrypted entries. No automatic deletion schedule or backup erasure is claimed. The Phase 2 privacy review must include this processing and retention.

## Changed files

New: `src/sia-orb.js`, `sia-orb.css`, `src/welcome.js`, `server/auth/setup-draft.js`, `scripts/verify-onboarding-browser.mjs`, `tests/onboarding-draft.integration.test.mjs`, `tests/sia-orb.test.mjs`, this handoff.

Extended: `index.html`, `server/index.js`, `server/auth/routes.js`, `server/auth/email-registration.js`, `server/tenancy/routes.js`, `src/account.js`, `src/onboarding.js`, `src/business-onboarding.js`, `src/mobile-auth.js`, `src/sia-company-setup.js`, `src/sia.js`, `src/app.js`, `tests/sia-company-setup.test.mjs`, `tests/email-signup.integration.test.mjs`, `scripts/browser-check.mjs`.

Protected customer dashboard/locale, marketplace, official logo and historical SQL migrations are unchanged. Only shared entry/presentation and backend safeguards were extended.

## Verification and limitations

Test configuration was inspected: PostgreSQL tests create a generated-credential disposable loopback cluster and use fictional records/mocked email. Browser tests use a local server, isolated headless profile and fictional intercepted APIs. No actual inbox delivery is proved by these tests.

Initial focused tests exposed and fixed a draft-router scope error which interfered with anonymous login. The router is now mounted only at `/auth/setup-draft`. Browser checks exposed the old success-card branch and viewport-specific dashboard test assumptions; the actual OTP handoff and assertions were corrected. Company-setup VM tests now load the actual shared orb dependency.

Before final refinements: 19 focused tests passed; 179 safe unit checks passed; full PostgreSQL-backed runner passed 533 tests; 64 focused onboarding browser checks passed across six widths, including valid/invalid OTPs and full-reload draft resumption. These counts are historical checkpoints, not substitutes for final results below.

Results before the owner assigned further testing to manual acceptance:

- Final full PostgreSQL-backed runner: **534 passed, 0 failed, 0 skipped**, exit 0; `.verification/phase3-final-all.log`. This includes unit/contract tests as well as real database scenarios, not 534 separate database workflows. The disposable cluster stopped successfully.
- Safe unit runner: **181 passed, 0 failed**; `.verification/phase3-unit-final.log`.
- Last static result: **1,714 passed, 0 failed**; `.verification/phase3-static-final.log`. Later source/copy changes were not followed by another static run after the manual-testing instruction.
- Focused onboarding browser: **65 passed, 0 failed**; `.verification/phase3-browser-focused.log`, covering six widths, both OTP handoffs, an actual page reload for draft resumption, paused-modal Escape and reduced motion. Browser APIs are fictional; real inbox receipt remains manual.
- The broader browser run did **not** fully pass: its latest recorded result was **1,194 passed, 3 failed**, with the scenario stopping at an obsolete avatar selector. The other assertions still expected the previous business-home destination/pause selector. These assertions were updated to the new dashboard/orb contract but not rerun after testing was assigned to the owner. Do not present this as a completed whole-app browser pass.
- Browser checks also exposed a genuine orb-toggle defect: the broad selector matched the HTML root after setting its motion data attribute. The handler now targets buttons only. The focused browser rerun confirmed that pausing preserves the document, and a unit regression covers the selector boundary.

Broader browser scenarios for the retired email-only business wizard were replaced by shared signup assertions; legacy backend security tests remain. New explicit browser scenarios cover successful dashboard navigation, so mocked failure-only coverage is not presented as successful onboarding.

Production still requires reviewed release approval, configured email workers, delivery acceptance, the earlier recovery evidence, legal/tax approval and published trial/plan configuration. Signup alone never establishes those capabilities.

## Latest owner instruction: manual acceptance

The owner will test both dashboards manually. No further automated tests were started after that instruction. Remaining local changes clarify the welcome/setup navigation and remove stale fallback text suggesting already-implemented modules are reserved for a later phase. The main customer dashboard design, customer locale, marketplace and logo remain unchanged.

Use `MY_SOLAR_CUSTOMER_BUSINESS_MANUAL_ACCEPTANCE.md` for the customer and owner/employee journeys, actual configuration blockers, and how to report a failure without disclosing private credentials. End-to-end manual acceptance and production deployment are not yet complete. Do not mark either entire dashboard fully production-ready on the basis of this local implementation.

## Git commands — only after separate release approval

The current worktree also contains the preserved unreleased Phase 1 and 2 work. Pushing main can trigger Railway deployment. Do not run the publishing commands before the outstanding release gates are approved. They are provided for the owner's standing request for commit/push commands, not executed here.

```powershell
git status --short
git diff --check
git add -- server src scripts tests index.html sia-orb.css MY_SOLAR_FINAL_FOUNDATION_PHASE_1_HANDOFF.md MY_SOLAR_LEGAL_COMMERCIAL_PHASE_2_HANDOFF.md MY_SOLAR_SIA_ONBOARDING_PHASE_3_HANDOFF.md MY_SOLAR_CUSTOMER_BUSINESS_MANUAL_ACCEPTANCE.md
git diff --cached --stat
git commit -m "Complete foundation controls and shared SIA onboarding"
git fetch origin
git merge origin/main
git push origin main
```

Review staged files and resolve any merge conflict before continuing. Do not force-push or stage `.env`, ignored verification output or private recovery archives. No branch/history operation was performed in this phase.
