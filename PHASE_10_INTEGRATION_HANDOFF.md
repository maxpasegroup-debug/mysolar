# Phase 10 integration verification — 17 October 2026

## Result

This local integration milestone passed after the defects below were fixed:

| Final check | Observed result |
| --- | --- |
| Complete automated inventory against disposable PostgreSQL | **174 passed, 0 failed, 0 skipped, 0 cancelled** |
| Headless browser, existing workflows plus PRO/expired views | **72 passed, 0 failed; no uncaught JavaScript exceptions** |
| Repository build/static validator | **680 passed, 0 failed** |
| Official npm registry audit, production dependencies | **0 known vulnerabilities** |

Production sign-off remains pending a controlled release rehearsal and real-user acceptance. No production connection, migration, account/data change, deployment, secret change, DNS change, external domain/provider resource, commit or push was performed. Company-domain traffic and billing remain disabled.

## Baseline and isolation

- Inspected Git status/diffs, project instructions, package scripts, PostgreSQL runner/setup, migration executor, business/domain/PRO handoffs, earlier Phase 10 report, authentication, tenancy, domain and commercial services before edits.
- Starting branch `main`, HEAD `24f3970` (`Add PRO partner network and part-time sales team`). The initial working tree and index were clean. Earlier implementation work was already in that commit; no reset, cleanup, stash or replacement was performed.
- No applicable `AGENTS.md` was found in the project ancestors or relevant source/test/script directories.
- Used existing workspace PostgreSQL binaries, reporting **PostgreSQL 18.6, x86_64 Windows**. Each run generated a fresh cluster directory under `.verification/postgres/cluster-*`, an ephemeral **127.0.0.1-only** listener, a random in-memory bootstrap password and database `mysolar_test_phase1`.
- The runner does not load `.env` or Railway variables. It explicitly supplies generated loopback test credentials and clears inherited SMTP, AI and session credentials in child tests. Individual integration helpers validate the loopback URL, database-name prefix and actual database identity before creating random schemas.
- Test accounts, company names, prices, provider observations and records are explicitly fictional fixtures. No real email or WhatsApp message was sent. Recovery uses an in-memory mail adapter; DNS verification uses controlled TXT responses at the resolver boundary. The real application routes, sessions, CSRF, queries, transactions and business services still execute.
- Each integration schema was dropped after its test and each runner stopped its cluster in `finally`, including unsuccessful exploratory runs. Password bootstrap files were removed. Ignored logs and stopped cluster files remain as local evidence; no test database is left serving application traffic.

## Exact migration status before disposable-schema cleanup

Fresh-schema execution, 007-to-current upgrade, and explicit 008 -> 009 -> 010 -> 011 upgrade all succeeded. The verified manifest contains **11 entries**:

| Entry | Status in the isolated schemas |
| --- | --- |
| `001_identity.sql` | Applied; checksum matched |
| `002_role_catalogue_v1` | Applied; immutable virtual role-catalogue checksum matched |
| `003_company_setup.sql` | Applied; checksum matched |
| `004_marketplace.sql` | Applied; checksum matched |
| `005_enquiries_quotations.sql` | Applied; checksum matched |
| `006_operations.sql` | Applied; checksum matched |
| `007_sia.sql` | Applied; checksum matched |
| `008_commercial.sql` | Applied; checksum matched |
| `009_shared_invitations.sql` | Applied; checksum matched |
| `010_domain_registry.sql` | Applied; checksum matched |
| `011_pro_network.sql` | Applied; checksum matched |

Repeat execution preserved all checksums and original application timestamps. Tests temporarily changed/deleted the final tracking entry, verified `/readyz` returned 503 and the executor rejected a changed checksum, then restored the exact original entry and verified readiness returned 200. The complete tracking history was rechecked after operational tests.

All PostgreSQL constraints were validated. Required unique/partial indexes, tenant foreign keys, domain-operation ownership, partner assignment ownership, role grants and the narrow part-time role were inspected and exercised. Duplicate primary domains, foreign company references, domain identity reassignment and invalid lifecycle transitions were rejected by PostgreSQL. Concurrent hostname claims produced one durable owner. The original SQL files and original role catalogue were **not edited**; checksum regression fixtures now also pin the unchanged 009–011 files. **No new SQL migration was needed.**

Full checksum/application-time/index evidence is in `.verification/phase10-migrations.json`. This records the schema **before cleanup**; that temporary schema no longer exists after the successful run. Production migration state was not queried or changed.

