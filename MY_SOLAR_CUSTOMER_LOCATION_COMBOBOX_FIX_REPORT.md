# Customer quotation location dropdown correction

17 November 2026 — implemented locally; **not deployed**. This supersedes the previous separate-search-field design.

## Result

The form at `/#/customer/enquiry/new?guided=home` now shows exactly two location controls:

- **State / Union territory \***
- **District \***

Each control is a single labelled, searchable combobox. Opening it shows a scrollable list; typing in that same control filters the list. There are no separate search inputs above the dropdowns. Result counts are announced to assistive technology without adding visible clutter.

The shared `IndiaGeography` directory remains unchanged: all 36 state/UT entries and all 14 Kerala districts, including Kozhikode. District is disabled until a state is selected. Editing/changing State clears District. Only selecting a listed option writes the canonical submitted value; arbitrary typed text fails client validity and cannot become a valid location. Existing backend state/district/PIN validation remains unchanged.

Keyboard support includes Arrow Up/Down, Home/End, Enter to select, Escape to close and Tab to continue. Combobox/listbox roles, associated labels, expanded state, active-option references and live announcements are included. Mouse click and touch selection work. Search fields use `autocomplete="off"` and do not use address-autofill names; hidden canonical fields preserve existing `state` and `district` request keys. Chrome's search-clear decoration is suppressed to avoid overlapping the dropdown arrow.

PIN, locality, street address, recipient review, database columns and matching logic retain their existing contracts. Malformed `Â·` separators and `â€™` apostrophe in the new-enquiry form and recipient preview were corrected. Other quotation screens were left unchanged.

## Files changed

- `src/company-location.js`: replace separate search/select pairs with two integrated accessible controls; retain existing company-onboarding behaviour.
- `purchase.css`: dropdown list, active option, responsive layout, focus appearance and screen-reader status styling.
- `src/purchase.js`: customer enquiry form/recipient-preview text encoding corrections only.
- `tests/company-location.test.mjs`: verify two comboboxes, no separate search/select pairs, disabled initial District and restored canonical values.

No new package, location dataset, migration or environment setting is required.

## Verification

| Check | Result |
| --- | --- |
| Full regression suite | **257 passed, 0 failed; 64 skipped** because their integration prerequisites were not enabled in that run |
| Final focused unit checks | **11 passed, 0 failed** |
| Chrome desktop | **PASS** — exactly two visible fields, 36 state/UT options, filtering, mouse and keyboard selection, ARIA active option, Escape/Tab, dependent districts, invalid values and PIN |
| Chrome mobile/touch emulation | **PASS** — selection/filtering, dependent dropdowns, responsive width, valid/invalid input and real enquiry creation |
| Real enquiry persistence | **PASS** in both browser variants — fictional request saved through the existing HTTP API; SQL confirmed canonical state/district/PIN/locality/address |
| Backend negative checks | **PASS** — invalid state, wrong-state/unknown/blank districts and malformed PIN rejected before matching and creation |
| Complete quotation journey | **PASS** — existing 15-step real HTTP/PostgreSQL acceptance, including correct company routing, business quotation issue, customer viewing, isolation and unpublished restrictions |
| Company onboarding regression | **PASS** — existing address persistence and separate approval state preserved |
| Lint and production build | **PASS** — each reported 1,829 passed, 0 failed |
| Git whitespace check | **PASS** |

The initial browser assertion counted unrelated native options elsewhere in the form. Its selector was corrected to inspect the location listbox; the focused browser rerun passed with no page errors. The successful real HTTP/PostgreSQL quotation journey did not depend on that browser assertion.

Tests used fresh disposable loopback PostgreSQL clusters, fictional identities and records only. Existing migrations ran solely in those disposable databases. Browser external requests were blocked; no live email was sent. Test clusters were stopped afterward. Mobile evidence is desktop Chrome touch/device emulation, not physical Android/iOS hardware or a private saved-address profile. Screen-reader semantics were checked, but manual assistive-technology testing was not performed.

## Screenshots and logs

- [Desktop — closed](.verification/enquiry-combobox-browser/desktop-closed.png)
- [Desktop — dropdown open](.verification/enquiry-combobox-browser/desktop-open.png)
- [Mobile — closed](.verification/enquiry-combobox-browser/mobile-closed.png)
- [Mobile — dropdown open](.verification/enquiry-combobox-browser/mobile-open.png)
- `.verification/enquiry-combobox-browser-final.log`
- `.verification/enquiry-combobox-db-browser.log` (quotation journey/company checks and initial browser assertion)
- `.verification/enquiry-combobox-unit-final.log`
- `.verification/enquiry-combobox-regression.log`
- `.verification/enquiry-combobox-lint.log`
- `.verification/enquiry-combobox-build.log`

## Release boundary

Production customer records, existing enquiries/quotations, XYZ and Railway settings were not accessed or modified. No commit, push or deployment occurred. The correction is ready for owner review; deployment requires approval.
