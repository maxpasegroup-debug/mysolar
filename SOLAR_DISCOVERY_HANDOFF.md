# Explore Solar discovery handoff

## Scope and architecture

Replaced only the public header's Explore Solar rows with an image-led, beginner-friendly discovery panel. Reused the vanilla JavaScript header lifecycle, hash router, shared icon/link helpers, public catalogue APIs, Express static-asset allowlist and public-only service-worker caching. No new dependencies or database changes.

The supplied clarification prioritizes visitors with little solar knowledge. Learning is available directly in the panel without sign-in: what panels, inverters and batteries do, the meaning of the electricity grid, three system types, potential benefits and power-cut limitations. No system sizing, financial savings or backup guarantees are made.

## Files

- `src/solar-discovery.js`: panel markup, public catalogue loading, bounded image samples, brand belt and lifecycle.
- `solar-discovery.css`: scoped ivory/burgundy styling, responsive tiles, disclosure and motion controls.
- `src/public-header.js`: Explore Solar integration and keyboard support for disclosure/brand controls.
- `index.html`: stylesheet and script loading.
- `server/index.js`: allowlist the two new static files only.
- `sw.js`: public static asset list and cache version.
- `SOLAR_DISCOVERY_HANDOFF.md`: this record.

Logo, For Businesses, Learn, login, burgundy Get Started CTA and onboarding journeys are retained.

## Panel and real destinations

1. DISCOVER SOLAR heading and inline About solar explanation.
2. Three visual category tiles with a short description each.
3. On-grid, off-grid and hybrid explanations; qualified benefits and backup caution.
4. Brand names from published catalogue samples, with an honest empty/unavailable state.
5. Explore All Solar Products: `#/products`.

Categories are resolved by actual returned public taxonomy slugs:

| Tile | Existing slug | Route after category lookup | Fallback if lookup fails |
| --- | --- | --- | --- |
| Solar Panels | solar-panels | `#/products?category=<returned UUID>` | `#/products?search=solar` |
| Solar Inverters | inverters | `#/products?category=<returned UUID>` | `#/products?search=inverter` |
| Solar Batteries | batteries | `#/products?category=<returned UUID>` | `#/products?search=battery` |

These slugs are present in migration 004's taxonomy; IDs are not hardcoded into the component. Brand links use `#/products?brand=<encoded catalogue name>`. All routes use the existing marketplace filters. Empty results are possible and do not imply stock or availability.

No dedicated About Solar route exists: education is inline instead of a fabricated link. No complete-system category was found, so that tile is omitted. Existing quotation/provider workflows remain in the application; this panel deliberately focuses on discovery rather than reproducing the previous link list.

## Images and brands

Uses published product `image_urls` when available for the corresponding category. Existing `assets/landing-solar-960.webp` is a labelled solar illustration fallback; `assets/my-solar-solutions-logo.png` is labelled brand artwork for inverter/battery fallbacks. Neither is claimed to depict a real listed product. Image failure returns to the labelled local artwork.

No official manufacturer logo assets or authoritative brand directory were found. The belt uses actual brand-name strings from sampled published listings, not invented logos or popularity rankings. Tata, Adani and Kirloskar are not hardcoded. No partnership/endorsement is implied. The sample is not a complete brand directory.

Only GET `/api/public/categories?page=1` and GET `/api/public/products` are used. One general product page plus at most three missing-category image samples are fetched when opened. A 20-second in-memory cache avoids repeated reads. No public catalogue responses are persisted to storage or cached by the service worker. Text is escaped; product image URLs are restricted to HTTPS image paths and remain subject to the existing server publication rules and CSP.

## Responsive and accessible behavior

Desktop opens by click and supports the existing outside-click, Escape and keyboard behavior. The panel stays within the viewport and scrolls internally on short screens. At widths below 1000px it is an expandable section in the existing drawer, with three compact tiles and a second disclosure for system types/benefits. The drawer retains its close button, focus handling and navigation dismissal.

Six or more unique names can animate, only when their sequence is wide enough for a convincing loop. Few names remain static. Visual clones are inert, hidden from assistive technology and contain no duplicate links. Hover pauses; a pause/resume control is available on desktop. Keyboard focus stops motion. Reduced motion and mobile show a static horizontally scrollable row. No carousel dependency was added.

## Error investigation

Existing marketplace destinations are real; customer quotations/enquiries use existing authentication guards. Source inspection found the application's existing page/API error presentation. No screenshot, failing URL or exact original error text was supplied, so the original root cause cannot be established. An isolated unavailable-catalogue browser fixture confirms that opening Explore Solar preserves the underlying page error rather than hiding or replacing it. Catalogue failures inside the panel have a separate retry and remain honest about unavailable information.

## Lightweight review and remaining work

Focused local browser review uses intercepted empty, fictional populated, few-brand and HTTP 503 catalogue responses. No production catalogue was queried or modified. Reviewed 360, 390, 768, 1024 and 1440px layouts, real returned-category routing, existing fallback images, public product images, brands, pause/hover/reduced motion, keyboard focus/Escape, independent business/Learn menus and onboarding, and preservation of underlying errors. Review outputs are ignored local artifacts under `.verification/discovery/`.

No comprehensive suite, build, audit, lint, migration, environment change or deployment was performed. Phase 10 should cover real database catalogue data and approved image hosts, authenticated roles and workflows, installed service-worker upgrade, slower/offline connections, touch/keyboard and screen readers across browsers. Plain-language content is English; Malayalam and Tamil educational translations remain to be supplied. Exact original page-error diagnosis requires the failing URL/message. Real product photos and official brand logos depend on approved catalogue/assets being supplied.
