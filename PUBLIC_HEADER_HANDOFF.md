# MY Solar Solutions — shared public header and supplied logo

## Implementation

The existing HTML/CSS/vanilla-JavaScript application, hash router, authentication and company onboarding are reused. One shared public-header component now serves the homepage, marketplace, informational pages and public authentication screens. Authenticated workspaces retain their existing navigation and tenant-specific branding.

Desktop order: supplied logo → Explore Solar → For Businesses → Learn → flexible space → Log In → Get Started. Signed-in users see My Workspace instead of another login link. The primary CTA is deep green, supported by restrained gold accents, warm white surfaces and subtle borders/shadows. The sticky header gains a light shadow after scrolling. No landing-page sections were redesigned.

The latest supplied burgundy/gold `My Solar Solutions Logo.png` is copied byte-for-byte into `assets/my-solar-solutions-logo.png`. It replaces the generic platform wordmark wherever the common `brand(false)` helper is used, including public footers and the customer platform identity. `brand(true)` and company logos remain unchanged. Gloss, a soft raised surface and highlights are CSS presentation; the supplied artwork, lettering, colours and proportions were not regenerated or edited. The earlier eco logo is not used. Existing favicon/PWA icons were not replaced.

The source PNG is 2091 × 752 and approximately 1.18 MB. Preserving it unchanged takes priority here; optional image-delivery optimization can be considered later without changing the approved artwork.

## Files changed

| File | Purpose |
| --- | --- |
| `src/public-header.js` | Central menu definitions, shared logo presentation, role-aware workspace links, dropdowns, mobile drawer and journey selector. |
| `public-header.css` | Scoped header/logo/menu/dialog styling, responsive behavior, focus indicators and reduced-motion rules. |
| `assets/my-solar-solutions-logo.png` | Exact copy of the latest user-supplied logo. |
| `index.html` | Load the new stylesheet and component before app initialization. |
| `src/app.js` | Use the shared public header and platform logo; clean up and mount header behavior during router rendering. |
| `src/landing.js` | Delegate the earlier landing-specific header to the shared component; move the language selector into Learn to avoid duplicate control IDs. |
| `server/index.js` | Extend only the existing explicit public static-asset allowlist. |
| `sw.js` | Add public header assets and advance the public static cache version. Existing private/API caching exclusions remain. |
| `PUBLIC_HEADER_HANDOFF.md` | Route map, decisions, review evidence and remaining verification. |

Existing uncommitted launch-phase work in README, package configuration and database verification files was left untouched. No dependencies, database schemas, environment files, Railway variables, commercial entitlements, payment behavior or SIA configuration were changed. No production deployment or data change was performed.

## Actual menu routes

All internal paths below use the application's existing `#/...` routing.

| Group | Label | Route / behavior |
| --- | --- | --- |
| Brand | MY Solar Solutions | `/` |
| Explore Solar | Solar Solutions | `/products` — real published catalogue; empty results remain honest. |
| Explore Solar | Find Solar Providers | `/vendors` — published distributor profiles and declared service areas, not a fabricated installer directory. |
| Explore Solar | Request a Quote | `/customer/enquiry/new` — existing guarded enquiry flow. |
| Explore Solar | Compare Quotations | `/customer/compare` — existing guarded enquiry selector/comparison, not product or brand comparison. |
| For Businesses | Business Platform | `/?section=platform` — existing landing-page business section. |
| For Businesses | Distributors | `/distributor` — existing business entry page. |
| For Businesses | Business Log In | `/distributor/login` — existing account login and authorized company selection. |
| For Businesses | Become a Partner | `/distributor/onboarding` — explicitly described as distributor company onboarding. |
| Learn | How MY SOLAR Works | `/?section=journey` — existing four-step customer journey. |
| Learn | App & Offline Guide | `/app-info` — existing installation/offline information. |
| Learn | Interface language | Existing English/Malayalam/Tamil selector; some content remains English. |
| Header | Log In | Existing `/customer/login`, wrapped in `Journey.authPath()` to retain an existing safe return intention. |
| Header | My Workspace, signed in | `/platform` with the existing platform-company read permission; otherwise `/companies` for company members, or `/customer/dashboard`. |
| Header | Get Started | Opens the local journey selector; no backend operation. |
| Journey selector | I want solar for my home or business | `/register?journey=customer`, preserving an existing safe return intention; signed-in users go to `/customer/dashboard`. |
| Journey selector | I'm a solar distributor | `/register?journey=distributor`, whose existing registration handler continues to company onboarding; signed-in users go to `/distributor/onboarding`. |
| Journey selector | Explore solar first | `/products` |
| Journey selector | Installer/dealer business overview | `/distributor`, with an explicit statement that separate onboarding journeys are unavailable. |
| Authorized operators only | Platform administration | `/platform`, shown only with `platform.companies.read`. |
| Authorized operators only | Catalogue administration | `/platform/catalogue`, shown only with `catalogue.read`. |

