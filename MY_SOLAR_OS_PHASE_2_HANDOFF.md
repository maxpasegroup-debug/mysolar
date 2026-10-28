# MY Solar OS Phase 2 - local catalogue-to-sales integration

26 October 2026. Local implementation only. Phase 1 was reviewed and its local gate passed before Phase 2 application/schema changes. No commit, push, deployment, production migration/data access, credential change, service provisioning or real email/invitation was performed. Customer dashboard and original logo are preserved.

## Review and starting state

Initial branch main at a6ee999, locally tracking origin/main, with no staged, unstaged or untracked work. This differs from the attachment's outdated statement that Phase 1 was uncommitted. No fetch or remote-state claim was made. Read MY_SOLAR_OS_PHASE_1_REVIEW.md for PASS/FAIL/BLOCKED/NOT VERIFIED findings and migration 033 release requirements.

Phase 1 reproduced: 403 automated/database tests, 938 browser checks and 1323 static checks passed. Initial browser draft-retention assertion raced a retained template status message; a revised selector needed correction for an implicit submit button. Final full rerun passed. Only the test wait changed during review; no Phase 1 product rewrite was required. These counts describe different check types and must not be added as if all were integration tests.

MY_SOLAR_OS_PHASE_2_PLAN.md was saved before migration/schema changes. It records inspected capabilities, gaps, migration dependencies and verification boundaries.

## Capabilities reused, without rebuilding

| Requirement | Existing implementation reused | Phase 2 change / evidence |
| --- | --- | --- |
| Eight approved master categories | Migrations 004/022, central catalogue records, discovery groups, operator-only administration | No new categories/products/prices seeded. Existing identity/idempotency/admin tests rerun; new integration checks eight distinct stored groups. |
| Multiple sellers per product | distributor_offers unique per company/product, shared master catalogue | Kept. New quote tool searches only this company's actual eligible published offers. |
| Seller prices, tax, stock and coverage | Existing validated offer edit/review/publication and service-area APIs | No competing stock/price store. Snapshot stores the seller-provided state at capture time; not live stock/reservation. |
| Marketplace search and PIN filtering | Existing published-only projections and recorded coverage/PIN filters | Reused unchanged, including truthful loading/empty/error states and existing real-data integration/browser checks. No distance inference, fake listing or customer-dashboard redesign. |
| CRM and qualification | Existing contact/enquiry links, unique company/enquiry lead, pipeline and role profiles | Qualification is now enforced on direct quote create/edit/send when the stored company policy requires it. |
| Quote calculations and review | Existing exact integer-paise engine, revisions, review/discount controls and permission checks | Preserved. Stored product/offer provenance is distinct from negotiated quote amounts. |
| Lead-to-quote trace | Existing enquiry/company relationship | Draft/issue captures the actual linked lead on the server; tenant/enquiry-qualified foreign key. Internal lead ID is omitted from customer quote serialization. |
| Quote-to-order | Existing order service, idempotency, company locks, uniqueness and confirmation | Reused. Sources flow into immutable terms/order-item snapshots; retry/concurrent-key and confirmation tests pass. |
| Audit/auth/tenancy | Existing session, origin/CSRF, withCompany, effective profiles, commercial guards and audit | No duplicate auth, role, tenant or audit system; quote draft/save audits include validated source references. |

## New source flow

The distributor quotation editor offers Choose my seller offer beside the existing catalogue/manual-entry choices. GET /api/companies/current/quotation-sources requires quotations.manage and the existing active-company/tenant/entitlement checks. It returns bounded, searchable, paginated public-safe fields from the current company's eligible offers. Quotes staff do not receive offer-administration authority or private seller notes/costs.

Selecting an offer copies actual product details, unit, recorded price when present, tax reference and exact offer revision. A request-price offer leaves the price blank. The user still reviews scope, overall tax treatment, price and discounts before saving. Source selection does not send a quote, reserve stock, accept an order or receive payment.

The request sends product ID and optional offer ID/revision, not trusted snapshot JSON or company/role claims. Server validation rejects extra snapshot payloads, foreign/unpublished/stale new offer selections and mismatched currency/unit. Trusted source fields are explicitly allowlisted from published projections. Canonical product reads are row-locked for consistent capture. Existing captured references can retain their original snapshots during draft edits/revisions even after a listing changes; historical availability is never treated as current stock.

