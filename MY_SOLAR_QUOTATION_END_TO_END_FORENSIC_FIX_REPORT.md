# Locality-aware quotation implementation — latest local acceptance

18 November 2026. **LOCAL ONLY. No commit, push, deployment or production mutation performed.** The earlier forensic/deployment observations below describe the previously deployed revision, not this new locality implementation.

## Root-cause correction and explicit scope rules

The old matcher omitted the customer locality and could treat a locality row containing a PIN as coverage of the entire PIN. The new shared `areaMatch` predicate has exclusive scope branches:

| Scope | Meaning and required declaration |
| --- | --- |
| Whole state | State only; no conflicting District, PIN or locality restriction. Existing scope retained. |
| Whole district | State + District, with no PIN/locality restriction. Customer PIN must belong to that region in reviewed postal data. |
| Exact PIN | State + District + reviewed PIN; locality field empty. This intentionally covers all reviewed localities in that PIN. |
| Named locality | State + District + PIN + exact normalized locality, bound to an active independently reviewed locality reference. Never falls back to district/PIN coverage. |

Customer locality now participates in the same predicate used by marketplace discovery, product/offer location filtering, recipient preview and final recipient validation. Public discovery's existing `area` parameter acts as the named-locality input when a PIN is supplied; broad declarations still match the reviewed locality because they explicitly cover the entire district/PIN. Company and offer-specific coverage restrictions remain conjunctive. Publication, service/category/product eligibility, company locks and tenancy checks remain enforced.

Normalization uses the existing NFKC/case/whitespace rules; no fuzzy matching, comma splitting, geographic inference or business-address fallback was added. Multiple independently declared locality rows remain supported, within the existing 20-area limit. Ambiguous mixed scopes and legacy locality rows without a reviewed reference remain ineligible. No legacy row is automatically repaired or upgraded.

The customer form replaces its unrestricted locality text box with a required native selector of active reviewed names for its exact State/District/PIN. State/District/PIN edits clear it; unchanged blur events do not. Stale lookup responses are discarded. Keyboard selection and mobile touch use the native select. Missing/unavailable references produce a clear message and cannot be selected. Unrelated notes/contact edits still preserve recipient review; locality changes require re-review. Matching and send reject stale publication/reference changes.

Compatibility: historical enquiry/quotation text and snapshots are untouched. Older API clients with a blank locality can match only explicitly broad scope declarations; blank locality never matches Named locality. New customer UI requires selection, and any supplied locality must be in reviewed reference data. A private unmatched enquiry is not treated as delivery to a company.

## Files changed for this implementation

- `server/db/migrations/051_reviewed_locality_coverage.sql`: additive reviewed-locality table and nullable coverage reference link.
- `server/marketplace/coverage.js`: scope-specific owner-save validation and reviewed-reference binding.
- `server/marketplace/company.js`: validate/bind declarations before saving; existing audited review/publication lifecycle retained.
- `server/marketplace/service.js`: single scope-aware eligibility predicate shared by all matching paths.
- `server/postal.js`: validated postal regions; public locality options and privileged, audited locality-reference review/import/withdrawal.
- `server/purchase/validation.js`, `server/purchase/service.js`: carry normalized locality, explain unverifiable locations and lock active references during final routing.
- `src/company-location.js`, `src/app.js`, `src/purchase.js`: validated locality selector, mount/fetch/reset/stale-response handling and existing request flow integration.
- New tests: `tests/locality-coverage.integration.test.mjs`, `tests/locality-migration.integration.test.mjs`, `tests/locality-selector.test.mjs`, `tests/helpers/reviewed-locations.mjs`.
- Updated test fixtures/assertions: `tests/helpers/connected-fixture.mjs`, `tests/helpers/purchase-flows.mjs`, `tests/admin-marketplace-acceptance.integration.test.mjs`, `tests/direct-enquiry-forensic.integration.test.mjs`, `tests/marketplace-discovery.integration.test.mjs`, `tests/platform-admin.test.mjs`, `tests/purchase.test.mjs`.
- This existing report contains the preceding owner's uncommitted follow-up; those findings were preserved below.

Fixtures now explicitly supply reviewed geography instead of silently assuming every syntactically valid postal PIN is a verified location. Existing positive/negative assertions were retained; one location-shape assertion was strengthened to include the newly carried locality. No billing application code or billing test assertions were changed.

