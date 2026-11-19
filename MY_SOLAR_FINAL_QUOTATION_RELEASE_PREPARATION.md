# MY SOLAR — Final quotation release preparation

Prepared: 2026-11-19. This is a local release-readiness review. No production database query, import, migration, deployment, push, commit, or live quotation was performed.

## Decision

| Release item | Decision | Why |
| --- | --- | --- |
| Product-first application deployment | **NO-GO until release preflight completes** | Local tests are positive, but the current Railway revision, production migration ledger, backup/restore evidence, and tested schema-compatible code fallback are not freshly verified. The checkout also has two uncommitted test/localization fixes. |
| Payyanur postal/locality activation | **NO-GO** | The independent reviewer, production before-images, production backup/restore evidence, and approved Shamin coverage change/republication are still required. |

The application can technically be deployed separately from reference-data activation. Without the reviewed reference records and a newly saved Named locality declaration, it will safely show that the Payyanur location cannot yet be verified and will not route a quotation to Shamin&Company. A deployment alone does not activate quotation requests for Payyanur.

## Verified local state

- Branch: `main`.
- Reviewed revision: `58c7114739f4988ae043220b0493d44251f5e5ca` (`origin/main`), `feat: Implement product-first quotation marketplace journey`.
- Remote: `https://github.com/maxpasegroup-debug/mysolar.git`.
- Current uncommitted code changes: `scripts/browser-check.mjs` and `src/customer-locale.js`. This release report and the migration rollback artifact are also new, untracked documentation files.
- `git diff --check` passes. The two code changes are limited to current-dashboard browser assertions/fixtures and Malayalam/Hindi translation of `Street address · optional`; no API, database, matching, authentication, or quotation behavior changed.

The stale dashboard selector was a genuine test defect. The browser harness was checking a retired `data-customer-home` dashboard even though the current customer dashboard renders `.cd-dashboard-v2` and `.cd-next-step`. The assertions now check the current dashboard. The same review found and corrected a real localized-label omission in the new quotation form.

## Checks completed locally

| Check | Result | Evidence |
| --- | --- | --- |
| Static build/release check | PASS | `npm run check` completed successfully. This repository's build command is the static syntax/import/asset checker. |
| Unit regression suite | PASS | `npm test`: 266 passed, 0 failed, 69 database-dependent tests skipped without a database. |
| Product-first browser acceptance | PASS | 24 passed, 0 failed, including product selection, reviewed recipient selection, no-invented-map behavior, desktop/mobile fit, and no uncaught browser exceptions. |
| Full legacy browser harness | RISK RECORDED | 1,173 passed and 27 failed. The failures are in existing onboarding/SIA/automation selectors and flows, not the product-first quotation route. They are release risk outside this quotation scope and must be triaged before a whole-product release. |
| Disposable PostgreSQL release set | PASS | 13 passed, 0 failed: product-first matching, migration 051 preservation, locality matching, concurrency withdrawal, and fictional backup/restore. |
| Fictional backup/restore | PASS | Custom-format dump/restore verified all 146 tables and the full migration ledger in a new disposable local database. |

## Quotation isolation and security

The new interface is on `/#/customer/enquiry/new`. It uses the existing customer quotation APIs and does not introduce a parallel enquiry, identity, or distributor system.

- `POST /api/customer/enquiry-matches` uses the shared `areaMatch` eligibility predicate.
- `POST /api/customer/enquiries` reuses the same predicate through `eligibleRecipients` inside the server transaction. It locks selected companies and reviewed postal/locality references before recipient rows are created.
- A changed State, District, PIN, locality, product, service, publication state, or coverage state invalidates stale selection. The server does not trust the browser preview.
- Named locality requires the precise active `postal_localities` reference. Whole district and Exact PIN remain separate explicit scopes.
- Customer reads remain customer-scoped. Business reads require that company to be the enquiry recipient; a different company receives 404 in the tested flow.
- The locality concurrency test verifies that coverage or locality withdrawal serializes with final submission. A request that loses coverage cannot be delivered after withdrawal wins.

## Migration 051

The local migration manifest contains 52 entries. Migration 051 has checksum:

```
68a8b9a712149f1b922fc2dcab75e8c3be4c13167de485982927644f56e677b6
```

It is additive: creates `postal_localities`, adds a nullable reference from `company_service_areas`, and adds an active lookup index. It does not import postal data or auto-upgrade a legacy locality row. The runner records SHA-256 checksums and `/readyz` compares the installed ledger to the application manifest.

The checked-in Railway deployment configuration runs `npm run db:migrate` as its pre-deploy command and checks `/readyz`. Production compatibility is still **unverified** until an authorised operator compares the live migration ledger, PostgreSQL version, table sizes, active transactions, and 051 checksum. The migration may require an `ALTER TABLE` lock window.

The tested forward-only rollback plan is in [MY_SOLAR_MIGRATION_051_ROLLBACK_ARTIFACT.md](MY_SOLAR_MIGRATION_051_ROLLBACK_ARTIFACT.md). There is no approved pre-051 image rollback because an older image would reject the applied migration ledger.

## Railway and production boundaries

