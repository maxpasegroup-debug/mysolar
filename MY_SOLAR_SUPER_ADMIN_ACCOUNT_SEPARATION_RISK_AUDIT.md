# MY SOLAR — Super Admin account separation and deletion risk audit

Date: 16 November 2026. Scope: read-only investigation; this report is not authorisation to implement a change.

## Decision

**NO-GO for deletion.** Deleting and recreating the identity is unnecessary for administrator access, is not supported by an account-deletion workflow found in this repository, and could break historical relationships. Production dependencies are unknown, not zero.

Recommended immediate approach: **Option A**, retain the intended eligible identity and, only after ownership verification and explicit approval, grant the existing `platform_admin` role using the existing private operator command. If independent operational administration is essential, **Option C** offers stronger separation using a different owner-controlled email. Removing a business membership is not required to enable administrator login.

The owner's statement that a Business account exists is context supplied by the owner, **not an independently verified production result**. The intended email is `mysolarsolutions2026@gmail.com` throughout.

## 1. Verified architecture

| Question | Repository finding |
| --- | --- |
| Shared identity table? | Yes. Customer and Business identities use `users`; platform administration is an additional `platform_admin_grants` row referencing the same user. There is no separate administrator user database. |
| Business plus administrator permissions? | Yes. Company permissions come from `company_memberships`; platform permissions come from the independent platform grant. Existing `server/admin.js` accepts active Business or legacy identities. |
| Administrator without a company? | Yes. Verified signup can create an eligible Business-type user without creating a company or membership. A subsequent authorised grant enables administration. “Business” is the identity channel; no separate `admin` account type is implemented. |
| Email globally unique? | Yes in the current intended migration chain: migration 032 creates `users_email_global_ci` on `lower(email)`. Migration 030 temporarily allowed separate account channels sharing an email, but 032 supersedes that design and refuses ambiguous existing duplicates. Actual production indexes/migration state remain unqueried. |
| Account deletion supported? | No user-deletion API, operator command or complete erasure workflow was found in the inspected server source. File deletion and SIA-history deletion are unrelated. |
| Can an existing Business user become an administrator without deletion? | Yes, by the existing authorised, audited platform grant. This adds privileges; it does not convert `account_type`, delete a company or remove memberships. |
| Can Customer be silently converted to Business/admin? | No supported conversion. Migration 030 makes a non-null `account_type` immutable; the current grant tool rejects Customer identities. A surprising account type requires a separate decision. |

Sources: `server/db/migrations/001_identity.sql`, `030_separate_account_channels.sql`, `032_verified_unique_email_signup.sql`, `server/auth/registration.js`, `server/auth/business-signup.js`, `server/auth/routes.js`, `server/admin.js`.

`createIdentity()` creates a `customer_profiles` row even for a Business identity. Therefore the presence of that supporting profile alone does not prove the account has made customer enquiries or has an active Customer login channel.

Passwords use the existing salted Argon2id mechanism in `server/auth/security.js`. New password creation/reset remains 12–128 characters. Recovery changes the existing identity's password and revokes sessions; it does not grant administrator access or rebuild missing business history.

## 2. Production account findings

Target from existing verified metadata: Railway project `mysolar` (`b189e069-4956-40fb-aeec-8237b7347893`), environment `production` (`8e1cb532-b9d3-447a-aeca-60fd41ff06fb`), database service `Postgres` (`058536fc-092b-4288-a48f-cb9cf8baae7d`), web service `mysolar` (`b27efca8-cfe2-4a3c-9f8e-57f9f255408a`).

The existing SSH access path to that web service was retried with only `node --version`. Railway returned **“No SSH keys found in your SSH agent or ~/.ssh/”**. No key or remote session was created. Previous documented database access also stopped before connection because no public connection/TCP proxy was available. `railway shell` is a local subshell and does not by itself reach the private network. The owner's database viewer access has not been transferred into an accessible operator session here.

