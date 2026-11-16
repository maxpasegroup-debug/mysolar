# MY SOLAR — Platform Administrator Implementation Report

16 November 2026. Local implementation only. **Implemented and unit/mock verified; database-backed and production operation unverified.**

## Outcome

Extended the existing platform administration workflow instead of creating a second identity or approval system. The application already had platform grants, review APIs, company detail screens, audit records, and separate activation/marketplace/publication actions. This task completed missing queue/correction/discovery connections and fixed a mismatch between free public listing and paid operational access.

XYZ was not reset, recreated, queried, activated, approved, published, or otherwise changed. Its pending states are owner-reported context, not independently inspected live records. No startup hook or company-name special case approves anything.

The requested D: project path is unavailable here. Work was performed in `C:\Users\kkyad\OneDrive\Desktop\mysolar\mysolar` on local `main`, HEAD `489d097`. The pre-existing untracked `MY_SOLAR_COMPLETE_PROJECT_HANDOVER.md` was preserved.

## Existing implementation inspected

- `server/admin.js`: existing database-operator grant/revoke procedure. It selects an existing active business/legacy account, requires a reason, records an audit and revokes sessions. It was **not run**. No hardcoded admin credential or automatic registration grant was introduced.
- `platform_admin_grants`, roles and permission mappings already exist in identity/setup migrations. Actual current administrator accounts cannot be enumerated without reading a database; **no account inventory or grant was performed**.
- `server/platform/routes.js`: existing `withPlatform` locks/revalidates the user/session, checks a platform grant and the requested permission and applies existing privileged-account protections. Router requires login and CSRF for mutations. Server origin/JSON protections remain in `server/index.js`.
- `src/organization.js`: existing `/platform`, `/platform/company?id=<uuid>`, review form and histories.
- `server/setup/routes.js` and `service.js`: existing explicit owner submission, review states, correction/resubmission, readiness, revision and audit mechanisms.
- `server/marketplace/public.js`, SQL public views and `src/marketplace.js`/`experience.js`: existing directory and profiles.
- `server/purchase/customer.js`, `company.js`, `service.js`: existing customer enquiries and company-recipient routing. No duplicate quotation engine was created.

Ordinary company ownership or customer registration does not create a platform grant. The actual grant is checked server-side on each action; hiding a link is not the security boundary. Independent approval remains required: an operator cannot approve/reactivate/publish a company they created or belong to.

## Changes

| File | Change |
| --- | --- |
| `server/platform/company-review.js` | Allowlisted action/permission map, queue predicates, reason requirements and transition helper over existing states. |
| `server/platform/routes.js` | Five review queues; search public name as well as company/city; detail includes structured coverage; corrections/return decisions; explicit decision audit; publication checks existing public-listing policy rather than paid OS writability. |
| `src/organization.js` | Queue dashboard, separate publication column, submission date/public name/structured coverage, correction choices, decision/reason history and an initially unselected decision field. |
| `src/customer-dashboard.js` | Adds **Find Solar Companies** as an internal hash link to `/vendors`. |
| `server/purchase/service.js` | Removes the additional paid-CRM predicate from recipient matching; the published-vendor, service, area, selected-ID and offer checks remain. |
| `src/account.js`, `src/business-access.js` | Allows active-company enquiry list/detail/notification screens through the subscription UI gate, matching existing server read access. Staff action permissions and paid writes remain enforced. |
| `tests/platform-admin.test.mjs` | 19 focused in-memory/VM/mock tests. No real database socket or external provider is used. |

The public-listing policy is not indiscriminately bypassed. Publication calls the same existing `commercial_public_allowed(company,'storefront')` function used by the public view. Its existing enrolled-company exception allows a free storefront. A legacy/company policy that denies public storefront access still fails closed; no subscription is assigned to solve that failure.

Receiving an enquiry is separated from operating paid CRM. A published eligible free business can receive a request; replying, preparing quotations and other operational writes retain the existing OS/feature/role gates. The retained enquiry UI may show such actions; their server rejection before subscription is intentional. This task does not make full business software free.

## Routes

| Purpose | Route |
| --- | --- |
| Existing login | `/#/distributor/login` using an already granted account |
| Admin dashboard | `/#/platform` |
| Pending applications | `/#/platform?queue=onboarding` |
| Active approved companies | `/#/platform?queue=approved` |
| Rejected/returned applications | `/#/platform?queue=returned` |
| Pending listings | `/#/platform?queue=marketplace` |
| Published flags | `/#/platform?queue=published` |
| Company detail | `/#/platform/company?id=<company-id>` |
| List/detail APIs | `GET /api/platform/companies`, `GET /api/platform/companies/<company-id>` |
| Review API | `POST /api/platform/companies/<company-id>/actions` |

