# Eight-phase MY Solar development handoff

Date: 2026-10-19. Repository: `D:/APPS/WEB/mysolar`. Base: `1ef20de` on `main`.

Decision: local implementation and automated acceptance PASS; public-launch acceptance remains BLOCKED by the live setup/receipt/recovery/domain and policy items below. All eight phases were worked in dependency order. Do not interpret this report as deployment or proof that every external integration is operational.

## Architecture and preservation

Extended the existing plain HTML/CSS/JavaScript frontend, hash routes, Express ESM backend, PostgreSQL migration runner, session/CSRF protection, company memberships/roles, commercial-policy service, existing business services and audit events. No replacement app, duplicate tenant database, new dependency, staging application, real tenant, external message, production migration, remote variable change, DNS change, payment, deployment, commit or push was performed. The initial worktree was clean; intended changes remain reviewable in the worktree.

## Phase outcomes

| Phase | Implemented in this programme | Remaining boundary |
| --- | --- | --- |
| 1. Account trust and recovery | User-bound verification; encrypted durable verification/recovery/invitation queue; invitation-aware shared-office signup allowance; current-password change/session revocation; TOTP, replay protection, one-time recovery codes and optional privileged policy gates; account-security screen | Configure encryption and mail worker; verify actual sender and recipient receipt; roll out policies after owner/operator enrolment. No live mail was sent. |
| 2. Release and operations | Per-schema migration locking plus existing CLI lock; safe error events; health/queue/worker observations; threshold monitor; redacted alert queue; mail retry/cancel console; actual disposable dump/restore; operations runbook | Hosting supervision, external uptime checks, real alert receipt and an approved remote backup/restore exercise are not established. |
| 3. Public discovery and trust | Reviewed postal import/lookup; broader declared-area matching from reviewed PIN mapping only; clean server-rendered catalogue/product/company pages; canonical metadata, robots/sitemap; solar basics/support; explicitly draft/noindex policies | Real reviewed postal data and final approved public policies are still needed. No exact-distance/live availability claims or fabricated supplier listings. |
| 4. Faster accurate sales | Reviewed CSV customer/lead imports, duplicate detection, same-user/company confirmation digest, canonical CRM creation, idempotent confirmation and restricted rollback; private quotation templates; printable authorized records alongside JSON/CSV | Import is bounded to 100 rows/40 KB. Templates require review of actual price/specification/scope before a new draft. Printed summaries are not certified GST invoices or payment receipts. |
| 5. Delivery and documents | Fail-closed scanning contract, bounded encrypted private uploads and explicit customer sharing; secure context-aware downloads; site observations; equipment serial/warranty records; customer handover pack | No scanning provider was provisioned. Uploads stay unavailable without approved scanner/encryption configuration. Observation forms do not perform engineering sizing or certify installation. |
| 6. Retention and communication | Recorded maintenance agreements/visit history; existing service workflow for explicit visit creation; maintenance/renewal reminder sources; separate owner approval and verified-recipient email consent; dispatch-time revalidation; unavailable SMS/WhatsApp adapter boundary | No automatic renewal/charge or completed-service claim. No WhatsApp/SMS provider exists. Email uses at-least-once SMTP and needs live receipt evidence. |
| 7. Commercial and white-label delivery | Existing FREE/ELITE/PRO and historical terms retained; removed hardcoded new PRO price; configurable drafts remain unpublished until approved; actual operator-entered costs by currency; durable consultation records/admin review; two branded page templates, saved version history, authenticated preview, explicit publish/unpublish with saved branding/contact snapshots | No new live pricing or paid plan assignments. Current publication is on `/sites/:companyId`; custom-domain verification/TLS provider/DNS connection remains a separately approved client-delivery step. |
| 8. SIA, usability and integration | SIA now references bounded permission-scoped Today exceptions and existing human workflows; main work-area and selected form translations extended in Malayalam/Tamil; new screens fit six widths; private-preview sandbox; focused indexes/immutable website versions; concurrency and full integration checks | Full detailed content translation and production-load sizing remain unfinished. SIA does not autonomously change finance, stock, orders or payments. The existing confirmed follow-up workflow remains the only SIA execution path. |

## Data and API changes