| Required production finding | Status |
| --- | --- |
| Account existence, status/type, email verification | BLOCKED — no database query executed |
| Company memberships and ownership, including sole-owner count | BLOCKED — unknown |
| Company creator relationships | BLOCKED — unknown |
| Customer profile and contact relationships | BLOCKED — unknown |
| Pending activation/publication applications | BLOCKED — unknown |
| Direct and company-associated enquiries/quotations | BLOCKED — unknown |
| Orders, invoices, payments, subscriptions and billing relationships | BLOCKED — unknown |
| Audit actor/target references and legal acceptance history | BLOCKED — unknown |
| Administrator grant and permissions | BLOCKED — unknown |

No production passwords, hashes, tokens, contact details, enquiry contents or customer records were retrieved. No result above may be interpreted as “no dependencies.” This audit stops at the missing production access boundary; the remainder evaluates repository-supported risks and alternatives, not the real account's record counts.

## 3. Database dependencies and deletion effects

These are constraints in the repository migration chain, not a live catalogue inspection. Ordinary PostgreSQL foreign keys without an `ON DELETE` clause use `NO ACTION`; even nullable references are not automatically cleared.

| Dependency family | Examples and effect of deleting a referenced user |
| --- | --- |
| Company identity/access | `companies.created_by`, `company_memberships.user_id`, `platform_admin_grants.user_id`: no delete cascade declared; referencing rows can block deletion. Removing a membership does not remove the historical creator reference. |
| Customer demand and quotations | `customer_enquiries.customer_id`, `quotation_versions.created_by`, message/note authors, enquiry event actors and workflow notification recipients: retained references can block deletion. Quotation/enquiry relationships also connect other companies and customers. |
| Daily business work | Contacts linked to a user, lead/task assignees, order owners/confirmers, project managers/team members, inventory actors and service/work records retain user references. Changing one identity can affect other employees' workflows. |
| Financial and commercial history | Receipts and other finance actors, subscription creators/event actors, billing-contract owners, commercial plan authors and referral participants/reviewers retain user references. Company-level payment/subscription relationships also need an indirect company dependency review. |
| Audit and review history | `audit_events.actor_user_id`, company review actors, publication/review actors, invitations and accepted legal records need retention review. `audit_events.target_id` is a generic UUID without a user foreign key: an FK-only audit cannot find every meaningful historical reference. |
| Mail and supporting history | `mail_jobs.user_id` has a non-cascading user reference. Signup challenge email and other snapshots can survive independently of the user row. |
| Authentication/supporting rows with cascade | `customer_profiles`, `sessions`, `password_reset_tokens`, `account_security`, `email_verifications`, `mobile_credentials` and `pin_challenges` declare user delete cascades in migrations 001, 013 and 021. A successful deletion can remove profile/session/recovery/MFA/mobile linkage data. |

Sources include migrations 001, 003–006, 008, 013, 017, 021, 025, 030, 032, 042 and 045. The complete migration search index is `.verification/admin-separation-schema-index.txt`.

**Consequences:** a normal delete may fail because of retained references. Disabling constraints, deleting related rows, or rewriting historical user IDs to force it through would expand the operation into a dangerous data migration affecting business and audit history. That is outside this task and is not recommended. A recreated account receives a new UUID; matching its old email does not reconnect old records, ownership or legal/audit history. Password recovery is not a deleted-account restoration mechanism.

### Soft deletion, retention and email reuse

- `users.status` supports `active` and `disabled`; no complete account soft-deletion/erasure workflow or `users.deleted_at` field was found. A disabled row still occupies its globally unique email and is rejected by normal login and active-account recovery. Directly setting that status is not an approved procedure in this audit.
- Membership `removed` is a retained membership state, not user deletion.
- Existing legal catalogue text explicitly says business records, legal acceptances, grievances and audit history have no automatic deletion schedules. That is repository policy text, not a verified legal retention period or proof of compliance. Any erasure request needs a reviewed retention/anonymisation process.
- A successful hard delete would remove the user row's email uniqueness claim, but application signup protections, outstanding challenges, independent historical records and retention duties still apply. It is not a supported same-email replacement workflow. No guarantee of immediate reuse is made.
- No production backup or tested account-level restore was inspected. Recreating a user or restoring a whole database is not a safe rollback for one account while others continue operating.

