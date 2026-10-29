# SIA-guided company setup

Date: 29 October 2026. Baseline: main, acc533b; working tree was clean on inspection.

## Implemented locally

The existing business-account registration and email verification remain the entry boundary. After sign-in, a new company uses three guided steps:

1. **Company:** name, login email selected by default with an editable alternative, supported business preset, optional HTTPS website, emergency contact and a linked WhatsApp number. Existing India/state/district controls remain available; required location errors open their collapsed section.
2. **Products:** ten product/service choices and an optional Other description. At least one choice or an Other description is required. These are business capabilities, not published product definitions, seller offers, prices or stock.
3. **Team:** thirteen planned job titles across leadership, sales/customer care, projects/field work, stock and finance/review. Select positions and headcounts, or start alone. The owner reviews the plan before company creation.

SIA uses a replaceable CSS avatar placeholder with floating, blinking and orbit motion, contextual step responses and a live selection summary. Reduced-motion preference disables its animation. This is deterministic guided assistance, not a model response or a live human conversation. No provider credentials, audio, generated avatar artwork or external requests are needed.

The existing transactional company creation now optionally saves the plan atomically. Its existing user lock, retry operation identity, duplicate checks and immutable request fingerprint also cover the validated plan. Legacy requests without a plan retain their original fingerprint shape. A failed transaction must not report a created company.

Saved plans can be reopened through **Set up with SIA / My workspace plan**. Draft and active companies can edit; pending-review and suspended companies receive a read-only view. Saving a plan returns to the existing Boss dashboard. The setup dashboard shows blueprint counts; the active dashboard's Team section distinguishes planned positions from actual active employees.

## Security and operational boundaries

- All planned titles map to existing staff roles; no planned title grants owner/platform authority. For example, a planned managing-director title currently maps to the existing Supervisor access role and says so on screen. This does not advertise a newly implemented managing-director permission bundle.
- These choices do not create employee accounts, reporting-manager links, permission profiles, memberships or invitations. Existing Team workflows remain responsible for those records, reviewed role restrictions and subscription capacity.
- Business presets continue to guide the existing workspace. This change stores a blueprint, not a new employee-dashboard engine or an automatically running company.
- No reminder rules, jobs, communications, payments or subscriptions are activated by this setup. Existing approved automation workflows remain separate.
- New companies remain unpublished drafts. Full legal/address/public-identity/coverage setup and authorised activation/publication remain required. The minimal wizard does not bypass these controls.
- Other product descriptions stay in the private company plan. They are not automatically promoted into the platform master catalogue; a platform-wide review/promotion UI is not included.
- Private contacts are available only through the owner-checked plan editor. Dashboard summaries select only product and planned-team fields. Audit metadata contains counts/revision, not private contact details or conversations.
- Existing session-derived tenant context, current membership/permission checks, CSRF/origin controls and commercial guards remain authoritative. Client-supplied company/role authority is not accepted.
- Existing-company edits use optimistic company revision checks inside the existing company-lock transaction. Website changes use the existing publication-withdrawal/review mechanism; private blueprint-only changes do not unpublish the company.
- No browser storage of company setup data was added. Back/forward within the wizard preserves the current form. Saved plans resume from PostgreSQL after a future authorised migration; an unsubmitted new-company form is not an autosaved account record.
- New setup copy is English. This work does not certify additional language translations.

## Files

New:

- `server/db/migrations/041_sia_company_plan.sql`
- `server/setup/sia-plan.js`
- `src/sia-company-setup.js`
- `sia-company-setup.css`
- `tests/sia-company-setup.test.mjs`
- `tests/sia-company-setup.integration.test.mjs`
- This handoff.

Modified:

- `server/tenancy/routes.js`: authenticated business catalogue endpoint and optional atomic creation payload.
- `server/setup/routes.js`: owner-only read/update editor and owner dashboard blueprint.
- `server/operations/boss-summary.js`: owner-scoped blueprint projection.
- `server/index.js`, `index.html`: explicit public asset registration and loading.
- `src/account.js`: company wizard entry and explicit payload serialization.
- `src/organization.js`: existing-company SIA setup route/navigation.
- `src/boss-dashboard.js`: SIA entry, saved blueprint counts and planned/actual distinction.
- `tests/boss-dashboard.test.mjs`: blueprint ownership and truthful dashboard assertions.
- `scripts/browser-check.mjs`: updated entry expectations plus SIA workflow, responsive, persistence-fixture, failure and accessibility scenarios.
- `scripts/verify-master-local.mjs`: added the new unit specification to the fixed safe allowlist.

