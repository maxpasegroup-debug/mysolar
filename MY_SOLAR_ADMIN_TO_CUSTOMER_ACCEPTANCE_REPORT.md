# MY SOLAR — Admin-to-Customer Acceptance Report

Verification date: 16 November 2026, Asia/Calcutta.

**Overall result: BLOCKED. Do not treat this as deployment acceptance.** No disposable PostgreSQL runtime or approved disposable connection was available. No part of the database-backed admin → publication → customer enquiry → business quotation journey is recorded as PASS. Mocked results were not substituted for that journey.

The existing safe unit regression suite was run only to investigate its five failures: **180 passed, 5 failed, 0 skipped; exit 1.** Those numbers do not prove the business journey.

## 1. Repository and preservation — PASS

| Item | Observed evidence |
| --- | --- |
| Inspected root | `C:\Users\kkyad\OneDrive\Desktop\mysolar\mysolar` from `git rev-parse --show-toplevel` |
| Requested historical location | `D:\APPS\WEB\mysolar` is unavailable in this environment |
| Origin | `https://github.com/maxpasegroup-debug/mysolar.git` for fetch and push |
| Local branch | `main` |
| HEAD | `3ff41b9493764b54217b1d316216153f2a97f271` — `feat: Add Customer Marketplace Connection Report and implement company review actions` |
| Starting worktree/index | Clean; `git status --short` returned no changes |
| Cached upstream relationship | `main...origin/main`: 0 local-only, 0 remote-only commits |
| Remote qualification | No fetch or network Git operation occurred; cached origin refs do not establish today's GitHub server state |

The previously implemented local work is now in the existing HEAD; this verification did not create that commit. No application source, tests, migration, package manifest, environment file or existing report was changed. Only this requested report and ignored local diagnostic logs were created. No Git staging, commit, push, branch change or deployment occurred.

## 2. Disposable PostgreSQL availability — BLOCKED

Observed checks:

- No `TEST_DATABASE_URL` or `POSTGRES_BIN` was present in the process environment. Secret `.env` files were not opened or loaded.
- The harness default `.verification/postgres/pgsql/bin/postgres.exe` does not exist. The alternative `C:\pgsql\bin\postgres.exe` is also absent.
- `psql`, `postgres`, `pg_ctl`, `initdb`, Docker and Podman were not found as commands. No PostgreSQL process or PostgreSQL/Docker installation directory was found in the standard Program Files checks.
- WSL distribution enumeration initially hit a sandbox access denial. The same read-only enumeration with additional process access succeeded and returned no distributions. Nothing was installed or started.

Actual preflight command:

```text
node scripts/verify-postgres.mjs database.test.mjs
```

Result: **exit 1**, `ENOENT` accessing `.verification/postgres/pgsql/bin/postgres.exe`, at `scripts/verify-postgres.mjs:12`.

The inspected harness checks binaries before creating the cluster, writing its bootstrap password, starting PostgreSQL, creating a database or launching tests. It stopped at that preflight. **No database, schema, migration, fictional identity, company, enquiry or quotation was created.**

Evidence log: `.verification/admin-acceptance-db-preflight.log` (ignored local file).

I did not install a database, infer a target from production settings, probe a production service or run integration suites against a fallback database.

## 3. Acceptance matrix

PASS means evidence actually obtained at the stated scope. FAIL means an executed check failed. BLOCKED means the required runtime evidence could not be obtained. Source inspection is described separately and is not a database PASS.

