# White-label domain foundation — 17 October 2026

This is the first domain-management foundation, not a live white-label hosting release. No domain can be activated through these APIs in this step. No migration was executed, no DNS or Railway configuration was changed, no provider resource was created, and no code was committed, pushed or deployed. No production data was accessed to establish this task's baseline.

## 1. Initial Git and migration baseline

- Branch: `main`; HEAD `eec3080` (`Fix authentication database setup and guard future deployments`). Recent preceding commits are `89f0a1f`, `e45f847`, and `fba79b4`.
- Remote: `https://github.com/maxpasegroup-debug/mysolar.git`. No fetch or remote mutation was performed.
- No staged changes. Thirteen tracked files were already modified and five files were untracked before this work. The pending work is the employee/customer invitations and Boss dashboard implementation.
- Existing modified files: `.env.example`, `README.md`, `operations.css`, `server/customer/experience.js`, `server/index.js`, `server/operations/read.js`, `server/setup/invitations.js`, `server/setup/routes.js`, `src/account.js`, `src/experience.js`, `src/operations.js`, `src/organization.js`, `sw.js`.
- Existing untracked files: `BUSINESS_COMPLETION_HANDOFF.md`, `server/db/migrations/009_shared_invitations.sql`, `server/operations/customer-invitations.js`, `server/setup/invitation-delivery.js`, `tests/business-access.test.mjs`.
- These changes were preserved. `server/index.js` receives additional domain imports/mounts without removing the earlier customer-invitation router. Other files in the existing pending set were not edited by this domain step.
- The repository contains migrations 001, 003–009, plus programmatic `002_role_catalogue_v1`. `server/db/migrations.js` checks hashes; `server/db/migrate.js` uses the existing PostgreSQL advisory lock and transactional runner. Historical SQL and `roleDefinitions` were not modified.
- Migration 010 follows pending migration 009. The earlier authentication-repair handoff records a real 001–008 initialization, but that is historical evidence, not a fresh live-schema inspection. The current environment's applied migration history was not queried. Neither 009 nor 010 was applied by this task.

Architecture remains plain HTML/CSS/JavaScript, Express, PostgreSQL, global users, database sessions, company memberships and server-side permissions. `npm start` runs `server/index.js`; `/healthz` is liveness and `/readyz` compares the migration manifest. The existing `railway.json` declares pre-deploy migrations and `/readyz` health checking. The preceding read-only audit observed unset values in active Railway deployment metadata despite the repository configuration; this discrepancy remains unresolved and was not altered or newly inspected here. Before any deployment, verify the effective config-file path, pre-deploy settings and deployment health check.

## 2. Files created or extended

| File | Purpose |
| --- | --- |
| `server/db/migrations/010_domain_registry.sql` | Domain assignments, lifecycle constraints, lookup/queue indexes, operation history and permission extensions |
| `server/domains/hostname.js` | Strict hostname/HTTP authority normalization and reserved-name policy |
| `server/domains/proof.js` | Bound, hashed TXT challenges and bounded DNS TXT reads |
| `server/domains/service.js` | Registration, verification, revision/idempotency checks, primary selection, blocked provider intent, suspension and removal |
| `server/domains/routes.js` | Authenticated company and platform domain APIs, CSRF, rate limiting and bounded directories |
| `server/domains/resolution.js` | Active-domain lookup and early fail-closed request-host boundary |
| `server/domains/provider.js` | Provider-neutral interface with an honestly unavailable adapter |
| `server/index.js` | Mount host boundary and domain routers while retaining pending business work |
| `server/commercial/policy.js` | Enforce the existing custom-domain entitlement for domain changes, while allowing local suspension/removal after expiry |
| `server/tenancy/context.js` | Allow authorized owners to read their domain registrations when their company is suspended |
| `tests/domain-foundation.test.mjs` | Focused normalization, proof, routing, provider and idempotency checks without a real database |
| `DOMAIN_FOUNDATION_HANDOFF.md` | This consolidated implementation, provider and continuation report |

