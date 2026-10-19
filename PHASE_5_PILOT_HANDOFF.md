# Phase 5 — controlled business pilot support

Date: 19 October 2026.

**Decision: preparation complete; real pilot acceptance pending operator observations.** The operator will onboard the real company personally. The assistant has not created company/customer/employee accounts, sent invitations, changed subscriptions, published plans, charged anyone or deployed. This is not a production-readiness or commercial-viability approval.

## Architecture and scope

Reuse the existing account/company setup, activation review, role-bound invitations, Today, CRM, enquiries, versioned quotations, customer agreement/orders, projects, service and in-app reminders. No parallel onboarding system, business module, migration, dependency or environment variable was introduced.

Current Git branch inspected: `main`; latest observed commit `2f4622d`. Existing intended files were preserved. The assistant did not commit or push. The repository already contained the pilot support files when the final user-led scope adjustment was made; the latest changes update that scope and complete the historical-price regression. No reset or staging of unrelated work occurred.

## Deliverables

- `PILOT_PLAYBOOK.md`: operator-led first session, release evidence gates, genuine customer journey, daily observations, issue severity and proposed success measures. One company establishes a first case; repeatability requires additional independent cases.
- `pilot/OBSERVATION_TEMPLATE.md`: blank task, defect, consent and cost records. Store completed private copies outside Git; `.pilot/` is ignored, not encrypted.
- `PILOT_COMMERCIAL_REVIEW.md`: verified source-level FREE/ELITE/PRO behavior, current unknowns and cost/contribution evidence requirements. No renamed plans or final offers.
- `pilot/cohort.example.json`: empty approval/cohort template; no real identities or approval invented.
- `scripts/pilot-snapshot.mjs`: optional operator CLI, explicit connection and approved UUID cohort, completed bounded observation window, migration checksum match, repeatable-read/read-only PostgreSQL transaction. Reports allowed commercial fields, historical agreement snapshots, cohort journey/activity counts, company usage aggregates and worker heartbeat. Does not load `.env`, send messages, execute migrations or modify business data. No live snapshot was collected.
- `tests/pilot-snapshot.test.mjs` and `tests/pilot-snapshot.integration.test.mjs`: scope/date/identity/connection validation and database regression. The integration fixture uses existing business APIs for fictional terms and assignments, then checks that newer draft pricing does not overwrite historical agreed pricing.
- `.gitignore` and `README.md`: private evidence exclusion and current pilot status.

## Verified findings and open live evidence

Source inspection confirms no seeded canonical FREE/ELITE plan catalogue. PRO creation policy currently fixes INR 5,999/month plus tax, with dated active/trial eligibility and independent role/feature restrictions. Pre-billing does not imply an assigned FREE plan or payment; the initial INR 35,000 setup proposal is disabled. These are implementation facts, not proof of current deployed commercial settings. Assigned historical terms must be reviewed separately from current directory terms.

Railway CLI was retried after the operator confirmed authorization and still returned `Unauthorized`. Read-only review was authorized, but a usable authenticated session was unavailable. No live plan directory, company subscription, migration 012, worker heartbeat, provider usage or bill was inspected. No credentials were printed or requested. Do not treat the operator's reported deployment as independent verification of those items.

Actual Railway/Resend/SIA costs, support effort, SaaS receipts, willingness to pay and margins remain unknown. Provider public pricing is context only; it is not this business's bill. Distributor collections are not MY SOLAR SaaS revenue. Reminder delivery currently means in-app notifications, not implemented email/SMS/WhatsApp automation.

## Checks actually performed

- `node scripts/verify-postgres.mjs pilot-snapshot.integration.test.mjs pilot-snapshot.test.mjs`: **4 passed, 0 failed, 0 skipped**. Fresh disposable loopback PostgreSQL; stopped afterward. No Railway production access. Read-only SQL rejects a deliberate fixture write, failed collection rolls back, unrelated company content stays out, unknown token totals stay unknown, and historical pricing stays unchanged by directory versioning.
- `npm run build`: **802 static checks passed, 0 failed**, including syntax/import checks. This plain frontend has no bundler. Local check logs are ignored under `.verification/`.
- Git branch/status and relevant existing source, test fixture and commercial routes inspected. The full application/browser suite was not repeated for this script/documentation-only scope; earlier phase results are historical, not reruns in this phase.
- An initial historical-version test used an unsupported method/path and then the wrong response expectation; both test assertions were corrected to the existing `POST /plans/:id/versions` contract (200). No production application route was changed to satisfy the test.

No confirmed product defect was reported from a real participant; none is invented here. No production writes, migrations, environment changes, infrastructure creation, external messages or deployment occurred.

## User-led trial and single next milestone

The operator uses Get Started → Distributor, completes company setup and activation review, invites an employee through the existing supported flow, and records the first genuine lead/quotation. A consenting customer uses their own account; do not share staff credentials. Continue through actual agreement, installation and service events as they occur; unavailable genuine milestones stay unobserved.

For each blocked or confusing step, provide the page/step, expected result, actual result and error reference or a screenshot with sensitive details removed. Record assistance and time, repeat daily use, customer understanding and support effort. No real roster is needed in chat to perform your own onboarding. Later private-data inspection needs a specifically approved scope.

**Next milestone: complete and review the first user-led real-company onboarding and connected customer transaction observation, fix reproduced blockers, then decide whether to extend the pilot.** The Phase 5 completion gate remains open until actual adoption and cost/offer evidence support that decision. No next feature phase begins automatically.