| Requested check / journey | Result | Evidence and limit |
| --- | --- | --- |
| Correct repository, branch and starting state | **PASS** | Git root, origin, HEAD, branch, clean worktree and cached tracking relationship observed above. |
| Administrator login/authentication | **BLOCKED** | No disposable database to persist users/sessions or execute a real login. Existing authentication architecture inspected. |
| Administrator server permissions and ordinary-user denial | **BLOCKED** | Grant/permission/CSRF/session checks exist in source, but real database-backed authorized and unauthorized requests were not executed. |
| Pending/approved/returned/marketplace/published queues | **BLOCKED** | Allowlisted queue predicates and UI exist; SQL results and state membership unexecuted. |
| Disposable fictional test records | **BLOCKED** | PostgreSQL preflight failed before test setup. No production or XYZ records substituted. |
| Company setup and submission | **BLOCKED** | Existing owner submission path inspected; no persisted fictional submission. |
| Admin company activation | **BLOCKED** | Existing independent reviewer and readiness/revision checks inspected; no activation performed. |
| Separate marketplace approval | **BLOCKED** | Separate action/state inspected; no approval performed. |
| Explicit publication | **BLOCKED** | Public policy, approval history and profile checks inspected; no publication performed. |
| Find Solar Companies search | **BLOCKED** | Sidebar `/#/vendors` entry and real public API exist; no database result or browser search accepted. |
| Open selected company's public profile | **BLOCKED** | Storefront/API/server-rendered routes exist; no fictional published profile opened from real data. |
| Customer submits enquiry to selected company | **BLOCKED** | Recipient preview and transaction paths inspected; no actual submission. |
| Correct business receives enquiry | **BLOCKED** | Company-recipient joins inspected; no stored recipient or inbox acceptance. |
| Business prepares and sends quotation | **BLOCKED** | Existing draft/send routes found; entitlement, qualification and quotation policy prerequisites apply. No draft/send SQL executed. |
| Customer sees quotation and status | **BLOCKED** | Customer-owned non-draft read/status paths exist; no issued quote read or viewed transition accepted. |
| Unpublished company excluded | **BLOCKED** | Public view requires publication; no executed unpublish/search/profile-negative case. |
| Customer/customer and company/company isolation | **BLOCKED** | Ownership/recipient/current-company predicates inspected; no real adversarial cross-account requests. |
| Existing safe unit regressions | **FAIL** | 180 passed, five failed, zero skipped. Exact investigation below. |
| Investigate the five failures | **PASS** | All five reproduced and traced to current source/test contracts. This does not make the failing suite green. |
| Identify source migration/environment requirements | **PASS** | Read-only manifest/configuration review completed below. |
| Verify installed schema and configured runtime | **BLOCKED** | No database or deployed environment inspection. |

## 4. Existing implementation traced

### Administrator access and queues

- Login: `/#/distributor/login`, using the existing authentication architecture and an already authorized operator account.
- Dashboard: `/#/platform`.
- Queues: `/#/platform?queue=onboarding`, `approved`, `returned`, `marketplace`, `published`.
- Detail: `/#/platform/company?id=<company-id>`.
- APIs: `GET /api/platform/companies`, `GET /api/platform/companies/<id>`, `POST /api/platform/companies/<id>/actions`.

`server/platform/routes.js:14` revalidates the user/session, checks `platform_admin_grants`, checks the action permission and applies existing privileged protections. The router requires login and CSRF for writes; origin/JSON middleware is mounted in `server/index.js`. Public registration does not issue platform grants. `server/admin.js` is the separate operator procedure and was not run.

`server/platform/company-review.js` defines existing-state transitions and allowlisted queues. Company approval is `pending_review` → `active` with publication off. Marketplace approval is separately `pending` → `approved` with publication off. Publish is another explicit action. Rejection/corrections reuse existing return states, with reasons and decision audit. Positive decisions require an operator independent of the target company. Revision checking, company locks, `company_reviews` and audit writes remain in the transaction.

These are source facts; actual operator identities, row locks, journal durability and queue SQL are unverified here.

### Customer and quotation route chain

1. Login `/#/customer/login` → Home `/#/customer/dashboard`.
2. **Find Solar Companies** → `/#/vendors`; search example `/#/vendors?search=<fictional-name>`.
3. **Explore distributor** → `/#/storefront/<company-id>`; alternate `/#/storefront?company=<id>` and `/companies/<id>`.
4. **Request a quotation** → `/#/customer/enquiry/new?companyId=<id>`.
5. Request options/matches: `GET /api/customer/enquiry-options`, `POST /api/customer/enquiry-matches`.
6. Submission: `POST /api/customer/enquiries`; selected recipients must still qualify at commit time.
7. Business inbox `/#/distributor/leads` → `GET /api/companies/current/enquiries`.
8. Business detail `/#/distributor/enquiry?id=<enquiry-id>` → its company-scoped API.
9. Draft: `POST /api/companies/current/enquiries/<enquiry-id>/quotations`; UI `/#/distributor/quotation/new?enquiryId=<enquiry-id>`.
10. Send: `POST /api/companies/current/quotations/<quotation-id>/actions` with `action:send` and current revision.
11. Customer detail: `/#/customer/quotation?id=<quotation-id>` → `GET /api/customer/quotations/<id>`; customer quotation actions use `POST /api/customer/quotations/<id>/actions`.

Relevant files: `src/customer-dashboard.js`, `src/marketplace.js`, `src/experience.js`, `src/purchase.js`; `server/marketplace/public.js`; `server/purchase/customer.js`, `company.js`, `service.js`, `sources.js`, `review.js`; `server/tenancy/context.js`.

Public discovery requires the `marketplace_vendors` view's active status/lifecycle, marketplace approval, publication, profile/contact and recorded review conditions plus public-storefront policy. Enquiry eligibility also checks declared service/coverage and selected offers where applicable. A private saved request with no recipients is not company delivery. Draft quotations are not visible to customers; issued customer reads are tied to the owning enquiry.

### Important entitlement prerequisite

