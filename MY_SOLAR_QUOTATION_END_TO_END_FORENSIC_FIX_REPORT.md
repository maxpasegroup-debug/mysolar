# Customer quotation forensic investigation and local correction

18 November 2026. **LOCAL FIX; PRODUCTION COVERAGE CORRECTION REQUIRES APPROVAL.** No production customer authentication, enquiry, quotation, coverage, approval, credential, session, billing, deployment, commit or push operation was performed.

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