## 4. Membership and ownership controls

Existing endpoint: `PATCH /api/companies/current/members/:membershipId` in `server/tenancy/routes.js`.

- Requires `members.manage`, correct company scope and validated role/status.
- Supports suspension/removal of a **non-owner** membership by changing its status, retaining the row and auditing `membership.updated`.
- Calls `requireNoOutstandingWork()` before deactivating access; active responsibilities require handoff first. See `server/operations/work-handoffs.js`.
- Explicitly rejects owner changes with `OWNER_PROTECTED`: “Owner changes require a separate ownership-transfer workflow.” A complete ownership-transfer endpoint was not found; the error text is not evidence that such a workflow exists.
- Owner access is granted by the atomic company-creation path. Do not work around owner protection with a direct SQL update or delete. Production owner/sole-owner status must be known before any departure plan.

Important separation limitation: `server/platform/routes.js` blocks independent approval/reactivation/publication when the administrator is the company's `created_by` user or has a non-removed membership. Removing a non-owner membership alone does not erase the creator restriction. A platform grant does not entitle the owner to self-approve their own company. This is intentional protection, not a login defect.

## 5. Options compared

| Option | Feasibility/security | Data risk | Approval and rollback | Assessment |
| --- | --- | --- | --- | --- |
| A — Keep identity, add `platform_admin` | Supported for an active eligible Business/legacy user through `server/admin.js`. Same identity retains business access and gains platform permissions. Larger privilege exposure if compromised; enrolled MFA and independent review remain applicable. | Lowest structural risk: no deleted/reassigned records or lost membership. Grant revokes existing sessions. | Explicit named owner approval for exact user ID/grant; verify ownership first. A newly added grant can be revoked using the audited CLI with rollback approval. Do not revoke a pre-existing grant to undo another operation. | Recommended immediate path for this exact email, subject to production lookup. |
| B — Remove only Business membership, retain admin identity | Conditional: supported for non-owner memberships after handoff; owner removal is blocked. Identity remains Business-type, and can still have creator history. Not a new administrator account type or full historical separation. | Business access loss and operational disruption if responsibilities are not handed over. No record deletion should be necessary for the supported non-owner path. | Separate company-authorised membership/handoff approval plus administrator grant approval. Restoring an eligible membership uses existing controls and entitlement/capacity checks; not a guaranteed one-click undo. | Consider only after a real dependency/ownership audit. Not needed for login. |
| C — Different email, dedicated admin identity | Supported by verified signup without company creation followed by an explicit grant. Separate fresh credential and MFA provide stronger operational separation. Different user must still be independent of reviewed companies. | Low impact to existing business data; additional identity/supporting signup records. New privileged identity must be secured and maintained. | Approve new owner-controlled email/identity and grant. Revoke the new grant if abandoned; retain identity/audits pending a reviewed retention decision. | Preferred for strict separation if owner accepts a different email. Does not satisfy the exact-email preference. |
| D — Delete existing account, recreate with same email | No supported end-to-end deletion/replacement mechanism found. Global uniqueness prevents parallel same-email identities. References can block deletion; removing guards is not acceptable. New UUID loses original relationships. | Highest risk: lost authentication/profile/security records, damaged historical attribution, interrupted ownership/work and potential financial/audit retention loss. Real dependencies unknown. | Would require a separately designed retention/migration/backup/recovery plan and explicit approval for every affected scope. No reliable existing account-level rollback established. | **NO-GO. Not recommended.** |

## 6. Safest dedicated administration plan for the specified email

This is a proposal only; no step below was executed.

