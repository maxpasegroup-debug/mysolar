# Solar OS — business presets (Phase 2)

Date: 27 October 2026. Repository: `D:\APPS\WEB\mysolar`.

## Decision

Implemented locally over the existing onboarding and OS. This is not a production deployment or release approval. Existing foundation work, including migration 034 and its release restrictions, remains intact. No Railway access, production database operation, environment change, commit, push or deployment was performed for this phase.

## Supported workflows

| Saved preset | Existing marketplace classification | Existing workflows used | Workspace emphasis |
| --- | --- | --- | --- |
| Equipment distributor (`distributor`) | `distributor` | Leads, customer enquiries, quotations, orders, stock, purchases, invoices and collections | Sales, then stock/purchases |
| Dealer / retailer (`dealer`) | `distributor` | The same existing sales and inventory services; separate saved setup identity | Customer sales first |
| Installer / EPC (`installer`) | `installer` | Leads, enquiries, quotations, projects, field tasks, materials, service and recorded finance | Work/service first; Projects & installations terminology |
| Combined sales & installation (`both`) | `both` | Existing sales and installation services together | Both sets of tools prominent |

Support means these existing workflows and route/API boundaries were inspected and exercised locally. It does not imply a separate retail POS, wholesale pricing engine, manufacturer/supplier onboarding, payroll, automatic utility approval or unrestricted EPC automation. Supplier/manufacturer is not a selectable company preset. Existing supplier records within procurement remain available to authorized employees.

Public marketplace filtering deliberately retains its three historical classifications. A dealer remains in the sales/distributor classification; no additional public search filter is advertised.

## User experience and persistence

- One existing three-stage journey: account, company, workspace. Four exclusive, keyboard-accessible radio cards replace the two business-type checkboxes. Combined business remains an explicit choice.
- Company creation and the resumable profile form persist the preset. Session membership data supplies the active company's preset to its workspace; switching company switches presentation with the existing authenticated context.
- Unsaved service suggestions follow the preset. Existing saved service selections and rooftop settings are never silently rewritten. Services and coverage still require an explicit save and review.
- Today identifies the business preset. Its launchpad prioritizes relevant existing workflows. Navigation retains Today, Sales, Work, Customers and Company.
- Less relevant authorized links move under **Other permitted tools**. They remain real links; the currently open record's route remains directly visible. No records are hidden or deleted by changing the preset.
- Existing lifecycle and marketplace review/publication rules remain authoritative. Profile edits continue through the existing revision and review logic; a change may withdraw publication for review. Presets do not activate a company, publish a storefront or prove payment.
- SIA remains optional. No new AI execution or external integration was added.

## Security and compatibility

- `resolveBusinessPreset` validates an allowlisted preset and its matching historical business type. Unsupported, inherited-property and contradictory inputs fail safely.
- Creation retains verified business-account identity checks and server-controlled ownership. Editing retains session-derived tenant context, permission checks, CSRF/origin protection, lifecycle checks, commercial controls, company row locking and optimistic revisions.
- A preset grants no role permission, entitlement, subscription, financial visibility or employee authority. Existing APIs continue enforcing their own rules even when called directly.
- Existing profiles have a nullable new field and fall back to their historical business type. Older clients may omit the new field. When their classification is unchanged, a cached profile form preserves an explicitly saved preset, including dealer.
- Creation audit includes the chosen type/preset. Profile audit records previous/new values inside the existing transaction. Failed and conflicting edits do not leave a successful audit or partial profile update.
- No customer dashboard, customer locale, marketplace dashboard or logo files were changed. Their SHA-256 values were checked against the start-of-phase baseline stored privately in `.verification/business-presets-protected.json`.

## Database

New sequential migration: `server/db/migrations/035_business_presets.sql`.

- Adds nullable `company_profiles.business_preset`.
- Adds a CHECK constraint binding the four presets to the three existing `business_type` values.
- Leaves historical SQL files unchanged. No new table, permission system, tenant store or dependency.
- Current manifest has **35 entries**. Migration 035 checksum: `2691e26ab0d6aacb70b087696ac82783192e2c383527b8c3edc6b1cce0b92609`.
- The isolated rehearsal applied through 034, retained a legacy installer profile, applied 035 and verified repeat migration execution without changing ledger checksums.
- Migration 035 was **not applied to production**. The release must include the matching code and migrations. Do not deploy this session projection against a schema lacking 035.

## Files changed in this phase

New:

- `server/setup/presets.js`
- `server/db/migrations/035_business_presets.sql`
- `tests/business-presets.integration.test.mjs`
- `MY_SOLAR_OS_BUSINESS_PRESETS_HANDOFF.md`

Modified:

- `server/tenancy/routes.js`: validated preset creation and audit.
- `server/setup/validation.js`: optional backwards-compatible preset input.
- `server/setup/routes.js`: transactional save, audit and legacy-form preservation.
- `server/setup/service.js`: saved preset in authorized setup responses.
- `server/auth/routes.js`: preset in authenticated company memberships.
- `src/workspace.js`: four choices, defaults, terminology, navigation emphasis and launchpad ordering.
- `src/account.js`: same company-creation journey and new preset payload.
- `src/onboarding.js`: business-only explanatory copy.
- `src/organization.js`: resume/save and reviewer display of the preset.
- `organization.css`: responsive cards and accessible focus/touch styling.
- `tests/workspace-ui.test.mjs`: updated preset tests and menu authorization/preservation cases.
- `scripts/browser-check.mjs`: retained prior checks; added four choices, six widths, keyboard checks and screenshots.

All other pre-existing modified/untracked work was preserved. No staged files were created.

## Verification evidence

These runs use generated local PostgreSQL clusters or local fictional browser fixtures, never production credentials/data. Mail/provider integrations are disabled or mocked.

| Actual run | Results | Evidence |
| --- | --- | --- |
| Full `node scripts/verify-postgres.mjs` regression | **441 passed, 0 failed, 0 skipped**, exit 0 | `.verification/business-presets-full.log` |
| Final focused PostgreSQL + workspace regression | **27 passed, 0 failed, 0 skipped**, exit 0 | `.verification/business-presets-final-focused.log` |
| Final workspace unit tests | **17 passed, 0 failed, 0 skipped**, exit 0 | `.verification/business-presets-ui-final.log` |
| Static syntax/import/asset checks | **1,361 passed, 0 failed**, exit 0 | `.verification/business-presets-static-final.log` |
| Responsive browser checks | **991 passed, 0 failed**, actual process exit 0 | `.verification/business-presets-browser-final.log` |

Counts overlap; do not add them together. The final focused run added migration/legacy/concurrency assertions after the full run. Final unit coverage added menu-preservation assertions afterward. Subsequent application changes were business-only explanatory/reviewer copy; their JavaScript syntax was checked.

Database-backed cases include all four create/resume paths, fixture-controlled activation and dashboard access, persisted profiles, publication/activation independence, revision conflicts, change audits, invalid preset rejection, tenant spoofing, CSRF/origin rejection, unchanged services/roles/subscriptions, ordinary sales-employee denial, constraint rollback and concurrent conflicting edits. Native radio selection and arrow-key behaviour were checked at 360, 390, 768, 1024, 1280 and 1440 pixels. Browser APIs are intercepted fictional fixtures; browser checks alone do not prove database authorization.

The first focused run expected HTTP 403 for an inactive company; the existing backend correctly returned HTTP 409. The test expectation was corrected without weakening the backend. An earlier browser run reported passing checks but PowerShell treated expected error-scenario stderr as a failed shell invocation. The final browser invocation redirects stdout/stderr separately and explicitly checks the actual process exit code. Error scenarios continue to be tested.

A later screenshot repeat stopped with 719 passed checks and one timeout in an existing report-filter scenario: its diagnostic screen showed the offline-submit guard. The fixture runner now explicitly maintains an online emulated network between its deliberate offline tests, rather than inheriting an uncontrolled host network state. The application offline-submit guard was not changed. Drawer transitions are allowed to settle before preset inspection, and screenshots are centered on the actual preset choices.

`git diff --check` passed for the files changed in this phase. Git emitted existing Windows line-ending/ignore-file permission warnings, not conflict markers or whitespace errors.

## Release boundary and next step

Local implementation is complete. Real-business acceptance and production release remain distinct gates. The existing migration 034 cutover requires the coordinated maintenance/write-fence, backup/recovery and matching-code procedure from the foundation handoff. Include 035 in that reviewed release; do not simply push main to trigger the automatic deployment.

No production migration commands were executed, and no claim is made that this phase is live. Next implementation milestone: the next explicitly requested Solar OS phase. Do not automatically start it.

## Commit/push reference — review first, release hold remains

These are instructions only; no staging/commit/push was executed. The worktree also contains intended prior foundation changes. Review them together before preparing a release commit; do not accidentally omit their source files or migration 034, or add private `.verification` evidence/archives.

```powershell
cd D:\APPS\WEB\mysolar
git status --short
git diff --stat
git diff
```

After explicitly reviewing all intended files and excluded private material, the normal commands are:

```powershell
git add -- .
git diff --cached --stat
git diff --cached
git commit -m "Configure Solar OS business presets and preserve release foundation"
```

**HOLD publication.** `git push origin main` is the eventual push command, but must not be run until the migration 034/035 coordinated release and deployment are separately authorized. A local commit does not authorize the automatic Railway release.