No new dependency, persistent environment setting, tenant store, user system or duplicate audit system was added. No website editor, domain-management frontend or billing interface was introduced.

## 3. Domain schema, lifecycle and API

`company_domains` records a normalized hostname, immutable company assignment, custom/platform-subdomain kind, primary preference, lifecycle, challenge hash/expiry, proof timestamps, provider identifier/resource reference, provider hostname status, certificate status, revision and created/updated/deactivated timestamps.

A partial unique index permits only one non-removed claim for a hostname. Another permits one current primary domain per company. Company/domain relationships use foreign keys; assignment identity cannot be edited into another company or hostname. A removed row cannot be revived. Historical removed assignments remain available for audit. A new assignment must receive a fresh random challenge. The service also refuses reassignment while a previous provider resource has not been marked removed.

Lifecycle:

- `pending`: reserved with a time-limited ownership challenge; not routable.
- `verified`: a matching DNS proof was observed; still not routable.
- `active`: represented in the schema and resolver, but intentionally unavailable through application activation in this foundation. SQL constraints require ownership evidence and observed active provider/certificate fields.
- `suspended`: immediate local resolution denial; not a claim that an external provider was suspended.
- `removed`: immediate local denial and historical assignment closure; external cleanup may remain blocked/pending.

Database triggers constrain transitions. Verification cannot jump straight to active. Challenge renewal of a suspended or verified assignment returns it to pending; an active domain must be suspended first. Selecting a primary verified domain is a preference, not publication or a redirect.

`domain_operations` stores durable intents with company/domain foreign keys, UUID operation key, actor/payload fingerprint, expected assignment revision, safe outcome, retry fields, reason and timestamps. Repeating the same operation key/payload does not repeat the mutation. A changed payload or actor cannot reuse it. Challenge plaintext is never persisted in operations; replay does not redisclose it. Provider setup/reconciliation intents are `blocked` with `DOMAIN_PROVIDER_UNAVAILABLE`, not successful external provisioning. No queue worker runs in this step.

API boundary:

| Endpoint | Access |
| --- | --- |
| `GET /api/companies/current/domains` and `/:id` | Current company, `domains.read` |
| `POST /api/companies/current/domains` | Current company, `domains.manage`, custom-domain entitlement; body: hostname, operationKey, reason |
| `POST /api/companies/current/domains/:id/verify` | Current company, `domains.manage`, entitlement; body: operationKey, revision, reason |
| `POST /api/companies/current/domains/:id/actions` | Same company authorization; action plus operationKey, revision, reason |
| `GET /api/platform/domains` and `/:id` | Existing platform grant plus `platform.domains.read` |
| `POST /api/platform/domains/:id/verify` and `/:id/actions` | Existing platform grant plus `platform.domains.manage` |

Actions: `challenge`, `primary`, `setup`, `suspend`, `remove`, `reconcile`, `activate`. Activation always returns `DOMAIN_ACTIVATION_UNAVAILABLE`. There is no browser-supplied lifecycle/provider-status update endpoint. Operation reasons are required. Directories are limited to 20 records per page; per-domain operation history is limited to 30.

Migration 010 grants company domain permissions to the existing owner role and platform domain permissions to the existing platform-admin role. It does not grant an administrator account, change historical role checksums, or enable commercial access. The initial commercial policy still has `custom_domain: false`; an authorized operator must explicitly configure the existing policy/plan entitlement before new company domain actions become available. Reads remain permission-scoped. Platform operators retain local suspension/removal control; they cannot bypass the activation gate.

## 4. Ownership verification and hostname resolution

Registration generates a random 256-bit token for `_mysolar-verification.<hostname>`, valid for 24 hours. Its hash is bound to assignment ID, company ID and normalized hostname. The DNS TXT value is returned only at creation/renewal, not stored as plaintext. Reopening a lost challenge requires renewal. Renewal is audited and invalidates the old proof.

