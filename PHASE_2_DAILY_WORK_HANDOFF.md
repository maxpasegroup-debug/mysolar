# Phase 2 — Simpler onboarding and daily work

Implemented locally on 19 October 2026. Not deployed, committed or pushed by this phase. Existing uncommitted work was preserved.

## Architecture reused

The existing HTML/CSS/JavaScript application, Account session/cache and CSRF client, company onboarding endpoints, independent company activation process, operation forms and PostgreSQL business records remain authoritative. No dependencies, environment variables or database migrations were added.

## Delivered

- Dealer/distributor, installer/EPC and combined business presets use the existing distributor/installer/both values. Presets suggest services and rooftop availability only for unfinished business setup; saved choices remain intact. Suggestions require explicit saving.
- Company setup resumes at the first unfinished saved step. Optional website and visual-brand controls are expandable. Server validation errors expose collapsed controls for correction.
- Company summary explains the next action, independent review, active status or suspension. Activation does not imply marketplace approval, publication or connected domains.
- The distributor dashboard is now Today. Existing permission-scoped CRM follow-ups, assigned tasks, installation issues, services, collections and activity remain in place. Additional counts are below an expandable section.
- Role-aware getting-started guidance links to the existing first-customer, first-lead, quotation and invitation workflows. Completion uses real, authorized database counts. A quotation still requires an existing customer enquiry; no alternate quotation or authentication system was created.
- Persistent Add lead and Prepare quotation actions appear only for the relevant roles. Employees get assigned-work guidance. Empty priority lists explain their scope without claiming all business work is finished.
- Sidebar destinations are grouped into Customers, Quotations, Work, Money, Team and Company settings. Existing permissions filter each destination; inactive companies retain setup access. Existing SIA, company-switching, logout and mobile menu behavior remain available under their established rules.
- The invoice navigation permission now matches the backend finance.read permission. Hiding a destination does not replace backend authorization or subscription checks.

## Files changed for this phase

- `src/workspace.js` — new shared presentation and preset helpers.
- `src/organization.js` — guided setup and activation guidance; preserves earlier team eligibility work.
- `src/operations.js` — Today, first-work guidance and quick actions.
- `src/account.js`, `src/app.js` — role/lifecycle navigation and Today label.
- `server/operations/read.js` — role/tenant/assignment-scoped getting-started counts; preserves earlier employee eligibility filtering.
- `index.html`, `server/index.js`, `sw.js` — script inclusion, public static allowlist and static-cache version.
- `styles.css` — accessible details groups, preset cards and responsive first-work guidance.
- `tests/workspace-ui.test.mjs` — nine focused regressions.
- `tests/business-access.test.mjs` — actual owner counts and unauthorized employee-count suppression.
- `scripts/browser-check.mjs` — explicitly fictional owner/employee/setup fixtures and responsive checks; session refreshed when switching fixture roles.
- `scripts/prepare-staging.mjs` — reviewed runtime artifact list includes the new phase files; not executed to release infrastructure.
- `README.md`, this handoff — documentation.

## Local evidence

- `node --test tests/workspace-ui.test.mjs`: 9 passed.
- `node scripts/verify-postgres.mjs`: 191 tests passed, zero failures/skips. New disposable local PostgreSQL cluster; production credentials were not used. Existing migrations remained unchanged.
- `npm.cmd run build`: 720 static checks passed, zero failures. This project's build command performs syntax/import/assets/dependency checks.
- `node scripts/browser-check.mjs`: 109 checks passed, zero failures or uncaught browser exceptions. Covers 360, 390, 768, 1024, 1280 and 1440 pixels. New UI scenarios use explicitly fictional read-only responses; real database and authorization behavior is checked separately by integration tests.
- Evidence logs: `.verification/phase2-tests.log`, `.verification/phase2-static.log`, `.verification/phase2-browser.log`. Screenshots/results: `.verification/browser/`. These artifacts are ignored by Git.

## Manual acceptance after an authorized release

Use an approved trial company and individual employee accounts. Do not share passwords.

1. An unfamiliar owner signs up, registers a company, chooses its business type, completes setup, leaves and returns to verify saved progress, and submits for independent activation review.
2. After an authorized operator activates the company, the owner opens Today, saves a customer, adds a lead with a next follow-up, and invites an employee with the appropriate role.
3. A customer creates a real enquiry for the company. The owner opens it and prepares a private quotation draft, reviewing equipment, installation, price and tax fields before any explicit send action.
4. The employee accepts the invitation with their own account, opens assigned work, and completes a permitted task. Confirm finance and management controls are absent for restricted roles.
5. Repeat key tasks on a phone. Record any step requiring developer help, misunderstood labels or unsuccessful saves.

The unfamiliar-user completion gate remains pending this manual trial. Local automated checks do not establish production or usability acceptance. No automatic reminders, autonomous SIA work, new payroll, production changes, email delivery claims or later development phases are included.

## Next milestone

Release the reviewed Phase 2 change set through the authorized release procedure, then perform the owner/employee acceptance trial above before starting further development.