## Migration and reference requirements

`051_reviewed_locality_coverage.sql` creates `postal_localities` (stable ID, PIN FK, canonical name/key, source reference, reviewer, review time, active flag, unique PIN/key) and adds nullable `company_service_areas.locality_reference_id`. It inserts **no production geography** and performs no company, coverage, approval, account, enquiry, quotation or financial-record updates. The manifest becomes 52 entries, including the existing role-catalogue entry.

Reference review reuses existing `catalogue.manage`, authenticated sessions, CSRF and platform permission checks:

1. `POST /api/platform/locations/import`: review the PIN's canonical State/District using a real verified source.
2. `POST /api/platform/localities/import`: review canonical locality names using `rows: [{pin, name, active}]`, `source` and `reason`; a reviewed active PIN is required. Reimport preserves locality identity; `active:false` withdraws a reference without deletion.
3. `GET /api/public/locations/:pin/localities?state=...&district=...`: exposes active names/IDs only for that exact region/PIN, bounded to 500 options.
4. Existing owner `PUT /api/companies/current/service-areas`: explicitly declares each business-confirmed locality and binds its reviewed reference. This still withdraws publication and requires independent marketplace review/publication. Reference existence establishes geography, not a company's willingness or technical ability to serve it.

Use unambiguous reviewed canonical labels within each PIN; aliases or similarly named localities are not inferred. No official production locality dataset was supplied/imported. All names and review records used in acceptance are fictional test fixtures. The current owner coverage editor still validates typed names against the reviewed registry on save; the customer selector is restricted to supplied options.

The migration was applied only to positively verified fresh local PostgreSQL databases (`127.0.0.1`, `mysolar_test_*`, isolated schemas/workspace clusters). A populated upgrade from 050 proved byte-equivalent JSON records for identities, companies, approval history, enquiries, recipients, quotation threads and versions; coverage IDs/fields remained equal except for the added NULL column. Reapplying migrations preserved tracking. No production schema check or migration execution was performed in this task.

## Verification and evidence

Final counts (runs overlap; do not add them as unique coverage):

- Focused first integration run: 45 passed, 0 failed, 0 skipped.
- Expanded affected integration run: **81 passed, 3 failed, 0 skipped** across 84 reported tests. The 3 failures are two commercial-trial subtests plus their failed parent suite, not three independent application defects.
- Those same failures reproduced on the unchanged committed baseline `ee8e8c66f8a8c616c79f07484f5a60e8de4fac8e`: **26 passed, 3 failed, 0 skipped**. Evidence: `.verification/locality-baseline-database.log`; source snapshot `.verification/locality-baseline-minimal`.
- First completed desktop/mobile locality browser suite: **8 passed, 0 failed, 0 skipped**. Final frozen-code browser plus populated-migration suite: **9 passed, 0 failed, 0 skipped**, with both desktop/mobile full quotation and logout/relogin journeys passed and the disposable cluster stopped cleanly.
- Default regression: **265 passed, 0 failed, 68 skipped**. Skips are not verification; real database runs are reported separately.
- Final lint/build: **1,880 passed, 0 failed each**. These commands run the repository's JavaScript syntax/import/static checker; no TypeScript source or configured typecheck command exists.

Verified scenarios include two localities sharing a PIN, covered/uncovered and second independently covered locality, wrong region/PIN, unknown locality, blank locality failing narrow scope, normalized names, mixed-scope rejection, direct/general discovery-preview-send agreement, publication/reference withdrawal after preview, deduplication, company/customer isolation, and existing distributor/marketplace/purchase workflows.

Desktop and mobile Chrome/touch emulation exercised real fictional mobile/PIN authentication, company discovery/storefront, retained company ID after refresh, reviewed locality selection, uncovered-locality rejection, notes preserving review, material edits invalidating review, enquiry submission/My enquiries, Business login/inbox, quotation entered/saved/sent in the UI, customer receipt/tax totals/Viewed status and logout/relogin. APIs and database responses were real. Email was queued only in disposable fixtures; no external mail delivery is claimed. Unsaved form draft recovery remains unimplemented; refresh retains the target company URL, not unsaved request details. Physical-device and manual screen-reader testing remain unverified.