Quotation prices can be negotiated independently of the recorded source offer price. Existing quote review and line-discount policy apply; no new price-floor, margin approval or price-parity guarantee is claimed. Tax and technical/warranty information remain supplier/distributor-provided, not independently verified.

The distributor quote detail shows recorded sources and, for CRM-authorized staff, a link to its actual source lead. An enquiry-linked CRM lead offers the existing quotation workflow. Manual leads without a received enquiry do not silently create a customer/enquiry: the existing quote flow requires a genuine received enquiry. Existing manual agreed-order workflows remain available under their own documented agreement/authorization rules.

## Qualification and privacy

The old policy guarded lead-stage advancement but did not guard a direct quotation draft request. The shared quotationLead server check now enforces saved requirement/site address and a non-lost actual linked lead whenever qualification_required is enabled, for draft create/update and issue. It derives identity using the authenticated company and enquiry; the browser cannot select an arbitrary source lead.

A telecaller profile still cannot draft quotations or use the source tool; quotations.manage remains mandatory. Read-only and foreign-company access remain denied. Customer quote serialization removes source_lead_id and private review fields. Public-safe product/offer snapshots do not include private_notes, internal costs, company management records or unrelated customer data. Existing customer ownership and quotation privacy remain authoritative.

## Confirmed frontend defects fixed

New browser coverage proved that the quote editor's hidden input named id shadows HTMLFormElement.id. The prior form.id checks could skip preview and submission. The distributor quotation editor now uses matches('#purchase-builder') for its preview, source action and submit dispatch. Customer form handlers/dashboard behavior were not redesigned.

The existing saved-template picker used a resource key different from the route without an inline mount, so it could remain in a loading state. It now mounts its result/error into its own host using the existing Account.resource mount options. A delayed-template browser fixture proves the typed quote reference and selected seller source survive completion. No global account renderer or customer dashboard rewrite was introduced.

Failed saves retain the draft and source selection. Clearing the catalogue link clears seller provenance too. No action reports success on a mocked rejected write.

## Migration 034 and release risks

server/db/migrations/034_quotation_sources.sql depends on the complete 001-033 chain, particularly marketplace offers (004), quotations (005/006), CRM tenant keys (006) and qualification policy (023).

It adds:

- quotation_versions.source_lead_id with a foreign key matching lead, company and enquiry;
- quotation_line_items.company_id, derived for legacy lines solely from their existing version parent, NOT NULL with version/company FK;
- optional offer_id/offer_revision with company/product-qualified FK and paired positive-revision constraint;
- product_snapshot and offer_snapshot JSON objects defaulting to empty objects for old lines;
- supporting unique keys/indexes for tenant-qualified references and source lookups.

No historical product facts, prices, availability, sources or lead assignments are invented. The upgrade test compares every old quotation/version/line field before and after, verifies correct parent-derived company, empty new snapshots, unchanged checksums and repeat-run no-op behavior. Historical migrations, including 033, are unchanged.

Only disposable test databases were migrated here. Production status remains NOT VERIFIED. An authorized release must inspect actual migration history/checksums, obtain a verified recovery point and coordinate the new backend/frontend/worker schema expectations. Older quote writers omit the new mandatory company_id; therefore migration 034 is not a safe independent rollout while old writers continue serving requests. Quiesce affected quotation writes or use a separately reviewed compatible transition during the coordinated release. Index/backfill lock duration must be measured on an authorized representative dataset; no production downtime estimate is claimed.

There is no automatic down migration. A code rollback to pre-034 writers cannot be assumed compatible. Preserve data and migration history; prefer reviewed roll-forward and use a tested recovery procedure if necessary. Earlier migration 030/032 reconciliation blockers, if pending in the actual target, must still be resolved through authorized review rather than bypassed.

No new environment variables, dependencies, public provider resources or domain configuration are required. Existing mail/encryption secrets were not printed or changed. Service worker v25 and its private-data exclusions remain unchanged; modified JS is already served by the existing network-first static allowlist.

## Exact changed-file summary