The verification API performs a real DNS TXT lookup only when an authorized caller explicitly requests verification. No DNS lookup was executed during these local checks. It uses finite resolver/overall timeouts and bounded record parsing. The network read occurs outside the database mutation transaction; current session, company permission, entitlement, assignment revision, hash and expiry are checked again before saving. Missing proof, propagation delays and DNS errors never grant verification. Verification is a point-in-time DNS observation, not DNSSEC validation, a certificate, permanent control or proof of legal business identity. Ongoing ownership monitoring remains future work.

Hostname normalization handles case, one terminal dot and IDN-to-ASCII conversion. It rejects schemes, credentials, ports in registrations, path/query/fragment syntax, IPs, wildcards, malformed labels, ambiguous separators and unsupported local/test/internal suffixes. Common infrastructure hostnames are reserved. Custom apex and `www` names are separate registrations. A single non-reserved label beneath the configured application hostname is recognized as a platform subdomain; platform DNS operators must arrange its proof. No wildcard DNS/TLS entitlement or automatic subdomain activation is inferred. In local loopback development, custom hostnames remain registrable but platform subdomains are not inferred from `localhost`.

The request boundary examines the actual Host authority, rejects duplicate/ambiguous hosts and ignores forwarded-host and tenant selectors. Existing proxy-hop trust is unchanged. The configured application hostname continues through the existing application. Explicit non-production loopback development remains supported. Only GET/HEAD `/healthz` and `/readyz` have the narrow hostname exception.

Unknown, pending, verified-only, suspended and removed company hosts do not fall back to MY SOLAR or another company. Unknown/ineligible hosts receive a neutral 404; malformed authorities receive 421; registry failure receives neutral 503. Even a fully populated active assignment receives 503 at the HTTP boundary in this step: its public context can be resolved internally, but website rendering and private APIs remain disabled until the additional controls are implemented. This avoids prematurely exposing single-origin authentication or the global customer dashboard on company domains.

## 5. Security implemented and pending

Implemented: current session/membership/company validation; existing CSRF and exact single-origin checks; company/platform permission separation; existing commercial controls; expected-company checks; normalized unique hostname claims; serialized cross-company claims plus database uniqueness; revision checks; hashed fresh proof; operation-key replay protection; no provider-state claims from browsers; neutral host rejection; safe local offboarding; existing audit events with actor, target, reason and previous/current state; user limits of 20 attempts per operation category per hour and session-company limits of 40 where applicable. These reuse the existing rate-limit mechanism and are not advertised as a complete distributed abuse-control policy.

Pending before enabling company-domain traffic:

- Domain-audience/session binding and the intersection of domain company with current membership or customer ownership.
- Company filters for currently cross-company customer dashboards, enquiries and quotations.
- Server-selected company destinations for branded-site enquiries.
- Exact per-request verified-origin CSRF handling; do not turn the single origin into a blanket allowlist of all tenant origins.
- Domain-aware invitation/recovery URLs and token audience binding; retain host-only Secure/HttpOnly cookies.
- Safe optional central sign-in handoffs with exact callback registration and short-lived single-use codes. Platform administration should remain on the central trusted hostname.
- Provider evidence validation, authenticated callbacks, renewal/ownership-loss checks and certificate/routing reconciliation.
- Authenticated edge-to-origin forwarding and protection of direct-origin paths.
- Private preview authorization and published-snapshot rendering.
- Public hostname/company/revision cache keys, invalidation, private API cache bypass and per-domain manifest/offline treatment.

No authentication, cookie, reset, invitation, marketplace approval or frontend routing behaviour was changed to accommodate custom domains. No website becomes public from the existence of a verified registry entry.

## 6. Provider-neutral boundary and fixed Railway origin

The provider interface defines requestHostname, getOwnershipInstructions, getStatus, activate, suspend, remove and reconcile. Requests must use server-loaded assignments, expected revisions and durable operation IDs. A future adapter must return validated, allowlisted provider evidence and finite safe errors. The included unconfigured adapter throws an unavailable error for every method; it does not simulate verification, certificate activity or successful removal.

Proposed target path:

`verified customer hostname -> managed custom-hostname edge -> routing Worker/proxy -> fixed Railway origin -> authenticated original-host resolver -> shared application`