## Verified coverage

| Area | Evidence from actual integration or browser checks |
| --- | --- |
| Authentication | Customer/distributor registration and login, anonymous-session rotation, duplicate/wrong-password/privilege payload denial, separate company ownership, logout and stale-session rejection. Signup abuse limits remain enforced; a sixth fixture signup is explicitly rejected. |
| Recovery | Honest unavailable state without SMTP; matching immediate responses for known/unknown email; hashed, expiring/replaced tokens; invalid-token, CSRF, origin and identity-payload denial; successful reset revokes all sessions and preserves membership; replay and disabled accounts fail; failed mail delivery invalidates its token. No real deliverability claim is made. |
| Business/customer linking | Employee and customer sharing/acceptance, recipient matching, explicit consent, expired/revoked/replayed/changed-contact denial, company ownership, private-note exclusion, connected-company views, after-sales service and Boss priorities/exact recorded balances. |
| Existing operations | Existing catalogue/enquiry/quotation flows, human order confirmations, CRM conversion, task/project assignments, milestone permissions, procurement/partial receipt/idempotency, concurrent stock removal without negative balances, invoices/collections/reversals and customer-visible service/document boundaries. |
| Domains | Explicit entitlement required for registration, normalized hostnames, secret-free replays, failed/successful/expired/rotated/stale ownership proofs, concurrent claims, primary uniqueness, SQL identity guards, operation foreign keys, blocked provider setup and unconditional activation denial. |
| Domain lifecycle/isolation | Tenant-scoped reads, immediate suspension/removal denial, provider-cleanup gate before reclaim, new assignment/new ownership proof on reassignment, read/removal access after commercial restriction, operator-only cross-company actions and scoped audit records. |
| Host boundary | Real raw HTTP Host overrides are tested; unknown hosts return 404, eligible fixture company hosts still return 503 and never issue session cookies. Forwarded-host claims cannot switch a canonical session to another company. No company-domain traffic was enabled. |
| Partners | FREE/ELITE/pre-billing denial despite permissive base flags, private previews, explicit acceptance, CSRF/origin/recipient checks, expiry/revocation/inviter-authority checks, single-use consent, no added memberships or dashboard access, source-private notes/assignments, revisions, suspension and fresh bilateral acceptance. |
| Partner concurrency | Held opposite company locks return `409 PARTNER_BUSY` without changing pending invitations. Concurrent opposite invitations cannot create duplicate accepted pairs; failed attempts roll back and safe retries are checked. |
| Part-time executives | Invite-only onboarding, forged role/details denial, exact minimal grants, tenant/revision-scoped business details, no broader role conversion, assigned-task-only reads/progress, foreign task/customer/finance/quotation/team/partner denial, foreign assignment rejection and idempotent task creation. |
| Commercial lifecycle | Strict PRO eligibility, authorized price/version publication and administrative assignments, trial/past-due behavior, snapshot preservation, active/pending seat caps, automatic end-date expiry, restricted new activity with retained reads, closure/revocation after downgrade and explicit restoration after renewal. No payment record or charge is inferred. |
| HTTP/assets/errors | Every HTML-referenced public asset served, server/env/Git/migration sources unavailable, no-store APIs, CSP/referrer metadata, cross-site rejection and safe database-error responses. Existing security, SIA/provider, money and ownership regression tests passed. |
| Browser/PWA | Existing desktop/mobile routes, keyboard/Escape/menu behavior, language/form preservation, offline handling and worker cache isolation; PRO and expired partner/team rendering at **360, 390, 768, 1024, 1280 and 1440px**, disabled creation/reactivation controls and assignment-link eligibility. |

Browser PRO data is explicitly fictional, read-only response interception for rendering checks. Authenticated business authorization is verified separately through real HTTP/PostgreSQL integration. These results do not claim live SMTP delivery, external DNS propagation, payment/model-provider execution, production TLS, custom-domain hosting or a thousands-company load benchmark.

## Confirmed defects fixed

1. **Expired PRO executive reactivation remained selectable in the team form.** The Active option is now disabled for part-time executives without current PRO access. Suspending/removing access remains available. The backend denial was already correct and was preserved.
2. **The executive card still offered a new sales-task assignment link without PRO.** That action is now shown only with current PRO access and task-management permission. Existing task links remain readable.
3. **The employee assignment picker still listed ineligible part-time executives.** Its server query now uses the centralized PRO resolver to omit those new-assignment choices. The existing final-operation validation remains in place; ordinary employee choices and retained company records are preserved.
4. **Verification drift:** the business test expected five roles and failed before creating its fixtures, causing cascading failures. It now recognizes the additional restricted role and separately asserts non-PRO denial. The browser test now uses the current public-menu selector. Host-spoof tests use raw HTTP because Fetch does not transmit the supplied Host override. Fixtures respect actual signup limits and use the existing `disabled` account status; expiry assertions respect the existing base-entitlement-first denial. No production security rule was relaxed to make a test pass.