| File | Change |
| --- | --- |
| MY_SOLAR_OS_PHASE_1_REVIEW.md | Reproduced review, findings, test correction and local/release gates |
| MY_SOLAR_OS_PHASE_2_PLAN.md | Capability reuse, verified gaps and migration plan before schema edits |
| MY_SOLAR_OS_PHASE_2_HANDOFF.md | This implementation/release report |
| server/db/migrations/034_quotation_sources.sql | Additive source relationships, snapshots and tenant constraints |
| server/purchase/sources.js | Controlled source choices, trusted capture and qualification check |
| server/purchase/company.js | Source API and quote lifecycle integration |
| server/purchase/validation.js | Optional validated offer ID/revision, strict payload allowlist |
| server/purchase/service.js | Stored source reads, private lead removal and audit metadata |
| server/operations/orders.js | Trusted sources for manual agreed lines and preservation through existing order snapshots |
| src/purchase.js | Distributor source picker, lineage display, ID-clobber-safe quote dispatch |
| src/operations.js | Enquiry-linked lead quotation action |
| src/release-tools.js | Inline saved-template completion/error without draft replacement |
| tests/os-phase2-sales.integration.test.mjs | Ownership, source history, qualification bypass, privacy, calculations and duplicate-order/confirmation tests |
| tests/os-phase2-sources-upgrade.test.mjs | Legacy data preservation, tenant constraints, checksums/repeat |
| tests/people-sales.integration.test.mjs | Reopen the intentionally lost fixture lead before subsequent qualification-controlled quotation tests; no weakened policy |
| scripts/browser-check.mjs | Phase 1 wait correction and new source/payload/delayed-template/draft-retention checks |

Protected customer dashboard/marketplace/language files and logo remain unchanged against the initial HEAD. Final comparison evidence is recorded under .verification/os-phase2-preservation.json. No user data or provider credentials appear in these files.

## Commands executed and verified results

Phase 1:

- git status --short; git branch -vv; git diff --stat; git diff --cached --stat; git log -1 --oneline.
- node scripts/verify-postgres.mjs: 403 passed, zero failed/skipped.
- node scripts/browser-check.mjs: final 938 passed, zero failed. Initial wait failures and correction are recorded in the review.
- node scripts/check.mjs: 1323 passed, zero failed.

Phase 2:

- Focused source integration: seven passed, zero failed; log .verification/os-phase2-source-test.log.
- node scripts/verify-postgres.mjs: 411 passed, zero failed/skipped; .verification/os-phase2-postgres.log. Includes catalogue idempotency, actual-data PIN/offer filtering, category administration, ownership, customer/onboarding regressions and migration chain/checksums.
- Focused local browser: 15 source checks passed after confirming/fixing form ID shadowing; .verification/os-phase2-source-browser-fixed.log. This overlaps the final browser suite.
- Final node scripts/browser-check.mjs: 955 passed, zero failed/uncaught exceptions; .verification/os-phase2-browser-final.log. Includes six viewport widths, named-ID controls, late template arrival, real fixture source copying and safe failure behavior. Fictional intercepted data is not live delivery or production evidence.
- Final node scripts/check.mjs: 1333 passed, zero failed; .verification/os-phase2-static-final.log. git diff --check passed. Protected-file comparison passed for all five dashboard/marketplace/language/logo files.

Initial focused runs exposed fixture issues (the existing seller price enum is price_available, not fixed; an intentionally lost lead must be explicitly reopened under the new qualification rule) and the confirmed UI defects above. They were not represented as passes. Final full database tests passed without removing security checks.

## Remaining blockers and next action

No known unresolved critical local code issue is accepted as passing. Actual production deployment/migration state, sender/worker delivery, alerts, recoverable backups, scale/lock duration, real customer/employee usability and external integrations remain NOT VERIFIED in this local-only task. No staging or infrastructure is created to bypass that boundary.

Manual source facts/stock are supplier-provided. Manual leads still need a real received enquiry for the quotation path; they are not auto-converted into fabricated customer requests. Payment processing, automatic purchase, stock reservations, procurement automation and unsupported company types are not introduced.

Precise next action: review the local diff, Phase 1 review and migration 034 release plan, then obtain a separate authorization for coordinated release/acceptance with current migration/backup evidence. Do not treat a push as proof of migration success or production readiness. No commit, push or deployment was executed. Do not start another OS phase automatically.
