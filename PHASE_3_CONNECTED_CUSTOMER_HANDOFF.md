# Phase 3 — Connected customer journey

Implemented locally on 19 October 2026. Production was not accessed or changed. No deployment, commit or push was performed. Existing uncommitted work from earlier phases was preserved.

## What changed

The existing marketplace, customer accounts, enquiry distribution, quotation versions/comparison, immutable order snapshots, explicit agreement, installation milestones, invoice records, notifications and service workflows remain authoritative. The frontend remains the existing HTML/CSS/JavaScript application with Express and PostgreSQL. No new dependencies, migrations, environment variables or external resources are required.

### Discovery and location continuity

- PIN entry is visible in the main marketplace search form; detailed state/district/service-area options remain available.
- Product and storefront offer APIs now apply recorded location coverage when a location filter is supplied. They retain the existing public approval/publication and commercial eligibility gates.
- Product cards, distributor links and quotation-request links retain selected state, district, PIN and named area. The enquiry form pre-fills state/district/PIN without submitting it. Storefront filtering retains the selected location.
- Exact recorded coverage remains the rule. No GPS position, live inventory, nearest-distance ranking or PIN-to-district mapping is invented. A broad state/district declaration cannot establish coverage of an unknown PIN.

### Connected records

- New screen: `/#/customer/journey?id=<enquiry UUID>`.
- New authenticated read API: `GET /api/customer/experience/journeys/:id`.
- The screen connects an owned enquiry to latest issued quotations, shared orders, projects, invoices and service requests. Each stage links to the existing record/action screen; absent stages explain what happens next.
- Records must match the enquiry's quotation, company, order and owned customer contact. Private order/invoice drafts are excluded. Each section is bounded to 20 records; the screen explains this limit and retains the main module lists for all records, including standalone purchases.
- Enquiries, quotations and customer dashboard entries link to the request tracker. Operational records link back to the authorized source quotation/request and related order where present.
- Distributor quotations show existing related orders. The order-draft shortcut requires a current, fixed, tax-confirmed quotation without an existing non-cancelled order. Backend duplicate and agreement checks remain authoritative.
- Preference, customer confirmation, distributor acceptance, installation progress and recorded collections remain separate. Opening a screen performs no business action or payment.

### Quotation clarity and notifications

- Comparison explains why totals require matching quantities, equipment, tax, delivery, installation scope and warranty. There is no fabricated vendor ranking.
- A zero installation charge explicitly does not establish that installation is included. Missing scope/terms still require distributor clarification. An explicitly supplied 0% tax rate displays as 0%.
- Enquiry copy now describes the implemented order workflow instead of saying orders are a future phase.
- Unified notification links open a specific quotation when the event includes a version, otherwise its enquiry or operational record.
- Notification lists and mark-as-read requests recheck current permissions and record access. Customer feeds exclude private drafts and restrict quotation notifications when quotation access is revoked.
- Delivery remains the existing persisted in-app system. This phase adds no scheduled reminder worker, SMS/WhatsApp delivery or transactional-email claim.

### Documents and exports

- New authenticated API: `GET /api/customer/experience/exports/:kind/:id?format=json|csv`, where kind is quotations, orders, projects, invoices or service.
- Customer document and operational screens offer JSON and CSV downloads of saved, authorized records. Exports include an explicit record-format identifier, timestamp, appropriate snapshot/line fields, milestone status and invoice collection information.
- Export queries recheck current customer grants and ownership; quotation/order/invoice drafts remain private. Unknown query fields/formats are rejected. Downloads are attachments with private/no-store and nosniff headers; IDs determine filenames.
- Export fields are explicitly allowlisted. Private staff notes, document/evidence URLs, internal agreement notes, provider credentials and unrelated customer/company information are excluded. CSV cells quote content and neutralize spreadsheet-formula prefixes.
- Integer paise are retained. Invoice balances use the actual recorded collection aggregate. Collection rows are bounded to 1,000; total count and truncation are explicit, while balance totals cover all recorded entries.
- Successful exports create an existing-system audit event containing record identity, kind and format, not complete record content.
- Uploaded-file storage and file downloads remain unavailable. Existing document references are private metadata, not downloadable files. JSON/CSV exports do not claim to be certified tax documents, bank confirmations or payment receipts.

## Files added

