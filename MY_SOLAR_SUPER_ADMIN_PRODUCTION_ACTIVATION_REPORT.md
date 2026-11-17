# MY SOLAR — Production Super Admin activation

Date: 17 November 2026. **Final status: BLOCKED. No production mutation authorised or executed.**

## Production identification

Fresh read-only Railway status metadata confirmed project `mysolar` (`b189e069-4956-40fb-aeec-8237b7347893`), environment `production` (`8e1cb532-b9d3-447a-aeca-60fd41ff06fb`), application `mysolar` (`b27efca8-cfe2-4a3c-9f8e-57f9f255408a`) and database `Postgres` (`058536fc-092b-4288-a48f-cb9cf8baae7d`). Application deployment `92bfc5e5-04fe-45cb-9281-5c34390c9f96` is marked SUCCESS; source commit `c7d664759392a344fc93ccbf386b9dd69699052b`.

Evidence: `.verification/admin-production-activation-metadata.json`. Metadata is deployment evidence, not a fresh database query or login test.

## Missing Node executable: findings and limits

Verified deployment manifest: builder **RAILPACK**, Railpack **0.43.0**, Node provider detected, requested Node `>=22.14.0`, resolved Node **22.23.4**, start command **npm start**, runtime V2. Repository `package.json` starts `node --env-file-if-exists=.env server/index.js`. No custom Dockerfile is selected by the manifest. `railway.json` configures `/readyz` and pre-deploy `npm run db:migrate`; this task did not deploy or invoke that migration command.

Owner-reported console evidence: `/app/server/admin.js` exists; `node` and three conventional paths were unavailable; `ps` was unavailable. This was not reproduced inside the container by this task.

**Root cause remains unconfirmed.** The metadata contradicts a conclusion that the app was built without Node. A console PATH difference or wrong console/service context is plausible. Railpack documents Mise-managed runtime layers under `/mise/shims` and `/mise/installs`, which were not in the owner's previous path checks. Source: [Railpack layer configuration](https://railpack.com/config/file), [Railpack architecture](https://railpack.com/architecture/overview). These document general layout, not the live executable's verified location.

The existing SSH path was retried with `node --version` against the explicit web service. It failed before remote execution: **No SSH keys found in your SSH agent or ~/.ssh/**. No key was generated, no package installed and no container changed. Railway shell/run execute locally with service variables and are not a substitute for private-network execution.

### Next safe runtime probe for the owner's existing console

Run this **read-only** block in the already accessible application console. Do not run a grant yet:

```sh
printf 'service=%s environment=%s\n' "$RAILWAY_SERVICE_ID" "$RAILWAY_ENVIRONMENT_ID"
for candidate in /mise/installs/node/*/bin/node /mise/shims/node; do
  if [ -x "$candidate" ]; then
    printf 'candidate=%s\n' "$candidate"
    "$candidate" --version
  fi
done
```

Expected IDs are the application service and production environment IDs above. This uses shell builtins, prints no secrets and does not rely on `ps`. A candidate/version result does not independently prove database targeting. If no candidate works, stop; do not run Mise install/activation commands, install Node, copy executables or change PATH permanently. A further bounded read-only inspection of the existing runtime/process filesystem is needed. No deployment alternative is justified until that evidence is available.

## Production identity and affiliation evidence

Owner provided an earlier production SQL result: **active; is_platform_admin=false**, and separately identified the account as Business. This is **owner-reported historical evidence**, not a fresh independent check. The supplied two-column query alone does not establish exact match count, account type, mailbox verification, memberships, creator links or current grant state.

Fresh production account lookup: **BLOCKED** by unavailable authorised internal execution. Previous external lookup also lacked a public database route. The owner has an existing SQL console; use this single read-only query there for current eligibility and conflict counts:

```sql
BEGIN READ ONLY;
WITH target AS (
  SELECT id,status,account_type,email_verified_at
  FROM users WHERE lower(email)='mysolarsolutions2026@gmail.com'
)
SELECT
  (SELECT count(*) FROM target) AS matching_users,
  (SELECT count(*) FROM target WHERE status='active') AS active_users,
  (SELECT count(*) FROM target WHERE status='active'
    AND (account_type='business' OR account_type IS NULL)) AS grant_eligible_users,
  (SELECT count(*) FROM target WHERE email_verified_at IS NOT NULL) AS verified_users,
  (SELECT count(*) FROM platform_admin_grants g JOIN target t ON t.id=g.user_id) AS existing_grants,
  (SELECT count(*) FROM platform_admin_grants g JOIN target t ON t.id=g.user_id
    WHERE g.role_id='platform_admin') AS platform_admin_grants,
  (SELECT count(*) FROM company_memberships m JOIN target t ON t.id=m.user_id) AS all_memberships,
  (SELECT count(*) FROM company_memberships m JOIN target t ON t.id=m.user_id
    WHERE m.status<>'removed') AS conflict_memberships,
  (SELECT count(*) FROM company_memberships m JOIN target t ON t.id=m.user_id
    WHERE m.role_id='owner' AND m.status='active') AS active_owner_memberships,
  (SELECT count(*) FROM companies c JOIN target t ON t.id=c.created_by) AS companies_created;
