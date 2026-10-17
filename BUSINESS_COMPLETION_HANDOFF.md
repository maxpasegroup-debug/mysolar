# Business onboarding completion — 17 October 2026

## Delivered scope

Completed the remaining employee sharing, customer account connection and owner Boss dashboard work. Existing HTML/CSS/JavaScript, Express, PostgreSQL, authentication, permissions, company context, commercial entitlements, operations and customer experience services are reused. No new dependencies, external messaging provider, payment system or alternate account store was introduced.

This is implementation and focused local verification, not a declaration that every planned launch audit or real-user acceptance scenario has passed. These code changes have not been pushed or deployed. No production records, environment variables or schema were changed in this task.

## Employee journey

An owner opens **Team**, enters the employee's email and selects Sales, Supervisor, Field Engineer, Inventory Manager or Accounts. The new default is a private invitation link. The receipt offers **Share on WhatsApp**, **Open email app**, **Copy link** and **Hide private link**. Opening a composer does not send a message; the owner reviews and sends it. No passwords are shared.

Automatic email remains an optional delivery choice when the existing SMTP transport is configured. It never claims delivery when unconfigured or when sending fails. The legacy development-only manual mode remains restricted to development; production sharing is a distinct, audited `share` delivery type.

The recipient signs in or registers with the invited email, reviews the company, role and expiry, then explicitly accepts. Existing server validation enforces recipient, expiry, inviter authority, active company status, role allowlist and subscription team capacity. The resulting company membership controls access at the common MY Solar Solutions login. Company ownership and platform administration are never selectable employee roles.

## Customer journey and access safety

The owner creates a company customer contact with its correct email, opens that customer's record and chooses **Create customer invitation**. The owner must confirm that the named customer may access that contact's existing and future customer-visible orders, installations, invoices and service requests. This is a deliberate access grant, distinct from the previous automatic/enquiry matching restrictions. Only company users with both customer-management and membership-management permissions may make it.

The customer opens the private link, signs in or registers, reviews the company and expiry, and confirms the connection. They are sent to their customer dashboard, which now identifies connected solar companies even when no orders exist yet. They receive no staff/company membership. Existing ownership queries provide orders, installation milestones, issued invoices, recorded balances and service requests; private company notes, supplier records and draft commercial records remain excluded.

After-sales service uses the existing confirmed-order service workflow. Linking an account does not accept an order, record a payment, establish warranty coverage or promise a resolution time.

Customer invitations are recipient-bound, one-time, expire after 48 hours, and can be revoked. A replacement invitation revokes the previous pending invitation for that contact. The stored email and contact revision are rechecked at acceptance, as are the inviter's current permissions and company status. A changed, already-linked, expired or mismatched contact cannot be silently reassigned. One registered customer can be linked to only one contact per company, enforced by the existing unique index. New linking requires the existing CRM entitlement; authorized existing reads remain available under the existing policy.

Private tokens are cryptographically random. Only their hashes are saved. Raw links are shown once to the authorized issuer, held in tab memory and cleared on account/company changes or logout. Recipient tokens are removed from the address bar and retained in memory through the signup/login flow; reopening the original link is necessary after refresh. Invitation history remains in the database; this work does not implement automatic retention deletion.

## Boss dashboard

Active owners receive a minimal company control centre with Add customer, Invite employee, Assign task, Create order and Company setup actions. Existing plan/access and SIA entry points are retained without duplicating them in the new action row.

The overview shows authorized enquiry, quotation, project and service counts; an exact server-calculated outstanding balance against issued invoices; customer follow-ups, team/assigned tasks, delayed/on-hold installations, service follow-ups and overdue invoices. Each priority section links to at most four actual records. Additional business counts are expandable, and recent activity remains visible. Empty sections show honest empty states.

Staff receive role-aware work views. Finance details require finance permission; project, service and task assignments preserve existing scopes. Company context comes from the authenticated session, with existing expected-company checks. Counts cover saved history, priority due dates use India time, and the dashboard states its scope and timestamp. Recorded collections do not imply bank/provider verification.

Owners whose company is not active now reach the existing setup overview rather than a failing operations request. Company profile, branding and business setup, activation review and marketplace review remain explicit separate steps. Company activation is not granted automatically.

## Files

