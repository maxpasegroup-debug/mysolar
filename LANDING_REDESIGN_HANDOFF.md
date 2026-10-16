# MY SOLAR — premium public landing page

## Scope and architecture

The existing HTML, CSS and vanilla JavaScript application, hash router, Express static-asset allowlist, account/session modules, permission rules and service worker are retained. This change replaces the homepage only. Other public pages and authenticated workspaces keep their existing shells. No framework, animation library, font dependency, payment integration or database migration was introduced.

The homepage does not need catalogue or private business data to render. Category illustrations link into the real published catalogue. Business preview records are explicitly fictional and do not issue business API requests. Actual listing availability, prices and vendor information remain in the existing marketplace.

Implementation structure: cinematic hero → four audiences → interactive category discovery → four-step customer journey → interactive business workspace preview → SIA → product values → two-path conversion → complete footer. Existing burgundy and gold branding is supported by warm ivory and deep forest green. Local system sans-serif and Georgia provide the typography without external font requests.

## Files

| File | Purpose |
| --- | --- |
| `src/landing.js` | Modular homepage, header/footer, category selector, business preview and motion lifecycle. |
| `landing.css` | Isolated landing design tokens, layout, responsive rules, focus states and motion. |
| `index.html` | Load the new assets; update title, description and Open Graph text; add a JavaScript-disabled explanation. |
| `src/app.js` | Delegate homepage rendering/header/footer to Landing; mount and clean up its effects; apply the homepage class and title. |
| `src/marketplace.js` | Route the public homepage directly to its marketing experience instead of embedding a catalogue API response; exclude it from the catalogue focus-refresh hook so focused controls and selections survive. Catalogue/vendor refresh behavior remains in place. |
| `server/index.js` | Add only the five new public assets to the explicit static allowlist. No backend business logic changes. |
| `sw.js` | Version the public static cache and allow the new public assets; preserve API/private-data caching exclusions. |
| `assets/landing-solar.jpg` | Local JPEG fallback, 1536 × 1024; approximately 355 KB. |
| `assets/landing-solar-1536.webp` | Desktop hero artwork, approximately 300 KB. |
| `assets/landing-solar-960.webp` | Smaller hero and lazy-loaded audience image, approximately 120 KB. |
| `LANDING_REDESIGN_HANDOFF.md` | Design, route, review and artwork handoff. |

Pre-existing launch-phase changes in README, package configuration, database tests and launch verification files were preserved. They are separate from this redesign. Local browser-review scripts, screenshots and image-encoding intermediates are under ignored `.verification/`, outside deployment assets.

## Motion and interactions

- Short staggered hero text entrances and an image mask entrance; navigation remains available immediately.
- One-shot Intersection Observer reveals, with staggered siblings and gentle scale entrances for selected compositions. Content is present and visible before observers run.
- Desktop-only scroll parallax, capped at 50 pixels, scheduled through requestAnimationFrame without reading layout each scroll.
- Subtle arrow, border and image hover feedback. Button hit areas remain stationary.
- A native details/summary mobile menu, including Escape-to-close and focus return.
- Two independently operated ARIA tab interfaces: six energy categories and three business workflow previews. Arrow, Home and End keys switch tabs.
- Section links scroll below the sticky header and move keyboard focus to the destination.
- Reduced-motion preferences remove CSS motion and disable JavaScript animation/parallax, including when the preference changes during a visit.
- Observers, animation frames and event subscriptions are cleaned up when the router renders another page.

## CTA destinations

All paths below are existing application hash routes (`#/...`).

| CTA | Destination |
| --- | --- |
| Explore solar solutions / browse catalogue | `/products` |
| Category exploration | `/products?search=solar`, `inverter`, `battery`, `mounting` or `equipment` |
| Service providers / find a distributor | `/vendors` |
| Customer audience | `/customer` |
| Solar business / installer / distributor / grow with MY SOLAR | `/distributor` |
| Dealer / set up company / start with your company | `/distributor/onboarding` |
| Get started / create account | `/register` |
| Customer sign in | `/customer/login` |
| Business sign in | `/distributor/login` |
| SIA purchase assistant | `/customer/sia` |
| SIA Virtual CEO | `/sia` |
| App and offline information | `/app-info` |
| Platform administration | `/platform`, displayed only with the existing platform read permission |
| Catalogue administration | `/platform/catalogue`, displayed only with the existing catalogue read permission |
| How it works / the platform / scroll cue / back to top | Local section navigation; route-shaped hrefs also resolve after a normal router navigation. |