1. Verify the exact production identity/grant and non-sensitive dependency counts read-only, using existing authorised internal access or the owner's query console. Inspect actual constraints/migration state before making production schema claims.
2. If the existing identity is active and eligible, preserve its UUID, memberships, ownership, email, MFA and history. Verify owner control, then request explicit approval to issue only a missing `platform_admin` grant through `node server/admin.js grant`, with a named authoriser/change reason on stdin. Never put a password in that command or Railway variables.
3. If it already has the grant, do not regrant. If authentication needs recovery, obtain separate explicit approval for the existing `/#/admin/recover` flow; owner enters a fresh compliant password privately using the real HTTPS reset link. Existing Argon2id hashing handles storage.
4. If no identity exists, use approved existing verified signup to create the user identity without a company, then verify ownership/ID and obtain the exact grant approval. Do not infer absence from login failure. Customer/disabled/ambiguous identities stop for a separate decision.
5. Verify owner login at `https://mysolar.solutions/#/admin/login`, redirect to `/#/platform`, review queues and authoritative activation/publication permissions. These permissions remain separate. Do not change a real company decision to prove access; use prior fictional disposable acceptance evidence for writes.
6. If “dedicated” means zero business memberships, evaluate Option B separately after ownership/work review. Keeping the existing Business identity channel is expected. If historical creator independence is required, use Option C rather than deleting or rewriting history.

The grant CLI is transaction-protected and uses one grant row per user, but rerunning it rewrites grant reason/time, revokes sessions and adds audit events. Recheck pre-state and skip completed grants; do not blindly retry. The CLI records an audit event with a null human actor and a random operator-event identifier, so retain the real named authorisation/execution record in addition to the required reason.

## 7. Exact next authorised action

**Owner/operator: run this single scoped, read-only query through existing authorised access to the confirmed production Postgres service and return only its result.** It selects no password/hash/token or private company/customer content. It checks identity, supporting profile, creator links, memberships/ownership and grant as a first step; it is not the complete enquiry/financial dependency audit.

```sql
BEGIN READ ONLY;

SELECT u.status,
       u.account_type,
       COALESCE(g.role_id = 'platform_admin', false) AS is_platform_admin,
       (SELECT count(*) FROM customer_profiles p
        WHERE p.user_id = u.id) AS supporting_profiles,
       (SELECT count(*) FROM companies c
        WHERE c.created_by = u.id) AS companies_created,
       (SELECT count(*) FROM company_memberships m
        WHERE m.user_id = u.id) AS all_memberships,
       (SELECT count(*) FROM company_memberships m
        WHERE m.user_id = u.id AND m.status = 'active') AS active_memberships,
       (SELECT count(*) FROM company_memberships m
        WHERE m.user_id = u.id AND m.role_id = 'owner'
          AND m.status = 'active') AS active_owner_memberships
FROM users u
LEFT JOIN platform_admin_grants g ON g.user_id = u.id
WHERE lower(u.email) = 'mysolarsolutions2026@gmail.com';

ROLLBACK;
```

If the owner has a table viewer only, report that limitation; do not manually edit records or expose password columns. An operator with an existing authorised internal SQL connection is required for the full counts/constraints audit. No key generation, networking change, proxy enablement, schema migration or deployment is authorised here.

Once that result is available, conduct the remaining scoped dependency counts (including historical and indirect company/financial/audit relationships) before reconsidering separation. Stop if any required schema/access information is unavailable. Do not assume missing results mean safe deletion.

## 8. Final authorisation and verification status

- Deletion: **NO-GO**; neither necessary nor demonstrated safe.
- Existing-identity grant plan: supported by repository evidence, **not executed or production-verified**.
- Production account/dependency findings: **BLOCKED** by unavailable authorised internal session.
- This task changed no application code, identity, membership, grant, password, company, production data or configuration. XYZ was not queried or modified.
- No live email, production SQL, migrations, deployment, commit or push was performed. Only this report and a local ignored schema-search index were written. No new tests were needed for this read-only source audit; earlier local tests do not establish this production account's state.
