# Signup and authentication repair — 17 October 2026

## Confirmed cause and live repair

The linked Railway `mysolar` application pointed to the correct existing Postgres service and had its HTTPS origin and session secret configured. Read-only inspection from inside the deployed app confirmed that the database's public schema had no application tables. `/healthz` returned 200, while `/readyz` returned 503 and `/api/auth/session` returned 500. API rate limiting and sessions both need database tables, so requests failed before either customer or distributor signup could proceed. This was not an audience-selector or registration-form failure.

Applied the repository's existing migration command inside the deployed app:

```text
railway ssh --service mysolar -- npm run db:migrate
```

All tracked migrations completed: 001 identity, 002 role catalogue, 003 company setup, 004 marketplace, 005 enquiries/quotations, 006 operations, 007 SIA and 008 commercial. No historical migration was changed; no existing business data was deleted. No production test accounts, companies, products or payment records were created. Migration-defined taxonomy/configuration is initialization data, not live inventory.

Afterward, read-only inspection confirmed migration records and application tables. Live HTTPS observations:

- `/healthz`: 200.
- `/readyz`: 200, `ready`.
- `/api/auth/session`: 200, anonymous session with a CSRF token and Secure/HttpOnly session cookie.

The live database repair takes effect immediately without a code redeploy. A browser retaining the earlier session-loading error should reload the page before registering. No environment variables or credentials were changed.

## Repository changes

- `railway.json`: run `npm run db:migrate` before future deployments and use `/readyz` as the deployment health check. Railway blocks a deployment when its pre-deploy command fails. This configuration takes effect when committed and deployed; it has not been deployed in this task. Documentation: https://docs.railway.com/config-as-code/reference and https://docs.railway.com/deployments/pre-deploy-command.
- `server/errors.js`: return a safe 503 setup response for missing/outdated database objects. Log only fixed diagnostic categories and the existing request ID for server errors. No raw exception messages, queries, request bodies, emails, passwords or secrets are added to logs.
- `tests/authentication.test.mjs`: isolated PostgreSQL registration/login/logout and separate company-setup regression coverage.
- `tests/errors.test.mjs`: safe setup-error and diagnostic redaction coverage.
- `AUTH_REPAIR_HANDOFF.md`: this record.

Authentication, cookie security, CSRF, roles, customer ownership and tenant enforcement remain in force. Both signup journeys still use `/api/auth/register`; signup alone grants no distributor company or platform privileges. Distributor company creation remains an explicit signed-in `/api/companies` operation, followed by existing onboarding/approval requirements.

## Focused checks

Ran only the focused authentication/database checks and existing security checks against a new temporary local PostgreSQL cluster: **13 passed, 0 failed, 0 skipped**. The local cluster stopped afterward. No comprehensive suite, build, lint or broader launch audit was run.

Coverage includes customer profile creation, anonymous-to-user session rotation, HttpOnly cookie, customer login/logout and old-session revocation; distributor personal registration, explicit company creation, owner membership and subsequent login; customer/company separation; platform privilege denial; wrong passwords, missing CSRF, duplicate email and injected role rejection; Argon2 password verification, origin checks and safe error diagnostics.

Local checks use fictional accounts in a disposable schema and do not prove a real person's completed production onboarding. Live checks intentionally stop before account creation. Operational scripts under ignored `.verification/` retain credentials only in process memory and are not deployment assets.

## Manual follow-up

Reload the live site, register the intended real distributor account, continue to company setup and check sign-out/sign-in. In a separate browser/private session, register a real customer and check their dashboard and login. An existing email should use login rather than repeated registration. Password recovery/email delivery still depends on the existing SMTP configuration; this task does not add a mail provider or bypass recovery controls.

Commit/push the repository changes to enable the future deployment safeguard. No code was pushed or deployed by this task. Remaining launch verification is separate from this confirmed database initialization repair.
