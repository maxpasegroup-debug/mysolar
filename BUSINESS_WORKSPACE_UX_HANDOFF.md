# MY Solar Solutions — unified entry and daily workspace

19 October 2026. Implements the approved UI direction over existing onboarding, setup, marketplace, operations, permissions and subscriptions. No live provisioning or deployment was performed.

## Entry and saved progress

The business journey now shows three stages: **Your account → Your company → Your workspace**. Customer registration remains separate and unchanged. Distributors and installers use one business account flow. Two accessible checkboxes allow distributor, installer or both; the selection maps to the existing `distributor`, `installer` and `both` values. Supplier and arbitrary Other business types are not advertised or accepted.

Company entry asks for supported essential fields and the business types. The existing transactional company-creation endpoint now accepts optional `businessType`, validates the existing enum, and persists it in the existing profile alongside atomic owner/session creation. Older callers omitting the field retain the distributor default. No new schema or migration is required. Selection never grants permissions or activation.

After successful creation the user reaches the setup-focused dashboard. The remaining profile, public identity and services/coverage forms remain resumable and revision-controlled in PostgreSQL. Their three saved-task cards and separate activation-review link replace the four-step numbered presentation. Legal/contact requirements, independent review, suspension, publication, role authorization and commercial guards are preserved. Entering a dashboard is not permission to use inactive operations.

Existing selected companies get a resume action rather than another blank creation form. Users with other existing memberships get company selection. Creating a separate company remains an explicit `?new=1` choice. This is a UI duplicate-prevention measure, not a company-name uniqueness guarantee or a replacement for checking actual memberships.

## Dashboard and facilities

- Draft/onboarding/pending-review/suspended owners see saved setup, the next permitted action, the three facilities and review history. Status follows the returned lifecycle; no automatic activation or publication occurs.
- Active companies retain the existing Today endpoint and permission/assignment-scoped business records, priorities, collections, recorded activity and first-record guidance. The primary action row is limited to two role-relevant actions; optional SIA remains accessible where authorized. Owner setup guidance can be expanded separately.
- **My Public Profile**, `/#/distributor/public-profile`: actual publication state, public identity, coverage and offers management links, and the existing review/activation actions. Marketplace approval and publication remain separate. The public-view link appears only for a recorded published storefront; the backend still enforces publication eligibility.
- **Business Workspace**, `/#/distributor/dashboard`: Today or continuing setup according to actual lifecycle. Plan/access links use the existing subscription page. No plan name, renewal date, paid state, metric or percentage is invented.
- **Your Branded Platform**, `/#/distributor/white-label`: consultation information and a WhatsApp draft to the owner-approved Indian number **+91 8136906653**. The company name is URL-encoded in the prepared message. It is opened with safe external-link attributes. Opening the link performs no submission, database insert, notification or delivery acknowledgement. The user must review/send it in WhatsApp. No custom domain is connected by this screen.

Publication metadata on the existing Today endpoint is limited to company setup-authorized users and queried for the authenticated company. Employees receive `company: null`; they do not get company-administration facility links. Existing tenant/session/role/entitlement checks remain authoritative. Unknown publication metadata is labeled unavailable rather than assumed live or unpublished.

## Navigation and responsive behavior

Core navigation is **Today, Sales, Work, Customers, Company**. Related existing destinations are grouped beneath those labels and filtered by current role and activation status. Financial records, inventory, procurement, employees and partner features remain reachable through their permitted groups. Notifications, company switching, marketplace and sign-out remain utility actions. No route or existing business module was removed. Contextual workflow links remain available.

The burgundy/gold theme and existing logo/header are preserved. Facility cards use three columns on larger desktop screens and stack at tablet/mobile widths. The three-stage indicator adapts to narrow screens; field groups retain labels and existing keyboard/form behavior. Existing mobile navigation, loading/error feedback, focus styles and partial-language support are retained. No full translation coverage is claimed.

## File inventory

| Files | Change |
| --- | --- |
| `src/workspace.js` | Shared stages, multi-select mapping, grouped navigation, facility cards and WhatsApp draft |
| `src/account.js`, `src/onboarding.js` | Unified business presentation, essential company entry, resume guard and dashboard continuation |
| `src/organization.js` | Setup-focused dashboard, saved-task checklist and facility detail pages |
| `src/operations.js` | Today integration, shorter primary action row and optional SIA |
| `src/app.js` | Registered facility routes and removed duplicate settings navigation |
| `organization.css` | Responsive stages, facility cards and form/focus presentation |
| `server/tenancy/routes.js` | Backward-compatible optional business-type persistence in existing transaction |
| `server/operations/read.js` | Tenant-scoped publication metadata for authorized owners |
| `sw.js` | Advance static cache version; private API/session caching exclusions preserved |
| `tests/workspace-ui.test.mjs` | Mapping, navigation uniqueness, truthful statuses, stages and draft-link behavior |
| `tests/company-onboarding-acceptance.integration.test.mjs` | Persisted both type, unsupported/status input rejection and owner/staff metadata boundaries |
| `scripts/browser-check.mjs` | Updated checkbox expectations; setup, public-profile, resume and consultation checks at six widths |
| `README.md`, this handoff | Current behavior, validation and release boundaries |

No dependency, migration, environment-variable change, production write, credential generation, invitation sending, domain provisioning, commit, push or release was performed. Owner-confirmed private onboarding data was not embedded in the frontend or test fixtures. The public consultation number is the only newly configured contact destination.

## Verification and release boundary

Local verification completed:

- `node scripts/verify-postgres.mjs`: **235 passed, 0 failed, 0 skipped**. Includes existing customer, business, role, isolation, migration/checksum, recovery, subscription, PRO and automation regressions plus updated onboarding and UI tests. Disposable cluster stopped afterward. Log: `.verification/workspace-refresh-db.log`.
- Focused onboarding regression: **13 passed, 0 failed/skipped**, including supplier/status payload rejection before creation, persisted `both`, and owner-only publication metadata. Log: `.verification/workspace-refresh-onboarding.log`. These checks are also in the full suite, not additional distinct tests to add to 235.
- `npm run test:browser`: **180 passed, 0 failed**, at 360, 390, 768, 1024, 1280 and 1440px. Updated cases cover setup facility cards, public-profile access, consultation drafts, resume-before-create and two supported checkboxes. Existing customer/automation/mobile/offline behavior also passed. Log: `.verification/workspace-refresh-browser.log`.
- `npm run build`: **809 static checks passed, 0 failed**. This repository's build is syntax/import/asset validation, not a bundler or deployment. Log: `.verification/workspace-refresh-static.log`.
- Visual inspection of captured setup dashboards at 390 and 1440px: stacked mobile/three-column desktop facilities, clear next action, readable stages and saved setup tasks. Captures: `.verification/browser/setup-dashboard-390.png` and `setup-dashboard-1440.png`. These are explicitly labeled fictional fixture screens; missing publication fixture data correctly shows status unavailable.

All database tests use disposable loopback PostgreSQL; browser scenarios use explicit fictional fixtures. Neither proves live account existence, actual WhatsApp delivery, production worker deployment or successful live owner onboarding. Chrome tests ran outside the execution sandbox using the previously established local verification mechanism, without changing browser security flags.

The single next milestone is to review/release these changes through the authorized release process, then have the owner perform the real onboarding/Today acceptance trial. Do not create another live tenant until existing owner memberships have been checked. Domain hosting, autonomous SIA, external reminder delivery, new supplier-role support and commercial-policy changes remain outside this update.
