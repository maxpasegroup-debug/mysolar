# MY SOLAR — Phase 7 implementation handoff

Phase 7 implements the white-label customer experience and mobile web foundation over Phases 1–6. This is an implementation report, without a claim of runtime verification. Phase 8 has not started. No tests, test suites, linting/formatting checks, audits, builds, server startup, migrations or deployment-readiness checks were run.

## 1. Architecture reused and extended

The existing static HTML/CSS/classic JavaScript frontend retains its hash router, shared layouts, explicit fictional demo and Account/Organization/Marketplace/Purchase/Operations modules. New Experience and Journey modules compose these features. Locale helpers were extracted into a shared I18n module. There is no framework replacement or new dependency.

Express and PostgreSQL retain sessions, CSRF, trusted company selection, database permissions, tenant-scoped repositories, customer ownership, publication views, decimal-safe commercial snapshots and explicit business actions. New read endpoints supply an overview and document metadata; existing operational endpoints remain authoritative. No schema changes or migration 007 are needed.

## 2. Files created or modified

Created:

- `server/marketplace/presentation.js`: validated public branding, safe defaults and customer commercial-identity fallback.
- `server/customer/experience.js`: authorized, bounded customer overview and document metadata.
- `src/locale.js`: centralized existing English/Malayalam/Tamil labels and exact INR display.
- `src/journey.js`: validated same-app route intent and recent public storefront context in memory.
- `src/experience.js`: storefront, dashboard, tracking, documents, field work, mobile navigation and connected-web-app information.
- `src/pwa.js`: secure-context service-worker registration and browser-conditional installation prompt.
- `experience.css`: responsive storefront/customer/field presentation, focus and reduced-motion rules.
- `manifest.webmanifest`, `sw.js`, `offline.html`, `offline.css`: shared web-app identity, static caching and public offline fallback.
- `assets/app-mark.svg`, `assets/app-192.png`, `assets/app-512.png`, `assets/apple-touch-icon.png`: generic shared MY SOLAR sun/panel marks, produced with native drawing primitives. They are neither distributor logos nor a SIA avatar.
- `PHASE_7_HANDOFF.md`: this report.

Modified:

- `index.html`, `server/index.js`: assets, metadata, CSP worker/manifest directives, manifest MIME, router registration, stale-account mutation guard and static allowlist.
- `src/app.js`, `src/account.js`: route integration, sign-in return paths, navigation, session refresh, public entry copy and form-preserving connection/language/menu handling.
- `src/marketplace.js`: shared offer renderer, canonical storefront links, translated pager labels and public refresh behavior.
- `src/operations.js`, `src/purchase.js`: shared exact money display; reused commercial/action renderers; operational validation feedback focus.
- `server/marketplace/public.js`: company-specific offer filters, canonical metadata and safe public brand presentation.
- `server/operations/customer.js`: owned-record branding, confirmation/fulfilment fields, customer-safe collection entries and related owned records.
- `server/purchase/service.js`: preferred-history filtering includes a genuinely selected quotation after validity expires, while retaining its expired status.
- `server/operations/orders.js`: corrected an existing JavaScript string quoting error in the manual-order issuer query discovered during source inspection. No order workflow change was intended.
- `README.md`: current Phase 7 handoff and retained earlier phase history.

## 3. Storefront routing and branding

Canonical route: `/#/storefront/<company UUID>`. UUID identity avoids collisions between distributor names; input is validated and normalized before lookup. Existing `/#/vendor?id=<UUID>` and `/#/storefront?company=<UUID>` links remain aliases to the same presentation. The explicit demo preview remains separate.

The API resolves actual `marketplace_vendors` records. Active lifecycle, current approval/review and explicit publication requirements remain in the existing public views. Company offers also require current approval, publication and eligible product definitions. Search/category/page filters apply inside the selected company's offers. Public description, contacts and bounded service areas are displayed. There is no fabricated availability, distance, savings or certification.

