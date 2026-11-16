# MY SOLAR — Customer Marketplace Connection Report

16 November 2026. Existing enquiry system reused. **Source implemented; local mock/VM checks passed; real database and live website acceptance unverified.** No XYZ record or customer request was created.

## Customer clicks and existing URLs

Use the website's current origin before these paths; no live domain configuration was verified.

1. Sign in as Customer at `/#/customer/login`.
2. Open customer Home, normally `/#/customer/dashboard` after login.
3. Click the new sidebar **Find Solar Companies** link: `/#/vendors`. This is an internal hash link, not `/vendors` as a separate server document.
4. Enter XYZ in **Company or description**, choose location/filter values as needed and click **Search**. Example: `/#/vendors?search=XYZ`.
5. Click **Explore distributor** on a qualifying company card: `/#/storefront/<company-id>`.
6. Click **Request a quotation**: `/#/customer/enquiry/new?companyId=<company-id>`.
7. Enter requirement, project type, state, district, PIN, requested service and contact preference.
8. Click **Find eligible distributors**. Confirm the intended company appears. A qualifying direct company is selected automatically.
9. Review recipients and shared details, then click **Send request to 1 selected distributor**.
10. View the resulting enquiry at `/#/customer/enquiry?id=<enquiry-id>`, also accessible through **My requests** (`/#/customer/enquiries`). Check **Named recipients**.

The general **Get a quote** sidebar route is `/#/customer/enquiry/new?guided=1`; it is not a selected-company request. Product-specific seller requests also exist:

`/#/customer/enquiry/new?productId=<product-id>&companyId=<company-id>&offerId=<offer-id>`

Alternate public profile URLs remain `/#/storefront?company=<company-id>` and server-rendered `/companies/<company-id>`. The latter links to the interactive storefront. A current UUID must come from actual published company data, not an invented XYZ ID.

## Discovery and profile implementation

| Area | Source / API | Status |
| --- | --- | --- |
| Customer directory entry | `src/customer-dashboard.js` | Added and VM-render verified. |
| Directory cards/filters | `src/marketplace.js`; `GET /api/public/vendors` in `server/marketplace/public.js` | Existing implementation reused; SQL execution unverified. |
| Storefront | `src/experience.js`; `GET /api/public/vendors/<company-id>` | Existing implementation reused. |
| Server profile | `server/public-pages.js`, `/companies/<company-id>` | Existing implementation reused. |
| Quotation request form | `src/purchase.js`; options/matches/enquiries APIs | Existing form, explicit recipient review and selected-company route reused. |
| Recipient routing | `server/purchase/customer.js`, `service.js` | Existing storage/notifications reused; free receipt mismatch corrected. |

Directory UI supports company-name/description search, PIN, category, brand, price state, state/district/named area, product/service type and offered service. Results are by name, not distance or quality. Filters use recorded declarations and maintained PIN mappings, not GPS or live stock. Profile offer search supports product/brand/model and category.

Only active, marketplace-approved and published profiles satisfying `marketplace_vendors` conditions appear. Paid operation is not required solely for an approved enrolled-company free listing. Relevant profile edits, suspension, rejection/return or unpublication can remove visibility. No new visibility view or duplicate directory was introduced.

## Fixed free-listing enquiry mismatch

Before this task, request preview and final recipient eligibility additionally required `commercial_public_allowed(company,'crm')`, although the company could qualify for a free public storefront. That could make a visible free business unavailable as an enquiry recipient.

Both preview and final recipient lookup now rely on `marketplace_vendors` for public eligibility and retain:

- Selected company-ID restriction; no silent broadcast or substitute recipient.
- Recorded location/service coverage and requested service.
- Published product/category/offer matching when supplied.
- Company locks and selected-count validation during submission.

This allows incoming requests to published eligible companies independently of paid CRM. It does not enable quotation creation, messaging or other paid operational writes. Existing role, company lifecycle, subscription and feature checks remain.

## Does it reach the correct Business OS?

`POST /api/customer/enquiries` stores an owned `customer_enquiries` row and one `enquiry_recipients` row per explicitly selected eligible company. Distribution events and in-app notifications are written in the same existing transaction. A submission key protects supported retries. No new quotation/payment architecture was added.

Company list: `/#/distributor/leads` → `GET /api/companies/current/enquiries`.

Company detail: `/#/distributor/enquiry?id=<enquiry-id>` → `GET /api/companies/current/enquiries/<enquiry-id>`.

The authenticated active company and membership—not a browser-supplied company claim—scope reads. The list joins recipient rows by company ID; detail access requires that company as recipient. Customer reads are scoped by customer ownership. Existing `leads.read`, lifecycle and record guards remain in place.

Active unsubscribed companies can now open incoming enquiry list/detail/notification screens through the frontend gate, consistent with existing server read exceptions. The free listing page `/#/distributor/marketplace-leads` links **View my received enquiries** when the role permits it. It is not a second enquiry inbox.

Staff reply, mark-read or quotation controls can still encounter existing subscription requirements. This implementation guarantees neither free responses nor completed quotation issuance without an eligible OS agreement. Receiving/reading a request and operating the sales tools are separate capabilities.

## Important non-delivery states

- If a company is not published, lacks coverage, does not offer the requested service or lacks a matching eligible product offer, it will not qualify.
- If there are no matches, the form can save a request privately. **Save privately is not delivery to XYZ.**
- Submission with an explicitly selected recipient that becomes ineligible fails rather than silently routing elsewhere.
- The success response and detail show named recipients; these should be compared to the company inbox during acceptance.
- Company received/viewed status is distinct from a prepared quotation. Preparing a quote and creating a linked CRM lead remain subsequent authorized actions.
- Notifications are in-app. No automatic email/SMS/WhatsApp transport was added, and enquiry-form attachments remain unavailable.

## Verification and limits

The focused 19-test suite covers selected recipient insertion, notification control flow, invalid recipient rejection, published/area/service predicates, recipient-scoped SQL, wrong-company detail denial, unpaid read versus denied write control flow, admin review actions and VM navigation/rendering. **It uses mocks, not PostgreSQL.** Public-view visibility predicates were checked statically, not executed.

Static checks passed 1,788. Existing safe regression suite: 180 passed, five failures in unchanged Boss/commercial/legal/orb components. See the admin implementation report for exact failures. No live customer, company, administrator, browser submission, provider or database was used. Browser layout and real end-to-end delivery are unverified.

## Remaining acceptance gate

In a separately authorized disposable database with the existing migration chain installed, verify independent admin login → fictional company submission → activation → marketplace approval → publication → directory search → direct enquiry → matching business inbox. Exercise return/resubmit, unpublish, edited profile, missing coverage, duplicate/stale requests, parallel reviewers, removed permissions, customer ownership and another company's denied access. Verify real transaction rollback and ledger/view state. No migration should be executed as part of this delivered task.

XYZ's actual activation/publication and any production enquiry acceptance remain untouched. No migration, Railway, Razorpay, billing, commit, push or deployment occurred.