- `server/db/migrations/009_shared_invitations.sql`: permits employee `share` delivery and adds customer invitation history with recipient/revision/token hashes, foreign keys, indexes and a unique pending invitation per contact.
- `server/setup/invitation-delivery.js`: shared delivery validation, invitation URLs, optional SMTP and honest sharing receipts.
- `server/setup/invitations.js`: employee sharing and protected recipient previews; existing team acceptance/revocation retained; customer acceptance mounted with authentication/CSRF.
- `server/setup/routes.js`: team sharing availability and email capability.
- `server/operations/customer-invitations.js`: authorized customer invitation creation, revocation and explicit acceptance.
- `server/operations/read.js`: authorized customer invitation metadata and Boss priorities/balance.
- `server/customer/experience.js`: current customer's connected company names.
- `server/index.js`: new company operations router.
- `src/organization.js`: sharing controls, company/role previews, customer acceptance and invitation lifecycle. Also fixes the existing `history` helper shadowing the browser History API, which could break direct invitation links.
- `src/operations.js`: customer invitation UI and Boss dashboard.
- `src/account.js`: unactivated-owner setup routing.
- `src/experience.js`: customer connected-company presentation.
- `operations.css`: responsive dashboard and invitation receipts.
- `sw.js`: static cache version bump for updated scripts/styles; no private response caching added.
- `.env.example`, `README.md`, this handoff: configuration and operating instructions.
- `tests/business-access.test.mjs`: real isolated PostgreSQL regression coverage for the new flow.

## Verification performed

- `npm.cmd run build`: **565 static checks passed, zero failed**. The repository's build checks syntax, imports, asset serving and dependency consistency; it is not a bundler.
- Focused local PostgreSQL run: **21 passed, zero failed, zero skipped**, covering new employee/customer invitations plus existing authentication/security/error checks. Checks include 008-to-009 upgrade, repeat migrations, role allowlists, no-SMTP sharing, recipient-only previews, wrong recipients, expiry/revocation, contact revision changes, explicit confirmation, CSRF, cross-company denial, role restrictions, customer login after linking, ownership of historical records, private-note exclusion, customer service reporting and exact overdue invoice balance.
- Focused local Chromium review: **18 observations passed**, including 360/390/768/1024/1440px dashboard layouts, sharing controls, customer acknowledgement, safe fresh invitation links, anonymous signup returning to invitation, connected customer dashboard, setup routing and no uncaught JavaScript errors.

The local database used fictional accounts in a new disposable cluster/schema and stopped afterward. Browser fixtures were isolated and labelled as local review data. No WhatsApp or email message was sent by these checks. Ignored evidence/tools are under `.verification/business-access/`, `.verification/business-build.log`, `.verification/verify-business-local.mjs` and `.verification/review-business.mjs`; they are not deployment files. No comprehensive suite or production acceptance test was run.

## Deployment and manual acceptance

Commit and push the listed files. The existing `railway.json` pre-deploy command runs `npm run db:migrate`; migration 009 must complete before serving this code. `/readyz` must return 200 for the new migration manifest. No new environment variables are required for private sharing, WhatsApp or the owner's email app. Automatic email and password recovery still require genuine SMTP credentials and a verified sender; none were invented.

An authorized platform operator must already have a registered account and a server-issued platform grant to approve companies. The existing stdin-only `npm run admin:grant` bootstrap remains the secure operator procedure; no account was chosen or promoted by this task. Never grant platform access merely because someone signs up as a distributor.

Manual trial:

1. Register the real distributor, create its company, save company/brand/business profiles and submit activation review.
2. An authorized platform operator approves activation through the existing protected console. Marketplace publication is a separate decision.
3. Open the Boss dashboard; confirm empty counts before entering real records.
4. Invite an employee with the intended role, share privately and let them create their own account. Confirm restricted access and sign-out/sign-in.
5. Add the real customer with the correct email. Review the record, confirm the access grant and share the invitation.
6. In a separate browser/private session, let the customer sign up and accept. Confirm the company appears on their dashboard.
7. Create the actual enquiry/quotation/order using the existing agreement workflow. Check that each user sees only their authorized records.
8. Record installation progress and, against a confirmed order, submit a customer service request. Confirm the owner sees the follow-up and the customer sees only customer-visible updates.

Review real-device WhatsApp/email-app handling, email delivery if configured, company approval, and real-user accessibility during this trial. Secure file storage, verified payment integration, native apps and broader launch/security acceptance remain outside this completion task; no new promises about those capabilities are made.