Existing server authentication, tenant isolation, record ownership, permissions and CSRF remain responsible for access and mutations. Public menus do not grant access. Anonymous menus contain no platform-admin or internal business-dashboard links. No arbitrary external or unvalidated redirect target was introduced.

## Proposed destinations intentionally omitted

- Design Your Solar System: no implemented solar-design experience was found.
- Compare Products & Brands: no product/brand comparison interface was found. The existing quotation comparison is labelled accurately.
- Separate Solar Installer and Dealer registration: no distinct supported onboarding routes or role choices were found. The shared business overview remains available, with distributor company onboarding prioritized.
- Solar Basics, How Solar Works as technical educational articles, Installation Guide, Financing Information and FAQs: no corresponding published content pages were found. Learn contains the existing platform journey and app/offline guide, without inventing technical, financing, subsidy or savings claims.

## Interaction and accessibility

Menus open by clicking semantic buttons. Each trigger has `aria-expanded` and `aria-controls`; only one disclosure is open at a time. Clicking outside or moving focus outside the header closes disclosures. Escape closes a disclosure and restores its trigger. ArrowDown/ArrowUp open menus and move through links; Home/End work inside a disclosure; desktop Left/Right move between triggers. Normal Tab navigation is retained. Native select-key behavior is preserved for the language control.

Below 1000 pixels the same navigation DOM becomes a drawer with accordion groups, a visible close button and generous touch targets. The background is made inert, document scrolling is temporarily locked, and keyboard focus stays in the drawer. Escape closes an expanded group first, then the drawer; close buttons and the scrim close it directly. Closing restores prior inert states and focus. Navigation closes the drawer without reconstructing a typed form. At small widths the compact Get Started button remains beside the logo where it fits; below 360 pixels it stays available inside the drawer.

Get Started uses a native modal dialog with a visible close button, Cancel, backdrop dismissal and explicit Escape handling. Native modal focus containment is retained. Customer/distributor choices are links to existing flows, not a second registration system. Background scroll locks are removed on close or route cleanup.

Listeners use AbortController and scroll updates use a single scheduled animation frame. Route changes clean up listeners, frames, scroll locks and inert state. CSS motion respects reduced-motion preferences. The sticky header stays below 105 pixels at reviewed widths; existing landing anchor offsets accommodate it.

## Lightweight local review

A focused Chromium review completed **38 observations successfully**, covering:

- The supplied logo loading at its correct dimensions and matching SHA-256 hashes between source and repository copy.
- Desktop menu order, click switching, outside closing, arrow navigation, Escape and focus return.
- Get Started opening supported journeys and closing/unlocking with Escape.
- Layout at **360, 390, 768, 1024, 1280 and 1440 pixels**, without horizontal overflow or oversized header rows; desktop dropdowns stay inside the viewport.
- Mobile drawer isolation, accordion fit, Escape restoration and Tab/Shift+Tab focus containment.
- Typed login-form preservation and existing language selection without erasing form input.
- Existing quotation-route UI guards and safe return intent, using an anonymous session fixture.
- Workspace links for a customer fixture and administration links for a platform-operator fixture.
- Reduced-motion styling and no uncaught JavaScript exceptions.

Evidence: `.verification/header/review.json` and seven screenshots (`desktop-header`, `desktop-explore`, `desktop-business`, `journey-selector`, `mobile-navigation`, `mobile-header`, `mobile-selector`). These are local ignored review artifacts, not deployment assets. The review used an isolated loopback server and browser with temporary in-memory session fixtures; it did not authenticate real users, access production, run database migrations or exercise live business operations. Repository and Railway environment configuration were unchanged.

An initial review found inconsistent Escape dismissal in the native dialog under keyboard automation. Explicit Escape handling was added; the final focused review passed. No comprehensive test suite, audit, build or deployment was run.

## Remaining Phase 10 / manual work

Review on actual Android and iOS/Safari devices and with a screen reader. Recheck real customer registration → quotation return navigation and distributor registration → company onboarding against a configured database during the planned verification. Validate role-specific workspace choices using real accounts, plus any existing regression checks that expect the previous public menu selectors. This local UI review is not a production authentication or tenant-isolation certification.

Approve future educational content and installer/dealer onboarding requirements before adding those destinations. Complete approved Malayalam/Tamil translations; this change preserves the existing language foundation without claiming a fully translated interface.