Branding comes from persisted public projections. Colors require six-digit hex; primary/secondary colors fall back if unreadable against white. Accent text is chosen for contrast. Logos require configured HTTPS raster-image hosts with no credentials, query or fragment; invalid/missing/failed logos use the generic sun mark. Theme variables stay on relevant storefront/customer surfaces. The marketplace and installation manifest remain MY SOLAR. Missing/unpublished/suspended storefronts share a useful unavailable state without review/lifecycle reasons. Existing requested-domain configuration remains a foundation only; no DNS connection is claimed.

## 4. Customer journey integration

Published offers link to their product and explicit enquiry workflow. Sign-in/registration retain a validated intended product/vendor/customer destination instead of submitting anything automatically. Intent is an in-memory relative route, optionally carried in the auth hash; credentials, record data and form contents are not persisted by Journey. Unsafe/external destinations and sensitive query keys are rejected. Verified public storefront context provides a return link from product and customer views.

Existing enquiry recipient review, conversations, quote detail/comparison, clarification, preference, agreement and service actions remain explicit and server-authorized. Preference still does not place an order. No page visit submits a form, marks a quotation viewed, accepts an order, completes a milestone or initiates a financial action.

## 5. Customer dashboard and tracking

`/#/customer/dashboard` reads `/api/customer/experience/overview`. It shows only authorized sections with actual records: active enquiries, unreviewed valid quotations, selected preferred versions, orders awaiting agreement, confirmed orders, installation milestones, issued invoices with recorded balances and open service requests. Each section has a real count, at most four recent records and links to the existing paginated module. Notifications and customer-visible activity are bounded. Empty accounts receive a clear exploration/enquiry action.

`/#/customer/business-record?kind=<orders|projects|invoices|service>&id=<UUID>` reuses existing owned-record APIs and action forms. It shows saved commercial terms, recorded confirmation/schedule/fulfilment, actual milestone records, public updates and related owned records. Critical completed milestones lacking a reference explicitly need clarification. Staff-entered evidence references are not independent verification or downloadable proof. Order, project and collection statuses remain distinct; no progress percentage is invented.

## 6. Document and financial access

`/#/customer/documents?kind=<kind>&id=<UUID>` calls `/api/customer/experience/documents/:kind/:id`. Every request checks the authenticated customer's module permission and record ownership. Quotations exclude drafts; order/invoice reads retain existing visibility rules. The response contains safe record metadata and points back to the authorized saved snapshot. It does not expose private `operations_documents` metadata, evidence URLs or public download paths. Secure storage and file downloads are explicitly unavailable.

Invoice detail reads authoritative totals and net collection sums from PostgreSQL. Collection history contains only customer-safe amount/method/date/reversal fields, with pagination. It excludes private finance reasons, staff identity and provider/reference details. INR presentation uses integer paise without float rounding. Recorded collections are clearly distinguished from bank/payment-provider confirmation. Supplier bills, costs and finance notes stay private.

## 7. PWA and offline fallback

The shared manifest supplies standalone display, root scope, shared name/theme and PNG/SVG icons, including a maskable 512 icon and Apple touch icon. `/app-info` explains installation and connection requirements. The install button appears only when the browser provides an installation event; secure hosting and platform support determine availability. No native mobile application is claimed.

`sw.js` uses a versioned `mysolar-static-` cache and an exact same-origin static allowlist. API requests, non-GETs, query-string requests and unlisted resources bypass caching. Navigations use network only; network failure returns the pre-cached public offline page. HTML app navigations are never stored. Public CSS/JS/icons may be fetched and cached as static resources. No API, session, customer record, quote, invoice, image-host content or private document response is cached by this worker. It has no background sync, action queue or automatic form submission. Installation pre-caches only the offline page, its stylesheet and the generic mark. Storage failure cannot turn an offline page into a business workflow.

