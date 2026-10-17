# MY SOLAR — Phase 10 verification

Business onboarding completion (17 October 2026): [BUSINESS_COMPLETION_HANDOFF.md](BUSINESS_COMPLETION_HANDOFF.md) documents secure employee/customer invitation sharing through WhatsApp or an email app, recipient-bound account linking, after-sales service integration and the company Boss dashboard. Migration `009_shared_invitations.sql` is required on deployment. Focused local checks passed (21 database/auth checks, 18 browser observations, 565 static build checks). No production schema, data, settings or deployment was changed in this task. Private sharing needs no new credentials; automatic email still requires configured SMTP. Company activation remains an authorized platform review.

Current production update (17 October 2026): [AUTH_REPAIR_HANDOFF.md](AUTH_REPAIR_HANDOFF.md) records the signup repair. The running Railway app had an empty database; existing migrations 001?008 were applied successfully. Live readiness and anonymous secure-session responses now return 200. Focused customer/distributor authentication checks passed against isolated local PostgreSQL (13 passed, no failures/skips); real-account onboarding remains for manual verification. The new `railway.json` adds pre-deploy migrations and `/readyz` health checking when next deployed. Earlier crashed/uninitialized deployment statements below are historical.

Launch follow-up: [LAUNCH_PHASE_1_HANDOFF.md](LAUNCH_PHASE_1_HANDOFF.md) records the Railway inspection and newly executed local PostgreSQL verification: 100 automated tests passed with no skips. `npm run test:localdb` creates and stops an isolated loopback test cluster using local PostgreSQL binaries; it never uses Railway production or `.env`. A subsequent explicitly authorized update saved and verified 16 Railway app variables without triggering deployment. The latest deployed app remains crashed; production schema initialization, redeployment and live acceptance are still pending. No production migrations or business-data changes were performed. Earlier blocked-database statements below describe the original Phase 10 environment and are superseded by this launch-phase evidence.