The browser found an actual selector input/blur race; the fix memoizes the State/District/PIN tuple, and the new unit test verifies both preservation on unchanged blur and rejection of stale lookup responses.

### Existing regression failures

`tests/database.test.mjs`:

- `draft prices cannot activate; versioned manual trial preserves terms and read access`: expects 201 from a legacy trial activation path but receives 400. This conflicts with the already-committed no-trial commercial policy; unchanged baseline reproduces it.
- `expired entitlement blocks writes, retains reads and does not lock out operators`: cascades because the preceding expected trial agreement was not created (`undefined.id`). Unchanged baseline reproduces it.

No billing/security assertions were weakened to obtain a green run. The entire broad suite is not green; these tests require a separate supported-agreement fixture correction and rerun before an unconditional release recommendation.

### Screenshots and logs

Fictional records only:

- `.verification/locality-coverage-browser/desktop-recipient-review.png`
- `.verification/locality-coverage-browser/desktop-uncovered-locality.png`
- `.verification/locality-coverage-browser/desktop-business-inbox.png`
- `.verification/locality-coverage-browser/desktop-customer-quotation.png`
- `.verification/locality-coverage-browser/mobile-recipient-review.png`
- `.verification/locality-coverage-browser/mobile-uncovered-locality.png`
- `.verification/locality-coverage-browser/mobile-business-inbox.png`
- `.verification/locality-coverage-browser/mobile-customer-quotation.png`

Adapters/logs: `%TEMP%/playwright-test-locality-coverage.mjs`, `.verification/locality-coverage-final-db.log`, `locality-final-browser-migration.log`, `locality-migration-preservation.log`, `locality-final-regression.log`, `locality-final-lint.log`, `locality-final-build.log`. Preferred browser CLI was unavailable; the existing Playwright/installed Chrome setup was used. External browser traffic was blocked.

## Production rollout — NOT AUTHORISED

**NO-GO for automatic production deployment.** Local implementation does not constitute permission to change Shamin&Company or import production reference data.

1. Resolve/document the baseline billing-fixture failures and rerun affected checks. Approve the migration, release diff and maintenance/rollback plan separately.
2. Obtain real, independently reviewed locality/PIN source data and the business's precise covered locality list. Inventory all current scopes, offer coverage labels and ambiguous declarations read-only. Never infer whole-PIN/whole-district coverage.
3. Take and verify an authorised production backup/recovery point. Rehearse upgrade/reference import/declarations in staging. Review Railway's existing migration pre-deploy hook; no Railway setting was changed here.
4. With explicit release/migration approval, deploy the reviewed application and additive migration as one coordinated release. Verify readiness/manifest and drain **all old matcher instances before creating any new PIN-bound locality declarations**. An old matcher could treat these new narrow rows as whole-PIN coverage.
5. Import only separately approved postal/locality references using the audited platform APIs. Until reviewed options exist, the new customer form deliberately cannot select a location. Do not seed test names in production.
6. With explicit company-data approval, the authorised owner saves only confirmed locality declarations, preserving other valid declarations. Arrange independent approval and republication; never auto-approve.
7. Verify discovery, preview, final submission and negative locality cases. A real customer enquiry/quotation or private production login still requires its own explicit authorisation. No production customer credential or transaction was used here.

## Rollback — retain data and fail closed

Do **not** blindly redeploy the pre-051 commit: the manifest/readiness would be incompatible, and the old matcher could widen new locality rows into PIN coverage. Do not drop reference data, delete migration tracking, restore the entire database or erase audits.

Preferred emergency rollback is a reviewed forward-compatible release retaining migration 051 and reference validation while excluding Named locality from the shared predicate (`a.scope <> 'locality'`). This blocks narrow requests safely while preserving explicit broad scopes and historical reads. It requires explicit approval and staging tests; no such rollback was executed. Repair/re-enable the locality branch only after verified acceptance. Withdraw incorrect references through audited `active:false` rather than deleting records. Any company declaration rollback uses an approved pre-change snapshot, fresh revision and the existing owner API, with independent reapproval/publication.

**Current boundary:** implementation and tests are local; no staging, production import, company edit, migration, role change, deployment, commit or push was performed. Wait for owner approval.

---

# Historical customer quotation forensic investigation and local correction