## Verification actually performed

| Command | Actual result | Scope |
| --- | --- | --- |
| `node --test tests/sia-company-setup.test.mjs tests/boss-dashboard.test.mjs tests/workspace-ui.test.mjs` | 37 passed, 0 failed, 0 skipped; exit 0 | Pure validation, VM rendering and mocked scoped SQL; no PostgreSQL persistence proof |
| `node scripts/verify-master-local.mjs` | 136 passed, 0 failed, 0 skipped; exit 0 | Fixed unit/in-memory allowlist, forced loopback port-1 database and providers disabled; overlaps focused tests |
| `node scripts/browser-check.mjs` | 1,184 passed, 0 failed; browser process exit 0 | Real headless Chromium, local HTTP, fictional intercepted API records, no real database |
| `node scripts/check.mjs` | 1,498 passed, 0 failed; exit 0 | Syntax, imports, assets and existing static checks |
| `git diff --check` | Exit 0 | Whitespace checks |
| Protected customer dashboard/marketplace/logo diff | Exit 0, no changes | `src/customer-dashboard.js`, `customer-dashboard.css`, `src/customer-locale.js`, `src/solar-marketplace.js`, `assets/my-solar-solutions-logo.png` |

Browser checks include 360, 390, 768, 1024, 1280 and 1440px; email defaults, linked numbers, step validation, Other handling, role counts, retained Back navigation, confirmed-payload serialization, a rejected save retaining inputs, saved-plan fixtures, reduced motion, existing customer flows and no uncaught browser exceptions. Desktop and mobile screenshots were visually inspected after compact-number-field polish.

Local evidence:

- `.verification/sia-company-unit.log`
- `.verification/sia-company-regression-final.log`
- `.verification/sia-company-static-final.log`
- `.verification/sia-company-browser-final-ui.log`
- `.verification/browser/sia-company-team-1440.png`
- `.verification/browser/sia-company-team-390.png`

Earlier browser attempts exposed an obsolete old-layout assertion and errors in new test expressions; those were corrected. They are not treated as passing runs. A later run and the final polished run both returned 1,184/0. Test counts overlap and must not be summed as unique coverage.

## Database and release gate

Migration **041** adds one private `company_workspace_plans` table with company primary/foreign key, updater foreign key, JSON-object/size constraint and timestamp. No historical migration was changed. The existing migration manifest discovers sequential SQL files; no new migration runner was introduced.

**041 has not been executed. No database was created, seeded, restored or modified.** The prepared integration specification has not run. Real PostgreSQL transaction, persistence, concurrency, authorisation and migration compatibility still require a separately authorised disposable-database rehearsal. The prepared suite covers creation, invalid-role rejection, retry binding, one owner/no synthetic employees, cross-company context rejection, CSRF/origin rejection, revision conflicts, pending-review rejection and privacy of audit metadata. Additional concurrent request/recovery exercises remain part of the database release gate.

The app's readiness manifest will expect 041 once this code is released. Do not release this code against an unmigrated database. Before an authorised release, verify recovery evidence and the complete migration chain using the existing supported runner, then coordinate the database/application cutover. This report is not production-release approval.

No Railway access/settings changes, secret changes, production writes, deployment, infrastructure creation, Git index changes, commit, push, merge or rebase were performed.

## Commit/push commands for a later approved release

These are supplied for the owner's usual workflow, **not executed**. First complete the database rehearsal/release gate and confirm whether pushing main triggers deployment. Do not run the push as a substitute for migration approval. Review intended files and any newly introduced work before staging.

```powershell
git status --short
git diff --check
git add -- index.html scripts/browser-check.mjs scripts/verify-master-local.mjs server/index.js server/operations/boss-summary.js server/setup/routes.js server/tenancy/routes.js src/account.js src/boss-dashboard.js src/organization.js tests/boss-dashboard.test.mjs server/db/migrations/041_sia_company_plan.sql server/setup/sia-plan.js src/sia-company-setup.js sia-company-setup.css tests/sia-company-setup.test.mjs tests/sia-company-setup.integration.test.mjs MY_SOLAR_SIA_COMPANY_SETUP_HANDOFF.md
git diff --cached --stat
git commit -m "Add SIA-guided company and team setup"
git fetch origin
git merge origin/main
git push origin main
git status --short
```

If the merge reports conflicts, resolve and review both sides before continuing; do not force-push or discard work.

Single next milestone: authorise and complete the isolated PostgreSQL rehearsal of migration 041 and the new plan endpoints before any coordinated release.