The expanded browser baseline reproduced the two real UI defects with **70 passed / 2 failed**, then passed **72 / 0** after the corrections. Updated static cache identity delivers the corrected scripts with the next authorized release.

## Files changed

Application changes:

- `server/operations/read.js`: centralized eligibility filter for employee assignment choices.
- `src/organization.js`: optional disabled select choices and restricted executive activation.
- `src/growth.js`: restricted executive assignment link.
- `sw.js`: static cache version for the corrected controls; private caching rules unchanged.

Verification/documentation:

- `scripts/verify-postgres.mjs`: allowlisted optional test filenames; explicit local child credentials and credential isolation. The default still runs every test file in a new cluster.
- `scripts/browser-check.mjs`: current header selector, labelled read-only PRO/expired fixtures, six-width checks, reactivation/assignment controls and cache isolation.
- `tests/business-access.test.mjs`: current role expectation, restricted-role denial and unavailable-recovery regression.
- `tests/fixtures/migration-checksums.json`: append unchanged migration 009–011 checksums.
- New `tests/helpers/isolated-app.mjs`: validated disposable schema/server/client lifecycle.
- New `tests/domains.integration.test.mjs`, `tests/pro-network.integration.test.mjs`, `tests/recovery.integration.test.mjs`: database-backed scenarios above.
- `README.md` and this report: current evidence and operating boundary.

No dependency, authentication rule, commercial price, permission catalogue, environment file, historical migration or deployment configuration was changed.

## Final commands and evidence

Executed from the workspace:

```text
node scripts/verify-postgres.mjs
node scripts/browser-check.mjs
npm.cmd run build
npm.cmd audit --omit=dev --registry=https://registry.npmjs.org --cache .npm-cache --json
```

The first command ran every current test file with PostgreSQL available; none was skipped. `check`, `lint` and `build` are aliases for the same static validator in this repository, so it was run through `build` rather than presenting repeated identical runs as separate evidence. Focused debugging runs used the runner's allowlisted filename arguments. Earlier failing runs are retained and are superseded by these final successful results.

Ignored local evidence:

- `.verification/phase10-final-tests.log`: 174/174 and cluster shutdown.
- `.verification/phase10-final-browser.log`, `.verification/browser/results.json`: 72/72, fixtures/scope and exception observations.
- `.verification/browser/{desktop,mobile,pro-team,expired-team}.png`: browser captures.
- `.verification/phase10-final-static.log`: 680/680.
- `.verification/phase10-dependencies.json`: official registry advisory result.
- `.verification/phase10-migrations.json`: full migration checksums, timestamps, PostgreSQL version and indexes.

## Remaining boundary and single next milestone

There are **no remaining failing or skipped checks in this local milestone**, and safe isolated database access was available. This does not establish the current Railway deployment's schema, health configuration or production acceptance: those were intentionally not inspected or changed. Prior reports mentioned an effective Railway migration/health configuration discrepancy; verify the current settings during a separately authorized release rather than assuming repository settings took effect.

Live SMTP sender/deliverability, real distributor/employee/customer onboarding and their real-device WhatsApp/email experience still require acceptance. Any existing live PRO plan code must be reconciled with the canonical resolver during that review. Custom-domain provisioning, signed edge-origin forwarding, domain-bound authentication, website publication/templates and real TLS remain later work; the current denial boundary must stay enabled until those are implemented and verified.

**Single recommended next milestone: a controlled staging release and acceptance rehearsal**, covering the reviewed migration/release/health process and your distributor, employee and customer onboarding trial, while billing and company-domain traffic remain disabled. No staging or production resources were created in this task.

## Commit/push commands for later only

None was executed. Do not run these as part of this verification milestone. After review and separate release authorization, stage the intended files, then use:

```powershell
git add --interactive
git commit -m "Verify Phase 10 integrations and fix expired PRO controls"
git push origin main
```

Review staging to include the new test/helper/report files and to preserve any later user changes. A push may trigger the connected deployment workflow; it requires a separately authorized release.