I could verify the Git revision, but not the live Railway revision or backup state. The signed-in Railway browser surface is unavailable in this environment, so no production state is inferred from local Git. Historical reports mention an earlier Railway SHA; that is not fresh evidence that `58c7114` is live.

Before release, an authorised operator must privately verify the Railway project `mysolar`, production environment, application service, and Postgres service; then record the exact release revision and current backup identity. Do not include connection strings or credentials in this evidence.

## Prepared Payyanur reference activation

The proposed geographic reference is intentionally narrow:

- Postal mapping: `670307`, `Kerala`, `Kannur`.
- Named locality: `Payyanur`, PIN `670307`.
- Source to review: [Kerala postal directory](https://cee.kerala.gov.in/pgmonline2020/public/pdf/postoffices.pdf), which lists Payyanur in Kannur with PIN 670307.

This reference only enables the customer to choose the reviewed locality. It does **not** mean every address sharing 670307 is served. Shamin&Company must separately confirm, save, and have reviewed a `scope: locality` declaration for Payyanur.

### Proposed audited API calls — not executed

These requests require a current independent `platform_admin` with `catalogue.manage`, a CSRF-protected authenticated session, and a recorded independent source review. The reference reviewer must not have an active Shamin&Company membership and must not be its creator.

1. Import the postal mapping:

```json
POST /api/platform/locations/import
{
  "rows": [{ "pin": "670307", "state": "Kerala", "district": "Kannur" }],
  "source": "https://cee.kerala.gov.in/pgmonline2020/public/pdf/postoffices.pdf",
  "reason": "Independent review: Payyanur, Kannur, PIN 670307. Geographic reference only; no company coverage decision."
}
```

2. Only after that succeeds, import the locality:

```json
POST /api/platform/localities/import
{
  "rows": [{ "pin": "670307", "name": "Payyanur", "active": true }],
  "source": "https://cee.kerala.gov.in/pgmonline2020/public/pdf/postoffices.pdf",
  "reason": "Independent review: Payyanur named locality at PIN 670307. This does not grant whole-PIN or company coverage."
}
```

Both calls create audit events. They are not a substitute for company coverage or marketplace approval.

## Shamin&Company coverage approval workflow

After the references are active, and only after the business confirms it serves the named locality, an authorised Shamin&Company owner should use the existing `PUT /api/companies/current/service-areas` workflow. It must submit the complete intended coverage list at the current company revision and include:

```json
{
  "scope": "locality",
  "label": "Payyanur, Kannur",
  "state": "Kerala",
  "district": "Kannur",
  "pin": "670307",
  "locality": "Payyanur"
}
```

The endpoint resolves and binds the reviewed locality ID server-side. Saving coverage replaces the company area list, advances the company revision, and requires fresh marketplace approval and publication. It must not be used to add Whole district or Exact PIN coverage merely to make matching pass.

An independent platform reviewer, who is neither company creator nor current member, must then perform the existing `approve_marketplace` and `publish` actions. Their reasons and revisions must be recorded. Company identity, historic reviews, enquiries and quotations remain intact.

## Exact approval checklist

### A. Application deployment approval

- [ ] Review and either include or discard the two local uncommitted test/localization fixes; then verify a clean, pinned commit.
- [ ] Verify Railway project/environment/service, source branch, and target release SHA.
- [ ] Confirm a fresh production backup and complete an authorised restore into a disposable target.
- [ ] Run the read-only production migration-ledger check and confirm migration 051 checksum above.
- [ ] Test a schema-051-compatible fallback release; do not use a pre-051 image.
- [ ] Resolve or formally accept the 27 unrelated full-browser failures.
- [ ] Obtain explicit approval for the Railway deployment, which will run the pre-deploy migration command.
- [ ] Post-deploy: verify `/readyz`, the exact app revision, customer and distributor login, product-first quotation UI, and no regression in the existing enquiry inbox/quotation view.

### B. Postal/locality reference-data approval

- [ ] Nominate an eligible independent operator with `catalogue.manage`.
- [ ] Capture production before-images for PIN 670307, Payyanur locality, Shamin current coverage, company revision, marketplace status and publication state.
- [ ] Confirm a verified production backup/restore result and the operational recovery contact.
- [ ] Obtain source-review approval for the two exact records above.
- [ ] Approve the postal import and locality import as separate audited operations.
- [ ] Verify public location APIs return the new reference without claiming it is Shamin coverage.
- [ ] Get Shamin&Company's explicit owner confirmation and separate approval for the complete Named-locality coverage list.
- [ ] Obtain independent marketplace re-review and publication.
- [ ] Do a separate approved live acceptance transaction if a real enquiry, notification, or quotation is required.

## Remaining blockers

1. Fresh Railway deployed-revision and production backup status are unavailable to this local environment.
2. Live `schema_migrations` checksum validation for 051 has not been performed.
3. A schema-051-compatible production fallback has not been built and rehearsed.
4. The independent production reference reviewer has not been nominated or verified.
5. Production before-images and the exact current Shamin coverage/revision have not been read.
6. The postal mapping API has no corresponding audited deactivation operation; locality deactivation is supported.
7. The wider browser harness has 27 unrelated onboarding/SIA/automation failures.

No production action is ready to execute without the approvals above.
