# Signup and authentication repair

## 22 October 2026: mobile/PIN production activation and release

Inspected the deployed release and live configuration before making changes. Release 18e8633 already contained mobile/PIN authentication. The password signup screenshot was the intentional legacy fallback: AUTH_PIN_PEPPER was absent. All 21 production migrations matched the deployed manifest. DATA_ENCRYPTION_KEY was loaded, SMTP authentication succeeded, but there was no mail heartbeat.

The previously authorized, single mysolar-mail service had no deployment and no application variables in the resolved Railway response, despite the prior manual save confirmation. Added only missing references to the existing production web settings, then verified resolved equality in memory. No secret values were displayed or written as plaintext. Deployed the worker from 18e8633; runtime logs and a current database heartbeat confirmed its mail loop was running. Effective worker settings use npm run worker:mail, no HTTP health check, no migration pre-deploy command, ALWAYS restart and no sleep. No additional service was created.

Configured the previously missing AUTH_PIN_PEPPER from the existing Windows-current-user DPAPI-protected backup; read-back equality verified. The first attempts timed out during Windows decryption; extending the local decryption timeout succeeded without regenerating either key. Existing secrets were preserved. Saved production-only web settings with npm start, npm run db:migrate before deployment and /readyz readiness (120-second timeout), without triggering a deployment at that step. No historical migration was edited.

Improved signup modal actions to distinguish requesting an email code from verifying the code and creating the account. Added real-browser regression coverage for both customer and distributor signup modals at 360, 390, 768, 1024, 1280 and 1440 pixels. Default sign-in uses mobile and six-digit PIN when enabled; existing email/password access and conditional MFA remain available. Legacy users must enable PIN through Account security; contact phone numbers are not automatically enrolled.

Local evidence for this change: 15 focused authentication/PIN PostgreSQL checks passed in a disposable local database, no failures or skips; 360 browser assertions passed, zero uncaught browser exceptions; 1033 static checks passed before the additional browser assertions, followed by syntax and whitespace checks. PowerShell classified expected stderr from the no-database browser fixture as NativeCommandError despite the browser summary reporting zero failures; process-exit confirmation is recorded separately during release. Local results are not proof of production inbox delivery. The owner previously confirmed receipt of the direct SMTP diagnostic only. Production queued OTP/reset delivery and a real owner's successful account flow must be distinguished from these results; no real person's PIN or account was created or reset during preparation.

Railway's status page on 22 October reported recovery of API access and Pro deployments after its platform/security incident. Existing service metadata confirmed Pro deployment availability. This task does not establish completion of the operator's wider incident credential-rotation review. Production readiness must not be inferred solely from this authentication repair.