18 November 2026. **FOLLOW-UP: CODE NOW DEPLOYED EXTERNALLY; PRODUCTION COVERAGE CORRECTION STILL REQUIRES APPROVAL.** No production customer authentication, enquiry, quotation, coverage, approval, credential, session, billing, deployment, commit or push operation was performed by this investigation. The original investigation below records its earlier local-only state; the following recheck supersedes deployment and current-coverage statements.

## Follow-up: current production coverage and correction checkpoint

Fresh public GET at `2026-11-18T07:02:15Z` (12:32:15 IST) confirms the same company ID `821518ce-91b6-8aa5-a7ff-7ca5bb751c90` remains publicly visible. Its sole current coverage record has changed since the earlier investigation:

```json
{"scope":"locality","label":"Payyanur","state":"","district":"","pin":"","locality":"Payyanur"}
```

The comma-separated label has been corrected, but the structured coverage has not. Kerala + Kannur still yields zero public results, as does Kerala + Kannur + 670307. The reviewed postal lookup still returns no mapping for 670307. Services include consultation and rooftop installation; there are still zero public product offers. These are current public database projections, not a private raw-table audit. Current business-address PIN, company revision and private offer references remain unverified because no authorised private database/operator session is available here.

### Business PIN versus service coverage

`server/setup/routes.js`, profile save, writes `company_profiles.pin_code` along with the business address and region. It does not update `company_service_areas`. `server/marketplace/service.js:areaMatch` reads service coverage, not that business address. Therefore changing the business PIN to 670307 through the normal profile form updates the address only. Whether that business-address value was actually saved is not independently verified; the fresh public coverage record proves service coverage still has an empty PIN. Do not treat a Published label as location coverage approval.

### Release state and test evidence

The working tree was clean at follow-up start. `main` now points to `ee8e8c66f8a8c616c79f07484f5a60e8de4fac8e`, which contains the previously verified quotation correction, regression tests and reports. Railway's read-only deployment list for the established production project/service reports **SUCCESS**, deployment `7d5fe34c-5dcc-4656-8e46-ae8c7943393b`, source `main` at that commit. This commit/deployment occurred outside this investigation; no deployment was executed here.

Fresh public `src/purchase.js` and `src/company-location.js` matched the committed Git blob bytes. `/healthz` and `/readyz` returned 200, `ok`/`ready`. Thus this is no longer a missing frontend-deployment problem. The last disposable-data acceptance against this exact code passed: 25 combined integration/browser checks, 6 repeat-login forensic checks (overlapping coverage), 22 focused unit checks, 264 default regression passes with 66 skips, and 1,851 lint/build passes each. Tests were not rerun merely for a report-only follow-up; evidence remains in the logs listed below. No schema or credential change is required. No new deployment is needed for this revision; production data readiness remains blocked.

Read-only evidence: `.verification/quotation-production-recheck-public.json`, `quotation-production-recheck-filters.json`, `quotation-release-recheck.json`, `quotation-deployments-recheck.json`.

### Exact candidate operation — NOT AUTHORISED OR EXECUTED

First the business must explicitly confirm that it serves installations throughout postal area **670307**, not merely that its office is located there. Under existing matching rules, PIN scope covers that recorded postal area; the locality label does not narrow it to a street or smaller subset. If the business cannot confirm that scope, do not apply this candidate or infer district-wide coverage.

Use the existing authenticated owner workflow at `/#/distributor/service-areas` / `PUT /api/companies/current/service-areas`. Before any write, read `/api/companies/current/setup` to confirm the active company ID is exactly the ID above; read `/api/companies/current/service-areas` for its numeric revision and full current areas; inspect all existing offer coverage-label references. Capture a non-secret rollback snapshot and obtain explicit final approval of the resulting payload. Do not use an unknown connection string or a direct SQL update.

Proposed request body, **conditional on that business confirmation and an unchanged one-area snapshot**:

```text
{
  "revision": <fresh numeric company revision>,
  "areas": [{
    "scope": "pin", "label": "Payyanur",
    "state": "Kerala", "district": "Kannur",
    "pin": "670307", "locality": "Payyanur"
  }]
}
```

