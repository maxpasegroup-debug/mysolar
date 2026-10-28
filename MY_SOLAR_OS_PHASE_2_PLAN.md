# MY Solar OS Phase 2 local plan and migration dependencies

26 October 2026. Planning follows the documented PASS local gate in MY_SOLAR_OS_PHASE_1_REVIEW.md (403 automated, 938 browser, 1323 static). Production release remains unverified and unauthorized. Do not commit, push, deploy, use production data or modify customer dashboard/logo assets.

## Existing capabilities to reuse

- Migrations 004 and 022: eight approved discovery groups, stable persisted category IDs, central definitions, idempotent taxonomy seeding, operator-only catalogue/category administration, schema revisions and publication gates.
- marketplace/company.js: one company-owned offer per master product, multiple companies per product, actual supplied prices, tax, availability, maintained stock and service coverage, review/publication, immutable product ownership and revision control.
- marketplace/public.js and service.js: published-only product/offer/vendor projections, search, category, PIN/recorded service-area/availability filters, pagination and safe public field allowlists. Existing marketplace/customer dashboard presentation is preserved.
- operations/crm.js and people-sales.js: contacts, enquiry-linked leads, qualification, configurable pipeline, duplicate checks and owner-reviewed role profiles. Telecaller and sales access already use effective grants.
- purchase/company.js: received-enquiry ownership, private drafts, versioning, exact integer calculations, review/discount rules and explicit issue/withdraw transitions.
- operations/orders.js: authorised immutable order snapshots from issued fixed quotations, explicit customer/external confirmation, company lock plus idempotency and unique company/quotation/reference constraints. No replacement order/payment path.

## Verified implementation gaps and coherent changes

1. Quotation line selection copies published catalogue text in the browser, but there is no durable server-captured catalogue/own-seller-offer provenance. Add optional seller offer references, trusted snapshots and a quotation-source picker using only eligible real own-company offers. Negotiated quotation price remains distinct from the recorded offer price; no live stock reservation or price guarantee is implied.
2. Quotations and CRM leads already share an enquiry/company relationship (crm_leads has UNIQUE(company_id,enquiry_id)), but the draft version does not capture the responsible source lead. Derive the optional source lead on the server; never trust a browser company/user/lead claim.
3. Mandatory lead qualification currently guards lead-stage changes, but the direct quotation-draft API can bypass that path. Enforce the stored company qualification rule when drafting/revising/sending linked enquiries. If qualification is required, require the actual linked lead and saved requirement/site address. Do not invent an enquiry/customer for manual leads.
4. Expose source/lead trace only in distributor UI and existing protected APIs, retain customer-facing snapshots' public allowlist and add focused tests. Existing customer dashboard files and marketplace visuals remain unchanged.

## Migration plan - before schema edits

Proposed next migration: 034_quotation_sources.sql. Dependencies: complete 001-033 history, quotation_versions/line items (005/006), composite catalogue/offer/company relationships (004), CRM lead unique tenant keys (006) and sales policy/qualification (023).

Add nullable source_lead_id on quotation_versions with a company-qualified foreign key to crm_leads. Add nullable seller offer provenance and JSON snapshot fields on quotation_line_items, with a version/company foreign key and company-qualified offer/product relationship. Existing lines remain valid; do not backfill invented historical prices, product facts, availability or lead assignments. New reads handle empty legacy snapshots.

Only the supported migration runner may apply this in disposable local test databases during this task. Do not edit historical SQL or apply production migrations. Deployment must coordinate matching web/mail-worker schema expectations and a verified recovery point. A code rollback is schema-compatibility review, not a down migration or record deletion.

## Verification plan

Run targeted integration coverage for catalogue group identity/idempotency, offer ownership/publication/revision changes, foreign-company source rejection, trusted snapshot persistence, price calculations, source/lead trace, telecaller/sales restrictions, mandatory qualification direct-API bypass, version immutability and duplicate order retries/concurrency. Then run the full isolated PostgreSQL, existing browser and static suites. Compare protected customer/logo files against the initial revision. Record failures honestly; do not declare production readiness.
