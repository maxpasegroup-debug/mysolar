# Product catalogue and marketplace redesign

Implemented locally on 23 October 2026. No commit, push, deployment, production migration, secret change or production-data access was performed.

## Architecture and files

The existing plain-JavaScript frontend, Express APIs, PostgreSQL catalogue, company offers, authentication, permissions, review lifecycle and quotation/order services are retained.

- `src/solar-marketplace.js`: visual category discovery, search, optional filters, service-location controls, published seller offer previews, guided enquiry/help and buying guide. Uses existing I18n registration, approved illustrations and catalogue APIs.
- `src/marketplace.js`: routes customer discovery to the new presentation; retains distributor catalogue, product details, seller offers, review and administration workflows. Adds operator-only category presentation controls.
- `src/app.js`: authenticated product/search/detail views use the shared customer shell, including the existing logo, language selector, notifications and active Solar Products menu. Public visitors retain the public shell.
- `src/experience.js`: language changes redraw marketplace copy while retaining unsent search/filter/location fields in memory.
- `marketplace.css`: responsive four-column category grid, product cards, location/filter/help panels and four-step guide. Two category columns on smaller screens, touch-friendly controls and visible keyboard focus.
- `server/marketplace/public.js`: public category metadata, accurately scoped offer counts and up to three separate eligible seller previews per product. Full seller offers remain on the existing product page.
- `server/marketplace/service.js`: active category metadata, discovery-group filtering and availability/seller filters.
- `server/marketplace/validation.js`, `server/marketplace/admin.js`: validated optional descriptions, ordering and localized category labels, using existing platform catalogue permissions and audit transactions.
- `server/customer/experience.js`: authenticated customer-owned latest enquiry location and existing approved platform support contact. No precise geolocation inference or automatic location filtering.
- `server/db/migrations/022_marketplace_discovery.sql`: additive discovery metadata, constraints, index and repeat-safe taxonomy seeding.
- `index.html`, `server/index.js`, `sw.js`: script registration, explicit static allowlist and cache version.
- `tests/marketplace-discovery.integration.test.mjs`, `scripts/browser-check.mjs`: database/API/governance regressions and browser fixtures covering six viewport widths.

## Eight managed categories

Canonical customer categories are stored records, not decorative-only cards:

| Customer category | Stable existing/new slug | Handling |
| --- | --- | --- |
| Solar Panels | `solar-panels` | Existing ID reused |
| Solar Inverters | `inverters` | Existing ID reused |
| Solar Batteries & Storage | `batteries` | Existing ID reused |
| Complete Solar Systems | `complete-solar-systems` | New taxonomy record if missing |
| Solar Water Heating | `solar-water-heating` | New taxonomy record if missing |
| Mounting Structures & Accessories | `mounting` | Existing ID reused |
| Solar Electrical Components | `cables-protection` | Existing ID reused |
| Solar Lighting & Pumps | `solar-pumps` | Existing ID reused; legacy `solar-lighting` remains discoverable through this group |

Existing service and other categories remain available through filters and administration. No product is reparented or deleted. Existing activation states and technical schema revisions are preserved during taxonomy seeding. New systems/heating records have optional specification schemas. Parent/child editing remains in the existing operator tools. No new roles or supplier registration paths were introduced.

The additive `discovery_category_id` relationship is a public navigation grouping, not a replacement for product-category foreign keys or tenant authorization. Selecting the lighting/pump group includes legacy lighting products; disabling that canonical group prevents its grouped filter from returning them. Their original category relationships remain intact.

Category descriptions, ordering and localized text remain operator-managed. The existing category-save workflow still increments its revision and requires affected definitions to be re-saved, as stated in the admin screen; it does not silently reapprove listings.

## Real data and customer actions

