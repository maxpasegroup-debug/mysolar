# Single root application

19 October 2026. The canonical checkout is `D:/APPS/WEB/mysolar` on `main`. Commit `77a3c45` was fast-forwarded from `feature/unified-business-workspace` into local `main`. Application entry remains root `index.html` with existing `src/`, `server/`, `assets/`, scripts, styles and lockfile. Do not flatten these directories: their imports and asset paths are intentional.

Staging-only tools removed: `server/staging.js` and its HTTP/mail wrappers, `scripts/prepare-staging.mjs`, `scripts/staging-acceptance.mjs`, `scripts/staging-browser.mjs`, `tests/staging.test.mjs`, and staging variables from `.env.example`. Historical reports are retained as superseded evidence. Ignored `.verification/` artifacts were not deleted and are not deployment inputs. Local test isolation, authentication, sessions, CSRF, roles, tenant checks and invitation/recovery workflows remain.

## Root release configuration

| Purpose | Existing command/configuration |
| --- | --- |
| Install | `npm ci --no-audit --no-fund` |
| Static build validation | `npm run build` |
| Start | `npm start` |
| Supported migration runner | `npm run db:migrate` |
| Checked-in pre-deploy | `railway.json`: `["npm run db:migrate"]` |
| Readiness | `/readyz`, timeout 120 seconds |
| Process health | `/healthz` |
| Optional separate reminder process | `npm run worker:reminders` |

Use the repository root as build/deployment source. These are checked-in settings, not verification of effective Railway configuration. No remote environment, variable, service, volume, DNS, database or deployment was changed. Remote staging resources, if any, were neither inspected nor deleted; their current existence or absence remains unverified.

An old environment setting `STAGING_MODE=true` now deliberately blocks startup. Removing private-access/mail protections must not silently unprotect an old private deployment. Normal root configuration does not need staging variables. No remote variable was changed here.

`.railwayignore` excludes `.verification/`, `.pilot/`, `.git/`, `.env` secrets and other local-only files. Never force-add the private owner confirmation, database artifacts or secrets as deployment inputs. Existing database/session/mail configuration validation remains.

## Release and recovery

Use a reviewed commit and supported migration runner, not an old generated staging copy. Preserve previous release identifiers and confirm a recoverable backup before an approved live migration. Roll back code only to schema-compatible revisions; do not delete migration history or blindly restore over new customer data. Production backup/restore requires an explicit target and authorization.

The assistant performed no commit, push or deployment. Local `main` is ahead of the last observed `origin/main` by the feature commit; cleanup edits remain in the working tree. Pushing the deployment-connected main branch may release both UI changes and cleanup through the existing Railway integration. The push is left to the owner.

## Local verification

Observed results: **233 automated tests passed with zero failures/skips**, **180 browser checks passed**, and **783 static checks passed**. The lower counts versus the previous release reflect removed staging tests/scripts; a new configuration regression checks the legacy-mode startup refusal. Logs: `.verification/root-consolidation-db.log`, `root-consolidation-browser.log` and `root-consolidation-static.log`. The disposable PostgreSQL cluster was stopped afterward. No database migration was executed against a persistent or remote database. Runtime/import reference inspection found no remaining dependency on deleted staging files.

These local checks do not establish production readiness, real email receipt, live onboarding or remote environment deletion.