The existing backend retains responsibility for authentication and permissions. Public links do not grant access to protected screens. Categories are general educational starting points, not inventory or product listings; searches can legitimately return no published results.

## Missing destinations and operator decisions

- There are no dedicated installer or dealer onboarding journeys. They use the existing shared business entry/onboarding paths; no extra business roles or privileges were invented.
- No existing public privacy-policy or terms-and-conditions route was found. No fictional legal documents or dead links were added. Approved legal content and its publication remain a launch requirement.
- No configured public platform support address was found. No phone number, email address or support promise was invented.
- The existing language selector is available in the landing footer. Navigation translation remains the application's existing partial language preview; the new editorial copy still needs approved Malayalam and Tamil translations.
- SIA uses its existing replaceable placeholder. The page discloses the current unavailable AI-provider configuration; no model response or live external intelligence is simulated. Update that status copy if the operator changes provider configuration.

## Accessibility, performance and review

The design covers 320-pixel mobile through wide desktop, with stacked mobile actions, a vertical mobile journey, wrapping category selectors and a readable three-column workflow illustration. Decorative images have empty alternative text; meaningful destinations carry text labels. Controls retain visible keyboard focus and touch targets. No information depends on motion alone.

The hero is eager/high-priority and has responsive WebP sources plus a JPEG fallback. The audience image is lazy-loaded and reuses the smaller artwork. Images have declared dimensions. Assets are local, with no third-party image/font requests. No video background or continuously running scroll animation was added. No performance score is claimed.

The existing application is client-rendered and uses hash routes. Metadata improves the base document, but this task does not add server rendering or guarantee crawler/social-preview behavior. A noscript description explains the JavaScript requirement. Canonical URLs and absolute social-image URLs were omitted rather than assuming a deployment origin.

Focused local browser review is documented in `.verification/landing/review.json` and nine screenshots in that directory. The isolated review uses a deliberately unavailable local database to confirm honest public rendering, not production data or authenticated end-to-end workflows. All 17 focused observations completed successfully after corrections: homepage rendering without database access, image loading, meaningful category/business selection, real keyboard tab navigation and ARIA updates, no horizontal page overflow at 320/390/768/1024/1440/1920 pixels, native mobile-menu opening, Escape/focus return, reduced-motion behavior, existing customer sign-in and business demo shells, and no uncaught JavaScript exceptions. The expected unavailable-session API response is recorded by the isolated server; this is not a claim of an error-free production API.

Visual inspection covered the desktop hero, discovery, business preview, SIA and footer, plus small/mobile heroes, audience and business sections. The review found and corrected a narrow-screen decorative orbit overflow and an existing marketplace focus-refresh handler rebuilding the marketing homepage during keyboard interaction. Business-preview text was enlarged for readability. No comprehensive test suite, database migration, Railway change or deployment was performed.

Manual review still needed: open the homepage in real Safari/iOS and Android browsers; try a screen reader; review the final copy and language options; follow customer/business CTAs through real account onboarding in the separately planned launch verification. Confirm the published privacy, terms and support information before launch. No production readiness claim is made by this design handoff.

## Artwork provenance

Generated using the built-in imagegen tool, then encoded locally with a browser canvas into JPEG/WebP. Artwork is visibly labelled as an AI-generated illustration, never as a real customer installation. The original generated image stays outside the deployment; all consumed assets are stored in `assets/` above. No permanent SIA avatar or replacement MY SOLAR logo was generated.

Final generation prompt:

> Use case: photorealistic-natural. Asset type: premium MY SOLAR website hero photograph, wide landscape 1536x1024. Cinematic architectural editorial photograph of a contemporary low-rise Kerala house with broad dark blue photovoltaic panels securely mounted on its flat rooftop, lush coconut palms and soft wooded hills behind, warm early morning sunlight, pale hazy golden sky. Foreground close perspective of crisp realistic solar cells occupying bottom right; house sits middle-right; left half quieter dark tree canopy with space for white website text overlay. Rich deep forest green, warm ivory architecture and natural gold highlights, subtle analog grain, quiet aspirational atmosphere, believable Indian residential architecture, restrained luxury architectural photography. No people, no text, no logos, no watermark, no batteries, no floating objects, no infographics. This is decorative illustrative imagery, not a specific real installation.