ROLLBACK;
```

This produces only counts, no hashes, tokens, customer contents or connection details. Require `matching_users=1`, `active_users=1`, `grant_eligible_users=1`, and `existing_grants=0` before proposing a new grant. Verify the actual owner's control and authorisation; matching an email alone is not authority to promote an account. An unverified mailbox requires review of existing security policy and ownership proof, not silent bypass. If a grant already exists, skip granting and investigate authentication separately. Stop on ambiguous, disabled or Customer identities.

Company affiliation/creator counts are currently **UNKNOWN**. They do not necessarily block the platform grant, but determine which companies this administrator cannot independently approve. `server/platform/routes.js` prohibits approval/reactivation/marketplace approval/publication for a company created by the same user or linked by a non-removed membership. Keep those restrictions. Another independent authorised administrator must review such a company. No XYZ or other business record was queried or changed.

## Exact proposed administrator grant — NOT EXECUTED

Before final approval, confirm runtime path/version, exact application directory/script, installed dependencies (`pg`, existing application validation/configuration modules), deployed script contents and effective database target. Compare the web service's database host/name/port with the confirmed Postgres service **in memory**, outputting only match booleans; never print connection strings or dump environment variables. Do not assume that a correct service ID proves its database connection target.

An authorised operator must use the existing application environment without loading an unreviewed local `.env`. Run from `/app`; set `NODE_BIN` only to the **absolute executable path confirmed by the read-only probe**, not an unverified guess. The following is the exact mutation payload and existing CLI operation for final approval after those checks:

```sh
printf '%s\n' '{"email":"mysolarsolutions2026@gmail.com","reason":"Platform owner authorised administrator activation after production identity verification."}' | "$NODE_BIN" /app/server/admin.js grant
```

This is a preparation reference, **not execution authorisation**. The final approval record must identify the verified user ID, pre-existing grant state, named owner/operator, production target, command and time window. The existing CLI reason can include that real approval reference within its 10–300 character limit. Do not invent an approval reference or record approval before it is given.

Expected writes, in one existing transaction: add the user's `platform_admin_grants` row, delete that user's sessions, and insert `platform.admin_grant` audit event. The role defaults to constrained `platform_admin`. No password, company, membership, ownership, enquiry, quotation or financial record is changed. Source verified: `server/admin.js`. The command's upsert rewrites existing grant metadata and revokes sessions on retries, so skip an already-completed grant rather than rerun blindly.

## Approval checkpoint

**Pending prerequisites:** fresh eligibility/conflict counts, verified executable and application context, dependency/script inspection, current database target match and owner-identity confirmation. No production grant approval is requested blindly while these remain unresolved. Once verified, present the completed target-specific command and expected writes for final explicit owner approval. Do not use direct SQL INSERT/UPDATE as a fallback.

## Post-grant acceptance — PENDING, not executed

After a separately approved execution, read only the designated identity's grant and non-secret audit fields (event ID/action/time/target and approved reason); do not dump arbitrary audit metadata. Confirm `role_id=platform_admin`, the expected new `platform.admin_grant` event targeting the same user ID, and session revocation. For a strict zero-session check, query immediately before the owner logs in; a later new legitimate login creates a session. Audit CLI actor is null, so its random operator-event ID is not proof of human identity; preserve the named approval/execution record.

Owner signs in privately at `https://mysolar.solutions/#/admin/login`, completes enrolled MFA and confirms `/#/platform`. Verify queues/details and authoritative `platform.companies.read`, `platform.onboarding.review`, `platform.marketplace.review`, `platform.lifecycle.manage` and `platform.audit.read` permissions. Verify logout and non-admin denials with appropriate fictional test evidence rather than real company mutations. Preserve all existing business/customer data and independent review controls. No live company approval is part of this activation.

The owner previously disclosed a password in chat; treat it as exposed and never reuse it in scripts or tests. Secure password change/recovery is a **separate production mutation requiring explicit approval**, entered privately through the existing HTTPS flow. No password reset or recovery email was requested in this task. Secure-password acceptance remains pending, even if a role grant later succeeds.

## Rollback

Failed grant transactions roll back. If this operation newly grants the role, and rollback is separately approved, use the same verified runtime/service context:

```sh
printf '%s\n' '{"email":"mysolarsolutions2026@gmail.com","reason":"Owner approved rollback of the newly issued administrator grant."}' | "$NODE_BIN" /app/server/admin.js revoke
```

Revoke removes the platform grant, revokes sessions and appends `platform.admin_revoke`; it does not restore invalidated sessions or delete the original audit event. Do not revoke a pre-existing grant or delete/recreate the identity. Recheck exact user/pre-state before rollback. Password-reset reversal is not part of grant rollback; use another separately approved private reset if needed.

## Final status and outstanding blockers

**BLOCKED**, not activated. Owner historical evidence supports an active account without a grant; current eligibility and conflict counts remain unverified. Railpack/Node build metadata is verified, but the exact console failure and executable location remain unresolved. Runtime access, database match, fresh production account evidence, final grant approval, audited execution, private fresh-password setup and official login acceptance are pending.

No production role/password/session/data changes, new keys, package installation, Railway settings/networking changes, migration, deployment, commit or push were performed. Existing identity and all company/business records were preserved. Only this report and ignored read-only metadata were written locally.