New forward SQL files: `013_release_accounts.sql`, `014_operations_health.sql`, `015_public_discovery.sql`, `016_sales_tools.sql`, `017_documents_delivery.sql`, `018_service_communications.sql`, `019_white_label_commercial.sql`, `020_release_indexes.sql`. Historical 001–012 were not edited. The manifest contains 20 entries including the existing virtual role-catalogue entry 002.

New records cover account protection, verification, encrypted mail and attempts, worker heartbeats, operational incidents/events, reviewed PIN mappings, quotation templates/import batches, encrypted managed files, surveys/equipment, maintenance agreements/visits, consultation enquiries, immutable website content versions/publication pointers and private platform cost evidence. Existing company/user/subscription/permission/audit records remain authoritative.

Protected APIs use current authenticated context, existing CSRF/origin enforcement and role permissions. New write endpoints explicitly enforce their corresponding commercial feature where required; unpublish/cancel/transition access is preserved where appropriate. A browser role/company claim or plan name never grants tenant access. Public branded pages require an active company, published version and current white-label public entitlement. Private files are never served as static assets or cached by the service worker.

## Verification evidence

All evidence below is local, with fictional fixtures and disposable loopback PostgreSQL only:

- Complete automated suite: **247 passed, 0 failed, 0 skipped**. `.verification/all-integration-final.log`.
- Browser checks: **303 passed, 0 failed**, widths 360, 390, 768, 1024, 1280 and 1440. `.verification/all-browser.log`; screenshots/structured output under `.verification/browser/` as produced by the existing runner.
- Static checks: **993 passed, 0 failed**. `.verification/all-static-final.log`.
- Read-only production dependency advisory lookup: **0 reported vulnerabilities**, no packages changed. `.verification/dependency-audit.json`. This is a point-in-time advisory result, not a security guarantee.
- Fresh install, upgrade, repeat run, checksum refusal, constraints/index/role checks and concurrent same-schema migration runners passed across all 20 entries. `.verification/phase10-migrations.json` records the migration evidence; it is local ignored output, not a production manifest.
- A real local `pg_dump`/`pg_restore` exercise restored a fictional schema into a separate disposable database, checked a sentinel and all migration checksums, then removed the restored target.
- Concurrent reviewed import confirmation produced one contact; concurrent contract visits produced one service record; concurrent mail workers accepted one job; website versions reject mutation. Existing domain contention/ownership, PRO expiry/downgrade, tenant boundaries and customer/business workflows remain covered.
- Local bounded read probe: 12 dashboard requests, parallelism 4, 233 ms in the recorded run. `.verification/release-concurrency.json`. Tiny fictional fixtures do not establish capacity for thousands of production companies.

During implementation, checks exposed and led to correction of shared-router login gating of public discovery, encoding/index conflicts in a new migration, changed-format expectations in old export tests, outdated fixed-price assumptions and a browser empty-state/selector issue. Final review also preserved activation gates on the new import/delivery entry points and removed a database/configuration side effect from the shared error class. Secure company print previews preserve tenant/account context and use an opaque-origin sandbox. The initial unrestricted test run exhausted disposable PostgreSQL locks; the runner now bounds concurrency to two test files, sets a per-test timeout and configures sufficient local lock allocation. These settings do not modify production.

## Required live setup and remaining work

Read `RELEASE_OPERATIONS_RUNBOOK.md` before an approved release. In particular, queued email now depends on a separate `DATA_ENCRYPTION_KEY` plus the supervised mail worker. Existing Resend variables alone do not complete delivery. Keep a recoverable encryption-key backup. Configure/supervise reminder/mail/monitor processes, scheduled cleanup, approved alert recipient and an external uptime monitor. Verify actual invite/recovery/verification/alert receipt and an authorized remote restore. No provider receipt or Railway state is claimed here.

Secure uploads need an approved scanning endpoint/key. Reviewed PIN data needs import from an approved source. Final privacy/terms need operator approval. A custom-domain delivery provider, client hostname, DNS authorization and TLS/lifecycle acceptance are still required before domain traffic. Follow the owner-approved delivery order: connect/verify the domain through that approved boundary, then tailor the brand page and review it before publication. No domain was connected in this programme.