- `server/customer/records.js`: authorized journey and generated-export routes.
- `server/customer/record-export.js`: export projections, exact values and CSV escaping.
- `tests/connected-journey.integration.test.mjs`: dedicated disposable-schema fixture.
- `tests/helpers/connected-journey.mjs`: complete customer/distributor API journey.
- `tests/customer-record-export.test.mjs`: export privacy, formula escaping, precision and bounded-history checks.
- This handoff.

## Existing files extended

- `server/index.js`: route registration.
- `server/customer/experience.js`: accurate document capabilities and quotation notification targets.
- `server/marketplace/public.js`: product/storefront coverage filtering.
- `server/operations/customer.js`: authorized source/parent links.
- `server/operations/notifications.js`: permission/ownership-aware feed and read actions.
- `server/purchase/company.js`: tenant-scoped related orders.
- `src/app.js`: request-tracker route.
- `src/experience.js`: tracker, parent links and generated-record downloads.
- `src/marketplace.js`: visible PIN and retained location context.
- `src/purchase.js`: enquiry location, quotation clarity, tracker and order links.
- `src/operations.js`: version-specific notification navigation.
- `marketplace.css`, `experience.css`: responsive PIN controls and wrapped export actions.
- `sw.js`: public static-cache version updated; private API/export responses remain outside its allowlist.
- `scripts/browser-check.mjs`: fictional customer journey/discovery/comparison/export UI checks.
- `tests/helpers/isolated-app.mjs`: test client supports CSV responses and existing JSON responses.
- `scripts/prepare-staging.mjs`: reviewed local runtime artifact list extended; no release infrastructure was created or used.
- `README.md`: current phase link/results.

## Final local verification

- `node scripts/verify-postgres.mjs`: **203 tests passed; zero failures/skips**. A disposable loopback PostgreSQL cluster was created and stopped. Existing fresh/upgrade/checksum/repeat migration checks ran; historical migrations were not changed.
- `node scripts/browser-check.mjs`: **141 checks passed; zero failures or uncaught browser exceptions**. New scenarios cover journey, documents, comparison, PIN discovery and preserved enquiry location at 360, 390, 768, 1024, 1280 and 1440 pixels. New UI scenarios use explicitly fictional read-only responses; real workflow/authorization behavior is tested separately against PostgreSQL.
- `npm.cmd run build`: **746 static checks passed; zero failures**. This project's build command checks syntax, imports, public assets and dependencies.
- Full API journey: public coverage discovery; two issued quotations for one enquiry; customer preference; immutable quotation-backed order; duplicate conversion denial; explicit customer and distributor agreement; eight ordered installation milestones and handover; issued invoice; idempotent service reporting and service closure; consistently linked IDs; exact amounts; private drafts and other-user access denied.
- Additional checks: CSRF/origin rejection, unsupported export formats and identity query fields, private document/staff-note exclusion, customer permission revocation for exports/tracking/notifications, same-origin download URLs, public offline fallback and private cache exclusions.
- Initial expanded tests revealed shared-fixture interference and an incorrect expected document-create status. The journey now uses its own disposable schema and expects the actual HTTP 201 response. Final runs above pass; no business/security rule was weakened.
- Logs: `.verification/phase3-tests.log`, `.verification/phase3-browser.log`, `.verification/phase3-static.log`. Browser results/screenshots are in `.verification/browser/`. These local artifacts are ignored by Git.

## Manual acceptance after an authorized release

1. Using an approved trial company with genuinely published offers and maintained coverage, have a customer search their PIN, open a product/distributor and confirm the enquiry retains the intended location.
2. Send that enquiry to two eligible distributors. Each issues its own quotation. Compare equipment, scope, exclusions, tax and validity; ask a clarification question before choosing a preference.
3. The selected distributor prepares an order from the current agreed quotation. The customer reviews/confirms its exact terms; the distributor separately accepts. Confirm preference alone did not create or confirm an order.
4. Record installation milestones against that order. The customer follows the original request into installation progress and sees only shared updates.
5. Issue the linked invoice, review any manually recorded collections and download a JSON/CSV copy. Confirm no payment-provider verification is implied.
6. The customer reports an issue from the confirmed order. The distributor triages, assigns, resolves and closes it with explicit customer updates. Verify private staff notes remain hidden and the original request shows the service status.
7. Repeat key steps on a phone and try a second customer's account to confirm records remain private.

Local evidence establishes the connected flow under controlled fixtures. Real customer/distributor usability and production acceptance still require this authorized manual trial. No live payments, uploaded-file service, geocoding, automatic communications or new production-readiness claim is included.

## Next milestone

Release the reviewed changes through the authorized process and complete the connected customer/distributor manual trial before starting Phase 4.