Old caches are removed only within this application's static cache prefix. Worker updates do not force `skipWaiting` or reload an open form. Future static changes should bump the worker/cache version. HTTP errors still use their server response; the fallback addresses network failure.

## 8. Mobile field work

`/#/distributor/field` lists the signed-in worker's assigned tasks through the existing paginated operational API. Large cards link to task updates and permitted project/milestone/service screens. Existing completion notes and evidence-reference forms are reused, without requiring a dashboard table first. Role/assignment constraints remain on the server; client filters and hidden links grant no access. Customer details remain available only through already-authorized operational records. Field work requires a connection; uploads and synchronization are unavailable.

## 9. Multilingual and accessibility improvements

Existing English, Malayalam and Tamil navigation dictionaries are centralized in `src/locale.js`; missing translations fall back to English/source labels. New shared pager/search labels extend that foundation. Company/product names remain untouched. Commercial, warranty, safety and financial content is not machine-translated. A partial-translation notice remains; full translation is not claimed.

Layouts collapse to one column, use safe-area insets, readable cards and touch controls. Customer/field bottom navigation supplements existing navigation. Menus support keyboard containment, Escape, ARIA state and inert main content. Focus indicators, explicit labels, validation alerts, image fallbacks and reduced-motion rules were added. Connection events, menus and language changes preserve mounted forms where practical. No performance or accessibility compliance result is claimed.

## 10. Security, privacy and data loading

Read APIs reuse locked authenticated customer context and database grants. Every requested record is ownership-scoped; related records are also company/contact-qualified. Public branding uses eligible projections; existing authorized commercial issuer snapshots are the fallback when a public storefront disappears. Private current brand changes are not exposed via customer records. No staff assignments or internal project discussions are added to customer responses.

Session/CSRF values remain in memory and secure session cookies follow the existing backend rules. Mutations now include the expected signed-in account ID; the backend rejects a mismatched current session, alongside existing company-context and CSRF protections. The header is a stale-context guard, not authorization. Session refresh on private navigation/focus and restored-page refresh reduce stale identity exposure. Generation invalidation prevents old async responses rendering into a new account/company context. Memory reads expire and lists remain bounded; no private record storage was added to localStorage/IndexedDB/Cache Storage.

## 11. Manual setup, limitations and Phase 10 concerns

No new environment variables or dependencies are required. PostgreSQL, the existing ignored environment configuration, migrations 001–006, secure session settings, operator publication/review and actual authorized records must be supplied through the earlier setup process. They were not provisioned or executed in this phase. Logo/image hosts must be explicitly configured. Production PWA registration requires HTTPS; supported localhost development contexts are browser-dependent. The offline page requires a successful worker installation while connected. Serve through the existing Express asset routes rather than opening `index.html` directly.

No repository blocker prevented source implementation. Runtime, SQL integration and browser behavior remain unverified under the user's restriction. Reserve for Phase 10: fresh/upgrade migrations, missing database/config states, cross-customer/company tampering, role/assignment revocation, cross-tab account/company switches with typed forms, expired sessions and failed focus refreshes, lifecycle/publication withdrawal, expired preferences, immutable snapshots, collection reversal/balances, pagination links, sign-in return routes and invitation/recovery coexistence, public aliases, invalid themes/logos, cache contents after logout/account switches, worker update/storage failure/first visit behavior, installation across mobile browsers, safe-area layouts, keyboard/screen-reader interactions and Malayalam/Tamil overflow. Real data and operational policy review are still necessary. Nothing here is presented as verified or production-ready.

## 12. Deferred features

Custom-domain provisioning/ownership verification, secure file storage/download delivery, payment gateways, subscription billing, native Android/iOS apps, full offline synchronization, complete reviewed translations and live SIA AI execution remain deferred. SIA retains its existing replaceable avatar placeholder. The implementation stops at Phase 7 and does not begin Phase 8.