Free storefront publication and receiving/reading enquiries do not automatically enable business quotation writes. `server/commercial/os-access.js:10` requires valid managed-company access for new operational actions; `server/purchase/company.js` additionally requires `quotations.manage` to draft and `quotations.send` to issue. Qualification/source and internal-review policies can impose further checks.

A complete fictional rehearsal therefore needs an eligible, explicit test access agreement. The existing manual administration route `POST /api/platform/commercial/companies/<id>/subscriptions` can assign an active plan with appropriate grants and versioned terms; source explicitly records that this is access administration, not payment received. Its actual operation was not tested. No Razorpay or live billing is necessary merely to test such a fictional manual agreement, but it must remain entirely inside the disposable target.

Do not bypass the new-company journey by deleting enrolment rows or updating activation/publication flags directly. Existing `tests/helpers/connected-fixture.mjs` does those fixture shortcuts for historical-company scenarios; it cannot by itself prove this requested admin-driven acceptance chain. This helper was inspected but not executed.

## 5. Investigation of the five failures

Actual command:

```text
node scripts/verify-master-local.mjs
```

Result: exit 1; 185 tests, 180 passed, five failed, zero skipped. The fixed allowlist resets provider settings, removes database-test targets and runs deterministic/unit/in-memory specifications. It does not run PostgreSQL integration acceptance. Configuration tests need child-process access; the allowlist was run with that process access after inspection. Log: `.verification/admin-acceptance-unit.log`.

### A. Boss Dashboard — FAIL, stale copy expectation

- Failure: `tests/boss-dashboard.test.mjs:53`, assertion at line 58 expects `Online lead automation · Coming soon`.
- Current `src/boss-dashboard.js:44` renders Sales Booster with `Connect your online channels with our team.` and `Free setup`.
- Earlier assertions in this test reached the final copy assertion; this failure is not evidence of a failed permission or SQL calculation.
- **Launch effect:** no demonstrated direct blocker to approval/enquiry/quotation routing. The test and approved product wording must be reconciled. The replacement copy is a human-service offer, not evidence of functioning automatic channel integrations. Do not advertise it as verified automation.

### B. Team-cap commercial test — FAIL, brittle query-position assertion

- Failure: `tests/commercial.test.mjs:17` expects `calls[1]` to equal `['company','invitation']`; actual second call is `['company']`.
- Current `teamCapacity` in `server/commercial/policy.js:9` first reads policy, then checks OS enrolment, then performs the capacity query. The test assumes the old two-query order.
- The capacity query still counts active members and pending invitations and uses `id<>$2` for the invitation being accepted. The initial `PLAN_LIMIT_REACHED` assertion in the original test succeeded; the later call-index assertion failed.
- Additional **diagnostic-only fake-query checks**, without changing tests or code, confirmed the exclusion parameters reach the third query, a used count of two rejects at cap two, and used count one is allowed.
- **Launch effect:** this particular failure is test maintenance, not reproduced SQL under/over-counting. Real invitation acceptance, concurrent capacity and enrolment behavior remain database acceptance gates. The fake-query diagnostic is not a capacity database PASS.

### C. Legal proposal test — FAIL, outdated free-trial sentence

- Failure: `tests/legal-controls.test.mjs:10` expects `No payment mandate is required`.
- Current `server/legal/catalogue.js:25` says new Solar OS accounts do not receive a free trial and paid access requires approved terms and explicit supported authorization. Historical no-mandate trial handling remains documented separately.
- A read-only diagnostic checked the remaining proposal amounts, annual-price warning, six unique document digests, draft statuses and `commercialReady() === false`; those assertions held. No document was approved or edited.
- **Launch effect:** stale assertion does not establish broken quotation routing. However, the checked-in `server/legal/review.json` independently still has empty document approvals, no grievance appointment and pending tax review. **Paid commercial launch remains blocked** by that genuine approval gap. Legal consent/publication readiness must be assessed separately from this wording test.

### D. SIA orb control test — FAIL, missing tested API

- Failure: `tests/sia-orb.test.mjs:5`, `orb.control is not a function`.
- Current `src/sia-orb.js` exports only `markup` and `setState`; the tested manual motion-control method is absent. Repository source search found no current application call to `SiaOrb.control`.
- **Launch effect:** no demonstrated direct dependency of admin approval/quotation routing on this missing method. This is an unresolved UI/accessibility contract, not something to hide by calling all tests stale. Decide whether manual pause is a required feature and implement/accept it or intentionally update the contract in later work.

### E. SIA motion interaction test — FAIL, missing click behavior

