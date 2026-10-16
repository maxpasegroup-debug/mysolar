# MY SOLAR — Phase 9 implementation handoff

Phase 9 implements commercial administration and subscription access controls in the existing application. Billing is disabled. No tests, test suites, linting/formatting checks, audits, builds, server startup, migrations, deployment-readiness checks or external payment-provider requests were run. This is an implementation report without verification or deployment claims. Phase 10 has not started; no domain was connected.

## 1. Architecture reused and extended

The HTML/CSS/classic JavaScript hash-routed frontend, Express backend and PostgreSQL migration system remain. Existing sessions, CSRF, expected account/company guards, permission grants, `withPlatform`, `withCompany`, company lifecycle, role/assignment checks, audit events, public publication views and SIA provider/security limits are reused. No new company, identity, administrator bootstrap or audit authority is introduced. No dependencies were added.

Commercial state is separate from onboarding/company lifecycle and from verified payment. A plan grants no role permission. Platform access remains protected by the existing database-operator grant procedure, and commercial controls use explicit new database grants. Ordinary company users have no commercial write API.

## 2. Files created or modified

Created:

- `server/db/migrations/008_commercial.sql`: versioned configuration/plans, agreement snapshots, lifecycle events, usage counters, shared SQL policy resolver, public projection gates and permissions.
- `server/commercial/policy.js`: feature registry, protected-action mapping, team/published-offer capacity, usage summaries and external SIA allowance reservations.
- `server/commercial/validation.js`: prices, supported currencies, tax configuration, intervals, limits, date validation, publication rules, reasons and revisions.
- `server/commercial/routes.js`: protected commercial operator console APIs and read-only owner summary.
- `server/commercial/payments.js`: disabled future payment boundary; no HTTP callback or provider implementation.
- `src/commercial.js`: settings, plan/version forms, subscription directory/details/actions/history and owner status/export interface.
- `commercial.css`: responsive, labelled commercial forms, cards, usage and history presentation.
- `PHASE_9_HANDOFF.md`: this report.

Modified:

- `server/tenancy/context.js`: centralized commercial action guard after existing tenant/role checks; owner subscription read remains available under lifecycle read restrictions.
- `server/tenancy/routes.js`: team capacity on direct member addition/restoration and protection of private commercial audit metadata from the general company audit feed.
- `server/setup/invitations.js`: capacity on invitation reservation and acceptance, under the existing company lock.
- `server/platform/routes.js`: storefront publication respects entitlement; company review activity only exposes commercial metadata to commercial readers; legacy proposed-settings mutation is retired with an explicit migration message. Legacy data remains readable history.
- `server/purchase/service.js`: new enquiry recipient matching and final routing also require CRM access; existing customer records/conversations remain accessible.
- `server/sia/routes.js`: commercial daily/monthly allowance reservation inside the existing security-budget savepoint, access status and safe fallback.
- `server/index.js`: mounts commercial/owner APIs and explicitly allowlists new static assets.
- `src/account.js`: commercial page delegation, owner navigation permission and expected-account guards on commercial reads.
- `src/app.js`: routes/navigation, shared commercial decoration and Phase 9 labels.
- `src/organization.js`: existing platform navigation links to commercial controls.
- `src/sia.js`: explains additional commercial AI allowances and rule-only access.
- `index.html`: loads the commercial module/styles.
- `sw.js`: static-only cache version update and public commercial CSS/JavaScript allowlist entries. Private APIs remain excluded.
- `README.md`: current phase overview, setup pointers and preserved earlier history.

## 3. Schema and migration

Migration `008_commercial.sql` follows 001–007 without editing them. It creates:

- `commercial_settings_versions`: immutable effective-dated platform access policy and setup-fee proposals.
- `commercial_control`: singleton revision/lock for concurrent configuration edits.
- `commercial_plans`: stable code, availability status, revision and current-version pointer.
- `commercial_plan_versions`: immutable terms, features and allowances, unique by plan/version.
- `company_subscriptions`: company/plan/version-qualified agreement, immutable snapshots and manual activation provenance; lifecycle state/revision/end date are controlled separately.
- `company_commercial_state`: one current agreement pointer per company, with an optimistic revision. No duplicated subscription state is added to company/user profiles.
- `commercial_subscription_events`: append-only actor/time/reason/previous/new lifecycle records.
- `commercial_usage`: persistent daily/monthly external AI attempt counters, independent of deletable SIA request history.

Foreign keys qualify plan versions and company agreement pointers. Checks constrain states, intervals, currencies, dates, features and non-negative limits. Immutable triggers reject edits/deletion of stored configuration/plan terms and lifecycle events, protect subscription agreement snapshots and prevent agreement deletion. Indexes support effective policy, company history and usage lookup. Existing `audit_events` records commercial settings/plan/subscription changes with actor, timestamp, affected record, previous/new values and reason.

