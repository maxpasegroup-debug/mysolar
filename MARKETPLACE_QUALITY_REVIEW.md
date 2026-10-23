# Solar Products focused quality review

Date: 23 October 2026. Repository: `D:\APPS\WEB\mysolar`, branch `main`.

The initial working tree was clean. Existing architecture, branding, customer routes, permissions and quotation workflows were preserved. The page was not redesigned from scratch.

## Confirmed cause of zero products

Production was inspected read-only on 23 October 2026, including an aggregate SQL snapshot at **17:39:44 UTC**. The database session reported `transaction_read_only=on`; the diagnostic used a read-only transaction and rolled it back. No product, offer, company, user or configuration record was changed.

| Production observation | Result |
| --- | --- |
| Raw master products | **0** |
| Draft / published / inactive products | **0 / 0 / 0** |
| Eligible public products | **0** |
| Raw seller offers | **0** |
| Draft / pending / approved / published offers | **0 / 0 / 0 / 0** |
| Eligible public offers | **0** |
| Featured master categories | **8, all active, all revision 1** |
| Unfiltered public products API | **HTTP 200, total 0, items [], locationFiltered false** |
| Readiness endpoint | **HTTP 200, ready** |

The zero count is correct. There are no underlying product definitions or seller offers to display. It is not caused by missing master categories, a selected PIN, search filters, hidden draft products or a failed API being rendered as zero. No invented inventory, prices or approval records were added.

The live public API accepted all eight category IDs, each returning HTTP 200 with zero products. `pin=673014` returned HTTP 200 with location filtering enabled; `pin=12345` and `pin=012345` returned HTTP 400 validation errors. Search for `solar` and the price-available filter also returned honest empty results.

## Verified working features

### Master categories and persistence

The physical production records and public category API agreed:

| Category | Stable ID | Slug |
| --- | --- | --- |
| Solar Panels | `10000000-0000-4000-8000-000000000001` | `solar-panels` |
| Solar Inverters | `10000000-0000-4000-8000-000000000002` | `inverters` |
| Solar Batteries & Storage | `10000000-0000-4000-8000-000000000003` | `batteries` |
| Complete Solar Systems | `ca96236c-3907-45b5-9c3f-1ffb63e94235` | `complete-solar-systems` |
| Solar Water Heating | `bc1c334a-5b2c-4980-8948-f1ee6b66111d` | `solar-water-heating` |
| Mounting Structures & Accessories | `10000000-0000-4000-8000-000000000004` | `mounting` |
| Solar Electrical Components | `10000000-0000-4000-8000-000000000005` | `cables-protection` |
| Solar Lighting & Pumps | `10000000-0000-4000-8000-000000000006` | `solar-pumps` |

Display order is 1–8. Production migration history contains 022 and the existing virtual role migration, 22 entries in total. This review did not apply migrations to production or independently recompute production migration checksums.

In disposable local PostgreSQL, upgrading through 021 to 022, running the seed SQL again, and running the migration runner again preserved **all category IDs**, including both newly created category records. There were no duplicate slugs or featured slots. Disabled category state and existing technical revisions remained intact. Historical migration files were not changed.

### Search, filters and seller eligibility

- Positive local SQL fixtures exercised every category with a stored published product and verified the selected category's records, not merely the URL or visual highlight.
- Product-name, brand/model search, category, price, seller-availability and six-digit PIN validation use the existing backend.
- Exact maintained PIN coverage and reviewed PIN-to-region coverage remain the location rules. Company addresses do not imply service coverage; no exact distance is calculated.
- Seller counts/previews remain scoped to eligible public offers, including the chosen location and offer filters. Unknown prices stay null and display as a request for a price; prices are not merged across sellers or units.
- Legacy lighting discovery, inactive categories, withdrawn storefronts, customer-owned location access and rejected cross-company offer mutations passed integration checks.

### Customer actions and states