- Failure: `tests/sia-orb.test.mjs:10`, `click is not a function`.
- The same source has no registered click handler for `data-sia-motion` and no manual pause-state implementation. CSS still has a `prefers-reduced-motion:reduce` rule disabling animation. State markup and label escaping also passed supplemental VM diagnostics.
- **Launch effect:** related to D; reduced-motion CSS is useful but does not prove an explicit manual-pause requirement is satisfied. Accessibility acceptance remains unresolved. No browser accessibility audit was conducted.

All five failures were left visible. No test assertion was changed, removed or suppressed. They do not establish a critical admin/customer data failure, but they prevent declaring the existing regression suite green. The missing real database journey is the primary deployment-acceptance blocker regardless of these diagnoses.

## 6. Schema and environment requirements

### Schema

Read-only `migrationManifest()` inventory returned **51 entries**, including generated `002_role_catalogue_v1`, both `047_razorpay_webhook_inbox.sql` and `047_round_robin_lead_assignment.sql`, and final `050_direct_subscription_no_trial.sql`.

No new schema change was identified as necessary for the admin-to-customer workflow; it reuses existing grants, review/audit, profiles, public views, enquiries and quotations. **The existing chain still must be applied and verified in a new disposable database.** It was not applied here. Existing upgrade/repeat/checksum compatibility remains untested.

Readiness compares the full manifest to installed names/checksums. No target ledger was inspected, so the pending migration list for any deployed database is unknown. Checked-in `railway.json` has automatic pre-deploy `npm run db:migrate`; deploying is not a safe way to discover pending schema work. No Railway setting was read remotely or changed.

### Disposable test configuration needed

- An accessible local PostgreSQL runtime (`postgres`, `initdb`, `pg_ctl`) for `scripts/verify-postgres.mjs`, normally under its workspace-local path or an explicit `POSTGRES_BIN`; alternatively an explicitly dedicated loopback PostgreSQL test target.
- `TEST_DATABASE_URL` must identify loopback and a database named `mysolar_test_*`. Existing tests create unique schemas and perform data cleanup in that designated target. Never substitute `DATABASE_URL` from a production `.env`.
- Test process `DATABASE_URL` must point only to that disposable database/schema; generated `SESSION_SECRET`, local HTTP `APP_ORIGIN`, `NODE_ENV=test` and local DB TLS policy must match the test harness.
- Isolated fictional users and server-controlled admin grants; no public registration privilege injection. Seeded verified fictional accounts can test real password/session behavior without claiming real SMTP/OTP receipt.
- A valid fictional OS access agreement for quote drafting/sending, assigned through the existing administration model with explicit terms and permissions. Free listing alone is insufficient.
- Keep SIA providers, SMTP/Resend, scanner calls, Razorpay, live billing and operational alerts disabled unless a separately scoped test explicitly requires them. No external integration is needed for in-app enquiry/quotation acceptance.
- If actual email/OTP delivery is separately required, encryption, mail provider and supervised mail worker need their own acceptance. No real email delivery was attempted here.

These are requirements, not environment changes made by this task. Do not weaken authentication or commercial guards merely to make the journey pass.

## 7. Required next acceptance evidence

After a disposable runtime/target is available, run one connected fictional scenario with evidence at each boundary:

1. Apply/repeat the existing migration manifest and record PostgreSQL version plus names/checksums.
2. Authenticate independent operator, owner, customer, second business and second customer. Check ordinary-account, CSRF and stale-session denials.
3. Create and submit the fictional company through existing setup APIs. Assert pending state, no automatic activation/publication, and correct queue rows.
4. Perform three separate operator decisions: activation, marketplace approval, publication. Read stored reviews/audits after each; exercise correction/resubmission and stale revisions.
5. Search through the customer directory and open its profile from actual persisted records.
6. Send a direct request with matching recorded service coverage; verify exact recipient row and business inbox. Check other business/customer denial.
7. Assign the explicit fictional access agreement, satisfy actual qualification/review requirements, prepare and send a quote. Verify draft secrecy and issued/customer-viewed status transitions.
8. Unpublish through the admin action; verify directory, API profile and clean public URL exclusion while authorized private history remains accessible.
9. Record DB persistence, transaction rollback/concurrency and cross-company/customer negatives. Then perform browser click/keyboard/layout acceptance against the same disposable app.

No step above is marked complete in this report. No mock response or directly patched public flag should replace its evidence.

## Final decision and safety record

**BLOCKED / NO DEPLOYMENT ACCEPTANCE.** Provide an available, explicitly disposable local PostgreSQL runtime or test target before claiming the full journey works. Reconcile the five regression contracts and separately resolve commercial/accessibility gates appropriate to launch scope.

XYZ and all production records were untouched. No database connection, migration, schema creation, real account/grant change, live billing, Railway/Razorpay change, production setting change, commit, push or deployment occurred. Only this report and ignored diagnostic logs were written. Verification stops here.