The migration seeds an explicit pre-billing policy, not a subscription or payment. It imports the existing proposed setup amount, whose original reference is ₹35,000 plus applicable GST. It creates no subscription plan, price, provider transaction or paid company. New permissions are granted to the existing `platform_admin` role; `subscription.read` is granted to existing owners. No new administrator account is created.

## 4. One-time setup-fee proposal

Operators can append versions of amount, currency, tax mode/rate, enabled-for-new-agreements flag, required-under-future-policy flag, effective date and internal description. The initial proposal is disabled and optional. It remains a commercial proposal, never an invoice, balance due or payment request. Applicable GST is not invented; its initial rate remains unconfirmed.

The API converts decimal price strings to integer minor units using the existing monetary parser. Supported currencies in this phase are INR, USD, EUR, GBP and AED, each with two decimal places. Tax mode is unknown/exclusive/inclusive/exempt; supplied rates are bounded and exempt needs explicit zero. No commercial invoice/tax calculation is implied. The effective setup terms are snapshotted when assigning a company agreement, so later setup-fee edits do not alter prior terms. Internal fee descriptions/operator notes are not included in the owner response.

## 5. Plans and subscription lifecycle

Plans have a stable internal code, public name/description, monthly/annual interval, optional draft price, currency/tax, trial eligibility via trial-days value, assignment availability dates, support description, features and limits. No final subscription price is seeded. Creating or editing terms saves a draft; editing appends an immutable version and withdraws availability for new assignment until explicitly reactivated. Activating a plan requires an explicit price and confirmed tax configuration. An inactive/draft/out-of-date plan cannot be newly assigned. Deactivating/editing a plan does not silently change existing agreement snapshots. There is no public purchasable plan directory or checkout.

Operators assign only active, currently eligible plans with explicit agreement start/end dates, state and reason. Terms, entitlements, limits, setup-fee proposal and source version IDs are snapshotted. Reassignment cancels/supersedes the old current record through an audited event and appends a new agreement; it never erases the previous record. The new assignment takes over immediately, including when its start is in the future; a future start therefore creates pending access rather than extending the previous agreement automatically.

| Effective state | Meaning for commercial new actions |
| --- | --- |
| `not_configured` | No assigned agreement. Explicit pre-billing defaults apply only in pre-billing mode; controlled mode denies commercial new actions. |
| `trial` | Explicit current trial period and snapshot feature allowances apply. |
| `pending_commercial_activation` | Assigned but not manually activated, or active/trial start is still in the future; no commercial new actions. |
| `active` | Manually administered access within the recorded period; it is not proof of payment. |
| `past_due` | Administrative restriction marker, not a fabricated invoice or debt confirmation; new actions blocked. |
| `suspended` | Subscription access restricted independently of company/security lifecycle. |
| `cancelled` | Historical agreement retained; new actions blocked. A fresh agreement is required to restore cancelled access. |
| `expired` | End reached or explicit administrative expiry; new actions blocked. A new agreement is required for new paid-style access. |

`commercial_policy` evaluates dates on the server on every decision. An active/trial record before its start resolves pending; active/trial/past-due records after their end resolve expired. No scheduler or automatic renewal is claimed. Recorded state remains visible separately from derived effective state. Manual activation is always `manual_administration`, never verified payment. Company onboarding/security lifecycle still independently restricts access.

Initial trials require an eligible plan and a period no longer than its trial-days allowance; only one trial grant per company is allowed. A still-current trial may be explicitly extended by an authorized operator, with a reason and lifecycle event, up to 365 days from the original start. Expired trials cannot be silently reopened. Cancellation, suspension, past-due, activation and expiry follow explicit transition allowlists and revision checks.

## 6. Central server-side entitlement enforcement

The shared SQL function `commercial_policy(company UUID)` resolves effective configuration and current agreement. `commercial_public_allowed` uses that same resolver in the existing public views. The JavaScript guard uses the resolver inside `withCompany`, after authenticated role permission checks and the existing company lock. Platform administration has its own permission path and is not subscription-gated.

Company feature groups are storefront, catalogue/offers, CRM/enquiries, quotations, orders, team, inventory/procurement, projects/field tasks, finance, customer service, white-label customization, Virtual CEO and a future custom-domain capability flag. The last flag grants no working DNS/domain feature. Shared customer SIA is a distinct global setting: a distributor plan cannot take ownership of or remove a customer's shared account or historical records.