- Product results come from the existing published-product projection. Draft, inactive, hidden or schema-stale definitions remain excluded.
- Seller previews use the existing public-offer and eligible-vendor projections. Review, company publication, product revision and service-area requirements remain authoritative.
- Offer counts and previews share selected location, price, service and availability scope. Prices remain separate by seller, unit, currency and tax treatment. Unknown prices remain unknown; zero is never substituted for missing data.
- Preview count is bounded to three sellers per product. See Sellers opens the existing full product/specification/offer view. It does not rank sellers or combine unlike packages.
- Delivery, installation, warranty and tax uncertainty is explicit; supplied availability is not independently verified live stock. Cards without approved images show a useful fallback.
- Search uses the established product-name/brand/model search. The interface removes internal “matching definitions” terminology from customer discovery.
- PIN input requires an Indian six-digit PIN. Matching uses recorded seller coverage and existing reviewed PIN-to-region mappings; neither a company address nor a customer city implies service coverage or distance.
- An authenticated customer's latest saved enquiry location is offered explicitly and is not automatically applied. Other customers cannot retrieve that location. Search/location state stays in the route and unsent form values remain in memory, not a new private browser store.
- Quote links preserve actual product and service-location context and use the existing authenticated enquiry workflow. Existing seller selection, quotation comparison and order confirmation are retained. Buttons never fabricate a completed enquiry or purchase.
- One contextual help panel provides guided enquiry and the approved support contact. No duplicate sidebar help card was restored.

## Zero results: confirmed finding and limits

The former heading displayed the `total` from the eligible published-product query. Category existence is not product availability. Zero results can reflect no published products, visibility/schema/publication restrictions, or selected filters. This task did not inspect production records, so the exact production-data cause was not established. The redesign supplies truthful empty, error and retry states; it does not manufacture inventory to make the page look populated.

## Translation and storage limitations

All new UI copy uses the existing translation interface; operator-provided category names/descriptions can store supported-language values. Malayalam and Hindi include translated main headings, categories and important controls, with English fallback for remaining guidance. The existing thirteen-language selector is preserved. Full regional-language translation and native-speaker review remain outstanding; no claim of complete translation is made.

Actual product-image upload/storage is not configured by the existing catalogue. Definitions continue to accept validated raster URLs from configured trusted hosts, managed by catalogue operators. Illustrations are reused decorative category art, not photos of purported inventory. No new upload service or second product store was added.

Seller-created missing product definitions and category requests do not have an existing controlled submission service. They remain an operator-assisted catalogue task; sellers cannot create arbitrary public definitions/categories or bypass independent offer review. No fake submission-success flow was introduced.

## Verification evidence

- Before edits: full disposable-PostgreSQL regression suite **270 passed, 0 failed, 0 skipped** (`.verification/marketplace-baseline.log`).
- Final database/API suite: **279 passed, 0 failed, 0 skipped** (`.verification/marketplace-release-tests.log`).
- Final browser acceptance: **460 passed, 0 failed** (`.verification/marketplace-acceptance-browser.log`). Desktop and mobile screenshots were also visually inspected after correcting category-image framing. Widths: 360, 390, 768, 1024, 1280 and 1440 pixels.
- Final static checks: **1064 passed, 0 failed** (`.verification/marketplace-acceptance-static.log`). `git diff --check` passed.
- New integration coverage includes eight-category uniqueness/reuse, inactive category preservation, old IDs/revisions, empty catalogue integrity, repeat SQL execution, upgrade through 021 to 022, legacy lighting discovery, operator-only metadata validation with rollback, distinct seller offers, null/actual prices, scoped counts, search/PIN validation, customer location ownership, withdrawn storefronts, inactive product categories and cross-company offer update rejection.
- Existing suites continue to cover enquiry ownership, linked quotations, comparison, customer/business operations, CSRF, authentication and tenant isolation. Browser checks use explicitly fictional fixtures and do not prove production email delivery, real inventory, or business acceptance.
- Browser testing found and fixed a location-panel helper shadowing the browser URL object. Test selectors were updated for the new error panel and asynchronous catalogue interactions wait for data before clicking.

All database changes and migration verification were performed only in fresh disposable local clusters. Historical migrations were not rewritten. The local migration chain now includes 022 and the existing virtual role migration. Production migration status was not inspected or changed.

## Before an authorized release

Migration 022 must be reviewed and applied through the supported migration runner as part of a separately authorized release, with the established backup/recovery safeguards. The new server queries require its columns. Do not deploy this backend against an unmigrated production database. Populate only genuine operator-approved definitions and seller-approved offers; the taxonomy alone is intentionally not purchasable stock.
