# MY Solar — no-autopay trial and subscription flow

29 October 2026. Local implementation only. Main / HEAD cb49690.

## Decision

**IMPLEMENTED — MOCK-VERIFIED ONLY for the connected flow. Not approved for production release or live billing.**

This supersedes the upfront trial-mandate description in the earlier pricing alignment report. Free trials require no payment provider, bank account, card, mandate or priced purchase offer. Trial expiry creates no automatic charge.

## Owner journey

1. Business entry introduces SIA in the existing popup experience.
2. Enter email, verify its eight-digit email OTP (edit email, resend and delivery-status controls), then name/password. Customer and business identities remain separate. Actual inbox delivery remains an external acceptance gate.
3. Save essential company details, services/products, contacts and planned team. Resume incomplete setup instead of creating duplicate companies. Full profile stays available later.
4. Open Boss home. Free LEADS/public-profile management remains separate from subscription. Visibility requires existing company/publication approvals; saved details never imply publication.
5. An active, approved company with a verified owner explicitly starts its one-time seven-day trial. An operator first configures its reviewed workspace scope using an existing immutable plan version. Draft monetary terms are allowed for this free scope. No mandate/payment record is created.
6. Trial starts when the server saves access, not at signup or page rendering. Existing role, feature and capacity limits apply. Planned positions are not employee accounts.
7. Day 5 begins after 96 hours. The top Boss welcome area shows actual expiry and Review subscription. It remains through day 7 while access is valid. No extra dashboard row or scheduled-charge claim.
8. At exactly 168 hours, backend guards reject new operational work. Free listing, account/setup/support and existing authorised read/history/export workflows remain accessible. Records and memberships are preserved.
9. After expiry, select genuinely published monthly terms and explicitly consent to payment and recurring autopay. Actual amount, tax treatment, interval, billing cycles and cancellation meaning are shown. No second free trial.
10. Only a signed webhook reconciled with canonical provider records, captured payment and paid invoice restores a valid paid period. A browser return or mandate authorisation alone cannot unlock the OS.
11. Future renewals require the consented subscription. Failures grant no extension. Cancellation preserves records and does not automatically refund payments.

Existing agreements are grandfathered. Old consented mandates are not silently cancelled or rewritten; their recorded reminder/cancellation services remain intact.

## Commercial presentation

| Proposal | Monthly price before GST | Proposed capacity |
| --- | ---: | --- |
| Starter | INR 3,500 | Up to 10 users |
| Pro | INR 6,999 | Up to 25 users |
| Elite | INR 9,999 | Up to 50 users |
| Enterprise | Custom pricing | By agreement |

Proposal cards are distinct from immutable published billing terms. Annual purchase remains unavailable. No GST rate, discount, add-on price or plan record was invented. AI Agents remain one optional Coming Soon category; TalkinLabs remains separate Coming Soon. Internal PRO network rules are unchanged.

## Changed implementation

- server/commercial/free-trial.js: existing-subscription trial assignment; company/verified owner/cohort checks; replay preserves dates; history prevents restart; no provider or mail operation.
- server/commercial/os-routes.js: authenticated/CSRF-protected activation endpoint; withCompany permissions/locks; 10 attempts/day; server eligibility; platform-only trial configuration with reason, audit, revision and transaction advisory lock.
- server/commercial/os-billing.js: shared assignAccessPeriod; paid checkout after historical trial; immutable paid intent purpose; captured invoice before access; legacy mandate rules retained.
- server/commercial/razorpay.js: paid monthly terms may record trialDays 0 or 7 but conversion creates no new trial. Post-trial provider creation omits start_at.
- server/commercial/os-access.js: server-time day-5/expiry projection and operational guard. Entitlements never override role permissions.
- src/business-access.js and business-access.css: free trial independent of billing configuration; checkout only after expiry; actual agreements; operator scope form; top reminder helper; 60-second session refresh on visible running-trial dashboard.
- src/boss-dashboard.js: reminder reuses welcome area; expired home says Subscribe to continue; real authorised metrics retained.
- src/account.js and src/app.js: redraw on authoritative access/day changes, mount dashboard refresh. No payment side effect from rendering.
- server/db/migrations/043_no_mandate_trial.sql: PREPARED, NOT EXECUTED. Reviewed trial configuration and immutable contract purpose. No seed, automatic live conversion or prior migration rewrite. Migration 042 remains preserved and unapplied by this task.
- tests/business-subscription.test.mjs and scripts/browser-check.mjs: revised local scenarios.
- tests/business-subscription.integration.test.mjs: extended future disposable-database scenario, NOT RUN.
- MY_SOLAR_PRICING_AND_ENTITLEMENTS_ALIGNMENT_REPORT.md: superseding policy notice.