- Product **Get a Quote** opens `/customer/enquiry/new` with the actual product ID and selected delivery location. The product context endpoint and form were tested.
- **Help me choose** and empty-state **Request a Quote** open the existing three-choice guided enquiry. The next form retains the selected PIN and still requires recipient review and explicit submission.
- **Call Now** points to the approved `tel:+918136906653` URI when support context is available. If it is unavailable, the existing `/support` route remains available. No actual telephone call was placed, and call receipt was not tested.
- Loading is announced without sample products. Empty results and API failures are separate. Retry actually requests data again and recovers after the fixture error is removed.
- Native Filters keyboard operation, PIN rejection cases, category selection announcements, image decoding and desktop overflow checks passed.
- All category artwork is decorative and paired with visible category names/descriptions. Existing product image fallbacks remain available.

### Languages and permissions

The existing I18n system and thirteen-choice language selector are retained. English, Malayalam heading/draft preservation, Hindi heading, and Urdu direction/English fallback were exercised on the marketplace. New labels use translation lookups; supplied brand/model/specification values are data, not automatically translated claims.

This does **not** establish complete translation into thirteen languages. Malayalam/Hindi copy is partial; Urdu and the remaining languages have English fallback for untranslated content. Native-speaker review remains outstanding.

Customer authentication, permissions, seller ownership, publication reviews, tenant scope and quotation privacy were not weakened. Existing automated customer/business regressions passed. Live authenticated customer transactions were not attempted during this review.

## Defects fixed

| Confirmed issue | Focused fix |
| --- | --- |
| Header and page search both submitted product searches | Products/Search routes retain one prominent page search. The header search remains on other customer routes. |
| A late support response could leave Contact Us displayed while the user typed, and a redraw could discard an unfocused draft | Update the location/support panels in place. Preserve search/filter/PIN values and focus; make Call Now available when the approved response arrives. Reproduced with a deliberately held response before fixing. |
| Guided help and empty-state enquiry links dropped the selected delivery location | Preserve the existing state/district/PIN context when navigating to the existing guided journey. No new enquiry service was introduced. |
| Lighting/pumps used an uninformative generic sun symbol | Added a lightweight decorative street-light/pump illustration in the existing card frame. |
| Equal-width sprite slices included neighbouring artwork in mounting/electrical cards | Corrected individual crop bounds without changing the shared source bitmap or unrelated dashboard cards. |
| RTL search text could crowd the icon; category arrow spacing used physical sides | Use logical inline padding within the marketplace. RTL spacing was tested and visually inspected. |
| A selected category was identified visually only | Add `aria-current` to the selected category link. |
| The empty message implied an active product-adding process | State that no published products are available, with a real help/enquiry action. |

## Remaining blockers and limits

1. **Catalogue data is absent.** An authorized catalogue operator must enter genuine product definitions and publish eligible records. Companies must create their actual offers, obtain review and publish them. This review did not do that.
2. **Live positive-result acceptance is unavailable with an empty catalogue.** Search, positive category results, price retrieval, eligibility and linked customer workflows were exercised against actual local PostgreSQL records with clearly fictional content. That is not a real-company pilot or proof of production fulfilment.
3. **Translations are incomplete.** Some guidance and supplied commercial/specification content remains in English.
4. **Service coverage depends on maintained records and reviewed postal mappings.** Nationwide completeness was not established. Exact distance, delivery time and live stock are not provided.
5. **Existing category-edit revision policy remains.** The admin screen warns that category revisions can require affected definitions to be re-saved before public visibility. No historical review or schema policy was silently relaxed.
6. **These fixes are local and uncommitted.** They have not been deployed. Production still serves its currently deployed presentation until a separately authorized release.

## Visually present versus implemented

| Surface | Actual capability / limit |
| --- | --- |
| Eight category cards | Working filters over managed taxonomy; not eight stocked products or purchasable packages. |
| Product/seller cards | Implemented and locally tested, but production currently has no records to populate them. |
| Four-step buying strip | Guidance, not an automatic checkout, payment or fulfilment operation. |
| Nearby seller discovery | Recorded service-area matching; no Uber-style live map, distance or arrival estimate. |
| Call Now | Native dialler link; no call-centre integration or verified answered call. |
| Language selector | Language preference and translated/fallback copy; not complete native-language coverage. |
| Product images | Approved URL-backed images and decorative category artwork. The existing catalogue does not have a configured product-file-upload workflow. |
| Missing seller product/category | Operator-assisted catalogue maintenance; no new seller-submission/review service was simulated. |