The routing component must construct its upstream URL from a fixed configured origin, not a visitor-supplied URL. The outbound Host and TLS/SNI must match an origin Railway recognizes. It must strip visitor-supplied Forwarded/X-Forwarded-Host and MY SOLAR routing headers, then convey the original normalized customer hostname through authenticated context. The application must verify that context before resolving the tenant and must refuse direct-origin requests claiming tenant context without authentication. A signed request envelope should bind hostname, assignment version, method/path and timestamp, with key rotation and replay safeguards. Never derive roles or company access from that envelope alone.

This foundation intentionally does not accept any such headers yet. The fixed origin is not configured, no edge is provisioned and no bypass-prevention claim is made. An external proxy sending tenant traffic to the central hostname today would still be unsafe; it must not be enabled before this work is complete. A normal forwarding proxy that preserves each customer's Host may still require every hostname to be attached to Railway, defeating the intended scaling model.

Cloudflare documents Workers receiving custom-hostname traffic and an origin Host/SNI mismatch problem for hosted origins. That supports the proposed design, but it does not prove our exact Worker-to-Railway deployment. Strict TLS, correct Host/SNI, body/cookie handling, original-host authentication, canonical redirects and origin-bypass rejection require an authorized staging proof before provider selection or rollout.

## 7. Official provider constraints and commercial assumptions

Reviewed official documentation on 17 October 2026; no account plan/entitlement or negotiated price was established in this task.

- Railway documents 1 custom domain on Trial, 2 per service on Hobby and 20 by default on Pro, with increases on request. It requires the supplied CNAME and TXT verification and supports automatic SSL. These are origin hosting constraints, not a strategy for attaching thousands of domains individually: https://docs.railway.com/networking/domains/working-with-domains
- Cloudflare for SaaS lists 100 included hostnames, a published maximum of 50,000 for non-Enterprise plans, and $0.10 per additional hostname. Actual account quotas, billing terms, Worker usage, traffic, support and additional features must be costed separately. These figures are not a total operating-cost estimate. Its plan table separately restricts wildcard custom hostnames, apex proxying and custom-origin SNI rewriting: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/
- Hostname ownership and certificate validation are separate; provider hostname status, certificate status and routing DNS must be suitable before production traffic: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/hostname-validation/
- Worker fallback routing: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/
- Host/SNI and origin restrictions: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/custom-origin/
- Default customer onboarding uses a CNAME-capable hostname such as `www.company.com`; arbitrary A records are not a supported substitute for the SaaS target. Apex proxying requires separately supported setup: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/ and https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/apex-proxying/setup/

Offer `www`/another supported subdomain first. An apex can use provider-confirmed supported DNS arrangements, or a separately operated apex-to-www redirect with valid HTTPS for the apex itself. Do not promise registrar forwarding works over HTTPS without checking it. Verify both hostnames and use a primary-domain policy rather than assuming root and www are interchangeable. MY SOLAR-owned first-level subdomains can later use a provider-supported wildcard under our own zone; that does not cover unrelated customer domains. No wildcard resource is configured here.

## 8. Requirements for genuine thousands-domain operation

Indexed hostname lookups and bounded APIs are present. Resolution currently queries PostgreSQL directly without a process-local cache, so state changes are not hidden by stale per-process entries. This is an intentional correctness baseline, not a throughput claim. Before scale, measure query/connection behaviour and introduce a bounded cache only with hostname/company/revision keys and reliable cross-replica invalidation, short fallback lifetimes and safe suspension/removal behaviour.

Still required: durable queue workers with leases/SKIP LOCKED, fixed lock ordering, assignment-revision/authority rechecks, provider idempotency, bounded retries/backoff/jitter, dead-letter/operator handling, quota/cost monitoring, certificate expiry alerts, ownership/DNS-loss reconciliation and provider cleanup evidence. Do not automatically execute old blocked intents simply because credentials are added.