The placeholder must be replaced with the freshly read number; it is not an executable request as printed. Keep the existing `Payyanur` label to avoid gratuitous offer-label changes. If the fresh snapshot contains additional legitimate areas, retain them and present a revised exact payload for approval rather than replacing them blindly.

The existing API performs the following scoped database transaction: checks company permission/revision/lifecycle; replaces only this company's operational `company_service_areas` rows with the submitted records; stores normalized keys `kerala`, `kannur`, `payyanur`; synchronizes `company_business_profiles.service_areas`; increments company revision; sets marketplace review to pending and `storefront_published=false`; appends review/audit events. This is the proposed database operation through the audited application mechanism, not permission for manual SQL. It does not replace the company/user identity, memberships, historical approval records, enquiries, quotations, payments or other customer data. Operational area row IDs are regenerated by the existing API.

**Impact:** the company will temporarily leave public discovery. An independent, authorised reviewer must approve the marketplace change and separately publish it again. No activation re-creation or automatic approval is proposed. Re-evaluate any existing offer coverage references; zero public offers does not prove zero private offers. Exact PIN coverage does not need a new `postal_locations` import. Final verification must show this company in the location-filtered result; a genuine production enquiry/quotation still needs separate explicit transaction approval and private customer sign-in.

**Rollback:** use the same owner API with a fresh revision to restore the complete pre-change snapshot. For the current observed one-area state, restore `{"scope":"locality","label":"Payyanur","state":"","district":"","pin":"","locality":"Payyanur"}`. Preserve any other areas found during the preflight read. Rollback is another audited configuration change, again withdrawing publication and requiring independent reapproval/publication. It restores the present matching failure, not a working configuration. Never remove audit events, restore the old `Payyanur,Kannur` value from stale evidence, edit approval history, or restore the whole database. No credentials or customer records are involved.

**Exact next action:** obtain the business's confirmation of the proposed 670307 service scope. After confirmation, perform only the authorised private read of current company ID/revision/areas/offer references, then present the final target-specific payload for explicit owner approval. No production correction or deployment is authorised by this report.

## 1. Root cause

There are two distinct problems.

**Verified production coverage defect:** the public API returns Shamin&Company with exactly one service-area record: `scope=locality`, label/locality `Payyanur,Kannur`, and empty State, District and PIN. The shared SQL coverage predicate requires the request's State and District to match structured coverage; the comma-separated label cannot satisfy it. The company disappears even when filtering only Kerala + Kannur, before a PIN is supplied. Changing the PIN alone cannot solve this.

**Verified frontend defect:** `src/purchase.js` previously cleared all reviewed recipients on every input and compared the complete form JSON at submission. Notes, timeframe, street-address and contact-preference edits therefore produced “Request changed” even though these fields do not change distributor eligibility. This is separate from zero matching coverage. Both defects were reproduced with fictional records; assertions preserve eligibility restrictions.

Additional facts: Shamin&Company lists consultation and rooftop installation, but currently has zero public offers/categories. Choosing a product category requires an eligible published offer in that category; listing a service alone does not satisfy that product-offer predicate.

## 2. Current production evidence

Read-only public API inspection at `2026-11-18T06:14:41Z`:

| Item | Observed value |
| --- | --- |
| Company ID | `821518ce-91b6-8aa5-a7ff-7ca5bb751c90` |
| Public name / city | Shamin&Company / Kannur |
| Services | Solar panels, inverters, batteries, rooftop installation, maintenance, energy consultation |
| Rooftop / preferred contact | Listed / email |
| Declared area labels | One string: `Payyanur,Kannur` |
| Structured public area | Locality scope; State, District and PIN empty |
| Published offers / offered categories | 0 / empty |
| Unfiltered public company search | 1 result |
| Kerala + Kannur filter | 0 results |
| Kerala + Kannur + 670307 | 0 results |
| Kerala + Kannur + 123456 | 0 results |
| Reviewed application postal mapping for 670307 | `location: null` |

Evidence: `.verification/quotation-production-public.json` and `.verification/quotation-production-filters.json`, from `/api/public/vendors?search=Shamin`, `/api/public/vendors/{id}` and `/api/public/locations/670307`. Only public business fields were recorded, not private contact details or customer credentials.