Clean public directories currently list up to 100 records, while the existing marketplace provides paginated search; the sitemap is bounded to 10,000 entries per record type. Extend clean-URL pagination/sitemap indexing before a larger catalogue rollout. Full translations, production-scale load testing and external communications/provider work are explicitly not complete. Real company/customer onboarding tests are excluded at the owner's request. The single next milestone is an approved live-configuration and operational acceptance session, followed by the owner's real-company/customer acceptance; do not open unrestricted onboarding based on local checks alone.

## Files

94 source, configuration, documentation and test files were created or modified. Local `.verification/`, `.pilot/` and secrets remain ignored. `package-lock.json` and installed dependencies were not changed.

- `.env.example`
- `README.md`
- `RELEASE_OPERATIONS_RUNBOOK.md`
- `RELEASE_PROGRAMME_HANDOFF.md`
- `ROOT_DEPLOYMENT.md`
- `index.html`
- `organization.css`
- `package.json`
- `scripts/browser-check.mjs`
- `scripts/verify-postgres.mjs`
- `server/auth/protection.js`
- `server/auth/routes.js`
- `server/auth/sealed.js`
- `server/auth/sessions.js`
- `server/auth/totp.js`
- `server/automation/catalogue.js`
- `server/automation/engine.js`
- `server/automation/routes.js`
- `server/commercial/growth.js`
- `server/communications-boundary.js`
- `server/config.js`
- `server/customer/experience.js`
- `server/customer/records.js`
- `server/db/cleanup.js`
- `server/db/migrations.js`
- `server/db/migrations/013_release_accounts.sql`
- `server/db/migrations/014_operations_health.sql`
- `server/db/migrations/015_public_discovery.sql`
- `server/db/migrations/016_sales_tools.sql`
- `server/db/migrations/017_documents_delivery.sql`
- `server/db/migrations/018_service_communications.sql`
- `server/db/migrations/019_white_label_commercial.sql`
- `server/db/migrations/020_release_indexes.sql`
- `server/documents.js`
- `server/errors.js`
- `server/html.js`
- `server/index.js`
- `server/mail-queue.js`
- `server/mail-worker.js`
- `server/marketplace/service.js`
- `server/monitor-worker.js`
- `server/operations-health.js`
- `server/operations/crm.js`
- `server/operations/delivery.js`
- `server/operations/orders.js`
- `server/operations/read.js`
- `server/platform/routes.js`
- `server/postal.js`
- `server/print-record.js`
- `server/public-pages.js`
- `server/sales-tools.js`
- `server/service-contracts.js`
- `server/setup/invitation-delivery.js`
- `server/setup/invitations.js`
- `server/setup/routes.js`
- `server/sia/tools.js`
- `server/solar-delivery.js`
- `server/tenancy/context.js`
- `server/white-label.js`
- `src/account-security.js`
- `src/account.js`
- `src/app.js`
- `src/automation.js`
- `src/commercial.js`
- `src/experience.js`
- `src/growth.js`
- `src/landing.js`
- `src/locale.js`
- `src/marketplace.js`
- `src/operations.js`
- `src/organization.js`
- `src/print-record.js`
- `src/private-download.js`
- `src/purchase.js`
- `src/release-tools.js`
- `src/workspace.js`
- `sw.js`
- `tests/documents-delivery.integration.test.mjs`
- `tests/domains.integration.test.mjs`
- `tests/helpers/connected-fixture.mjs`
- `tests/helpers/connected-journey.mjs`
- `tests/helpers/env.mjs`
- `tests/operations-monitor.integration.test.mjs`
- `tests/pilot-snapshot.integration.test.mjs`
- `tests/pro-growth.test.mjs`
- `tests/pro-network.integration.test.mjs`
- `tests/public-discovery.integration.test.mjs`
- `tests/recovery-restore.integration.test.mjs`
- `tests/recovery.integration.test.mjs`
- `tests/release-accounts.integration.test.mjs`
- `tests/release-concurrency.integration.test.mjs`
- `tests/sales-tools.integration.test.mjs`
- `tests/service-communications.integration.test.mjs`
- `tests/white-label-commercial.integration.test.mjs`
