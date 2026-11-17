# Customer quotation location selection fix

Date: 17 November 2026. Status: implemented and locally verified; not deployed.

## Cause and change

At `/#/customer/enquiry/new?guided=home`, `src/purchase.js` rendered State and District as ordinary text inputs with address-autofill hints. They did not use the application's existing location selector or directory. This explains why Chrome could offer saved-address suggestions instead of application-provided state choices. Production was not changed or tested with a real customer's session.

The form now uses enquiry-specific controls in the existing `src/company-location.js` component and the same `src/india-geography.js` directory already used for company onboarding. No new location dataset, dependency or schema was added.

- State/Union territory offers all 36 existing directory entries (28 states and 8 union territories), with a search field filtering a native dropdown.
- District offers only the selected state's directory entries. Kerala has all 14, including Kozhikode.
- District selection and its search field are disabled before State is selected. Changing State clears the previous District and district search.
- Native selects support keyboard and touch; search fields allow substring filtering. Labels identify both searches and selectors; matching-result announcements use a live status region.
- Selectors and search fields use `autocomplete="off"`. State/District are no longer free-text address inputs. Actual saved-address behaviour from an owner's private Chrome profile was not inspected.
- Valid state/district query parameters restore canonical directory values; unknown combinations are not preselected.
- PIN, locality and street address fields retain their existing names and payload types. PIN retains its six-digit Indian format check, starting with 1–9.
- Backend enquiry validation now rejects unknown states or districts outside the selected state before both matching and creation. Database strings and existing normalized matching keys are unchanged. Existing records are not backfilled or rewritten.
- Company onboarding retains its existing controls and its existing handling of renamed/new districts. The customer form strictly uses the shared reference directory; districts absent from that directory require a future reviewed shared-directory update, not a second dataset or arbitrary customer text.

## Changed files

- `src/company-location.js`: searchable dependent enquiry controls alongside existing onboarding functionality.
- `src/purchase.js`: replace only the two free-text location fields with the shared controls.
- `purchase.css`: responsive location layout and disabled-control appearance.
- `server/purchase/validation.js`: shared-directory state/district validation; existing PIN and matching format preserved.
- `tests/enquiry-location.integration.test.mjs`: real disposable PostgreSQL/HTTP validation and optional browser adapter.
- `tests/purchase.test.mjs`: all Kerala districts, mismatched/unknown locations, PIN failures and canonical matching payload.
- `tests/company-location.test.mjs`: scope the existing mock's `closest()` behaviour accurately to company controls.
- `tests/platform-admin.test.mjs`: replace the fabricated request district “Test District” with Kozhikode so the existing routing test submits a valid location. No routing assertion was removed or weakened.

## Verification

| Check | Result |
| --- | --- |
| Focused location/purchase unit tests | 11 passed, 0 failed |
| Full default regression run | 257 passed, 0 failed, 64 skipped because their explicit integration prerequisites were not enabled in that run |
| Focused real PostgreSQL integration run | 21 passed, 0 failed, 0 skipped |
| Chrome desktop | PASS: searchable states/districts, keyboard selection, clearing/disabling, query restoration, invalid PIN, no horizontal overflow, real matching and enquiry persistence |
| Chrome mobile/touch emulation, 390 × 844 | PASS: touch interaction with native selector, search, responsive layout, state/district reset and real matching/enquiry persistence |
| Enquiry-to-quotation regression | PASS: existing 15-step real HTTP/PostgreSQL marketplace acceptance, including routing to the correct business, quotation issue/customer viewing, isolation and unpublished restrictions |
| Company onboarding and reviewed PIN discovery | PASS in the focused integration run |
| Lint/build | PASS: each ran the shared repository checker, 1,829 passed and 0 failed |
| Git whitespace validation | PASS |

The database runner created fresh loopback-only PostgreSQL 16.16 clusters with random credentials and isolated test schemas. It verified the disposable database and applied the existing migration chain only there. Both browser variants created fictional enquiries, verified saved state/district/PIN/locality/address via SQL, and used no external browser requests. Clusters stopped after testing. No production connection, real customer record or email delivery was used.

The first broad regression run exposed the invalid district fixture described above; after correcting that fixture, the full rerun passed. The initial sandbox refused Node test subprocesses; tests were rerun with authorised subprocess access. Neither was counted as a passing run.

Evidence:

- `.verification/enquiry-location-unit.log`
- `.verification/enquiry-location-regression-final.log`
- `.verification/enquiry-location-db-browser.log`
- `.verification/enquiry-location-lint-final.log`
- `.verification/enquiry-location-build-final.log`
- [Desktop screenshot](.verification/enquiry-location-browser/desktop.png)
- [Mobile screenshot](.verification/enquiry-location-browser/mobile.png)

The browser adapter was a temporary local Playwright script, invoked by the new integration test through `MYSOLAR_LOCATION_BROWSER_SCRIPT`. The project has no new browser runtime dependency. Physical Android/iOS device testing and every browser's private autofill profile remain unverified; mobile evidence is Chrome device emulation. The directory remains the existing static reference, not a live authoritative district register.

## Release boundary

No schema migration or environment change is required. No production records, XYZ, Railway settings, billing or authentication policies were changed. No commit, push or deployment occurred. The fix remains local for owner review and deployment approval.