Current public visibility is verified. In the checked-in `marketplace_vendors` definition, visibility requires active company/account lifecycle, approved marketplace review, publication, a recorded approval and valid public contact/profile requirements. Thus API visibility supports those gate conditions; individual raw approval rows, revisions, profile State/District/business-address PIN, private offers and review history were **not independently inspected**. Direct internal PostgreSQL access remains unavailable under the previously documented operator-access blocker; no unknown database URL was used. Do not describe the public projection as a full raw database audit.

The real customer's account, PIN, mobile credential record and sessions were not accessed or reset. User-supplied customer identity is contextual information, not independently verified account evidence.

### Postal evidence

`123455` and `123456` are syntactically six digits, not verified coverage/postal evidence. Official [India Post Kerala directory](https://www.indiapost.gov.in/sites/PostalCircles/Kerala/Lists/PostOffices/KL_Pincode_12Nov2020.pdf) lists Payyanur SO under 670307; the [Payyannur Block Panchayat address](https://payyannurblockpanchayat.lsgkerala.gov.in/en/page/address) also identifies that postal code in Kannur. This does not establish the exact customer's installation PIN or the distributor's business coverage commitment. The application has no reviewed mapping for it. A postal import is unnecessary for explicitly maintained PIN coverage, but broader district/state coverage requires a reviewed mapping when matching a PIN.

## 3. Code and route findings

- Customer entrance: `/#/customer/login`, existing mobile/PIN API `/api/auth/pin/login`; no authentication model changes.
- Discovery: `/#/vendors`; public profile link leads to `/#/storefront/{companyId}`. Storefront quotation link passes `companyId` to `/#/customer/enquiry/new?companyId={id}`. `src/marketplace.js` defines marketplace routes; current storefront rendering also uses the existing shared public-profile implementation.
- `src/purchase.js:newEnquiry` requests `/api/customer/enquiry-options?companyId=...`, retains `targetCompanyId`, and offers “This distributor only.” `match` passes that ID to `/api/customer/enquiry-matches`.
- `server/purchase/validation.js:enquiry` validates the shared State/District directory and six-digit PIN, normalizes State/District, and constructs location predicates. Locality/address are stored; locality is not a replacement for maintained structured PIN/region coverage. No locality aliases or geographic inference were added.
- `server/marketplace/service.js:areaMatch` applies structured coverage, not the business address. All supplied location clauses must match the same area row. District/state scope can use reviewed `postal_locations`; exact PIN scope matches an explicitly recorded PIN. Legacy named localities with missing region fields cannot fulfil a fully specified enquiry. Offer coverage can narrow company coverage further.
- `server/db/migrations/004_marketplace.sql` creates legacy area rows from free-form onboarding labels, with empty hierarchical fields. `server/setup/routes.js` saves the free-form labels; it does not infer geographic structure. This explains the observed production record without assuming who entered it.
- `server/purchase/service.js:matching` and `eligibleRecipients` use the same coverage/service/offer predicates. Final submission revalidates under existing company locks; no company is silently substituted.
- `server/purchase/customer.js` stores `customer_enquiries`, `enquiry_recipients` and workflow notifications. Business reads use `/api/companies/current/enquiries`; quotation draft/send use the existing company quotation APIs; customer list/detail use `/api/customer/quotations`.
- `server/marketplace/company.js` exposes the existing owner-authorised `/api/companies/current/service-areas` API. Saving structured coverage calls `markChanged`, withdraws publication and requires renewed marketplace approval/publication. This impact is intentional and was tested locally.

## 4. Local fix

Application files changed for this task:

- `src/purchase.js`: displays “Requesting a quotation from [company]”; compares a normalized material-field signature instead of all form fields; preserves reviewed recipients for notes, contact, timeframe, quantity and street edits while updating the visible information-sharing summary. State/District/PIN/locality/category/product/service/project-type/mode/target changes require review. Stale asynchronous matching responses cannot enable Send after a material edit. Backend mismatch explanations are escaped before display.
- `server/purchase/service.js`: provides public-safe mismatch codes/messages: incomplete structured coverage, location not covered, service not listed, missing eligible published offer, or distributor unavailable. Explanations derive from the same coverage predicate; restrictions are unchanged. Final send rejects ineligible selected recipients with a specific explanation.
- `server/purchase/customer.js`: a requested company that is no longer publicly eligible causes a conflict instead of silently opening a general enquiry form.

No company/PIN/customer-specific special case, fuzzy geographic matching, business-address fallback, account merge, automatic coverage repair, migration, new dependency or permission bypass was added. The previous State/District autofill change was already uncommitted at task start and is preserved separately in `src/company-location.js`, its unit test and report. It is not the quotation root-cause correction.

New regression files: `tests/enquiry-recipient-review.test.mjs`, `tests/direct-enquiry-forensic.integration.test.mjs`. Existing fixture helpers accept an optional local port; the platform-admin mock fixture now supports the additional public diagnostic query, retaining its rejection assertions.

## 5–7. Acceptance and customer receipt

Disposable records reproduce the exact legacy coverage shape, prove rejection, then use the existing owner coverage API and an independent fictional operator to review/publish corrected coverage. No real Shamin&Company record is copied or changed.

The genuine HTTP/PostgreSQL test verifies fictional customer mobile/PIN enrollment and login, eligible/general/direct matching, incorrect PIN and district, service/category mismatch, recipient deduplication, correct business inbox, unauthorized tenant/customer rejection, private draft visibility and sent quotation with tax calculation. Publication withdrawal, suspension and loss of approval fail closed. No SMTP delivery or external message delivery is claimed; quotation delivery means existing in-app availability.

**PASS locally in desktop Chrome and mobile/touch emulation:** real mobile/PIN login, marketplace search, storefront quotation link, exact selected company retained after refresh, location/recipient review, unrelated edits preserving recipients, material locality/category edits requiring review, enquiry creation and My enquiries, business email/password login and inbox, quotation entered/saved/sent in the existing UI, customer quotation list/detail and Viewed action. Database checks confirm the intended recipient, item description, 100.00 base + 18.00 tax = 118.00 total, and `viewed_at`/effective Viewed status. Raw issuance status remains Sent as designed. No mocked API success responses were used.

Refresh retains the company ID from the URL but does **not** recover unsaved form details: a persistent draft-recovery feature is not implemented and was not added. No sensitive request drafts were placed into browser storage. An edited locality causes re-review; existing exact-PIN coverage still governs the result after re-review. No wider coverage is inferred from locality text. Physical-device and manual screen-reader testing remain unverified.

## 8. Test results

- Default regression: **264 passed, 0 failed, 66 skipped**. Database/browser-dependent skips are not passes.
- Focused recipient-review/platform-admin unit checks: **22 passed, 0 failed, 0 skipped**.
- Lint/build: **1,851 passed, 0 failed each**. Build is the repository's static checker, not a bundle compiler.
- Combined disposable database/browser suite: **25 passed, 0 failed, 0 skipped**. Includes the new forensic journey, existing administrator-to-marketplace acceptance and location validation. All 51 migrations installed in disposable databases; the clusters stopped cleanly. This does not verify a production migration execution.
- Desktop/mobile customer logout/relogin repeat: **6 passed, 0 failed, 0 skipped** in a fresh disposable cluster, repeating the full forensic journey and confirming both viewport sessions can log out, sign in using the same mobile/PIN and reopen the saved enquiry. This repeat overlaps the combined suite; counts are reported separately, not added as unique coverage.
- No TypeScript source/configured typecheck command exists in the project; TypeScript checking is not applicable. Existing JavaScript syntax/import checks run through lint/build.

Initial local failures were corrected without relaxing application requirements: the new fictional fixture needed complete onboarding flags and marketplace inclusion, suspended fixture status had to agree with lifecycle, and the mock query fixture needed the new public diagnostic SELECT. Browser adapters were corrected to select the company-specific quotation link rather than a product-offer link and to check computed Viewed status (`viewed_at`/`effective_status`) while preserving the raw Sent issuance record. The logout adapter needed bounded retries because dashboard redraw can detach the profile menu; final assertions still require actual logout, repeat authentication and enquiry access. No authentication code was changed for that test adaptation.

## 9. Screenshots

Fictional desktop/mobile critical-screen artifacts, populated by the acceptance run:

- `.verification/quotation-forensic/desktop-recipient-review.png`
- `.verification/quotation-forensic/desktop-business-inbox.png`
- `.verification/quotation-forensic/desktop-customer-quotation.png`
- `.verification/quotation-forensic/mobile-recipient-review.png`
- `.verification/quotation-forensic/mobile-business-inbox.png`
- `.verification/quotation-forensic/mobile-customer-quotation.png`

Browser adapter: `%TEMP%/playwright-test-quotation-forensic.mjs`; database runner: `scripts/verify-postgres.mjs`. Local logs: `.verification/quotation-forensic-browser.log`, `quotation-forensic-repeat-login.log`, `quotation-forensic-regression.log`, `quotation-forensic-lint.log`, `quotation-forensic-build.log`. Screenshots were visually inspected. Some existing quotation-detail separators still show text-encoding defects; those cosmetic defects were not changed in this eligibility fix.

## 10. Deployment status

**Uncommitted local changes on main, based on `71df433c656a0397bc0011d31042fadc3667cec7`; not pushed, staged or deployed by this task.** No production transaction or live quotation was created. Current production continues using the existing data and deployed code. No schema change or credential/environment change is required by this fix.

## 11. Remaining production boundary and exact proposed remediation

**A code deployment alone will not make the current unstructured coverage match.** The company owner must confirm the exact installation postal code and the area the business actually serves. The following is a candidate only if the owner explicitly confirms service throughout that PIN area; it must not be treated as automatically approved:

```json
{
  "revision": "fresh company revision from authorised service-areas GET",
  "areas": [{
    "scope": "pin", "label": "Payyanur 670307",
    "state": "Kerala", "district": "Kannur",
    "pin": "670307", "locality": "Payyanur"
  }]
}
```

Target: existing company `821518ce-91b6-8aa5-a7ff-7ca5bb751c90`, existing `PUT /api/companies/current/service-areas` as its authorised owner. The revision placeholder is not executable; retrieve the real revision first. Snapshot **all** existing coverage and offer coverage-label references before proposing the final payload; do not discard other newly added areas. The observed public snapshot contains one area and zero public offers, but private offers remain unverified.

Impact: replaces maintained coverage records and displayed labels, increments company revision, journals the change, and withdraws publication pending independent marketplace approval and a separate Publish action. Existing enquiries, quotations, customers and financial history are preserved. Changing label references may affect existing offers; inspect them first. No postal import is needed for exact maintained PIN coverage. Do not infer district-wide or statewide coverage.

Rollback: use the same authorised API with a fresh revision to restore the complete saved original area payload (observed original: locality scope, label/locality `Payyanur,Kannur`, empty State/District/PIN), preserving historical audits. It will again require independent review/publication, and restores the original matching failure. Never roll back with direct SQL or delete audit/history. API replacement regenerates operational area IDs; it is a semantic configuration rollback, not restoration of deleted row IDs.

If an operator needs raw production confirmation, use the existing Railway SQL viewer in a read-only transaction; do not copy a connection string here:

```sql
BEGIN READ ONLY;
SELECT c.id,c.status,c.lifecycle,c.marketplace_status,c.storefront_published,c.revision,
       p.state,p.district,p.pin_code,
       b.services,b.rooftop_available,b.preferred_contact,
       (SELECT count(*) FROM company_reviews r WHERE r.company_id=c.id AND r.kind='marketplace' AND r.new_state='approved') AS recorded_approvals,
       (SELECT count(*) FROM marketplace_vendors v WHERE v.id=c.id) AS publicly_eligible,
       (SELECT count(*) FROM distributor_offers o WHERE o.company_id=c.id) AS all_offer_count
FROM companies c
JOIN company_profiles p ON p.company_id=c.id
JOIN company_business_profiles b ON b.company_id=c.id
WHERE c.id='821518ce-91b6-8aa5-a7ff-7ca5bb751c90';
SELECT scope,label,state,district,pin,locality,state_key,district_key,locality_key
FROM company_service_areas WHERE company_id='821518ce-91b6-8aa5-a7ff-7ca5bb751c90' ORDER BY label;
ROLLBACK;
```

This query was prepared, not executed against production. Share only these non-sensitive statuses/coverage summaries, never credentials or arbitrary table exports. No real customer login/PIN is necessary for it.

Required owner actions remain separate: approve the reviewed local release if desired; confirm business coverage and authorise its exact production correction; arrange independent reapproval/publication; then authorise and privately conduct the genuine customer-to-business request and quotation acceptance. No such approval is assumed by this report.