Browser process exit was independently confirmed as zero using cmd.exe redirection (avoiding PowerShell's stderr classification): 360 passed, zero failed. Final syntax and git diff --check succeeded. Release execution and final live evidence are recorded below when available. Older entries describe earlier states and are not current configuration claims.

### Verified production release evidence

Committed and pushed the implementation and regression coverage as 52f1e5bf33f3cd3373cb70f149f70cd116c47fdc. Railway web deployment fee61ed6-de5a-4240-829a-34fda08ac18b and mail deployment 28937313-d886-4917-9916-68d89cf0beb0 both reported SUCCESS on that exact commit. The web deployment manifest confirms /readyz and npm run db:migrate; its build log records a successful readiness check and runtime logs confirm startup. Post-release database inspection confirms exactly 21 migrations with matching checksums and a current idle mail heartbeat. No schema changes were required for activation.

Public /readyz and /api/auth/session returned HTTP 200; pinAvailable and pinEmailAvailable are both true. A fresh live Chromium session passed 10 checks at 390 and 1440 pixels covering public flags, both signup modals, and both sign-in routes. Signup fields are name/recovery email/mobile, with Send email code; sign-in fields are mobile/PIN, with Forgot PIN. No signup or login credentials were submitted by this live browser check. Visually reviewed the final mobile signup screenshot after the opening animation completed. Local screenshot/evidence files remain ignored.

The approved test inbox already had an active account; no duplicate was registered. One public /api/auth/recover request for that approved inbox returned 202 with normal session, origin and CSRF protections. The real mail worker processed its recovery job with attempts=1, status=accepted, last_code=SMTP_ACCEPTED, finished_at=2026-10-22T18:01:32.883Z, and private payload cleared. No password/PIN was changed and the recovery link was not followed. Owner inbox receipt of this queued recovery message remains awaiting confirmation; earlier direct diagnostic receipt is separately confirmed. Live OTP enrollment/reset completion on a real account has not been performed by the agent. No mobile credential exists at this inspection; existing users must enroll rather than expect a contact phone to work immediately.

This evidence establishes the deployed authentication presentation, configuration, queue execution and local security regressions. It does not establish every business feature, actual inbox receipt of this message, full real-account acceptance, an off-site restore test, or resolution of Railway incident credential-rotation recommendations. A follow-up documentation-only commit records these verified results; inspect the latest running commit after its automatic deployment.

## 21 October 2026: owner saved worker variables; Railway platform incident confirmed

Owner explicitly confirmed saving the eight reference variables in production/mysolar-mail. The agent has not independently read back those values because variable/configuration APIs remain affected. Existing production web release, secrets and business records were not changed in this resumed step.

Tried the guarded CLI repository connection, then the exact-target serviceConnect API for the authorized worker after confirming its only instance is in production and its start command is npm run worker:mail. The direct API returned Deploys have been paused temporarily. A final metadata read confirmed the repository link was nevertheless saved: mysolar-mail now points to maxpasegroup-debug/mysolar and retains npm run worker:mail. It has no latest deployment. This was a partial configuration success, not a running worker. Public /readyz and anonymous /api/auth/session both returned HTTP 200; pinAvailable and pinEmailAvailable remain false.

Railway's official status page https://status.railway.com/ showed an active partial outage titled Builds are temporarily paused, covering regional builds and API/backboard. Initial update 21 October 07:24 UTC (12:54 IST); latest visible update 08:28 UTC (13:58 IST) also reports backend issues under investigation. This confirms an external platform incident consistent with the deployment/configuration failures, rather than a proven account-login or user-variable-entry mistake. No billing limits were changed and no outage bypass was attempted. Stop deployment/configuration retries until recovery.

Resume after provider recovery: inspect actual worker variables/settings/source, preserving existing key values; connect/deploy only the authorized mysolar-mail service; verify its live mail heartbeat and database access; verify durable queued email and approved recipient receipt; then configure/verify the missing PIN pepper and controlled web release. Recheck effective pre-deploy migration and readiness settings. Keep existing email/password access and company permissions. Owner receipt of the earlier direct SMTP test is confirmed, but queued OTP/recovery delivery and live mobile/PIN acceptance remain outstanding. Do not add a company or reset a real account as a substitute for acceptance evidence.

## 21 October 2026: CLI refreshed; manual variable-reference handoff pending

Owner confirmed a separate CMD railway login. Updated the existing official local Railway CLI from 5.44.1 to 5.71.0 through its recommended npm update route (Windows npm.cmd); no application dependencies changed. Variable operations still return Problem processing request. The owner's dashboard Variables page works, but there is no connected browser available to the agent, including no iab browser provider.

Asked the owner to save only reference variables in production/mysolar-mail Raw Editor (NODE_ENV, APP_ORIGIN, DATABASE_URL, DATABASE_SSL, SESSION_SECRET, DATA_ENCRYPTION_KEY, RESEND_API_KEY, MAIL_FROM). No secret values were supplied in chat. Repository connection/deployment remains gated on explicit confirmation that those variables were saved. Prepared an ignored local source-connection helper with exact-target and owner-confirmation guards; it has not been executed.

An automatic approval review rejected one diagnostic that would have written raw production variables to a local file. The command did not execute and no such file was created. Continued with checks that withhold secret values; the rejection was not bypassed. Existing key backup remains DPAPI-encrypted. Do not enable PIN until delivery configuration is verified. This handoff is not a production-readiness declaration.

## 21 October 2026: resumed configuration and confirmed email receipt

The owner confirmed receipt at maxpasegroup@gmail.com of the approved production SMTP delivery check, and confirmed the Railway Variables dashboard loads. This establishes receipt of that one diagnostic email; it does not prove durable-queue OTP/recovery delivery or end-to-end company onboarding.

A narrowly targeted Railway service-settings update succeeded for the authorized mysolar-mail service, after metadata confirmed it exists only in production. Stored start command npm run worker:mail, no HTTP health check/pre-deploy command, ALWAYS restart and sleep disabled. The source remains disconnected and the worker has not started. No new service was created on this resumed run.

Railway explicitly rejected adding a railwayConfigFile setting because new Config as Code settings are deprecated. Removed the unused local railway.mail.json draft rather than connect the worker to a rejected configuration path. Existing application source and historical migrations remain unchanged. The worker settings are stored through the supported service-settings API.

Variable reads/writes and worker secret-reference upserts still return Problem processing request. A browser fallback has no connected browser surface. Started an authorized fresh railway login; the owner must complete its browser consent before retrying configuration. DATA_ENCRYPTION_KEY remains saved from the earlier read-back-verified operation, but activation in a new running deployment is unverified. AUTH_PIN_PEPPER remains unset. Existing credentials are preserved. Public readiness and live PIN status must be rechecked after any completed deployment.

## 21 October 2026: production configuration attempt - BLOCKED

Owner authorized missing-variable setup and one dedicated production mail-worker service, acknowledging possible compute charges. Approved test recipient: maxpasegroup@gmail.com. Intended sender remains noreply@mysolar.solutions. Existing SESSION_SECRET, database credentials and Resend credential were preserved. No customer/company account was created and no live PIN/password was changed.

Confirmed running release 18e86338c6819157236e86fa940b4459cdfd74e2. Production preflight found all 21 migrations and matching checksums, correct HTTPS origin, secure cookies configured by production mode, Resend SMTP on port 465/TLS, intended sender, and successful SMTP authentication. No PIN credentials, encrypted records or pending mail existed at preflight. This is not end-to-end onboarding or inbox-delivery proof. Customers and distributor/installer/both company types are supported; the existing staff roles and PRO-gated part-time sales role remain. Independent company approval and commercial entitlements remain mandatory. Supplier-specific self-service onboarding and custom-domain traffic are not enabled by these changes.

Generated independent 32-byte encryption/PIN secrets without displaying them. Stored only the missing DATA_ENCRYPTION_KEY in production/mysolar using stdin and --skip-deploys, and verified read-back equality. The value is saved in Railway but has NOT been verified in a new running deployment. AUTH_PIN_PEPPER has not been set; mobile/PIN remains disabled. Both generated keys have a Windows-current-user DPAPI encrypted backup under the ignored .verification directory. That local backup is bound to this Windows user/profile; it is not an off-site recovery system. Operator must keep a separate secure backup before relying on encrypted production records.

Created exactly one empty service, mysolar-mail (068a60f0-6421-47e0-9ee4-6d07a56ac534), in production. It has no source, public domain, running worker or verified configuration. Prepared railway.mail.json with the existing mail-worker command, no HTTP health check, always-restart policy and sleep disabled. Source connection/deployment was intentionally not performed without verified variables. No other environment or provider resources were created or changed.

Railway subsequently returned 'Problem processing request' for variable listing, environment configuration, environment patch and worker variable-upsert requests. Account, service and project metadata still work and exact project/service/environment IDs match. This is not a confirmed expired-login error. Safe guards stopped before enabling PIN or deploying an unconfigured worker. No successful worker-variable/configuration mutation is claimed. Existing web deployment and 21-migration schema remain in place; pre-deploy/health-check discrepancy is unresolved. No signed-in browser surface was available for the dashboard fallback.

One direct, clearly labelled email-delivery check was attempted to the approved recipient. The SSH command timed out; provider acceptance/inbox receipt is UNCONFIRMED and it was not blindly retried. Read-only Resend domain/email queries returned 401 with category restricted_api_key; the credential is restricted from those read operations, not proven invalid. No broader provider key was requested. Await owner inbox confirmation and resolution of Railway configuration access.

Next steps: restore Railway configuration API/dashboard access; configure worker with references to web/database secrets and correct private process settings; ensure production web pre-deploy npm run db:migrate and /readyz gating; release encryption configuration; test an approved queued verification email and actual inbox receipt; only then set AUTH_PIN_PEPPER, deploy and rehearse PIN signup/login/reset using an owner-controlled test identity with permission. Do not reset existing accounts or add a real company for the owner. Optional scanning/AI/monitoring/reminder services remain separate configuration/acceptance concerns; no production-readiness claim is made.

## Authorized production migration and Git release preparation (2026-10-20T16:47:18.071Z)

The owner explicitly authorized all required migrations plus committing/pushing this release. Verified the existing approved Railway backup pre-signin-migrations-2026-10-20 (03c813d5-485c-4e9d-8e0f-dee4cd6cc318) remains listed without expiry. No additional paid backup/resource was created and no restore exercise is claimed. The production target is mysolar / production, using its existing Postgres service.

Applied only 021_mobile_pin.sql through the existing npm run db:migrate runner in the running application container, after transferring the exact new release migration with a checksum guard. No historical migration was rewritten. Before: 20 entries; after: **21 entries, all committed-release checksums match, zero unvalidated constraints**. The initial guard safely stopped because the local Windows copy of migration 020 has CRLF whereas committed/deployed bytes have LF; comparison was corrected to exact Git release bytes without changing that historical file. Public /readyz returned 200 ready and /api/auth/session returned 200 with an anonymous security session after migration.

Production configuration inspection (presence only) found AUTH_PIN_PEPPER unset, DATA_ENCRYPTION_KEY unset, mail credential/sender present, and no recorded mail-worker heartbeat. Variables, secrets, mail services, DNS and domain traffic were not changed. Therefore mobile/PIN activation and real email delivery remain blocked even after this code is released; existing email/password access stays available. Effective Railway deployment metadata still lacks the pre-deploy command/readiness health check; remote deployment settings were not altered. No account was registered, private workflow tested or email sent live. Git push may trigger the existing Railway GitHub deployment integration; code-release verification is separate from the successful schema migration.

## 20 October: mobile number and six-digit PIN (local implementation)

This section supersedes the older sign-in presentation when optional PIN configuration is enabled. Existing account IDs, memberships, permissions, sessions, CSRF/origin rules, audit records and encrypted mail delivery are reused. No production configuration, deployment, migration, account or outbound message was changed in this work.

### User journeys

- New customer/business signup: name, recovery email and Indian mobile; request an email code; enter it and choose a six-digit PIN. No account is created before email proof. Company setup/activation remains separate. Existing invitation destinations are retained and registration grants no company membership or administrator role.
- Sign in: mobile and masked PIN. Email/password remains available for existing accounts. An enrolled authenticator/recovery code is requested only after primary validation. Back clears credentials and the stale MFA message.
- Existing account: sign in, verify its email in Account Security, prove current password/PIN and enrolled MFA, choose mobile and confirm an emailed code/new PIN. Enrollment signs out all sessions. Contact phone fields are never automatically promoted to login identities. Duplicate users/phones are not merged.
- Forgot PIN: submit sign-in mobile; generic response does not disclose account/email existence. A valid recovery-email code changes the PIN and revokes all sessions. It never signs the user in or removes MFA. Next login still requires enrolled MFA.
- Initial scope is Indian mobile numbers beginning 6 through 9, normalized to +91. Ten-digit local numbers or country-prefixed numbers with formatting are accepted. **Mobile ownership is not verified by SMS.** No SMS/WhatsApp provider was added; number disputes/recycling still need an operator policy.

### Security and storage

Forward migration **021_mobile_pin.sql** adds unique user-linked mobile_credentials, session-bound pin_challenges, constraints/indexes and the pin_otp mail kind. Historical migrations are untouched. Signup/invitation context and queued messages are encrypted. PINs are HMAC-peppered then Argon2id-hashed. OTP hashes are keyed and bound to purpose/challenge. PIN-only accounts store an inaccessible random legacy password verifier to preserve the existing NOT NULL schema; this is never exposed/delivered. Verified email recovery may explicitly establish a legacy password later.

Email codes expire in ten minutes, permit five comparisons and are single-use. Resending invalidates the older code. Challenge/session/purpose binding, current verified email, credential revision and authenticated ownership are checked where relevant. Failure counters commit on rejected comparisons. Five incorrect PIN/MFA attempts lock that credential for fifteen minutes across IPs/restarts. Additional IP/mobile/email/user budgets and request cooldown buckets remain; per-account reauthentication throttling covers existing security endpoints. New PINs reject identical/consecutive digits. Role/tenant authorization and MFA remain authoritative.

The worker cancels invalid jobs, scrubs terminal message payloads and may deliver at least once; duplicate email does not allow duplicate redemption. db:cleanup deletes expired/consumed challenges. Until cleanup runs, those rows remain stored; no automatic deletion is claimed. Existing audit retention is unchanged. Audit metadata excludes PINs, OTPs and personal message contents.

### Operator rollout (not executed)

1. Review/commit the release. Verify a current recoverable backup before authorizing schema deployment. Earlier production authorization covered 009-020, not this new migration.
2. Apply through the supported **npm run db:migrate** runner on the explicitly approved target, never manual SQL. The manifest now expects 21 entries. Verify effective Railway pre-deploy/health-check settings against repository configuration; the prior discrepancy has not been changed. Keep PIN configuration empty initially for legacy access.
3. Configure an independent random 32-byte hexadecimal **AUTH_PIN_PEPPER** via the operator secret manager and back it up. Never reuse session/encryption secrets. Rotation invalidates existing PIN verifiers and outstanding codes, requiring a planned recovery process.
4. OTP signup/reset also require **DATA_ENCRYPTION_KEY**, existing Resend/SMTP credentials, verified **MAIL_FROM**, and a supervised **npm run worker:mail** process. Do not rotate an existing encryption key without migrating encrypted data. Resend uses the existing server-only SMTP adapter.
5. With separate authorization, verify actual inbox receipt and signup/reset/MFA/session revocation using an approved recipient. Mock SMTP acceptance is not evidence of Resend inbox delivery. Strong owner/platform MFA policies require a working recovery procedure.

Without the pepper, the default remains email/password and PIN endpoints safely report unavailable. Missing mail/encryption blocks PIN setup/reset, while already-enabled PIN login still works with the pepper. Removing the pepper is only an emergency legacy-UI fallback: PIN-only users may need verified email password recovery or restored PIN configuration. Do not drop credential tables during app rollback.

### Files and verification

Backend: server/auth/pin-routes.js, pin-security.js, shared registration.js, existing auth routes/protection, config, mail queue, cleanup and migration 021. Frontend: src/mobile-auth.js, account/security/onboarding integration, index.html, accounts.css, static server allowlist and service-worker cache v18. Configuration/tests: .env.example, isolated secret scrubbing, PIN integration, authentication/config tests and browser scenarios. No dependencies added.

Final local checks: **257 automated tests passed, zero failed/skipped**, using a disposable PostgreSQL cluster; **336 browser checks passed** across six widths with fictional API fixtures. Coverage includes concurrent normalized mobile claims, email proof, expiry/replay/resend/attempt budgets, durable lockout, existing email/password, disabled configuration, session revocation, retained MFA and correct company-role restoration. An inherited stale MFA feedback issue was fixed. Browser screenshots include .verification/browser/mobile-pin-390.png. **1,033 static checks passed.** Protected deep-link sign-in also preserves its conditional MFA step. These results are not production readiness, real email delivery or mobile ownership verification.

## 20 October: simple sign-in and production schema repair

The initial customer and distributor sign-in form now contains registered email (the existing account identifier), password, Sign in and Forgot password only. Removed the marketing side panel, account-creation/demo links, unconditional authenticator field and duplicate setup error. Accounts with enrolled MFA receive a separate, focused code step only after the backend verifies the password. Back clears the password. No password or MFA material is stored in browser storage. Recovery, role guards and safe journey destinations remain in use. Static cache version is v17.

Read-only inspection of the running production service confirmed only migrations 001–008 were applied although deployed commit 91f0ab12acd3eae21db4814c1c57363e5f7e6a97 expected 20 entries. The users.email_verified_at/sessions.mfa_verified_at columns and account_security table were absent. This caused the screenshot's SERVICE_NOT_READY response after signup; the account should not be registered again to repair it.

The owner explicitly authorized checking backups/applying migrations, then separately authorized one new backup when none existed. Production PITR was disabled and the initial backup list was empty. Created one approved backup on the existing Postgres volume: pre-signin-migrations-2026-10-20, ID 03c813d5-485c-4e9d-8e0f-dee4cd6cc318, listed by Railway at 2026-10-20T15:13:49.337Z (20:43 IST), referenced size 869 MB. No restore exercise or PITR enablement is claimed. Manual backup storage may be billed by Railway.

Existing 001–008 checksums matched before the change. Ran the existing npm run db:migrate through the running production mysolar container, applying 009–020 without rewriting historical migrations. Post-check: 20 entries, all expected checksums matched and zero unvalidated constraints. Public https://mysolar.solutions/readyz returned 200 ready, and /api/auth/session returned 200 with a valid anonymous security session. No private token/cookie values were printed. No user or company account was created, no password was changed, no invitation/recovery mail was sent, and no code deployment, environment-variable, DNS or domain-routing change was made.

Local checks: 18 authentication/recovery/MFA integration checks passed against disposable PostgreSQL; 317 browser checks passed across six widths, including two-field login, conditional MFA and back navigation; 993 static checks passed. Screenshots are ignored local evidence: .verification/browser/signin-390.png and signin-1440.png. A browser-fixture race was corrected by draining a pending focus refresh before changing fictional roles; backend permissions were not relaxed.

Remaining operational issues: effective production deployment metadata still shows no pre-deploy migration command or readiness health check, whereas railway.json specifies npm run db:migrate and /readyz. Remote configuration was not changed; resolve that discrepancy before future schema releases. DATA_ENCRYPTION_KEY is unset in production, so queued recovery/verification/invitation mail and MFA enrolment still need the key and supervised mail worker. This is separate from the repaired schema failure and was not bypassed. The simplified sign-in code is local and needs the owner's commit/push/release; no commit or push was performed here.

## Historical incident record

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
