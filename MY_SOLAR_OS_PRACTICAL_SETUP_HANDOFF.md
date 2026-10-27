# Solar OS — Phase 3: practical company setup

27 October 2026. Implemented locally in `D:\APPS\WEB\mysolar`.

## Outcome and boundaries

Owners now have a persistent setup guide at `/#/distributor/setup?step=guide`, linked prominently from the existing setup progress controls. It connects the existing company details, public identity, services/coverage, catalogue/offers, team, record-import and communication workflows. Existing onboarding, roles, tenant context, commercial policy and review/publication rules remain authoritative.

Local implementation and verification are complete. This is not a production release or evidence that an unfamiliar real owner has passed manual acceptance. No Railway access, production data/configuration change, external email, infrastructure creation, deployment, Git staging, commit or push occurred in this phase. Do not automatically start another phase.

## What changed

1. **Seven-step company guide.** Server-derived progress shows saved company details, public identity, services/coverage, offers, team, opening-record review and communication review. Links use real existing routes and the current user's navigation permissions. Inactive companies see an explanation when an operational module requires activation. The guide works across desktop and mobile.
2. **Resumable decisions.** Owners can choose product offers, no offers needed or defer; invite a team, work alone or defer; start with new records, acknowledge reviewing existing records or defer. Communication review is an explicit checkbox. Choices persist in PostgreSQL with the actor and timestamp. Deferred steps remain incomplete; actual existing offers/employees take priority over a “not needed” choice.
3. **Truthful status.** Company activation, marketplace review and public-profile publication have separate visible states. The checklist does not activate a company, publish offers, change a subscription, prove payment or certify a business. Setup decisions do not withdraw an existing publication because they change no public content. Actual profile/branding edits continue using the existing review rules.
4. **Existing services and coverage.** Owners follow the existing saved services form and genuine coverage records. Company address is not automatically inferred as service coverage. Phase 2 business presets remain intact, including installer businesses choosing not to list product offers.
5. **Reviewed imports.** Existing contacts/leads CSV preview and confirmation services are reused. Customer imports create company contact records, not login accounts or invitations. Blank CSV-heading downloads help prepare files; no invented example customers are added.
6. **Duplicate fixes.** Preview now reuses `duplicateContacts`, including normalized phone matching and email matching. It detects either duplicate identifier within a contact file. Distinct lead titles for one customer are allowed; repeated contact/title lead rows are rejected or recognized as existing duplicates. Existing customers remain untouched.
7. **Confirmation safeguards.** Contact/lead duplicate checks run again during confirmation. If records changed after preview, `409 IMPORT_CHANGED` requires a new preview and rolls back the whole transaction. Same-batch retries remain idempotent. Company locking protects competing batches from creating duplicate customers. Expiry, actor/company binding, digest and permission checks remain.
8. **Frontend import context.** The import screen checks captured account/company context after reading a file, before sending a preview, after its response and before confirmation. A stale preview cannot be reused in a different company or account.
9. **Opening-record guidance.** Existing customer import, inventory and permitted finance screens are linked. Choosing “start fresh” or “reviewed” creates no financial entry, stock quantity or transaction. Review is explicitly an owner acknowledgement, not an independently verified reconciliation.
10. **Communication review.** The guide reports only a configuration-presence boolean and invitation mode. It never reveals credentials or claims actual delivery. In-app reminders still require approval and a running worker. Existing public contact settings and reminder controls remain the places to configure them. Automated SMS/WhatsApp are unavailable; saving the guide sends nothing.

## Schema and API

New migration: `server/db/migrations/036_practical_setup.sql`. SHA-256: `3b61d684e57ea2ee1add535a3c88bbaba7ae252cbba9a73b18107ebdbf2da90c`.

`company_setup_choices` has a company primary/foreign key, constrained offer/team/opening choices, communication-review boolean, updating user foreign key and timestamp. Existing companies need no fabricated backfill; an absent row returns undecided defaults. Historical migrations were not edited. The normal checksum/advisory-lock runner applied the complete history and repeat runs in isolated local databases only.

- `GET /api/companies/current/setup/guide`: authenticated `company.setup.read`; tenant derived from the session. Uses existing setup data and permission-filtered counts. No financial balances, private CSV rows, arbitrary record URLs or provider secrets are exposed.
- `PUT /api/companies/current/setup/decisions`: authenticated `company.onboarding.manage`, CSRF/origin, strict validation, existing company lock and optimistic company revision. Suspended companies cannot save. Existing audit records contain previous/new choices and a required review reason. Concurrent saves cannot silently overwrite each other.
- Existing import endpoints retain their ownership, entitlement, actor, digest and transaction rules. No second import, permission, audit, onboarding or financial system was introduced.