Phase 10 adds dependency-free verification scripts, unit/HTTP/browser regressions, an isolated PostgreSQL integration suite, safe configuration fixes, reusable checksum-preserving migration execution, and `/healthz` / `/readyz` endpoints. See [PHASE_10_HANDOFF.md](PHASE_10_HANDOFF.md) for observed results and release blockers, and [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for environment, backup/migration/rollback and domain procedures. These current documents supersede the earlier-phase status statements retained below.

Run `npm test` for automated regressions, `npm run check` (also `lint`/`build`) for Node syntax/import/asset/lock validation, and `npm run test:browser` with an installed Chromium browser. There is no bundler or third-party style linter; the build is the equivalent validation of this plain frontend/backend. The browser script starts its own loopback test server with an isolated profile and no configured database or external AI/email provider. It does not exercise authenticated database workflows.

For database verification, securely configure a dedicated loopback `TEST_DATABASE_URL` with a database name starting `mysolar_test_`, then run `npm run test:db`. It never falls back to `DATABASE_URL`, never loads `.env`, and uses generated schemas in that designated disposable database. Without configuration the database suite explicitly skips as blocked. Do not point test scripts at production. Local evidence is not production acceptance; billing, deployment and domain connection remain inactive.

## Phase 9 implementation history

Phase 9 adds versioned commercial configuration, one-time setup-fee proposals, draft/active/inactive plans, manual company subscription agreements, trials and lifecycle history, centralized backend entitlements and usage caps. Operators use `/#/platform/commercial`, `/#/platform/plans` and `/#/platform/subscriptions`; owners use `/#/distributor/subscription`. Billing remains disabled. No checkout, payment request, provider transaction or verified-payment record is created.

See [PHASE_9_HANDOFF.md](PHASE_9_HANDOFF.md) for the schema, changed files, enforcement coverage, access modes, history/audit safeguards, setup and Phase 10 concerns. Migration `008_commercial.sql` is added but has not been executed. The initial explicit pre-billing policy preserves existing company features with no additional commercial caps; plan prices are not seeded. The existing proposed setup fee is imported as a disabled, optional proposal (the original reference is ₹35,000 plus applicable GST). Assigned agreements retain immutable price/entitlement/setup-fee snapshots.

No dependencies or new environment variables were added. Existing SIA security limits remain upper bounds. No tests, test suites, linting/formatting checks, audits, builds, server startup, migrations, deployment checks or external payment-provider requests were run. Runtime behavior remains unverified. Phase 10 has not started, and `mysolar.online` has not been connected.

## Phase 8 implementation history

Phase 8 adds customer SIA at `/#/customer/sia` and distributor SIA at `/#/sia`. Both use controlled, authorized tools over existing records, with deterministic assistance available without an AI provider. The optional server-only provider adapter highlights trusted evidence; it cannot invent response text or execute tools. An explicit, session-bound approval workflow can save an in-app customer follow-up through the existing enquiry service.

See [PHASE_8_HANDOFF.md](PHASE_8_HANDOFF.md) for the file inventory, provider contract, environment variables, tools, approvals, retention, usage limits, privacy boundaries and Phase 10 concerns. Migration `007_sia.sql` adds scoped request/proposal/usage records and SIA access grants; it has not been executed. No dependencies or external service accounts were added. `.env.example` documents optional operator configuration; no credential was created or external AI request made during implementation.

No tests, test suites, linting/formatting checks, audits, builds, server startup, migrations or deployment-readiness checks were run during Phase 8. Runtime behavior remains unverified. Phase 9 has not started. Secure uploads, payments, subscription billing, autonomous business changes, native apps and domain provisioning remain deferred.

## Phase 7 implementation history

Phase 7 connects the saved distributor storefront, customer journey, owned-record dashboard and tracking views, and mobile field-work entry. It adds shared translation helpers, safe navigation return paths, a web app manifest and icons, a static-only service worker and a public offline fallback. Existing HTML/CSS/JavaScript, Express, PostgreSQL, authentication, tenancy, publication rules and operational workflows are retained.

See [PHASE_7_HANDOFF.md](PHASE_7_HANDOFF.md) for created/modified files, routes, API boundaries, setup requirements, limitations and Phase 10 concerns. No new dependencies, environment variables or database migration were introduced. Existing migrations 001–006 and environment/database setup remain required and have not been executed here.

No tests, test suites, linting/formatting checks, audits, builds, server startup, database migrations or deployment-readiness checks were run during Phase 7. Behavior remains unverified. Secure file storage, background synchronization, native apps, connected custom domains, subscriptions, payment gateways and live SIA execution remain unavailable. Phase 7 implementation is handed off for the next development phase; Phase 8 has not started.

## Phase 6 implementation history

Phase 6 adds the distributor operating foundation: role-scoped dashboards, CRM and company customers, explicit commercial agreements/orders, a physical stock ledger and reservations, approved procurement and receipts, installation projects and field tasks, operational invoices/collections/payables, and service/warranty records. Customer screens now include owned orders, explicit agreement, project milestones, invoices and service reporting. Existing enquiries, quotations, marketplace and company setup are retained.

See [PHASE_6_HANDOFF.md](PHASE_6_HANDOFF.md) for the complete file list, 22-table migration, permissions, workflow rules, integration points, setup requirements, known limits and concerns reserved for Phase 10. Migration `006_operations.sql` is added but has not been executed. No new dependencies, environment variables, external services or payment gateways were introduced.

No tests, test suites, linting/formatting checks, audits, builds, server startup, database migrations or deployment-readiness checks were run during Phase 6. Runtime behavior has not passed verification. Secure uploads, offline synchronization, statutory accounting certification, live SIA, subscriptions, domains and external payment processing remain unavailable. Phase 7 extends presentation and integration as documented above.

The sections below retain earlier implementation history.

## Phase 5 implementation history

Phase 5 adds database-backed customer enquiries, explicit multi-vendor recipient review, private distributor conversations and notes, versioned quotations, decimal-safe INR calculations, comparison, rule-based purchase assistance and persisted in-app notifications. Existing marketplace, accounts, tenancy, company setup and branding are retained. No dependencies or external services were added.

See [the Phase 5 implementation handoff](PHASE_5_HANDOFF.md) for the exact files, schema, permissions, transitions, API integration, setup requirements, limitations and concerns reserved for Phase 10. Migration `005_enquiries_quotations.sql` is added but has not been executed. Existing database/environment setup is still required; no new configuration variables were introduced.

No tests, test suites, linting, formatting checks, audits, builds, server startup, database migrations or deployment-readiness checks were run in Phase 5. This was the Phase 5 implementation handoff, without a verification or readiness claim. Phase 6 extends operational orders and manual financial records as documented above; external payments and live AI remain unavailable.

The sections below retain the implementation history for earlier phases.

## Phase 4 implementation history

Phase 4 implements stored energy catalogue definitions, tenant-owned distributor offers, approved vendor discovery, company storefront offers and manual service-area search. Existing HTML/CSS/JavaScript, Express, PostgreSQL, authentication, CSRF, company context, branding and platform grants are reused. No framework, infrastructure or dependency migration was introduced. Phase 5 extensions are documented above.

No tests, test suites, linting, formatting checks, audits, builds, server startup, database migrations or deployment-readiness checks were run during Phase 4. This is an implementation handoff, not a claim that the features passed verification.

## Phase 4 — Catalogue and discovery

### Product definitions and company offers

The shared catalogue is distinct from a company's offer. Operators with `catalogue.manage` create/edit definitions at `/#/platform/catalogue` and `/#/platform/product`. Definitions include main category/optional subcategory, manufacturer/brand, model/shared SKU, description, optional structured specifications, sale unit, up to five validated image URLs, supplied warranty information, draft/published/inactive status and public visibility. Private source notes stay inside authorized catalogue administration.

The initial taxonomy contains nine requested energy categories only. It contains no product definitions, vendors, prices, stock, ratings, certifications or warranties. Categories support subcategories and optional, validated specification rules. Panel rules cover rated watts, technology, dimensions and efficiency; inverter rules cover capacity, phase, grid compatibility and mode; battery rules cover chemistry, voltage, capacity and usable energy. No specification is required or prefilled with an invented value. Operators can extend categories through `/#/platform/categories`. A category schema revision requires affected definitions to be re-saved before public exposure. Existing categories retain their parent/type; create a new category for structural changes.

Published definitions are supplied catalogue information, not certification, manufacturer authorization or platform performance guarantees. There is no certified/verified product badge. Products with no eligible offers show no implied price, stock or availability.

Authorized distributors browse `/#/distributor/catalogue`, add a definition to their company, and manage it at `/#/distributor/offers` / `/#/distributor/offer`. There is one offer per company/definition. Offers support company SKU, explicit price/request-quote/contact states, INR price and unit, estimate labelling, supplied tax information, declared availability, stock quantity only when explicitly maintained, optional minimum order, configured coverage and provided/confirmed public terms. Private notes are never in public projections. This is not procurement, stock movement, inventory accounting or a binding quotation workflow.

Owners receive offer read/manage/submit/publish/deactivate permissions. Sales receives read access. Inventory Managers receive read/manage/deactivate, with no approval, submission or publication privilege. Server checks are authoritative. Suspended owners can inspect offers read-only; suspended-company mutations remain blocked.

New or edited offers are private drafts. Editing clears previous approval. An eligible, published company can submit an offer. An independent platform operator with `offers.review` must approve its current offer and product revisions; rejection needs a reason. Approval does not publish automatically. An authorized company owner explicitly publishes an approved offer. Unpublishing and deactivation are separate supported actions. Changes to product definitions hide offers approved against an older revision until renewed review. Deactivated/hidden definitions or inactive categories cannot supply public offers. Existing private offers remain editable even if the shared definition becomes unavailable, but cannot be published until eligible again.

### Public rules and exposure boundary

Public screens use explicit database views: `marketplace_vendors`, `marketplace_products`, `marketplace_offers`. Views expose allowlisted public fields, not underlying company/user/offer rows. Vendor eligibility requires active status and lifecycle, marketplace approval, enabled public profile, required public name/description/contact data, and an actual marketplace approval review record. Company suspension, withdrawal or unpublication removes discovery immediately on subsequent API queries. Existing Phase 3 branding/service changes still withdraw publication for renewed company review.

Offers additionally require current approval, explicit publication, matching approved offer/product revisions and valid company-configured coverage. Public reads exclude private procurement information, supplier terms, margins, internal notes, source evidence notes, sessions, invitations, review reasons, membership lists, private contacts and legal address. Catalogue and company publication approval is not a business-certification claim. Database views are projection safeguards, not PostgreSQL row-level security; private repositories still require the existing authorization context.

### Location and service-area behavior

`company_service_areas` extends the Phase 3 area-label foundation with explicit state, district, PIN and named-locality scopes. Owners configure these at `/#/distributor/service-areas`. Unicode normalization, whitespace normalization and case folding are used for new search keys. PIN values require six Indian-format digits. Names are supplied text; no authoritative administrative-location dataset, geocoding or live coordinates are configured.

Existing service-area labels are backfilled as exact named areas. The company's registered address is never inferred as service coverage. A compatibility trigger preserves structured rows for unchanged labels when the Phase 3 business form saves its area list, removes deleted labels and creates new labels as unstructured localities. Saving structured coverage updates the existing Phase 3 area list, increments company revision, withdraws publication and records an audit event. Approval/publication remain platform controlled.

Public product/vendor filters accept state, district, exact PIN and named area, with category, brand, price-state and service/listing-type filters where applicable. Multiple location filters are combined. A state filter requires a recorded state, so legacy labels without one may not match until the owner supplies it. PIN searches require an explicitly recorded PIN or exact legacy PIN label; state/district coverage alone is not mapped to PIN codes. Results are by name or update order, never fabricated proximity or distance. Manual input is always available; no precise location is requested.

An offer can narrow coverage to saved company area labels; leaving it empty inherits the company's published areas. References to removed areas are excluded from public offers until corrected. Labels are not converted into inferred geographic boundaries.

### Connected screens and search

- Homepage category discovery now reads the category database while retaining the Phase 1 hero, illustration and brand language.
- `/#/categories`, `/#/products`, `/#/search`: category listing, keyword/brand/category/price-state/type/location filters and bounded results.
- `/#/product?id=<uuid>`: stored specifications, supplied warranty/images and paginated eligible offers; missing values have explicit empty states.
- `/#/vendors`: active approved vendor directory, manual location/service/category filters and bounded results.
- `/#/vendor?id=<uuid>` and existing `/#/storefront?company=<uuid>`: saved company identity, public contacts, declared areas and eligible published offers.
- Distributor catalogue, offer list/editor/private preview, and structured coverage controls integrate with the existing workspace and permission-aware navigation.
- Platform category/definition editors and `/#/platform/offers` / `/#/platform/offer` provide shared catalogue administration and audited, revision-checked offer decisions.

Real pages never fill empty results with fictional products or companies. Explicit `?demo=1` layouts remain separate. The former fictional Sunfield profile route opens the real directory outside demo mode; the former rooftop sample route points to published service discovery. English/Malayalam/Tamil navigation foundations remain, with new navigation labels and the existing partial-translation notice. No complete translation is claimed. MY SOLAR remains the marketplace identity; stored company colours/names are scoped to the company workspace/storefront. Missing logos/images fall back without generated product imagery.

Search uses native PostgreSQL full-text indexing over product name, brand and model, with parameterized filters and stable pagination. Product, offer and vendor results use 20-record pages; category metadata is bounded to 200. Categories can be paged in directory/administration endpoints. Offer review and company history are bounded. No entire product/vendor dataset is loaded into the browser. The frontend cache distinguishes endpoints/filters, rejects obsolete in-flight responses, and refreshes public data on navigation/focus.

### Schema, permissions and API

Added `server/db/migrations/004_marketplace.sql`; existing migrations 001–003 and the original role-catalogue snapshot are unchanged. New tables:

- `catalogue_categories`, `catalogue_products`.
- `distributor_offers`, `offer_reviews` with a composite offer/company reference.
- `company_service_areas` with compatibility backfill/synchronization.

New indexes cover category/definition relationships, generated full-text search, brand/name/model, company-product offers, published/reviewable offers, eligible companies and normalized state/district/PIN/locality lookups. Constraints enforce price/stock nullability, role-independent approval/publication invariants and category-subcategory relationships. New permission grants are applied by migration 004, not by browser flags. Catalogue administration, offer edits/reviews/publication and coverage changes write audit records.

| API | Purpose |
| --- | --- |
| `GET /api/public/categories` | Bounded enabled category taxonomy |
| `GET /api/public/products`, `/products/:id` | Published definitions/search and eligible offers |
| `GET /api/public/vendors`, `/vendors/:id` | Eligible company search and storefront offers |
| `GET /api/companies/current/offer-template` | Authorized definition/coverage for a new company offer |
| `GET`, `POST /api/companies/current/offers` | Own-company offer list/create |
| `GET`, `PUT /api/companies/current/offers/:id` | Tenant-scoped read/edit; product association cannot be reassigned |
| `POST /api/companies/current/offers/:id/actions` | Authorized submit/publish/unpublish/deactivate |
| `GET`, `PUT /api/companies/current/service-areas` | Owner coverage read/save using company revision |
| `/api/platform/catalogue/categories`, `/categories/:id` | Authorized shared category list/create/read/update |
| `/api/platform/catalogue/products`, `/products/:id` | Authorized shared definition list/create/read/update |
| `GET /api/platform/catalogue/editor` | Bounded editor metadata and selected stored record |
| `GET /api/platform/catalogue/offers`, `/offers/:id` | Authorized offer review queue/detail |
| `POST /api/platform/catalogue/offers/:id/review` | Independent approval/rejection with offer and product revision checks |

Company operations reuse `withCompany`, active membership, session revalidation, permissions and `X-Company-ID`. Ownership is derived from the context, never accepted in request bodies. Offer reads/updates/actions/history include both ID and tenant. Platform handlers use `withPlatform` and separate grants; operators affiliated with the company cannot approve its offers. Mutations retain exact Origin/JSON/CSRF requirements. User values are parameterized or escaped; category schemas, attributes, image URLs, enums, money, numeric precision, quantities, areas and pagination are validated. Public views omit private fields even when future private columns are added to underlying tables.

### Files, configuration and handoff

Added: migration 004; `server/marketplace/{validation,service,public,company,admin}.js`; `src/marketplace.js`; `marketplace.css`. Updated: `server/index.js`, `server/config.js`, suspended read-only permission handling in `server/tenancy/context.js`, frontend cache/routes/navigation integration in `src/account.js`, `src/app.js`, `src/organization.js`, `index.html`, `.env.example`, and this README. Dependencies, existing style files and earlier migrations are preserved.

The only additional environment option is `PRODUCT_IMAGE_ALLOWED_HOSTS`, a comma-separated list of exact trusted HTTPS raster-image hosts. Empty permits image-free definitions only. PNG/JPEG/WebP URLs cannot contain credentials, custom ports, query strings or fragments. The server does not download arbitrary image URLs; CSP permits only configured hosts. No file upload/storage, automatic image generation or certification integration is claimed. Existing logo/SMTP/domain-preference rules remain unchanged.

Manual setup, at the permitted setup/verification stage: configure PostgreSQL and the existing ignored `.env`, apply pending migrations using `npm.cmd run db:migrate`, configure trusted image hosts if wanted, and use the controlled operator bootstrap for a registered administrator. Operators must supply genuine definitions; distributors must complete company review, create genuine offers and submit them for independent offer approval before publication. No migrations, server or data-seeding command was executed in this phase. There is no new demo seeder and no default catalogue administrator or fake production data.

Phase 10 must verify migration upgrades/fresh setup, full-text search/query plans, category/schema changes, money/stock/null/precision handling, product/offer revision races, independent review, cross-tenant IDs/coverage/history, stale-tab changes, suspend/unpublish behavior, public projection/privacy, location combinations and legacy labels, duplicate parameters, category pagination, images/CSP/fallbacks, keyboard/mobile flows, partial translations and preserved demo/account/company workflows. These are concerns for the scheduled verification phase, not passed checks.

Deferred: customer enquiries and quote execution/comparison, purchases/orders/checkout, payments/gateways, procurement/inventory accounting, installation operations, subscription billing and SIA execution. DNS provisioning, authoritative location data/distance ranking, file storage, certification verification and full content translations remain unimplemented. Stop at Phase 4; Phase 5 has not started.

## Prior phase foundations

Phase 3 extends the existing Express/PostgreSQL backend and plain HTML/CSS/JavaScript frontend with resumable company onboarding, persisted company branding, secure team invitations and a separate platform review area. Phase 1 layouts and explicit demos remain; Phase 2 authentication, CSRF, sessions, permissions and tenant isolation are reused.

The Phase 3 foundation below was implemented without tests, linting, formatting checks, audits, builds, server startup or database migrations. Phase 4 extensions above supersede its earlier catalogue/discovery boundaries; no verification is claimed for either phase.

## Phase 3 implementation

### Company setup and lifecycle

Register a minimal company through `/#/distributor/onboarding`; the server creates the initial owner and default setup records atomically. Continue at `/#/distributor/setup?step=profile`. Four progressive steps cover:

1. Legal/display name, business type, primary contact, private business email/phone, address, state, district, Indian PIN, operating language and optional HTTPS website.
2. Public company name, optional safe logo URL, primary/secondary/accent colours, welcome text, explicitly public contacts, description, storefront appearance and future domain preference.
3. Offered products/services, rooftop installation availability, service areas, preferred contact method and marketplace interest.
4. Saved summary, edit links and submission for activation review.

Each saved step persists in PostgreSQL and survives reload/sign-out. The owner dashboard shows actual saved-step progress, activation/publication states, brand/service-area status, membership counts and recent company events. No fictional operational metrics are mixed into it. New owner routes are `/#/distributor/setup`, `/#/distributor/branding` and `/#/distributor/team`; the existing settings route opens the setup overview.

New companies start `draft`; the first saved step changes them to `onboarding`. Completed onboarding submits to `pending_review`. Only an operator can approve `pending_review → active` or return it to `onboarding` with a reason. Owners can withdraw pending submissions to edit. Operators can suspend any non-suspended company with a reason, then reactivate it to the recorded pre-suspension state. Suspended owners retain read-only setup/team/history access; mutations and operational-module access remain blocked. Non-owner suspended-company access is rejected. Operational-module metadata also requires company activation.

Marketplace states are independent: `not_requested`, `pending`, `approved`, `rejected`, `withdrawn`. Inclusion interest is not approval. An active, complete company can request marketplace review; only a platform operator can approve/reject, and publication is a separate explicit operator action after approval. Owners may withdraw inclusion. Suspension unpublishes; reactivation never republishes automatically. Saving company/brand/business information removes publication and moves an existing approval back to pending review. Company revisions prevent saving or approving stale information. Review records capture actor, company, previous/new state, reason, revision and timestamp; audit events are recorded in the same transaction.

### Persisted branding and public storefront

`company_branding` is the central theme record. Saved public name, logo and palette are included in authorized session membership data and applied to the appropriate distributor workspace. The marketplace header and homepage retain MY SOLAR identity. Brand editing has a live scoped preview, reset-to-default and save controls. Reset affects the form first; saving persists changes. Primary and secondary colours require readable white-text contrast; colours use strict six-digit hex validation. Text is rendered as text, never company-supplied HTML.

The supported production asset approach is a **logo URL**, not a file upload. Configure exact trusted hosts through `LOGO_ALLOWED_HOSTS`. URLs must be HTTPS, have no credentials/custom port/query/fragment, and use a PNG/JPEG/WebP path. No host configured means no external logo is accepted. The server never downloads arbitrary URLs; CSP allows only the configured image hosts. A missing/failed logo falls back to the sun mark. Use trusted static-image hosts, not arbitrary user-controlled origins. No image storage or automatic upload is claimed.

`/#/storefront?company=<uuid>` reads only published, active, marketplace-approved company data from the existing public vendor API. It exposes public branding, explicitly public contacts, offered services and service areas; private business contacts, legal address, members and internal records remain excluded. Publication approval is not independent business verification. The old owner-controlled `published:true` shortcut is rejected by the server. Phase 1 session-only brand preview remains explicitly available in demo mode; real-company settings now persist.

Requested custom domains are stored with a database-enforced `not_connected` state. No DNS verification, provisioning, domain routing or connection claim is included.

### Team invitations

The team screen supports existing registered-account membership management plus secure invitations. Owners assign only the existing five staff roles. Owner membership is protected; these routes cannot remove the last owner or create platform administrators. Existing memberships, including suspended/removed ones, must be managed directly rather than overwritten through an invitation.

Invitations have random 256-bit tokens stored only as hashes, expire after 48 hours, are single-use and can be revoked. Acceptance requires an authenticated active account with the exact invited email, an available non-suspended company, and an active authorized issuer. The server derives company/role from the invitation, revalidates permissions and creates membership/consumes the token atomically. Tokens never appear in directory/list/audit responses. The browser removes invitation tokens from the address bar into memory; refreshing requires reopening the link. Sign-in/registration returns to the in-memory invitation flow.

Default `INVITATION_DELIVERY=email` requires existing SMTP configuration. Without SMTP it reports unavailability and sends nothing. For local development, an operator may set `INVITATION_DELIVERY=manual`: the authorized owner's create response shows a private acceptance link once. No email is claimed. Share it privately with the intended recipient; it is not publicly retrievable, persisted in browser storage or logged. Manual mode is rejected when `NODE_ENV=production`. The UI clears the displayed link on account/company changes, hide, or reload. SMTP failures invalidate the invitation and report failure; successful SMTP acceptance is not a delivery guarantee. Durable email queues remain deferred.

### Platform administration and proposed commercial settings

The platform area starts at `/#/platform` and includes a paginated/searchable company directory, lifecycle/marketplace filters, onboarding and marketplace queues, company details, review decisions/history and platform activity. Directory responses omit private customer/financial records. Detail review shows necessary onboarding/business information and membership counts, not customer records. Platform privileges are checked on every backend operation through the existing operator grant system; a company membership or frontend flag cannot grant them.

Separate permissions cover directory access, onboarding review, lifecycle changes, marketplace review and proposed settings read/write. Operators cannot approve, reactivate, approve marketplace inclusion or publish a company they created or belong to; an independent authorized operator is required. The existing `admin:grant` / `admin:revoke` stdin tools remain the only supplied bootstrap mechanism for an already registered operator account. They require trusted shell/database access, audit the change and revoke sessions. No default operator credentials are supplied.

`/#/platform/settings` persists the proposed white-label setup fee, GST note, optional subscription/trial and future limits. The initial reference is **₹35,000 plus GST**, with subscriptions/trial/limits unset. These values are proposals only; database constraints keep `billing_enabled=false`. There are no charges, payment requirements, limits enforcement or gateway integrations.

### Migration, endpoints and setup

Added migration `server/db/migrations/003_company_setup.sql` extends companies with lifecycle, marketplace status, revision and pre-suspension state, adds publication constraints, and creates:

- `company_profiles`, `company_branding`, `company_business_profiles`, `company_onboarding`.
- `company_invitations`, `company_reviews`, `platform_settings`.
- New company/platform permission grants; the immutable Phase 2 role-catalogue checksum is preserved.

The migration runner now ensures the original role catalogue exists immediately after migration 001 before applying later SQL, for both fresh databases and upgrades. Company-creation triggers create tenant-owned setup records, and existing companies receive backfilled defaults without fabricated completion flags. Existing Phase 2 company access is retained as active; previously self-published profiles are unpublished and placed in pending marketplace review. This intentional publication change implements the new approval requirement. Do not edit applied migration 001.

When the designated setup/verification stage permits it, apply pending migrations with `npm.cmd run db:migrate`; this command was **not run** during Phase 3. No new dependencies are required. Retain the existing ignored `.env` values and optionally add:

| Variable | Setup |
| --- | --- |
| `LOGO_ALLOWED_HOSTS` | Comma-separated exact trusted image hostnames; empty disables external logos |
| `INVITATION_DELIVERY` | `email` by default; `manual` only in development |
| Existing SMTP values | Required for production invitation/recovery email, with a verified sender |

New backend endpoints reuse same-origin cookies, exact Origin, CSRF and expected active-company headers:

| Endpoint | Capability |
| --- | --- |
| `GET /api/companies/current/setup` | Owner setup, completion, status, defaults, reviews and activity |
| `GET /api/companies/current/team` | Owner members, safe invitation list and relevant activity |
| `PUT /api/companies/current/onboarding/profile` | Save validated profile and progress |
| `GET`, `PUT /api/companies/current/branding` | Read/save authorized tenant branding |
| `PUT /api/companies/current/onboarding/business` | Save services, areas and business preferences |
| `POST /api/companies/current/onboarding/submit`, `/withdraw` | Submit / withdraw onboarding review |
| `POST /api/companies/current/marketplace-request` | Request / withdraw separate inclusion review |
| `GET`, `POST /api/companies/current/invitations` | Safe listing / authorized invitation creation |
| `POST /api/companies/current/invitations/:id/revoke` | Revoke own-company pending invitation |
| `POST /api/invitations/accept` | Authenticate and consume recipient-bound invitation |
| `GET /api/platform/companies`, `/companies/:id` | Authorized directory / necessary review detail |
| `POST /api/platform/companies/:id/actions` | Revision-checked lifecycle/marketplace/publication decisions |
| `GET`, `PATCH /api/platform/settings` | Proposed commercial configuration; billing disabled |

All setup queries remain tenant-scoped through `withCompany`. Platform actions use a separate checked operator context. Company locks serialize tenant edits, invitation actions and platform decisions; revision checks reject stale review/form data. Incoming fields are allowlisted, and role/state/publication values cannot be mass-assigned. Every row in the new company tables carries a company foreign key. Existing customer ownership and session safeguards remain.

Added files: `server/setup/{validation,service,routes,invitations}.js`, `server/platform/routes.js`, `server/mail.js`, the new SQL migration, `src/organization.js`, `organization.css`. Modified: existing tenancy/auth/config/HTTP/migration modules, permission-catalogue comment, `src/account.js`, `src/app.js`, `index.html`, `.env.example`, and this README. SMTP transport is shared rather than duplicated. Existing `styles.css`, `accounts.css`, dependency versions and lockfile are preserved.

Manual setup still requires a real PostgreSQL database, ignored environment values, pending migrations at the permitted stage, trusted logo hosting if desired, and SMTP or explicit development invitation mode. An operator account must be registered and granted through the controlled tool. None of these integrations were executed or represented as verified during this phase.

Phase 10 concerns include fresh/upgrade migration ordering, existing-publication withdrawal, tenant/stale-tab attacks, lifecycle and publication transitions, suspended read-only access, invitation expiry/replay/recipient mismatch/revocation/issuer changes, SMTP failures, public-field privacy, URL/CSP/logo fallback behavior, theme contrast, multi-company branding, concurrency, keyboard/mobile flows and partial translations. Phase 4 now supplies the catalogue/discovery foundation. Domain verification, durable mail, file storage, email ownership verification/MFA, ownership transfer, billing, operational modules and SIA execution remain deferred.

## Retained Phase 2 setup and foundation reference

## Architecture and files

The repository was empty before Phase 1 and frontend-only before Phase 2. The original HTML/CSS/JavaScript frontend and hash routes remain; there is no framework migration or bundler. Express serves an explicit frontend asset allowlist and same-origin `/api` routes. PostgreSQL holds persistent state. `pg` supplies parameterized queries and transactions, Argon2id hashes passwords, Helmet configures headers, and Nodemailer provides optional SMTP recovery. Exact dependencies are recorded in `package-lock.json`.

- Existing modified files: `index.html`, `src/app.js`, `README.md`. Original `styles.css` is preserved.
- `src/account.js`: in-memory session state, API integration, account forms, company selection, permission-aware navigation and live account views.
- `accounts.css`: responsive account UI using the Phase 1 design system.
- `server/index.js`, `config.js`, `validation.js`, `errors.js`: HTTP entry, environment validation, explicit input allowlists and safe errors.
- `server/auth/`: credential validation, session/CSRF management, rate limiting and recovery.
- `server/tenancy/`: mandatory authorized company context and company/member endpoints.
- `server/customer/`: personal profile and own-scope module foundations.
- `server/permissions.js`: centralized role catalogue and permission identifiers.
- `server/db/`: transaction/data-access helpers, SQL migration, checksum-based migration runner and expired-record cleanup.
- `server/admin.js`: separate privileged operator command for platform grants.
- `package.json`, `package-lock.json`, `.env.example`, `.gitignore`: runtime dependencies and safe configuration foundation.

## Local setup

Use Node.js 22.14+ and PostgreSQL 16+. Provision an empty PostgreSQL database and database login locally; no database credentials or defaults are supplied. Copy and edit configuration:

```powershell
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Put the generated random secret, your database connection and exact browser origin in `.env`, then:

```powershell
npm.cmd ci --no-audit --no-fund
npm.cmd run db:migrate
npm.cmd start
```

Open `http://localhost:3000`. `npm.cmd run dev` enables Node watch mode. Use `npm` instead of `npm.cmd` on Linux/macOS. This Windows host blocks the `npm.ps1` shim, so commands use `npm.cmd`. Real accounts require the Node server and same-origin API; no separate frontend server is needed. There is no build step. Opening `index.html` directly still supports the fictional preview and explains that account services need the backend.

`.env`, dependency directories, local npm cache and logs are ignored. No real credentials, users, companies or default passwords are included. Migrations were not executed because no database credentials were provided.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Required PostgreSQL connection string |
| `SESSION_SECRET` | Required random secret, at least 64 characters, for CSRF/rate-limit HMACs |
| `APP_ORIGIN` | Exact browser origin, default `http://localhost:3000` |
| `NODE_ENV` | `production` requires HTTPS and enables Secure cookies/HSTS |
| `PORT` | Default `3000`; Railway supplies its port |
| `DATABASE_SSL` | `disable` for local/private transport or `require` for verified TLS |
| `TRUST_PROXY_HOPS` | Default `0`; set only for the real trusted proxy topology |
| `SESSION_ABSOLUTE_HOURS` | Default `168`, maximum `720` |
| `SESSION_IDLE_HOURS` | Default `12`, maximum `72` |
| `SMTP_HOST`, `SMTP_PORT` | Optional recovery SMTP server; default port `587` |
| `SMTP_SECURE` | `true` for implicit TLS; otherwise STARTTLS is required |
| `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Required with SMTP host to enable email recovery |

Do not add conflicting SSL options to `DATABASE_URL`. A trusted provider certificate is required when TLS is enabled; do not disable certificate verification. SMTP credentials and verified sender setup are operator responsibilities. Registration does not yet verify email ownership or business credentials.

## Schema and migrations

`npm.cmd run db:migrate` applies pending migrations transactionally under a PostgreSQL advisory lock. Applied checksums prevent editing migration history. The role catalogue has its own versioned entry; future changes must add a catalogue version rather than modify an applied definition silently. Only role/permission definitions are seeded.

| Table | Foundation |
| --- | --- |
| `users` | Normalized unique email, display name, password hash and status |
| `customer_profiles` | User-owned phone, city and preferred language |
| `companies` | Business profile, private contact fields, publication flag and status |
| `company_memberships` | Unique user/company membership, company-scoped role and status |
| `roles`, `permissions`, `role_permissions` | Central authorization catalogue |
| `platform_admin_grants` | Separate operator-controlled platform privileges |
| `sessions` | Hashed random tokens, user, active company, idle and absolute expiry |
| `password_reset_tokens` | One-time reset hashes and expiry; never plaintext tokens |
| `audit_events` | Account, session, company, membership and operator security changes |
| `rate_limit_buckets` | Shared fixed-window counters with HMAC identifiers |
| `schema_migrations` | Applied migration names and checksums |

No notifications table is needed yet. `npm.cmd run db:cleanup` removes expired sessions, reset hashes and rate-limit buckets; audit events, reviews and invitation history are retained. Schedule cleanup through the operator’s chosen scheduler later.

## Authentication and recovery

Register at `/#/register`. Registration creates a personal account/customer profile; role and privilege fields are rejected. A company is registered separately after signing in. Passwords require 12–128 characters and use Argon2id with 64 MiB memory, three iterations and one lane. Unknown-account login performs dummy hash verification and returns the same error as an incorrect password.

Session identifiers are random 256-bit opaque tokens; only SHA-256 hashes are stored. Cookies are HttpOnly, SameSite=Lax, host-only, path `/`; production uses Secure and the `__Host-` prefix. Login/registration rotate the session. Anonymous CSRF sessions expire after one hour. Authenticated sessions enforce both absolute and idle expiry. Logout removes the current session; logout-all and password reset revoke all account sessions. Disabled users are rechecked by protected operations. No credentials or auth tokens enter browser local/session storage.

Every mutation, including registration/login/recovery, requires JSON, exact Origin and a session-bound HMAC CSRF header. `/api/auth/session` supplies the in-memory CSRF token. No CORS access is enabled. API responses use no-store. PostgreSQL rate limits cover API traffic, login IP/account, registration, recovery IP/account, reset attempts, company creation and adding members. Set proxy trust correctly so forwarding headers cannot bypass IP controls.

Without SMTP, recovery returns explicit unavailability without an account lookup, token or email claim. With SMTP, it returns a generic 202 before account lookup or delivery. A best-effort in-process worker sends an active account a 30-minute, one-use link. Failure invalidates the token. Raw tokens exist only in transient memory and the recipient’s email link, never API responses, logs or database records. The reset page immediately removes the fragment token from the address bar; refreshing requires reopening the link. Reset does not automatically sign in.

This worker is not a durable mail queue: process shutdown may interrupt delivery. Responses do not promise delivery. Durable encrypted jobs, email verification and MFA remain later hardening work.

## Membership and authorization

Company creation atomically inserts the company, its initial owner, audit event and active session selection. Users may belong to multiple companies. The picker lists active memberships in active companies only. Company ownership is never granted from a client role selection.

| Role | Initial access |
| --- | --- |
| Distributor Owner | Company settings/members/security events and all module shells |
| Sales | Leads and quotations |
| Supervisor | Projects and customer service |
| Field Engineer | Assigned-installation scope only |
| Inventory Manager | Inventory |
| Accounts | Accounts |
| Customer | Own profile and future own enquiries/quotations/orders/installation |
| Platform Administrator | Separate platform security-event access; no implicit tenant access |

Company roles also have basic company/workspace access, subject to lifecycle restrictions. Owners can add an existing registered account in a staff role, or use Phase 3 secure invitations. Direct member addition sends no email. Owners can change staff roles, suspend, restore or remove staff membership. Owner membership cannot be changed through staff endpoints; ownership transfer is deferred. This protects the initial owner from accidental removal.

Platform privileges require an existing account and trusted database-operator access. `npm.cmd run admin:grant` and `npm.cmd run admin:revoke` read one JSON object containing `email` and an operator `reason` of at least 10 characters from stdin, followed by EOF. Restrict shell/database credentials. The commands audit the action and revoke account sessions. No HTTP grant route, public administrator registration or hardcoded admin exists.

## Tenant isolation contract

Every private company repository must use `withCompany` in `server/tenancy/context.js`. Its transaction rechecks/locks the active account/session, validates the expected `X-Company-ID` against the server selection, checks current active membership/company status, then reads permissions from PostgreSQL. It supplies an immutable authorized tenant context. The expected-company header prevents stale-tab mutations; it never grants access to an arbitrary company. Company selection itself validates membership.

Queries explicitly scope by `ctx.companyId`; membership updates include tenant and record ID. Revoked selections are rejected immediately on protected requests and cleared at session retrieval. Customer queries use authenticated `user.id`. Public vendor API responses use the Phase 3 published-field allowlist above; only explicitly public contacts are exposed. Private business email/phone and internal records are excluded. Errors never return stack traces or database details; logs exclude request bodies and secrets.

Isolation is enforced by application repositories, not PostgreSQL row-level security. Future modules must use `withCompany`, the specific permission, non-null company foreign keys, tenant-qualified CRUD and tenant-safe child relationships. Assigned work additionally requires an authenticated assignee filter; customer records require authenticated ownership. Module metadata endpoints access no operational records. Never reuse a company-wide query for field engineers. Hidden navigation and UUIDs are not authorization.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/auth/session` | Identity, memberships, capabilities, recovery availability and CSRF |
| `POST /api/auth/register`, `/login` | Register / validate credentials and rotate session |
| `POST /api/auth/logout`, `/logout-all` | Revoke current/all sessions |
| `POST /api/auth/recover`, `/reset-password` | Request recovery / consume one-time token |
| `POST /api/companies` | Create company and initial owner atomically |
| `POST /api/companies/select` | Authorize and select company |
| `GET`, `PATCH /api/companies/current` | Private profile read / owner update |
| `GET`, `POST /api/companies/current/members` | Owner membership list / add registered account |
| `PATCH /api/companies/current/members/:membershipId` | Owner staff-role/status update |
| `GET /api/companies/current/audit` | Owner company security events |
| `GET /api/companies/current/modules/:module` | Authorized future-module metadata |
| `GET`, `PATCH /api/customer/profile` | Authenticated user’s own profile |
| `GET /api/customer/modules/:module` | Own-scope future-module metadata |
| `GET /api/public/vendors/:id` | Published-field allowlist |
| `GET /api/platform/audit` | Separate platform-admin security events |

Mutations reject unknown body keys and require `X-CSRF-Token`, JSON and exact Origin. `/companies/current` calls also require `X-Company-ID`. Same-origin cookies carry the session. The frontend supplies these headers. Errors have `{error:{code,message,requestId}}`. Module metadata returns `enabled:false`; it never invents business records.

## Preserved interface and boundaries

All Phase 1 public, customer, distributor and SIA routes remain. Added account routes: `/#/customer/login`, `/#/register`, `/#/recover`, `/#/reset-password`, `/#/companies`. Existing distributor login and onboarding are now real forms. Workspace routes outside demo mode require a session and authorized membership. Real accounts never display fictional operational records; `?demo=1` inside the hash explicitly opens Phase 1 layouts without private API access. Example: `/#/distributor/dashboard?demo=1`.

Warm marketplace/burgundy workspace styling, mobile navigation, shared states, English/Malayalam/Tamil navigation and partial-translation notices remain. Profile language preference is persisted. The Phase 1 `themeDefaults` preview still exists in explicit demo mode with local object URLs. Real-company branding is now persisted through the Phase 3 theme model and validated logo URLs. MY SOLAR identity stays separate from distributor identity. The reusable `avatar()` remains the replaceable SIA placeholder.

Registration, login/logout, own profile, resumable company setup, persistent branding, invitation acceptance, membership management, company switching and platform review are implemented. Marketplace search, quotations, inventory, installation, finance, service, SIA execution, billing and payments remain future-phase features. No payment gateway was added. Ownership transfer, email verification, MFA, durable email delivery, file storage, domain verification and full translations remain deferred.

## Railway setup and handoff

The Node service listens on `0.0.0.0` and Railway’s `PORT`, uses PostgreSQL instead of filesystem state and handles SIGTERM. For later deployment, configure PostgreSQL, a fresh secret, HTTPS `APP_ORIGIN`, `NODE_ENV=production`, trusted proxy hops and the provider’s database TLS requirements. Install with `npm ci --no-audit --no-fund`, use `npm run db:migrate` as a controlled pre-deploy migration command and `npm start` as the service command. No deployment or readiness check was performed.

Manual setup remains: provision PostgreSQL, fill the ignored `.env`, apply migrations, optionally configure SMTP/verified sender and grant a platform administrator only if needed. Dependencies installed successfully; database, server and email workflows were not executed.

Phase 10 must verify tampered IDs/cross-tenant child relationships, customer ownership, CSRF, cookie/proxy/TLS behavior, duplicate/concurrent requests, session expiry/revocation, membership races, reset replay/expiry/delivery failures, multi-instance rate limits, migration constraints, accessibility, responsive behavior, translation and preserved demos, alongside the Phase 3–4 concerns above. Production log retention and operational policies also require decisions. None of these are represented as tested. Phase 4 implementation is ready for Phase 5 development, subject to the planned verification phase; Phase 5 has not started.
