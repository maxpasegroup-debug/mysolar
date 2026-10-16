# Phase 5 — Enquiries, quotations and purchase assistance

Phase 5 extends the existing dependency-free HTML/CSS/JavaScript frontend, hash routes, Express routers and PostgreSQL repositories. It reuses HttpOnly sessions, CSRF, server-side role grants, active-company context, transaction helpers, audit events and the Phase 4 marketplace projections. No dependencies or external providers were added. Phase 6 has not begun.

## Files

Created:

- `server/db/migrations/005_enquiries_quotations.sql`
- `server/purchase/validation.js`, `money.js`, `service.js`, `customer.js`, `company.js`, `notifications.js`, `assistance.js`
- `src/purchase.js`, `purchase.css`, `PHASE_5_HANDOFF.md`

Modified: `server/index.js`, `index.html`, `src/account.js`, `src/app.js`, `src/marketplace.js`, `README.md`. Earlier migrations and the immutable Phase 2 role-catalogue checksum are unchanged. Environment configuration is unchanged.

## Database additions

Migration 005 adds `customer_enquiries`, `enquiry_recipients`, `enquiry_quotations`, `quotation_versions`, `quotation_line_items`, `enquiry_messages`, `enquiry_internal_notes`, `enquiry_events`, and `workflow_notifications`.

Unique customer/submission keys make retries of enquiry creation idempotent. One enquiry/company recipient prevents duplicate routing. A company has one quotation thread per enquiry; each revision is a separate version with a previous-version reference. A partial unique index permits only one draft per thread. Composite foreign keys bind quotation threads to recipient companies, versions to their thread and enquiry, and a preferred version to its own enquiry. Line items keep quoted descriptions, optional catalogue references, equipment details, monetary inputs and computed amounts. Indexes support customer timelines, company recipients, categories/status, quotation expiry/status, notes, messages and notification feeds.

Owner and Sales receive `enquiries.manage`, `quotations.manage` and `quotations.send` in addition to their existing lead/quotation read permissions. Other staff roles receive no new workflow access. Suspended/inactive companies cannot use the workflow. Platform administration does not grant access to private customer conversations or company quotations.

## Customer workflow

Use `/#/customer/enquiry/new`, or Request a quotation on an actual product, offer or distributor storefront. A general enquiry can ask for solution advice without a selected product. Quantity, technical requirements and timeframe are optional. A category or declared service is needed for relevant matching. Location and an address are required. Contact defaults to in-app; only explicitly selected email or saved profile phone is shared with authorized recipients, alongside the customer name and project requirements.

The customer reviews named recipients before submission. Direct requests target one published distributor. Multiple and matching-assisted requests let the customer choose up to ten distributors, including across candidate pages; the server never silently expands that selection. Matching uses active/approved/published vendor eligibility, published offers for a chosen product/category, optional company-declared service and recorded area coverage. An offer-specific request also checks the offer's narrowed areas. Results are ordered by company name, without distance, rankings or response promises.

Matching conservatively reuses the Phase 4 state/district/PIN predicates. A PIN needs an explicit recorded PIN or matching legacy label; no location dataset or PIN-to-district inference is available. A distributor with only broad state coverage may therefore not match a complete address until its coverage is configured. No candidates means a general enquiry can be saved privately in Submitted state with no recipients or invented matches. New vendors are not automatically notified later. An unavailable direct recipient is explained; that enquiry may also be saved privately without sending. A general enquiry remains available from navigation to find other distributors.

Enquiry creation and routing occur in one transaction. Requested recipients are revalidated at submission. Enquiries progress through submitted, sent, discussion, quotation received and preferred states through actual events. Only the owner customer may close, cancel or clear preference. Closed/cancelled requests cannot receive new messages or issued quotations. Internal notes remain available to authorized staff for record keeping.

Customer dashboard, My enquiries, enquiry details, My quotations, quotation details, Compare quotations and Notifications use actual stored records. Detail views include bounded, paged messages, activity and version history. Empty results remain empty; fictional Phase 1 previews still require explicit demo mode.

## Distributor workflow

Existing Leads & CRM opens real incoming enquiries. Filters support search, unread/status, category, area/PIN and date range. Mark as read persists a timestamp and creates an actual viewed event. Recipient-company detail includes the permitted customer contact snapshot, address, request, private messages and company-only notes.

Authorized users prepare a private draft, edit line items, review live total previews and explicitly send it. Saved draft content stays private until issuance. The quotation detail links to the enquiry's messages and complete version history. Revise from an issued quotation to prefill a new private version; an existing draft must be opened instead of duplicated. Only the intended customer can request clarification/revision or prefer a version. Distributor responses use the private enquiry conversation.

## Monetary rules and quotation lifecycle

Financial calculations live in `server/purchase/money.js`. Money uses BigInt integer paise, quantities use thousandths, and rates use hundredths of a percentage point. Lines round half up to paise; inclusive tax calculates rounded net then derives tax by subtraction. Fixed line discounts cannot exceed their gross line. Delivery/service and installation charges have a separate explicit tax rate. All values are bounded; currency is INR. The browser previews with integer arithmetic, while the server independently validates inputs and calculates saved totals. Browser totals and statuses are not accepted.

