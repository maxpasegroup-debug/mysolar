# MY SOLAR deployment runbook

Status: preparation only. No Railway project/environment has been selected or inspected remotely, no deployment or production migration has run, and `mysolar.online` has not been connected. PostgreSQL integration verification is a release blocker; see `PHASE_10_HANDOFF.md`.

## Release prerequisites

1. Put the preserved workspace under the operator's intended source-control repository. This workspace has no Git metadata; no branch, clean working tree or deployable commit was verified. Keep a protected copy of the original workspace and release artifact.
2. Configure a dedicated local PostgreSQL database named `mysolar_test_*`, with a test-only role and no production data. Set `TEST_DATABASE_URL` securely in the shell environment. The integration suite refuses remote hosts and other database names, creates random `mysolar_verify_*` schemas and drops only those schemas. The role needs schema/function/table creation rights in this disposable database. Run `npm test`, `npm run test:db`, `npm run build` and `npm run test:browser`; resolve failures and the coverage gaps in the handoff before releasing. Tests do not load `.env` or fall back to its database.
3. Validate the exact production Node runtime on staging. Local evidence uses Node 22.14.0/npm 10.9.2; `engines.node` is a minimum, not a security-patch guarantee. Select a supported, patched Node release in Railway and retest native Argon2 installation there.
4. Identify and record project ID, environment ID, app service and PostgreSQL service privately. Review permissions, budget, backups, maintenance window, approved artifact and rollback owner. Do not issue a deployment/migration command against an inferred CLI target.

## Service settings

The existing Node/Express service is Railway-compatible without adding infrastructure dependencies. Use Railpack's Node detection, the committed lockfile, install command `npm ci --no-audit --no-fund`, build/equivalent static command `npm run build`, and start command `npm start`. The build validates source and assets; this plain frontend does not produce a bundle. Do not run test scripts on the production service.

