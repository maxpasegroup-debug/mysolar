# State and District autofill mitigation

18 November 2026. Local changes only; no deployment or production data access/mutation.

## Cause and scope

The existing two searchable comboboxes already had `type="search"` and `autocomplete="off"`. Their IDs included `state` and `district`. Chrome can still infer address fields from identifiers and labels despite autocomplete hints. Address-field inference is the likely cause of the reported popup; this audit did not reproduce the native popup in the owner's profile, so the precise heuristic is not confirmed.

In `src/company-location.js`, only the enquiry search-input markup changed: neutral numeric IDs with corresponding labels/listbox references; explicit search keyboard/Enter hints; explicit listbox popup semantics; autocorrect disabled. The controls retain `autocomplete="off"`, no submitted search-input names, and the existing hidden canonical `state`/`district` fields. No misleading password autocomplete tokens, fake inputs, read-only focus tricks, duplicate search fields, global autofill restrictions or third-party libraries were added.

The shared India directory, option filtering, keyboard handlers, state-dependent district reset/disable rules, validation, database schema and matching implementation are unchanged. Login, customer contact information, company onboarding controls and ordinary street-address autofill remain unchanged.

## Tests

- Location unit tests: 3 passed, including 36 states/UTs, 14 Kerala districts including Kozhikode, two comboboxes, scoped autofill hints, hidden canonical values and disabled District.
- Default regression: 261 passed, zero failed, 65 skipped. Skips are not passes.
- Lint and build: 1,840 passed, zero failed each.
- Real PostgreSQL and Chrome desktop/mobile: 19 passed, zero failed/skipped. The cluster stopped cleanly. Browser checks passed with fictional Autofill test addresses configured: 36 State/UT options, 14 Kerala districts, keyboard search/selection, mobile touch, District clearing/filtering/disable, arbitrary invalid text rejection, invalid/valid PIN, unchanged street-address autocomplete, real matching HTTP and saved enquiry values. The separate real HTTP/PostgreSQL acceptance verified publication, direct enquiry routing, business quotation issue/customer viewing and cross-company isolation. No mocked backend success responses were used.

Browser tests configure fictional Indian address suggestions using Chrome DevTools Protocol `Autofill.setAddresses`. This is a test-address mechanism, not proof of a persistently saved Chrome profile or native popup absence. See the [official protocol definition](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Autofill.pdl).

An attempt to create a separate temporary saved-address Chrome profile could not locate Add Address in Chrome settings and timed out. No personal browser profile was accessed. **Persistent saved-address popup acceptance remains BLOCKED/unverified**, and physical mobile devices are not covered by touch emulation. No claim is made that every Chrome version/profile will suppress its browser-owned popup.

Evidence logs: `.verification/location-autofill-regression.log`, `.verification/location-autofill-lint.log`, `.verification/location-autofill-build.log`, `.verification/location-autofill-db-browser.log`. Browser script: `%TEMP%/playwright-test-location-autofill.mjs`. Fictional records only in a positively verified disposable loopback PostgreSQL cluster.

## Owner acceptance before release

In a disposable Chrome profile, save a fictional Indian address using Chrome settings, enable address autofill, and open the local quotation form. Click/type in State and District, select Kerala/Kozhikode with keyboard and touch, change State and confirm District clears. Confirm only application options appear during normal use, then check street-address autofill still works. Repeat desktop/mobile as available. This manual native-popup check is still required before describing the production issue as fully verified.

No deployment, commit, push, authentication change or production data modification performed. Deployment requires owner approval.