Protected company mutations are classified by existing route/permission: offer management/publication; enquiry/quotation actions; contacts/leads/orders; stock/reservations/suppliers/purchases/receipts; projects/tasks; invoices/collections/bills; service; team/invitations; branding; service areas and marketplace requests; and approved SIA follow-ups. Unknown operational mutations fail closed until mapped. New customer enquiry recipient previews and final routing require the recipient company's CRM entitlement, in addition to all prior publication/coverage checks. Public storefront/offer projections require their relevant entitlement as well as prior independent marketplace approval/publication rules.

Role authorization never overrides a feature restriction, and a feature never grants a role capability. Missing effective configuration fails closed for commercial new actions. Stored snapshots remain valid when the plan directory is later deactivated; this is deliberate historical agreement behavior. Plan/configuration changes do not delete records or rewrite saved publication flags. A feature change may remove public presentation through its view while keeping the underlying company data.

Private GETs retain existing permission, assignment and ownership checks without being blocked by subscription expiry. Cleanup actions—revoke invitation, suspend/remove staff, unpublish/deactivate offer, withdraw marketplace request, reject a SIA proposal and clear own SIA history—remain available under their prior authorization rules. Customer confirmation/service reporting against existing owned orders, quotation clarification and other existing-customer obligations are retained; a subscription does not become a means to remove customer access to agreed records. Company lifecycle/security suspension remains independently authoritative.

The owner can review existing module records, save an access-summary JSON file and contact the configured administrator for a plan/access transition. No general bulk export of private operational tables was added; existing bounded authorized read APIs remain available. Reducing limits does not remove staff, offers, history or orders. Existing over-limit quantities remain; only additional usage/publication/seats are blocked.

## 7. SIA and quantity allowances

Allowances are nullable non-negative whole numbers: active members plus valid pending invitations, published offer flags, daily external SIA attempts and monthly external SIA attempts. Blank means no additional commercial cap; zero prevents additional use. Team counts include the owner. A company's initial owner is retained even if a subsequent policy cap is zero/below existing use. Existing membership restoration, direct addition, invitation reservation and token acceptance check capacity under the company lock. Accepting an invitation excludes its own reserved seat before counting the new active member. Unused reservations can be revoked.

Published-offer capacity is checked before a new publication; re-saving an already-published offer does not consume a second slot. Downgrades do not arbitrarily discard existing published records. Explicit unpublication frees a slot. Counts use actual maintained records, not fabricated usage or availability.

External SIA requests retain the existing per-user rate and user/company security budgets. A commercial reservation is added inside the same savepoint, so hitting either daily/monthly cap or losing an AI entitlement rolls all partial budget reservations back. The commercial allowance never raises a global security cap. Counters use UTC day/month periods, persist independently of conversation clearing and continue across plan changes. User and company attribution remains server-derived. Shared customer external AI uses its global enable flag and per-customer commercial limits plus existing security caps.

Commercial counters begin when migration 008 is applied; previous token usage, costs or monthly attempts are not reconstructed. Existing Phase 8 daily security counters remain intact. No exact cost or charge is inferred. When optional external AI is blocked or capped, existing authorized rule-based read assistance remains usable with a clear explanation. Consequential SIA follow-ups still require commercial CRM/Virtual CEO access, role permissions and exact human approval.

## 8. Platform commercial console and APIs

Existing protected platform navigation links to:

- `/#/platform/commercial` (also the prior `/platform/settings` route): settings/setup fee, effective dates, access rules, global customer SIA and latest 30 configuration versions.
- `/#/platform/plans` and `/platform/plan?id=...`: searchable plan directory, draft creation, new term versions, activation/inactivation and latest 50 immutable versions.
- `/#/platform/subscriptions` and `/platform/subscription?companyId=...`: company directory, effective access, usage, active-plan picker, explicit dates, assignment, trial and state actions, paginated subscription/event history.
- `/#/platform/commercial-history`: paginated existing audit records with previous/new values, operator, time and reason.

The API prefix is `/api/platform/commercial`: GET/POST `settings`, GET/POST `plans`, GET `plans/:id`, POST `plans/:id/versions`, POST `plans/:id/state`, GET `subscriptions`, GET `companies/:id`, POST `companies/:id/subscriptions`, POST `companies/:id/subscriptions/:subscriptionId/actions`, GET `history`. Separate grants cover read, settings, plans, subscription management and manual activation. Every mutation uses CSRF, existing session checks, a reason and revision where applicable. The frontend also asks the operator to review access impact. Company locks serialize agreement/capacity changes; immutable versions and optimistic revisions prevent silent overwrite and harmful duplicate administrative writes.

Legacy `platform_settings` proposals remain historical read-only data. Its old PATCH route returns an explicit instruction to use the versioned console; it no longer changes entitlement decisions. No second active commercial source is introduced.