Set deployment health path `/readyz`, timeout 60 seconds, and a bounded restart policy (for example, on failure, three retries) in the selected service's settings. The app binds `0.0.0.0` and Railway's `PORT`. `/healthz` reports process availability; `/readyz` checks the expected migration checksums and returns generic 503 until the schema is available/current. Database query timeout is 1.5 seconds, connection acquisition timeout 10 seconds, with concurrent readiness calls coalesced. It does not prove every business workflow works. Railway health checks gate deployment activation; configure separate ongoing monitoring. [Railway health checks](https://docs.railway.com/deployments/healthchecks).

No automatic migration command is committed. Configure a controlled migration job only after the procedure below is approved. Current Railway documentation deprecates legacy `railway.json` configuration; service settings avoid introducing that format or an unnecessary IaC package into this existing application. [Railway configuration reference](https://docs.railway.com/config-as-code/reference).

`.railwayignore` excludes local environment files, verification profiles/evidence, dependencies, caches and local tool configuration from a future CLI upload. Review the upload scope before release and retain these exclusions. [Railway CLI file handling](https://docs.railway.com/cli/up).

## Environment variables

Set variables through Railway's protected variable interface. Never commit `.env`, put secrets in command arguments, screenshots or tickets, or run environment-dumping commands.

| Variable | Required production setting / behavior |
| --- | --- |
| `NODE_ENV` | `production`; enables secure `__Host-` session cookie and HTTPS requirements. |
| `PORT` | Supplied by Railway; app accepts integer 1–65535. |
| `APP_ORIGIN` | Exact single HTTPS application origin, initially the selected staging/service domain. No path, credentials or query. Change deliberately when moving to the final domain. |
| `DATABASE_URL` | The selected PostgreSQL service URL, supplied securely. PostgreSQL protocol, host and database required. No SSL query parameters; they are rejected to prevent overriding TLS policy. |
| `DATABASE_SSL` | `require` for a certificate-verified TLS connection; `disable` only for an explicitly reviewed trusted private-network connection that does not offer TLS. Confirm the actual service's requirements. Never use `no-verify` or disable certificate validation to fix connectivity. |
| `SESSION_SECRET` | At least 64 random characters, unique per environment. Generate/store outside source control. Rotation invalidates CSRF and token digests; plan session reauthentication. |
| `TRUST_PROXY_HOPS` | Default `0`; use `1` only after proving every incoming connection passes exactly one trusted proxy. Extra CDN/proxy layers need explicit review. Wrong trust can affect cookies and IP rate limits. |
| `SESSION_ABSOLUTE_HOURS`, `SESSION_IDLE_HOURS` | Defaults 168/12; validated bounds 1–720 / 1–72. |
| `INVITATION_DELIVERY` | `email` in production. Manual invitation links are development-only. |
| `LOGO_ALLOWED_HOSTS`, `PRODUCT_IMAGE_ALLOWED_HOSTS` | Exact trusted HTTPS DNS hosts, comma-separated; empty disables external image acceptance. Also controls CSP. No wildcard hosts. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Optional verified mail transport/sender. Complete credentials enable mail. Port defaults 587, `SMTP_SECURE=false` requires STARTTLS; true uses implicit TLS. Missing SMTP leaves recovery/email invitation delivery unavailable; it does not simulate delivery. |
| `SIA_ENABLED` | Default `true`; `false` disables assistance. Deterministic assistance works without an external model. |
| `SIA_PROVIDER` | Keep `disabled` unless an operator has configured the compatible `json-selector-v1` HTTPS gateway. No generic model-provider endpoint is assumed. |
| `SIA_PROVIDER_URL`, `SIA_API_KEY`, `SIA_MODEL` | Optional server-only compatible gateway configuration. No model request is made without explicit user opt-in. Validate on staging using authorized data. |
| `SIA_TIMEOUT_MS` | Default 12000; bounds and security budgets remain enforced independently of commercial allowances. |
| `SIA_REQUESTS_PER_MINUTE`, `SIA_USER_DAILY_LIMIT`, `SIA_COMPANY_DAILY_LIMIT` | Defaults 8/30/150. Commercial allowances add restrictions; they do not override these abuse safeguards. |
| `TEST_DATABASE_URL`, `BROWSER_EXECUTABLE` | Verification-only; do not configure these on the production app. |

No billing or payment-provider variable is required. Commercial defaults are stored in PostgreSQL, with pre-billing mode and a disabled optional setup-fee proposal. Never turn the ₹35,000 plus GST proposal into a live charge during deployment.

## Controlled migration, backup and rollback

1. First run fresh/repeat and 007→008 upgrade verification on the designated local test database, then on an isolated staging database matching production PostgreSQL/version/extensions. Review all SQL and the frozen virtual `002_role_catalogue_v1`. There is no physical 002 SQL file.
2. Before production changes, record database identity and existing `schema_migrations` names/checksums without exposing connection credentials. Verify a recent encrypted backup and perform a restore drill into a separate database. Record restoration time, data-loss window, owner and exact approved target. A backup that has not been restored is insufficient rollback evidence.
3. Obtain explicit approval for the named production environment, migration scope and tested rollback. Stop or constrain writes during any incompatible migration/restore window. Confirm the running code remains compatible with the proposed schema.
4. Run `npm run db:migrate` once from a controlled job using that environment's variables. The runner uses an advisory lock, per-migration transactions, recorded checksums and immutable historical SQL. It refuses changed applied checksums and emits safe failure messages. Never edit tracking rows to bypass a mismatch.
5. Railway supports a pre-deploy migration command, but it must be configured intentionally after the preceding review. A failed pre-deploy command stops deployment; its filesystem is separate from the runtime. Do not depend on local generated files. [Railway pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command).
6. Observe `/readyz` and perform staging/production smoke checks with authorized accounts across separate tenants, publication gates, quotes, stock, finance, SIA fallback and commercial read/write restrictions. Record the artifact and schema versions. Successful readiness alone is insufficient acceptance.
7. On failure, stop further rollout. Roll back to the retained code artifact only if it is compatible with the current schema. There are no automatic down migrations. Prefer a reviewed forward correction; restoring data requires the approved backup/restore procedure, write freeze, explicit authorization and reconciliation of any writes since the backup. Never drop a production schema as a shortcut.

The app handles SIGTERM/SIGINT by closing HTTP and its PostgreSQL pool with a 10-second forced-exit limit. Actual Railway shutdown timing, TLS, proxy headers, native-module installation, database permissions and backup restoration remain deployment checks.

## Domain cutover, after a verified deployment

1. First verify the deployed service through its Railway-provided HTTPS domain. Choose one canonical application origin; this app does not support concurrent unrelated origins for state-changing requests.
2. With explicit DNS approval and a saved copy of existing records, add `mysolar.online` to the selected service. Copy the actual CNAME/ownership verification records shown by Railway into the DNS provider; do not invent target values. For the apex, confirm the DNS provider's supported flattening/alias behavior. Preserve mail and other unrelated records.
3. Wait for Railway ownership verification and certificate provisioning. Check authoritative and public DNS, HTTPS chain/hostname, app/static/PWA endpoints and `/readyz`. [Railway domain procedure](https://docs.railway.com/networking/domains/working-with-domains).
4. Set `APP_ORIGIN` to `https://mysolar.online` at the approved cutover and redeploy the reviewed configuration. Verify secure cookie, CSRF, login/recovery links, company switching and image CSP on that exact origin. Accounts must sign in again on the new host. Decide redirects for the temporary domain separately; do not leave forms posting from an untrusted alternate origin.
5. Record DNS/TLS/runtime evidence before claiming the domain is connected. Restore prior records/configuration if the approved rollback criteria trigger. This runbook performs none of these changes.

## Operations and deferred integrations

Observe generic request IDs/error codes, health failures, database capacity and actual SIA metadata; never log credentials or full private conversations. Schedule and monitor `npm run db:cleanup` only after reviewing its retention effects. Password recovery uses an in-process, non-durable email worker. Define backup/restore, log retention, privacy retention, incident response and operator-access procedures before launch.

Billing checkout, recurring charges, payment events, reconciliation and gateway integration remain deferred until after verified deployment and domain setup. Manual subscription activation is administrative access, never proof of payment. No live SMTP, SIA or payment request is part of this runbook.