## Tests actually run

All database tests used new disposable local PostgreSQL clusters. Browser business records were explicitly fictional. Production was used only for read-only aggregate diagnostics and public GET requests.

| Check | Actual result | Evidence |
| --- | --- | --- |
| Focused pre-edit catalogue/discovery/connected-journey baseline | 17 passed, 0 failed, 0 skipped | `.verification/marketplace-review-baseline.log` |
| Expanded focused integration and customer-shell checks | 21 passed, 0 failed, 0 skipped | `.verification/marketplace-review-targeted.log` |
| Full automated regression suite | **281 passed, 0 failed, 0 skipped** | `.verification/marketplace-review-tests.log` |
| Browser checks after functional fixes | **482 passed, 0 failed** | `.verification/marketplace-review-browser-final.log` |
| Final image/spacing acceptance rerun | **482 passed, 0 failed** | `.verification/marketplace-review-acceptance.log` |
| Final static checks | **1065 passed, 0 failed** | `.verification/marketplace-review-static-final.log` |
| Whitespace checks | Passed | `git diff --check` |
| Live public filters | Eight categories accepted; valid PIN/search/price empty states; two invalid PINs rejected | `.verification/marketplace-review-public-api.json` |
| Live aggregate database snapshot | Read-only on; eight active featured categories; zero products/offers | `.verification/marketplace-review-live-counts.json` |

Browser widths: **360, 390, 768, 1024, 1280 and 1440 pixels**. Desktop, mobile and RTL screenshots were inspected. Browser regressions intentionally reproduced the late-support failure and RTL padding failure before their fixes; the failures were not hidden by removing assertions.

Commands used locally included:

```powershell
node scripts/verify-postgres.mjs marketplace-discovery.integration.test.mjs public-discovery.integration.test.mjs connected-journey.integration.test.mjs customer-dashboard.test.mjs
node scripts/verify-postgres.mjs
node scripts/browser-check.mjs
node scripts/check.mjs
git diff --check
```

## Files changed

- `src/solar-marketplace.js`: scoped draft-safe support updates, location-preserving help links, category selection semantics, accurate empty copy and corrected artwork.
- `src/customer-dashboard.js`, `customer-dashboard.css`: remove only the redundant Products/Search header search, preserving other routes.
- `marketplace.css`: marketplace-only logical padding and artwork fit.
- `assets/solar-lighting-pumps.svg`: decorative category illustration.
- `server/index.js`, `sw.js`: explicit public asset registration and cache version.
- `tests/marketplace-discovery.integration.test.mjs`, `scripts/browser-check.mjs`: focused regression coverage.
- This report. Read-only diagnostics and test evidence remain in ignored `.verification/` files; no credentials are included in this report.

## Release boundary

No deployment, commit, push, production-data change, secret change, paid resource, email/invitation, DNS change or production migration was performed. No new migration is needed for these focused fixes.

The page is **not declared production-ready** on visual or local-test evidence. The immediate catalogue milestone is to add genuine operator-approved product definitions and reviewed seller offers through the existing workflows, followed by an authorized live acceptance exercise.

For a later authorized release only, the commit/push commands are:

```powershell
cd D:\APPS\WEB\mysolar
git add -- customer-dashboard.css marketplace.css src/customer-dashboard.js src/solar-marketplace.js
git add -- server/index.js sw.js assets/solar-lighting-pumps.svg
git add -- scripts/browser-check.mjs tests/marketplace-discovery.integration.test.mjs MARKETPLACE_QUALITY_REVIEW.md
git commit -m "Fix focused marketplace usability and accessibility issues"
git push origin main
```

These commands were provided, not executed. Pushing may trigger Railway's configured deployment; use them only when that release is authorized.