## 9. Distributor owner view

`/#/distributor/subscription` reads `/api/companies/current/subscription` with the existing expected company and account headers. Only `subscription.read` owners can access it. It displays effective access mode/state, current snapshotted plan/price/interval/tax, period/trial end, enabled features, actual allowances/use, restrictions, administrator contact and up to 20 recent agreements. It explains pre-billing or neutral unassigned/controlled access and distinguishes manual access from payment proof. It has no payment button, fake payment history or platform invoice.

The JSON summary export uses the same authorized read endpoint and checks account/company context before delivery. Owner responses omit internal setup-fee descriptions, operator reasons and platform-wide records. Read/transition access is preserved when commercial access expires, subject to existing company/security/role rules. Forms, cards and history use the existing warm/burgundy visual language, responsive single-column layouts, labels, focus/validation feedback and touch controls. New commercial text is English with existing navigation fallback; full translation is not claimed.

## 10. Historical terms, audits and privacy

Plan code identity, immutable version rows and snapshotted agreements prevent an edit from silently changing prior commercial terms. Setup snapshots refer to the actual effective policy version. Future-dated configuration is ordered by effective time, then version ID; saving a new version does not silently delete an earlier scheduled one. Operators must review scheduled dates/history. Subscription events and existing audit records preserve reasons and previous/new values. Company pointers and state revisions prevent lost concurrent assignment updates. Cancellation retains records; no delete-agreement API exists.

Commercial endpoints derive operator/company authorization from existing sessions. Plan/version/company relationships are tenant-qualified; current agreement actions cannot mutate a historical record from another company. Ordinary owner access is read-only. Internal commercial audit metadata is excluded from the general company audit feed and from platform company-review activity unless the operator also has commercial read permission. The same existing audit rows remain accessible through the protected commercial console. Expected-account guards cover commercial GETs as well as mutations to reject stale cross-account tabs. Responses use the existing no-store API policy. Only public CSS/JavaScript joined the static cache; commercial data is not cached by the worker. Historical rows and counters have no automatic deletion policy added; existing operational/audit retention controls remain unchanged.

## 11. Environment and manual setup

No new environment variable or dependency is required. Existing database/session/HTTPS/operator setup and migrations 001–008 must be applied at the agreed later stage. None were executed here. The existing `admin:grant` operator procedure remains the only bootstrap; migration 008 supplies the commercial role grants. Existing SIA environment budgets still apply as hard upper safeguards.

The default policy explicitly permits existing company feature groups in pre-billing mode with no additional commercial caps; future domain capability is false. No plan is seeded. Operators must decide/publish actual plan prices and tax configuration, contact policy, features, allowances, trial periods and assignment dates. They may select controlled mode for unassigned companies through an audited effective-dated change. Assigned expired/restricted agreements never silently fall back to permissive pre-billing defaults. Read access remains protected independently.

No repository-specific blocker prevented source implementation. Runtime/SQL/browser behavior remains unverified and migration 008 is unapplied. New commercial tables/grants/policy functions are required before the new code can operate; this is not a deployment-ready claim. A compatible SIA provider remains optional and no provider or payment credentials were created.

## 12. Deferred work and Phase 10 concerns

No checkout, recurring charges, payment requests, retries, refunds, payment reconciliation, provider callbacks, domain provisioning or native app is implemented. `commercial/payments.js` defines disabled session/event entry points only; no route calls them, accepts browser payment proof or simulates payment activation. A later provider adapter must authenticate verified server events, validate signatures/replay and link immutable agreement/provider references through explicit audited reconciliation. Subscription renewal, payment failure/refund/cancellation records and real tax/billing documents require that later design. No phase 10 work or `mysolar.online` connection was started.

Reserve for Phase 10: fresh/upgrade migration dependency order and view preservation; default pre-billing compatibility; effective/future/backdated settings; missing/inconsistent configuration; published plan revision/history integrity; unsupported currency/tax/price/limit inputs; company/plan/version tampering; operator permission revocation and ordinary-owner write attempts; concurrent assignment/cancellation/state changes; one-trial policy and extension/expiry boundaries; future-start replacement behavior; tenant/member/offer capacity races including invitation acceptance; plan reduction with existing over-limit records; public listing/recipient routing after entitlement withdrawal; all protected mutation mappings and cleanup exceptions; SIA global plus commercial cap concurrency/UTC resets/history clearing; subscription and company lifecycle independence; stale-tab account/company changes; owner redaction/export; audit previous/new values; mobile forms, keyboard, history pagination and partial translations; and static worker API exclusions. No item is represented as passed.