Use scalable object storage and versioned company-owned media rather than local disk. Keep shared immutable code assets separate from company-public assets and all private responses. Maintain domain-aware cache purging and unpublish/remove propagation. Review the current pool max of 10 per process, replica totals, appropriate pooling, indexed query plans, provider API limits, WAF/abuse controls, backups, point-in-time recovery and tenant export/restore procedures. Domain removal must not delete business records. Release/reassignment requires cleanup and fresh proof. Load, security, browser, concurrency, recovery and operational validation are required before claims about thousands of tenants.

Company website publishing must be separate from marketplace inclusion. Existing companies.storefront_published and marketplace view/constraint gates are unchanged. Follow-up should add a company website record plus immutable published versions, templates and media, with an independently audited publication status. Marketplace products/offers must retain their existing approval rules. Domain activation should require the appropriate published website version and access policy; it must not set marketplace approval flags.

## 9. Lightweight checks and limits

- Focused `node --test tests/domain-foundation.test.mjs`: **11 passed, 0 failed, 0 skipped**.
- Syntax checks passed for the six new domain modules and changed server index, commercial policy and tenancy context.
- Application modules imported successfully under temporary test-process configuration, without listening on a port or connecting to PostgreSQL.
- Checked Git branch/status, staged/unstaged changes, recent commits, remote and migration/configuration sources; inspected the relevant auth, tenancy, branding, publication and audit paths. Official provider documentation was reviewed.

The focused checks use pure values and mocked database results. They cover normalization/IDNs, malformed authorities, duplicate Host headers, untrusted forwarded headers, bound/expiring challenges, unavailable-provider honesty, parameterized activation gates, central/health compatibility, neutral unknown-host handling, blocked custom-host authentication, expired proof, activation denial and idempotent removal. They do not validate PostgreSQL DDL or real DNS/provider behaviour. No real domain was registered, no DNS lookup or provider API call was made, and no database was used. Migration 010 has not been applied anywhere by this task.

No comprehensive suite, build, lint, server startup, migration, production-readiness check, production data query, environment mutation, DNS change, purchase, provider resource, deployment, commit or push was performed. The unchanged historical migration checksums and real tenant/lifecycle/concurrency boundaries require the planned Phase 10 database/integration verification.

## 10. Uncommitted work

All existing pending business work remains uncommitted. All domain-foundation changes are also uncommitted and unstaged. No reset, clean, stash, dependency installation or historical migration rewrite was performed. Review the two scopes together before a later release because server/index.js contains both router additions. Do not deploy this working tree without confirming the effective Railway migration/health-check configuration and applying pending migrations through the authorized release process.

## 11. Next dependency-ordered milestone

1. Establish a reviewed baseline for existing migration 009/business changes; resolve the effective Railway pre-deploy/health configuration discrepancy without assuming repository settings were applied.
2. In the planned verification phase, validate migration 009 -> 010 on disposable PostgreSQL, including constraints, concurrent claims, role boundaries, operation replay, DNS expiry and removal/reassignment. Add a small protected domain-management console over these APIs.
3. Implement authenticated edge-origin context and a provider adapter/worker behind disabled controls. Obtain explicit authorization for any staging resources/DNS. Prove fixed-origin Host/SNI, strict TLS and bypass prevention before enabling forwarding.
4. Add templates/content, draft previews, independent website-publication snapshots and rollback. Add server-rendered pages, company SEO/canonical URLs/sitemaps and scalable media.
5. Implement domain-bound sessions, exact-origin CSRF, scoped customer records/enquiries, safe invitations/reset links and any explicit cross-domain authentication handoff.
6. Connect a small authorized multi-company pilot only after the applicable Phase 10 security/integration checks pass; verify www/apex behaviour, certificate renewal, unpublish, suspension and removal in real browsers.
7. Expand self-service provisioning, provider reconciliation, cache invalidation, quota/cost reporting, backups/recovery/export and staged load verification; roll out gradually based on measured capacity.

The immediate next milestone is registry/schema verification plus the trusted edge-origin contract. It is not attaching thousands of domains or creating a website editor before the security boundaries are validated.