Provider reference: [Razorpay subscription API documentation](https://github.com/razorpay/markdown-docs/blob/master/api/payments/subscriptions-custom.md) documents immediate start after authorisation when start_at is omitted. Our access still separately requires captured subscription payment. Documentation is not live acceptance evidence.

## Evidence actually obtained

| Check | Result | Evidence scope |
| --- | --- | --- |
| Fixed safe unit allowlist | 172 passed, 0 failed, 0 skipped; exit 0 | In-memory / mocked DB interfaces; no PostgreSQL |
| Isolated Chrome harness | 1,291 passed, 0 failed; process exit 0 | Fictional intercepted APIs; no real registration, OTP, billing or persistence |
| Static source/import/asset checks | 1,582 passed, 0 failed; exit 0 | SQL was not executed |
| Git whitespace check | Passed | No Git write/history operation |
| Protected files | No diff | Customer dashboard JS/CSS, locale, marketplace JS, official logo |

Unit coverage: 96-hour reminder and 168-hour expiry boundaries; free trial with draft/unknown price; no provider/mail/payment writes; retry without extension; owner/lifecycle rejection; no restart; preserved reads/rejected writes; paid provider request without another trial; no authorisation-only unlock.

Browser coverage: day 4 absent/day 5 present/day 7 present reminder at 390/1440 widths; desktop vertical fit and mobile horizontal fit; no running-trial payment checkout; free activation submits only scope/confirmation; expired route locks; pricing/listing at 360/390/768/1024/1280/1440 widths. Counts include existing regression checks, not 1,291 new trial cases.

Local ignored logs: .verification/free-trial-unit.log, free-trial-browser.log, free-trial-browser-stderr.log and free-trial-static.log. Expected refused loopback DB connections exercise unavailable states; the runners configure no production connection.

Prepared PostgreSQL integration assertions cover CSRF denial, concurrent activation/replay, one persisted trial and zero billing contracts with billing disabled. Syntax checked only. Persistence, SQL constraints, transactional rollback and true DB concurrency remain unverified.

## Remaining gates

1. Resolve existing Migration 034 release/recovery gates.
2. Separately authorise disposable PostgreSQL acceptance of the full chain, including 042/043, upgrade/repeat/checksum checks, concurrent activation, expiry, rollback and quotation/order invariants.
3. Operator reviews actual existing plan records and selects/enables the free-trial scope. No records were inspected/created here. If missing, UI reports configuration pending.
4. Paid conversion separately requires approved published final monthly/tax terms, verified provider mappings, permitted provider mode/credentials and webhook configuration. Free trial requires none of those payment credentials.
5. Rehearse provider captures, auth-only denial, delayed/out-of-order/replayed events, cancellation, uncertain results/operator reconciliation, failure and renewal before live payments.
6. Verify real email delivery/recovery, company approval/publication and owner/employee acceptance. Existing provider configuration was not inspected or changed.
7. Authorise release separately. No deployment, database operation, Railway change, Git write, production record or payment request occurred.

The new reminder is in-app. Free trials create no legacy billing-reminder emails. Hidden/offline browsers cannot guarantee immediate visual refresh, but every protected action still checks server expiry. Read/export availability remains subject to existing permissions. Suspended companies remain restricted.

## Preservation and next step

Prior SIA/pricing changes remain intact and uncommitted. HEAD remains cb49690, no staged changes. No protected customer file/logo change. No database connected or mutated, no secret exposed, no production/Railway/commit/push/deployment operation.

Single next milestone: authorised isolated PostgreSQL and provider test-mode acceptance of this exact no-mandate trial flow, then an explicit release decision.
