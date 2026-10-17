# MY SOLAR launch phase 1 — database and core workflows

Date: 16 October 2026. This is phase 1 of the seven-phase launch plan, following the original development phases.

## Subsequent authorized Railway configuration update

After the inspection below, the user explicitly authorized updating the application variables. Sixteen variables were saved and verified on the existing production `mysolar` app service, using `--skip-deploys`: production mode, port 8080, HTTPS origin `https://mysolar.solutions`, the existing Postgres private-URL reference, database SSL disabled for that verified Railway private-network connection, conservative proxy trust 0, session lifetimes, email invitation mode, deterministic SIA mode and usage/security limits. A fresh 48-byte random session secret was generated in memory and supplied through stdin; its value was not printed or saved in the repository.

All sixteen read-back checks passed, including equality of the resolved application database URL to the existing Postgres service URL. No new deployment was triggered; the latest app deployment remains CRASHED. Database initialization/migrations and controlled redeployment are still pending. SMTP and an external AI provider remain unconfigured; no credentials were invented. Non-secret operational evidence: `.verification/railway-variable-update.json`.

## Outcome

The missing PostgreSQL verification environment is now available locally. The complete available automated suite executed against a fresh isolated PostgreSQL 18.6 cluster: **100 passed, zero failed, zero skipped**. Fresh initialization, repeat migration tracking and upgrade from 007 to 008 passed. The expected migration history also produced a real local HTTP `/readyz` 200 response.

This resolves the earlier Phase 10 blocker concerning unexecuted migration/core-workflow tests. It does not complete the remaining six launch phases or approve the application for public production use. Recovery/invitations, identity verification/MFA, the wider role matrix, commercial boundary cases, provider integration, accessibility and deployment acceptance retain their later-phase work.

## Existing Railway deployment — read-only inspection

Railway authorization succeeded. The workspace is linked to the existing project, without creating another paid service:

| Item | Observed value |
| --- | --- |
| Project | `mysolar`, `b189e069-4956-40fb-aeec-8237b7347893` |
| Environment | `production`, `8e1cb532-b9d3-447a-aeca-60fd41ff06fb` |
| App service | `mysolar`, `b27efca8-cfe2-4a3c-9f8e-57f9f255408a` |
| Database service | `Postgres`, `058536fc-092b-4288-a48f-cb9cf8baae7d` |
| Deployed source | `main`, commit `cf9340e3a9de8dff90a96a6c99d8eae85805fd63` |
| Latest app deployment | `3222a0ac-9dd2-448e-a2af-d26c4ea50d98`, **CRASHED** |
| Database deployment | **SUCCESS**; PostgreSQL 18.6 |
| Configured custom domain | Railway lists `mysolar.solutions`, target port 8080. This differs from the earlier planned `mysolar.online`. |

The application service has only Railway-generated variables. `APP_ORIGIN`, `DATABASE_URL`, `SESSION_SECRET` and explicit production/TLS configuration are absent. Its captured logs contain the fixed startup error **Production requires HTTPS APP_ORIGIN**. Strict configuration validation was preserved.

PostgreSQL inspection used `default_transaction_read_only=on` and a five-second statement timeout. Its `public` schema has zero tables and no `schema_migrations` relation. PostgreSQL supports SSL; the actual application TLS/certificate policy remains to be verified. Database credentials were read only into process memory and were not printed or saved in repository files. No customer/business records were queried.

A single HTTPS health request to `mysolar.solutions/healthz` timed out with no HTTP response. This is not evidence of successful domain/TLS/application acceptance. No DNS changes were made.

**During the initial inspection, no Railway variable, deployment, database schema or production record was changed.** The subsequent explicitly authorized variable update is recorded above. Linking the local CLI and authorizing the account do not constitute production repair or launch approval.

## Local verification environment

