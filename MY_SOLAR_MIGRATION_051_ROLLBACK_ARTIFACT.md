# MY SOLAR — Migration 051 rollback artifact

Status: prepared and tested locally; **not approved for production execution**.

## Scope

Migration `051_reviewed_locality_coverage.sql` adds the `postal_localities` table, its active lookup index, and nullable `company_service_areas.locality_reference_id`. It does not alter existing companies, enquiries, quotations, approvals, or coverage rows. Existing locality-like legacy rows remain unbound and therefore ineligible for locality-aware matching.

The reviewed local checksum is:

```
051_reviewed_locality_coverage.sql
68a8b9a712149f1b922fc2dcab75e8c3be4c13167de485982927644f56e677b6
```

## Tested local evidence

On 2026-11-19, an isolated loopback PostgreSQL cluster applied the complete migration chain and ran:

- migration 051 preservation of legacy identities, coverage, reviews, enquiries and quotations;
- named-locality matching and invalid-location rejection;
- company-coverage and locality-reference withdrawal concurrent with final routing;
- product-first final routing; and
- a custom-format `pg_dump` / `pg_restore` drill.

All 13 tests passed. The restore drill compared the complete migration ledger and row-count/content hashes for 146 tables. It used fictional data only.

## Approved rollback principle

Migration history is immutable. Do **not** delete `postal_localities`, drop `locality_reference_id`, edit `schema_migrations`, or restore a pre-051 application revision against a database that records 051. The application readiness check intentionally rejects an older migration manifest.

The safe rollback is forward-only:

1. Stop the release if migration 051 itself fails. The migration runner executes each migration in a transaction, so its own failed transaction rolls back.
2. If 051 succeeds but the new quotation user interface fails, release only a separately tested **051-compatible** application fallback. It must retain 051 in its migration manifest and preserve strict matching. No such production fallback artifact is currently deployed or approved.
3. If a reviewed locality reference proves wrong, an independent operator can use the existing audited locality import endpoint with that exact record set to `active: false`. This removes locality eligibility without deleting history.
4. If Shamin&Company coverage proves wrong, its authorised business owner must replace the complete saved area list with the approved list, then request fresh marketplace review and publication. Never delete customer enquiries or revise historic quotations.
5. A full production database restore is an incident decision, not a feature rollback. It risks discarding legitimate writes made after the backup.

## Preconditions before production use

- Verify the production `schema_migrations` entry for 051 equals the checksum above.
- Confirm a fresh backup for the correct Railway Postgres service, then restore it to an identified disposable target and verify its migration ledger, constraints, and application reads.
- Build and test the schema-051-compatible fallback before declaring code rollback available.
- Capture before-images of the postal mapping, locality reference, current company coverage list, current company revision, marketplace state, and publication state.
- Use separate approval for code deployment, reference-data import, business coverage change, marketplace review/publication, and any live customer transaction.

## Current limitation

The audited locality endpoint supports activation and deactivation. The audited postal mapping endpoint currently only activates/upserts a mapping. If a postal mapping itself must be withdrawn, halt locality coverage and use the approved incident process; do not issue direct production SQL. A postal deactivation API or a documented controlled operator procedure is required before claiming full reference-data rollback coverage.
