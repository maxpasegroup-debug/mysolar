# Customer authentication production release review

Date: 17 November 2026. No deployment, push, production account mutation or configuration change was performed during this review.

## Release identification

The requested revision is already live. Railway reports successful deployment `99ebf96a-f377-4efb-9c7b-265caa165c5c`, created 17 November 2026 at 10:00:48 UTC (15:30:48 IST), of commit `d25b3bb9da0c710fdb7ac502c82cd7339266b7ef`. This was discovered through read-only inspection; it was not deployed by this review.

- Repository: `https://github.com/maxpasegroup-debug/mysolar.git`.
- Local branch and GitHub source branch: `main`; both point to that commit. Tracked working tree was clean at review start.
- Railway project: `mysolar`, `b189e069-4956-40fb-aeec-8237b7347893`.
- Environment: `production`, `8e1cb532-b9d3-447a-aeca-60fd41ff06fb`.
- Application service: `mysolar`, `b27efca8-cfe2-4a3c-9f8e-57f9f255408a`.
- Database service: `Postgres`, `058536fc-092b-4288-a48f-cb9cf8baae7d`.
- Public domain: `https://mysolar.solutions`.
- Deployment: Railpack, start command `npm start`, health check `/readyz`, pre-deploy command `npm run db:migrate`.

Read-only configuration comparison confirmed the web service points to the selected database, production configuration validates, the official origin matches, and PIN authentication and recovery configuration are present. Only boolean results were recorded, never credentials. Configuration presence does not prove recovery email delivery.

## Code review and scope

Verdict: no new critical or high-severity defect identified in the reviewed diff. This is a source review, not proof of complete browser acceptance.

Compared the release to parent `3688b1f92d4503faaa95252e697f04c19a455c62`. Seven files changed:

- `src/account.js`: customer login selects the existing mobile/PIN interface; logout preserves the appropriate authentication entrance.
- `src/mobile-auth.js`: dedicated customer mobile/PIN presentation and recovery/registration links; stale email-mode state cannot select the customer email form.
- `server/auth/pin-routes.js`: country code is optional at recovery request parsing, consistent with the existing mobile canonicalizer; supplied values remain validated.
- `tests/customer-login-ui.test.mjs`, `tests/customer-login-session.integration.test.mjs`: customer UI and session acceptance checks.
- `tests/privileged-auth.integration.test.mjs`: updates an obsolete trial fixture while preserving permission assertions.
- `MY_SOLAR_CUSTOMER_AUTHENTICATION_LOGOUT_FIX_REPORT.md`: implementation evidence.

Business and Super Admin login handlers, identity models, permissions, hashing, rate limits and session implementation are unchanged. The shared PIN recovery parsing adjustment can also affect Business PIN recovery; therefore the entire diff is not exclusively customer UI. It introduces no alternate identity or account merging.

## Schema, credentials and compatibility

No migration, permission catalogue, environment template, dependency, session format, hashing or deployment configuration changes are included. No new environment variable or production credential change is required. Existing session records and customer identities remain compatible by source inspection; no logout-all, credential reset or secret rotation is required.

The live `/healthz` and `/readyz` returned HTTP 200. `/readyz` compares migration names and checksums against the release manifest using a read-only query, providing evidence that the current production manifest matches this release. No production migration was executed during this review. The existing pre-deploy migration hook would still run on any future deployment; recheck readiness before authorising one.

The production `src/account.js` and `src/mobile-auth.js` assets returned HTTP 200 and matched the committed Git blob bytes exactly. This verifies the changed assets are served, rather than merely relying on a deployment label.

## Final checks

| Check | Result | Evidence |
| --- | --- | --- |
| Default regression suite | PASS: 261 passed, 65 skipped, zero failed | `.verification/customer-auth-release-regression.log` |
| Disposable PostgreSQL security/integration suites | PASS: 21 passed, zero failed/skipped | `.verification/customer-auth-release-security.log`; mobile PIN, account channels, administrator login and privileged authentication suites |
| Lint | PASS: 1,840 checks | `.verification/customer-auth-release-lint.log` |
| Production build command | PASS: 1,840 checks | `.verification/customer-auth-release-build.log`; this project's build command runs the static checker |
| Whitespace validation | PASS | `git diff --check` |
| Fresh browser acceptance | PASS on isolated repeat: one integration test covering desktop and mobile Chrome/touch; first run timed out | `.verification/customer-auth-release-browser.log`, `.verification/customer-auth-release-browser-repeat.log` |
| Live signed-in customer, Business and Admin journeys | PENDING owner-private acceptance | No production login, logout, recovery or session API operations performed |

The default suite's 65 skips are not passes. Focused database suites used fictional accounts and an isolated local PostgreSQL cluster, not Railway. The first fresh Chrome browser run exercised desktop customer login/logout, expiry and recovery, then timed out waiting for a new-registration confirmation response. An unchanged, isolated rerun passed both desktop and mobile/touch: direct login, incorrect credentials, logout/relogin, expired sessions, PIN recovery, registration and repeat login, Business login, and Admin login/logout. The repeat finished with one passed integration test, zero failures/skips, and the disposable cluster stopped. The initial intermittent timeout remains a test reliability concern; its root cause was not established and no assertions were weakened. A sandboxed retry could not start PostgreSQL; the final successful run used the authorised local process permissions.

## Exact deployment action and approval boundary

A redundant deployment is not recommended because the exact revision is already served. If the owner explicitly wants a redeployment, the reviewed operation is:

```powershell
railway redeploy --project b189e069-4956-40fb-aeec-8237b7347893 --environment production --service b27efca8-cfe2-4a3c-9f8e-57f9f255408a --commit d25b3bb9da0c710fdb7ac502c82cd7339266b7ef
```

This command was not executed. It requires final explicit owner approval. No commit or push is needed for the already-live revision. Do not deploy the uncommitted report by using a local upload command.

## Rollback

If owner-authorised rollback is necessary, redeploy the exact previous source revision:

```powershell
railway redeploy --project b189e069-4956-40fb-aeec-8237b7347893 --environment production --service b27efca8-cfe2-4a3c-9f8e-57f9f255408a --commit 3688b1f92d4503faaa95252e697f04c19a455c62
```

Verify the selected project/service again, confirm `/readyz`, obtain explicit approval, execute only that operation, then verify deployment SHA, health, served assets and private login journeys. Previous deployment images may be removed; do not assume an old image is available. This source rollback restores the previous customer-login defect and recovery parser. Both revisions use the same migration files; no database downgrade, record deletion, credential reset, permission change or backup restore is part of this rollback. Existing migration hooks still apply. Normal in-flight requests may need retry during redeployment.

## Outstanding risks and private live acceptance

The owner must privately verify `/#/customer/login` shows country code, mobile number and six-digit PIN; sign in, reach the customer dashboard, sign out and confirm the same mobile/PIN entrance returns. Repeat on mobile. Separately verify existing Business and authorised Super Admin login/dashboard/logout, without changing roles or credentials. Do not send credentials in chat. These actions create ordinary production authentication/session records and were intentionally not performed by this audit.

Existing email-only customer identities without enrolled mobile credentials require the supported verified enrollment/support process; this review did not inspect production enrollment counts. No automatic linking or migration was introduced. Recovery provider/worker delivery, physical mobile devices and manual assistive-technology testing remain unverified. Admin account provisioning status is outside this release review.

Recommendation: local release checks pass, with an intermittent browser test timeout recorded. No additional deployment is needed. Final production sign-off remains conditional on owner-private live checks. Do not describe the full production journey as verified yet.
