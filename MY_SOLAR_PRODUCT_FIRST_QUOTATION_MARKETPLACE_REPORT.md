# MY SOLAR Product-First Quotation Marketplace

**Status:** Implemented and verified locally. Not committed, pushed, deployed, or applied to production data.

## What changed

The customer route `/#/customer/enquiry/new` is now a product-first quotation journey:

1. The customer selects a published product or chooses **I am not sure yet**.
2. The customer enters the installation State, District, PIN and reviewed locality.
3. MY SOLAR checks the product/service, published marketplace status, and approved company coverage.
4. Eligible companies appear in a list. The customer opens the existing public profile at `/#/storefront/:companyId`, contacts the company using its published contact details, or selects it for a quotation request.
5. The existing final submission endpoint rechecks eligibility before saving the enquiry.
6. The existing Business OS enquiry and quotation workflow receives the request and provides the customer quotation view.

Product cards use real published product definitions and current published-offer counts. The interface does not invent ratings, live availability, addresses, distances, or map positions.

## Matching and safety

The server still uses the existing shared coverage predicate for recipient preview and final enquiry submission. It supports the existing approved scopes:

- Whole State
- Whole District
- Exact PIN
- Named locality

The final enquiry request still rechecks publication, product/service compatibility, active reviewed postal/locality references, and coverage. A customer cannot send a request merely because a company appears nearby or has a similar business address.

When no company is eligible, MY SOLAR can show a clearly labelled **location-based company list**. These are public companies that declare some coverage in the requested district. They are not described as nearby or eligible, and cannot receive a quotation request until a new eligibility check passes.

If postal or locality reference data is missing, the customer receives a clear verification message instead of an internal validation message or a false "no companies" result.

## Map and nearby discovery

The result screen has List and Map controls. The Map control currently shows an honest unavailable state because the repository has no reviewed company coordinate data model or verified coordinates. It displays no pins, distances, or calculated 25 km radius.

`25 km` is returned only as the configured future radius. A real map requires a reviewed-coordinate data model, an approved map provider, and independently verified company coordinates. This is intentionally not implemented with guessed values.

## Files changed

- `src/purchase.js` - product-first customer form, list/map result view, clear missing-reference messages, and recipient selection.
- `purchase.css` - responsive product cards, company cards, result controls, and safe map fallback.
- `server/purchase/customer.js` - exposes up to 12 real published catalogue products with real published-offer counts for the customer form.
- `server/purchase/service.js` - includes explicit discovery metadata and a non-eligible district location list when there are no matches.
- `tests/product-first-marketplace.integration.test.mjs` - real PostgreSQL regression coverage for catalogue facts, eligibility, no-match fallback, and final submission revalidation.
- `scripts/browser-check.mjs` - focused fixture-only browser acceptance path and updated stale customer mobile/PIN and onboarding expectations.

## Database and migration impact

No new migration is required for this change. It reuses the current product, offer, publication, company service-area, postal-location, and postal-locality tables.

Migration 051 remains required for locality-aware coverage. This change neither modifies it nor changes any existing company coverage, approval, publication, customer, enquiry, or quotation record.

## Verification

| Check | Result |
| --- | --- |
| Full unit and regression suite | PASS - 266 passed, 69 skipped, 0 failed |
| Static check/build command | PASS - 1,892 checks passed, 0 failed |
| Disposable PostgreSQL product-first integration | PASS - 1 passed, 0 failed |
| Recipient-review and safe-public-profile regression | PASS - 4 passed, 0 failed |
| Focused desktop/mobile browser acceptance | PASS - 24 passed, 0 failed |

The disposable PostgreSQL test proves that an eligible published product returns eligible companies and that an unsupported service cannot be submitted to a selected company. It uses an isolated local database and fictional records.

The focused browser test uses fictional fixtures. It verifies product selection, reviewed-location controls, eligible-company results, recipient selection, map fallback, responsive desktop/mobile layout, and no uncaught browser errors.

![Mobile product-first quotation screen](.verification/browser/product-first-quote-mobile.png)

![Desktop product-first quotation screen](.verification/browser/product-first-quote-desktop.png)

## Outstanding items before production release

1. Review and deploy this local code through the normal release process. No deployment was performed.
2. Import and independently review the required postal and locality references before enabling a company's named-locality coverage. This is especially relevant to Payyanur, Kannur, PIN 670307.
3. Have an authorised independent operator approve Shamin&Company's exact Named locality coverage only after the reviewed reference exists. This work did not alter its coverage or publication.
4. Add reviewed company coordinates and an approved map-provider decision before enabling actual map markers, distance, or a real nearby-radius search.
5. The broad legacy browser harness currently stops after 104 passing checks because it expects the retired `[data-customer-home]` dashboard selector. This does not affect the focused product-first browser acceptance, which passed. Update that unrelated dashboard fixture before treating the complete legacy browser harness as green.

## Production safety

No production database, Railway setting, Razorpay setting, reference import, company coverage, publication state, customer account, enquiry, quotation, commit, push, or deployment was changed.