## Files created

- `server/db/migrations/036_practical_setup.sql`
- `server/setup/guide.js`
- `tests/practical-setup.integration.test.mjs`
- `MY_SOLAR_OS_PRACTICAL_SETUP_HANDOFF.md`

## Files extended

- `server/setup/routes.js`: guide read, decision validation/persistence and audit.
- `server/sales-tools.js`: trusted duplicate matching, lead distinction and confirmation revalidation.
- `src/organization.js`: guide layout, progress entry link, permission-aware actions and reviewed-decision form.
- `src/release-tools.js`: explicit import instructions, CSV-heading downloads and account/company-bound previews.
- `organization.css`: responsive seven-step cards and status presentation.
- `scripts/browser-check.mjs`: retained all prior work; added guide/heading controls, six-width checks and screenshots.

All pre-existing intended changes from the foundation and business-presets phases remain. Protected customer-dashboard, locale, marketplace-dashboard and logo hashes still match the saved baseline. No customer-dashboard redesign was included.

## Actual verification

| Run | Actual results | Local evidence |
| --- | --- | --- |
| Full isolated PostgreSQL/HTTP/unit regression | **452 passed, 0 failed, 0 skipped**, exit 0 | `.verification/practical-setup-full.log` |
| Final practical-setup PostgreSQL tests, including additional concurrency cases | **11 passed, 0 failed, 0 skipped**, exit 0 | `.verification/practical-setup-final-focused.log` |
| Final responsive browser suite | **1,011 passed, 0 failed**, actual browser-runner exit 0 | `.verification/practical-setup-browser-final.log` |
| Final static syntax/import/asset suite | **1,369 passed, 0 failed**, exit 0 | `.verification/practical-setup-static-final.log` |

Counts overlap and must not be added. The full run preceded the final additional concurrency assertions; those ran separately against another disposable cluster. Final frontend refinements were syntax checked and included in the final static/browser run. Browser APIs are fictional intercepted fixtures; database tests separately exercise actual Express routes and PostgreSQL persistence. No live email delivery or real-company usability claim is made.

Database coverage includes persistent choices, revision conflicts, audit entries, no fabricated invoices/publication, tenant spoofing, CSRF/origin, sales-employee denial, restricted auditor read access, normalized phone/email duplicates, multiple legitimate leads for one customer, no records before confirmation, actor/tenant binding, retries, stale-preview atomic rollback, expired previews and concurrent same/different-batch confirmations. Deferred choices remain deferred while a real existing employee continues to count as a saved team. The initial added concurrency test incorrectly expected zero completed steps despite creating that employee earlier; its expectation was corrected without altering product permissions or progress rules.

Guide layout, states, limitations and viewport fit were checked at **360, 390, 768, 1024, 1280 and 1440 pixels**. CSV-heading controls were checked for presence and keyboard focus; native CSV downloads were implemented but no manual Excel import/export acceptance is claimed. Local screenshots: `.verification/browser/practical-setup-390.png` and `practical-setup-1440.png`. Mobile guide screenshot inspected. `git diff --check` passed for the edited tracked files; existing Git line-ending/ignore-file permission warnings remain informational.

## Remaining limits and release requirements

- Bulk stock and financial opening-balance import are explicitly unavailable. Use supported existing workflows and reconcile source records; do not describe a checklist acknowledgement as a posted opening balance.
- A guide review does not prove email delivery, worker health, recipient consent or completed employee acceptance. These remain separate operational/acceptance checks.
- Catalogue products and seller offers retain their separate approval/publication controls. No fake products, prices, inventory, counts, subscription terms or activation statuses were added.
- The new explanatory guide is English. Existing operating-language settings and partial translations are preserved; complete translation of the new guide is not claimed.
- Manual owner/employee acceptance with the user's real pilot remains separate. No real company was onboarded by this task.
- Migration 036 and its matching code are **not live**. Keep the established migration 034 cutover/write-fence, recovery and release restrictions. Include migrations 035 and 036 and matching application code in that coordinated release; the new guide cannot run against a database lacking 036.
- Do not push main merely to publish this local work: Railway's automatic deployment/migration path still requires the separately authorized coordinated release.

## Commit/push reference

No commands below were executed. First review all intended prior work; private `.verification` material and `.env` must remain ignored. Do not commit a partial release that omits the preceding foundation files.

```powershell
cd D:\APPS\WEB\mysolar
git status --short
git diff
git add -- .
git diff --cached --stat
git diff --cached
git commit -m "Add practical company setup guide and strengthen reviewed imports"
```

**Hold publication until the coordinated 034–036 release is authorized.** The eventual command is `git push origin main`; it is not authorization to deploy or migrate production.