Official PostgreSQL 18.6 Windows binary archives were downloaded from [EDB](https://www.enterprisedb.com/download-postgresql-binaries?lang=en) over HTTPS into ignored `.verification/postgres/`; only `pgsql/bin`, `lib` and `share` were extracted. Archive paths were checked to remain inside that directory. The archive is 384,620,317 bytes. The executable reports PostgreSQL 18.6; it is not Authenticode-signed, and no independent upstream checksum comparison is claimed.

The reusable `npm run test:localdb` launcher:

- Creates a new uniquely named workspace-local cluster on an available loopback port.
- Uses SCRAM authentication and a random test password. The temporary bootstrap password file is deleted after initialization; connection credentials remain in memory.
- Creates only the local `mysolar_test_phase1` database and supplies its URL to the existing strict test harness. It never reads Railway credentials or loads `.env`.
- Explicitly selects `tests/*.test.mjs`, avoiding recursive discovery of launcher scripts.
- Stops its local cluster in `finally`. Cluster files and binary downloads remain ignored for diagnostics; no Windows database service was installed.

The Windows execution sandbox prevented PostgreSQL's restricted-token startup, so the authorized local test run used execution outside that sandbox. A Windows inherited-pipe wait was corrected by giving `pg_ctl` ignored stdio and keeping its server log in the isolated cluster. An early `test-postgres.mjs` name was discovered by Node's test runner; it was renamed `verify-postgres.mjs` and explicit test-file selection was added. Earlier attempts were preserved in ignored logs. These were harness issues, not application/security-rule changes.

## Executed integration coverage

The final 100 total includes the existing pure/unit/HTTP tests and 28 nested PostgreSQL integration cases plus their parent. Executed database cases cover:

- Fresh/repeat/007→008 migrations and readiness against recorded checksums.
- Registration/session rotation, public privilege-field rejection and logout revocation.
- Expected-company tampering, foreign records and separate-customer ownership.
- Public product/offer/storefront gates, approved revision matching and private offer-field exclusion.
- Multi-vendor enquiries, idempotent submission and private company notes.
- Private quotation drafts, issuance, historical revision preservation, comparison and preference without order creation.
- SIA follow-up proposals: explicit approval, exact session/company, stale revision, replay and single execution through the existing message service.
- Manual agreements and issued-quotation orders, with explicit customer and distributor confirmation and exact saved totals.
- CRM conversion, linked customer preservation, idempotency and tenant privacy.
- Stock opening, reservation, consumption, release, changed idempotency payloads and concurrent removal without negative balances.
- Procurement approval, partial receipt, duplicate protection and over-receipt rejection.
- One full invoice per order, partial collections, equal reversals and customer-visible amount/privacy rules.
- Supplier payables with exact amounts, duplicate rejection and cross-company denial.
- Assigned field project access, assignment revocation, prohibited financial access, task progress, ordered milestones, supporting references and project completion.
- Owned document metadata, service creation and allowed resolution stages; private service notes/resolution excluded from customer responses.
- Platform separation, draft-price restrictions, manual subscription trial/snapshots, expiry, blocked writes and preserved authorized reads.

No historical migration or production application business rule needed alteration to pass these cases. This is representative regression coverage, not proof of every input, race, role or launch requirement.

## Files and evidence

Created `scripts/verify-postgres.mjs` and `tests/helpers/operating-flows.mjs`; extended `tests/database.test.mjs`; added `test:localdb` to `package.json`; updated README and this handoff. No dependency versions, historical SQL or production secrets changed.

Final executed database command: `npm.cmd run test:localdb` → **100 passed / 0 failed / 0 skipped**. Evidence: `.verification/phase1-database-tests.tap`. The local test cluster stopped successfully; no generated cluster retained a `postmaster.pid` and no bootstrap password files remained. Static/build validation `npm.cmd run build` → **506 passed / 0 failed**, recorded in `.verification/phase1-build.log`.

Earlier evidence is retained in `.verification/phase1-local-launcher-attempt.log`, `.verification/phase1-first-database-run.tap` and `.verification/phase1-project-payable-run.tap`. The first database run included an extra recursively discovered launcher; use the final result, not that count.

To repeat on this Windows workstation: `npm.cmd run test:localdb`. On another workstation, install trusted PostgreSQL binaries and set `POSTGRES_BIN` to their `bin` directory, or place them under ignored `.verification/postgres/pgsql/bin`. Do not use the local test launcher on a production service. Ignored evidence/tools are not transferred by Git/Railway uploads.

## Next phases and production repair boundary

Launch phase 2 is account identity, recovery/invitations, administrator MFA and broader permission verification. The seven-phase launch plan remains in order.

The app secret, existing Postgres connection reference, current canonical HTTPS origin and initial runtime settings have now been saved as recorded above. Production repair still requires controlled migration initialization, redeployment, live proxy/header verification and deployment/health acceptance. Use the existing service; do not create a duplicate application. The domain currently listed is `mysolar.solutions`; any move to `mysolar.online` is a separate explicit cutover decision.

Production configuration/deployment and migrations must follow the agreed reviewed-target/backup/rollback approval boundary. No live initialization has been performed merely because the public schema currently appears empty. Billing and payment processing remain disabled.