Tax treatment must be selected: unknown, inclusive, exclusive or issuer-reported exempt. Inclusive/exclusive require supplied line and charge rates, including explicit zero where applicable. Unknown/exempt require blank rate fields. Unknown treatment displays tax as unconfirmed and the amount as non-final; the customer must request confirmed tax treatment before marking that version preferred. This is not tax compliance or statutory invoice generation.

Sending snapshots issuer public identity/contact and customer/project details. Issued line-item descriptions, prices, brands, models, supplied capacity text, scope, exclusions, warranties and terms do not change when catalogue data changes. Catalogue references must be public when added/saved. Staff can search actual published catalogue definitions in the line editor to copy supplied name, brand, model, unit and specifications; they must supply their own quoted price and confirm commercial terms. No warranty or technical suitability claim is inferred.

Issued contents cannot be edited in place through the API. A separate linked revision starts private; sending it supersedes the preceding issued version. Withdrawn/superseded versions remain readable to the intended customer and issuing company. Draft changes and customer revision requests use optimistic revision counters. Transactions lock the enquiry when issuing, preferring, messaging or changing lifecycle to serialize competing decisions.

Validity is enforced using database time and the India calendar date. A quotation is valid through its stated date; effective status derives expired on every relevant read and the preference guard. No background job is needed for correctness. A historic preferred enquiry can outlive its quotation's validity, but the quotation itself displays Expired; customers can clear preference to request a new version. Preference locks new quotation issuance/revisions until cleared; distributor withdrawal clears an affected preference while preserving history. Closing retains the recorded preference, and cancellation clears it.

Preference is a customer decision only. No order, distributor acceptance, checkout, payment authorization, inventory movement, project execution or subscription action is created.

## Comparison and purchase assistance

Comparison is per enquiry and shows the latest issued version from each recipient company, retaining explicit expired/withdrawn labels. Cards compare price/currency, tax, line quantities, supplied equipment/specifications, scope, included/excluded work, warranty, timeframe, payment terms and assumptions. Cards stack on mobile, with no mandatory wide comparison table. The enquiry links to every historical version through pagination.

`server/purchase/assistance.js` is a pure rule module over authorized quotation and item data, available for reuse by future SIA services. Missing fields produce concrete clarification questions. Estimates and unconfirmed tax receive explicit labels. All distributor-supplied information is labelled as not independently verified. No sizing, energy consumption, savings, payback, subsidy, compatibility, certification or quality claims are generated. No live AI service is called.

## Activity, privacy and notifications

Submission, distribution, read actions, messages, private notes, draft changes, issuance/revision, withdrawal, preference and closure create transactionally stored activity and existing audit records. Customer history excludes internal events. A company sees its own recipient conversation and events plus shared enquiry lifecycle events, never another company's notes, quotation identifiers or messages. Customers can access only their own enquiries and issued versions; drafts are excluded from customer APIs.

Meaningful events create persisted in-app notifications. Customer notifications belong to that user. Company notifications are generated for active members whose authoritative role can read leads and remain scoped to user plus active company. Read state is persisted separately for each notification recipient. Notifications link to the actual enquiry/quotation; permission checks are repeated on opening them. No email, SMS or WhatsApp delivery is claimed. Scheduled approaching-expiry reminders are deferred; validity remains enforced without a scheduler.

Existing same-origin, session, CSRF, company context and parameterized-query protections remain. Every purchase repository derives user/company scope from server context, not body IDs. Recipient IDs are choices validated against public eligibility, never authority. Plain-text validation and output escaping apply to user content. Lists and timelines use bounded pagination. JSON responses omit internal-note/draft data from customer views and avoid exposing another recipient's preferred-version identifier to companies. The asset allowlist includes only the new public JS/CSS, never server source or private data. Quotation write endpoints accept at most 48 KB for twenty bounded line items; other API payloads retain 16 KB limits.

## Setup, limits and Phase 10 concerns

No new environment variables or services are required. A configured existing PostgreSQL database, session secret and prior account/company setup remain necessary. Apply migration 005 through the existing migration runner only at the agreed setup/verification stage. At least one genuinely eligible published company and relevant offer or declared service with recorded coverage is needed to receive a request. No seed vendors, enquiries, quotations or operational metrics were added.

There are no enquiry drafts or arbitrary attachment uploads. Storage-backed attachment handling, notification delivery providers, automatic later redistribution and scheduled expiry reminders remain deferred. Currency is INR; rates, warranties and commercial terms are supplied by issuers. Existing English/Malayalam/Tamil navigation foundations are retained; the new form text is English and complete translation is not claimed. Lists are request-refreshed rather than live push updates.

Per instruction, no tests, suites, linting, formatting checks, audits, builds, server startup, migrations or deployment-readiness checks were run. This implementation has not passed runtime verification. Phase 10 needs to exercise migrations on a real database, decimal/rounding boundaries, concurrent issuance/preference/withdrawal, expiry/date boundaries, recipient eligibility changes, cross-user/company access denial, CSRF/session switching, pagination, unread events, responsive forms and keyboard/screen-reader behavior. Recipient routing locks chosen companies and referenced definitions/categories until commit, then rechecks marketplace eligibility; these publication-change and company-suspension races still need concurrency coverage in Phase 10. No deployment-readiness claim is made.

Stop at Phase 5. Phase 6 remains unstarted.