The returned queue includes existing rejection/return history and withdrawn marketplace states, including owner withdrawals. It is a review-management queue, not a new permanent rejection state. The published queue shows stored publication flags; actual public visibility also requires all public-view predicates. These queue labels do not certify business quality.

## Verification actually performed

| Check | Result | What it proves |
| --- | --- | --- |
| `node --test --test-isolation=none tests/platform-admin.test.mjs` | **19 passed, 0 failed, 0 skipped** | In-memory transitions, actual handler control flow with mocked queries, existing grant/permission/session checks, middleware denial, SQL scoping and VM-rendered UI. |
| `node scripts/check.mjs` | **1,788 passed, 0 failed** | Syntax/import/assets/dependency metadata. No SQL execution. Subsequent final UI/test changes also received focused syntax/test checks. |
| `node scripts/verify-master-local.mjs` | **180 passed, 5 failed, 0 skipped** across 185 tests | Existing fixed 28-specification unit/mock allowlist. **Regression suite is not green.** |
| `git diff --check` | Passed | Whitespace check, not Git mutation. |

Focused coverage: anonymous/CSRF denial; ordinary owner/customer lacking grant; missing action permission; revoked session; independent review; stale revision; activation separate from approval/publication; free-listing policy; missing readiness/history; correction reasons; audit transaction control-flow rollback; queue allowlist/bound search; selected-company request/notification; ineligible recipient rejection; recipient-scoped list/detail; read-only unpaid access versus blocked writes; admin/customer VM navigation and public-view static predicates.

The first default `node --test` attempt could not spawn a child process (`EPERM`). Focused tests used Node's no-isolation mode. Early focused runs exposed incomplete test-fixture handlers/VM globals; fixtures were corrected without weakening assertions. Final focused result is 19/19.

The safe allowlist needed child-process support for Node configuration tests. It was run twice: once for results, once to retain exact failure diagnostics in ignored `.verification/admin-regression.log`. Static output is in ignored `.verification/admin-static.log`.

### Existing regression failures left visible

1. `tests/boss-dashboard.test.mjs:53`: old Sales Booster “Coming soon” expectation.
2. `tests/commercial.test.mjs:17`: team-cap pending-invitation assertion.
3. `tests/legal-controls.test.mjs:10`: old legal/commercial proposal wording expectation.
4. `tests/sia-orb.test.mjs:5`: expected orb `control` method absent.
5. `tests/sia-orb.test.mjs:10`: expected click handler absent.

These same failure families were recorded in the prior webhook reliability report. Their tests and relevant Boss/commercial/legal/orb implementation files are unchanged by this task (read-only Git diff confirmed). They were not silently suppressed or fixed outside scope. They still require triage before calling the whole application regression-clean.

## Unverified and blocked

- **Unverified:** real PostgreSQL persistence, query execution, view eligibility, lock/concurrency behavior, rollback durability and cross-company isolation under real requests. Mock fixtures cannot prove these.
- **Unverified:** browser-rendered responsive/keyboard behavior and real login/OTP/MFA. UI tests here render JavaScript in a VM; no browser acceptance or production session was used.
- **Unverified:** existing admin identities, XYZ's actual stored setup/coverage, running schema, deployed commit, worker state and actual marketplace visibility.
- **Blocked by operational scope:** approval/publication of XYZ and any live administrator grant. No production database was accessed.
- **Release limitation:** five existing safe regression failures remain. No release approval is implied.

No migration is necessary for these changes. Existing lifecycle states, review rows, audit JSON and service-area tables are reused. No migration file was created or changed and no migration was executed. The target's existing schema still must be checked and accepted under a separately scoped disposable-database/release task. No exact pending production migration list is known.

Dependencies were installed locally from the existing lockfile with lifecycle scripts disabled; `node_modules/` and `.npm-cache/` are ignored. Package manifests/lockfile did not change. No production database, Railway, Razorpay, live billing, environment file, Git index/history, push or deployment was changed.

See `MY_SOLAR_COMPANY_APPROVAL_WORKFLOW.md` for the human review procedure and `MY_SOLAR_CUSTOMER_MARKETPLACE_CONNECTION_REPORT.md` for the customer/recipient connection.
