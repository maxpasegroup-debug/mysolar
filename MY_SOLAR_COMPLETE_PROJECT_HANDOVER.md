# MY SOLAR SOLUTIONS — Complete Project Handover

14 November 2026. Read-only source audit, with this requested report as the sole new file. No application, tests, workers, migrations, database connections, external provider calls, deployment, commit or push were performed. Secret environment files were not opened.

## 1. Executive summary

MY SOLAR SOLUTIONS combines a public solar marketplace with a private Solar OS for distributors and installers. Customers discover companies, submit requirements, review quotations and track their purchases. Companies manage leads, sales, stock, purchasing, installation, staff work, invoices and service in one workspace. SIA supplies guided assistance.

This is a substantial application with real server services and SQL persistence code, not just menus. However, no complete business module can be certified as production-working by this audit. Current database state, deployed version, provider settings, actual delivery and real-company acceptance remain unverified.

**Verdict: implemented foundation with material verification and launch gates. Paid launch is not supported by the available evidence.** Legal/tax review is incomplete in source. Custom-domain provisioning has no live provider. TalkinLabs and broad autonomous agents are not operational integrations.

**Important change:** older reports describe a seven-day free automation trial. Current `server/commercial/os-routes.js` rejects new trials with HTTP 410 and reports `trialEligible:false`. Migration 050 implements direct subscription for new companies while preserving historical trial agreements. The older trial journey is not the current source behavior.

### Evidence and scope

- **Source fact:** directly visible implementation/configuration; does not prove successful execution.
- **Developer-reported:** a historical report's tests/deployment statements, not independently repeated here.
- **Unverified:** needs database, browser, hosting or provider evidence.
- **Intended:** business interpretation, not verified customer adoption or revenue.

The requested `D:\APPS\WEB\mysolar` is unavailable. The inspected checkout is `C:\Users\kkyad\OneDrive\Desktop\mysolar\mysolar`. Historical documentation names the D: copy canonical; equivalence is unverified. Local HEAD is `489d097` — Fix SIA initialization blocking landing scroll animation. Git status was clean before this report. No repository AGENTS.md appeared in the inventory.

## 2. Business model and users

The intended model separates free public listing from paid business software. Subscription proposals in reports are Starter INR 3,500/month for 10 users, Pro INR 6,999 for 25, Elite INR 9,999 for 50, before GST; Enterprise is custom. These are proposals, not verified published checkout offers. Actual versioned plan records, tax treatment, features, capacity and provider mappings control purchase. Historical setup-fee and white-label proposals are not proof of approved offers or revenue. Internal PRO partner networking is distinct from a subscription named Pro.

The application addresses scattered customer information, inconsistent quotes, uncertain stock, staff follow-up gaps, installation coordination and collection/service tracking. Actual savings, conversion and commercial viability are unmeasured here.

Users are public visitors, customer account holders, distributor/installer owners, employees with job-specific access, partners and separately authorized platform administrators. Supplier records exist; a standalone supplier/manufacturer SaaS journey is not established.

Daily work is intended to follow: record customer/requirement → qualify lead → prepare/review quote → record agreement/order → reserve or purchase equipment → plan installation/tasks → record progress → invoice/collect → maintain/service. Boss sees summaries and exceptions. Each handoff needs linked-record acceptance before claiming the whole chain works.

## 3. Technology architecture

| Technology | Purpose and verified source | Limits |
| --- | --- | --- |
| Plain HTML/CSS/browser JavaScript | Frontend in `src/`, hash routes in `src/app.js` | No React/Vue/Angular or bundler identified. |
| Node.js ES modules, Express 5.3.0 | One web application with APIs, pages and assets; Node >=22.14.0 | Effective deployed runtime unknown. |
| PostgreSQL, `pg` 8.23.1 | Persistent records, handwritten SQL, pooled connections/transactions | No Prisma/Sequelize ORM. Current schema/data unknown. |
| Argon2, sessions, CSRF/same-origin guards | Password/session protection; OTP/recovery, optional MFA and PIN support | Configured policies, actual recipients and recovery acceptance unknown. |
| Helmet 8.3.0 | HTTP security headers | Not a security certification. |
| Nodemailer 10.1.1 | SMTP, including Resend SMTP configuration; encrypted mail queue | Real delivery and running worker unverified. |
| SIA rules and optional JSON gateway | Guided evidence-based help, controlled tools/proposals | No named LLM automatically configured; general autonomous agents absent. |
| Razorpay server adapter | Subscription creation, signed webhook inbox and verification worker | Test/live operation and mappings unverified. |
| Managed files | Scanned, encrypted PostgreSQL payload storage | No S3/Cloudinary implementation demonstrated; scanner/key absence blocks uploads. |
| Railway configuration | Declared pre-deploy migrations and readiness | Actual hosting settings/services unverified. |
| PWA manifest/service worker | Installable shell and offline fallback | Not full offline business editing/sync or native mobile apps. |

Typical request: browser → Express API → session → active company membership/permissions → subscription/lifecycle/record checks → SQL transaction → response. Public/customer routes use distinct visibility/ownership boundaries.

`build`, `lint` and `check` all run the same custom syntax/import/asset validator. They are not three independent certifications. No test suite was run here because some runners create data, start servers or write evidence.

## 4. Folder structure

| Path | Purpose |
| --- | --- |
| `index.html`, root CSS, `assets/` | Shell, styling, graphics |
| `src/` | Account, onboarding, dashboard, operations, marketplace, commercial and SIA interfaces |
| `server/index.js` | API mounts, middleware, web entry |
| `server/auth/`, `tenancy/`, `setup/`, `platform/` | Identity, company isolation, onboarding, administration |
| `server/marketplace/`, `purchase/`, `customer/` | Offers/catalogue, enquiries/quotes, customer experience |
| `server/operations/` | CRM, orders, fulfilment, stock/materials, installation, finance, service, reporting |
| `server/commercial/` | Plans/access, billing contracts, Razorpay inbox/worker |
| `server/automation/`, `sia/`, `domains/`, `legal/`, `partners/` | Reminders, assistant, domains, legal controls, partnerships |
| `server/db/` | Pool, transactions, schema/readiness and migrations |
| `scripts/`, `tests/` | Static/browser/integration/recovery tooling |
| Root Markdown files | History, audits, acceptance plans and runbooks; some superseded |
| `.verification/`, `pilot/` | Verification/pilot material; private ignored evidence is not a public deployment asset |
| `railway.json`, `.railwayignore`, `.env.example` | Deployment intentions, exclusions, configuration template |

## 5. Every module: implementation, users and attention

**I = Implemented but not fully verified; P = Partially implemented; U = UI only; L = Planned; B = Blocked.** None is Complete and verified by this audit. No production module is called Broken without runtime evidence. Intentional unconfigured states are blockers, not demonstrated defects.

For every SQL row below, actual service/schema paths exist. **Real customer records and successful current database operation remain unverified for every row.** Shared outstanding work: matching migrations/deployment, save/reload, permissions, concurrency and business reconciliation.

| Module / purpose | Users | Status / database connection | Incomplete and needs attention |
| --- | --- | --- | --- |
| Landing website | Public | I; static frontend and application links | Check current claims, live routing and responsive behavior. |
| Registration, login, recovery | Visitors/account holder | I; SQL users, challenges, sessions, security, mail jobs | Actual OTP/reset delivery, identity uniqueness/channel rules, MFA/recovery acceptance. |
| Company onboarding and resume | Business account, owner/setup authority; platform reviewer | I; SQL companies, memberships, profiles, onboarding/reviews | Concurrent retry/rollback, persisted resume, real independent activation. Migration 049 international/signup changes supersede older India-only descriptions. |
| Boss Dashboard and employee Today | Owner; permission-filtered staff | I; SQL aggregate/read services over actual operational records | Reconcile metrics, empty/restricted companies and performance. Dashboard render does not run the business automatically. |
| Customers and Customer 360 | Customer/CRM-authorized staff | I; SQL contacts, leads and linked history | Duplicate handling, totals, assigned-record and finance privacy. A contact is not automatically a customer account. |
| Enquiries/private messages | Owning customer; recipient company staff | I; SQL enquiries, recipients, messages/notes | Publication, recipient consent/isolation, actual notifications. |
| Sales/quotations/reviews/templates | Sales/owner, explicit review/send authority; customer own quotes | I; SQL quotations, immutable versions/items, reviews/templates | Discounts, source snapshots, concurrent revisions, approvals and agreement chain. |
| Orders and credit controls | Order staff/owner; customer own orders | I; SQL orders/items, acceptance, credit controls | Duplicate conversion, acceptance evidence, reservation/credit/cancellation reconciliation. An order is not payment proof. |
| Fulfilment and returns | Order/inventory authorities | I; SQL fulfilment, stock/cost entries | Quantity bounds, original-cost returns, concurrent dispatch/return. |
| Inventory/warehouses/materials | Inventory manager/owner and specific grants | I; SQL items, movements, locations, reservations/material ledgers | Opening stock, receipts/issues/transfers, cost reconciliation; no verified autonomous replenishment. |
| Purchases and suppliers | Procurement/inventory/accounts authority | I; SQL suppliers, purchase orders/items, bills/receipts | Receipt/bill/supplier reconciliation; standalone supplier portal not established. |
| Employees/team/profiles/handoffs | Owner/member managers, invited staff | I; SQL memberships, invitations, role profiles and handoffs | Actual acceptance/revocation/expiry/departure, capacity enforcement, branch isolation. Planned positions are not employee accounts. |
| Tasks/work updates | Assigned staff, supervisor, owner | I; SQL tasks/checklists; 048 adds hourly self-reports and manager review | Verify 048, own/team scope, persistence. Attendance, leave and payroll not supplied by work reports. |
| Installation/projects | Project staff/assigned engineers; customer own project | I; SQL projects, milestones, assignments, surveys/assets | Full installation/material/evidence/completion rehearsal. |
| Invoices/finance/export | Accounts/owner/finance grants; customer own invoices | I; SQL invoices, collections, bills, postings/ledgers | Balance and tax/rounding reconciliation. Not certified statutory accounting or automatic bank settlement. |
| Financing/subsidy | Authorized finance/project staff | I; SQL case/workflow/document structures | No verified government/lender processing integration; privacy and real case acceptance needed. |
| Service/warranty/maintenance | Service authorities; customer own requests | I; SQL service, contracts, visits, retention | Escalation/closure/renewal and due-date acceptance. |
| Public profiles/catalogue/offers | Public; company managers; platform approvers | I; SQL profiles, branding, offers, service areas and approved vendor views | Save is not publication. Confirm actual published data/coverage; leads not guaranteed. |
| White-label and custom domains | Entitled owner; platform domain operator | P/B; SQL websites/domain registry; unconfigured provider | Live routing/TLS provider adapter and traffic acceptance absent. |
| Automation/reminders | Authorized approver and permitted recipients | I; SQL rules/jobs/delivery/attempts; separate worker | Real leases/retries/dedupe/revocation/email receipt. Not autonomous money/stock/order authority. |
| Lead assignment/round robin | Sales/company controls | P/I; separate 047 assignment migration | Older missing-assignment report is historical. Verify latest behavior/schema; do not infer a general workflow engine. |
| SIA/setup assistant | Authorized customer/business user | P; SQL requests/proposals/usage, rules, optional provider | Gateway configuration, controlled action/approval acceptance and limits. Not a general autonomous operator. |
| General AI agents | Intended subscribers | L/U; coming-soon proposal category | Broad marketing/operational agent platform not verified. Define actions, consent, costs. |
| TalkinLabs | Intended businesses | B/U; coming-soon/unconfigured boundary | No operational provider transport identified. Credentials alone would not complete integration. |
| WhatsApp/SMS | Users can manually share links/drafts | P manual sharing; B/L automated transport | User-opened WhatsApp is not server delivery. Automatic WhatsApp/SMS provider transport not established. |
| Subscriptions/Razorpay | Owner checkout/cancel; platform commercial grants | P/B; SQL plans, access, contracts, events/inbox | Legal/tax/final offers/mappings, workers and payment acceptance. No established self-service plan change/proration or integrated refund issuance. |
| Administration/settings/legal/support | Platform grants; owner for company settings | I/P; SQL grants/settings/reviews/audit; review JSON | Confirm operator identities, approval evidence, support/reconciliation ownership. Owner is not platform admin. |
| Referrals/growth/Sales Booster | Scoped customer/company/platform participants | P/I; 040/045/046 migrations and growth/referral routes | Attribution/request outcomes and permissions need acceptance; not guaranteed sales or live marketing transport. |
| PWA/offline/exports | Public shell; scoped records for downloads | I/P; static offline fallback, authorized exports | Full offline write/sync absent; verify privacy and downloads. |

## 6. Database overview and company isolation

PostgreSQL is the system of record. Schema is SQL migrations, not an ORM model file. `server/db/pool.js` supplies transactions and audit insertion; services use parameterized queries.

A user has company memberships connecting user, company, role and optional role profile. Sessions select an active company. Business records link to company IDs and related records. Customer ownership is separate from unrestricted staff access. Platform grants are separate again.

Main models/families:

- Identity: users, customer_profiles, sessions, roles, permissions, role_permissions, platform_admin_grants, account_security, OTP/reset/PIN challenges, audit_events.
- Company: companies, company_memberships, profiles/branding/business profiles, onboarding/reviews/invitations, role profiles/setup choices.
- Selling: catalogue_categories/products, distributor_offers/reviews/service areas, customer_enquiries/recipients/messages, company_contacts, crm_leads, quotations/versions/items.
- Delivery: business_orders/items, fulfilment entries, inventory items/movements/reservations/locations, suppliers, purchase_orders/items, projects/assignments/milestones/tasks/materials.
- Finance/service: customer_invoices/collections, supplier_bills, posting/ledger structures, funding cases, service_requests/contracts/visits.
- Supporting: managed_files, notifications, automation rules/jobs/deliveries/attempts, mail_jobs/attempts, process_heartbeats, SIA requests/proposals/usage, domain operations/websites.
- Commercial: versioned settings/plans, company_subscriptions/commercial state/events, OS enrolment/billing contracts/events, Razorpay mappings/inbox.

`withCompany` revalidates/locks the authenticated user and active membership, compares browser context with server session, loads effective permissions, applies lifecycle/subscription guards and runs scoped work. Browser IDs alone are not authority. Record/assignment/customer ownership checks add boundaries. Profiles generally restrict baseline roles. This is visible application-level isolation; it does not prove every query safe or establish database row-level security. Cross-company adversarial tests were not performed.

## 7. Migrations, backup and recovery

The migration runner sorts SQL filenames and tracks full names and SHA-256 checksums in `schema_migrations`, applying missing entries transactionally with advisory locks. `002_role_catalogue_v1` is generated from JavaScript. Two distinct 047 files exist: round-robin lead assignment and Razorpay webhook inbox. Full filenames are the keys, so the shared number is not itself a demonstrated collision; release checklists must name both.

Source chain: 001 identity; generated 002 roles; 003 setup; 004 marketplace; 005 enquiries/quotes; 006 operations; 007 SIA; 008 commercial; 009 invitations; 010 domains; 011 partners; 012 automation; 013–020 account security/health/discovery/tools/files/service/websites/indexes; 021–032 PIN, discovery, sales/project/finance/materials/funding/retention/management and account recovery/verified signup; 033 workforce; 034 quote sources; 035 presets; 036 practical setup; 037 manual sales; 038 fulfilment; 039 credit; 040 attribution; 041 SIA company plan; 042 billing trial; 043 no-mandate trial; 044 customer installation actions; 045 referrals; 046 booster requests; both 047 files; 048 self-reports; 049 international PIN/signup; 050 direct subscription.

**Actual pending migrations cannot be known without the target ledger.** Inbox report says its 047 was not executed in that task. Historical reports flag 034 writer-compatibility/cutover/recovery gates. Neither statement proves today's production ledger. Do not execute migrations merely to discover pending work.

Runbooks require encrypted backups, separate-target restore drills, recovery-time/data-loss records, compatible code rollback and controlled writes for incompatible migration. Historical staging reports claim a successful restore and rejected unhealthy deployment. No current production backup schedule, retention, restorable artifact or recovery service level was verified. No automatic down migrations are documented. Encryption keys must be recoverable separately: database backup without the correct key cannot recover encrypted content.

## 8. Integrations, environment and workers

Variable names only; no secret values were inspected.

| Group | Configuration and purpose |
| --- | --- |
| Runtime | `DATABASE_URL`, `SESSION_SECRET`; `NODE_ENV`, `PORT`, `APP_ORIGIN` — database, session signing, runtime and canonical location. Production requires HTTPS origin. |
| Network/session | `DATABASE_SSL`, `TRUST_PROXY_HOPS`, `SESSION_ABSOLUTE_HOURS`, `SESSION_IDLE_HOURS` — TLS, proxy trust, expiry. |
| Encryption/auth | `DATA_ENCRYPTION_KEY`, `AUTH_PIN_PEPPER`, `AUTH_REQUIRE_VERIFIED_EMAIL`, `AUTH_REQUIRE_PRIVILEGED_MFA` — encrypted records and optional auth policies. |
| Email | `RESEND_API_KEY` or `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`; `MAIL_FROM`, `INVITATION_DELIVERY`. |
| Images/files | `LOGO_ALLOWED_HOSTS`, `PRODUCT_IMAGE_ALLOWED_HOSTS`, `FILE_SCAN_URL`, `FILE_SCAN_KEY`, `FILE_QUOTA_BYTES`. |
| SIA | `SIA_ENABLED`, `SIA_PROVIDER`, `SIA_PROVIDER_URL`, `SIA_API_KEY`, `SIA_MODEL`, `SIA_TIMEOUT_MS`, `SIA_REQUESTS_PER_MINUTE`, `SIA_USER_DAILY_LIMIT`, `SIA_COMPANY_DAILY_LIMIT`. |
| Payments | `RAZORPAY_BILLING_MODE`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_LIVE_ENABLED`. Default disabled; test mode is rejected in production runtime. |
| Monitoring/release | `APP_RELEASE`, `RAILWAY_GIT_COMMIT_SHA`, `OPS_ALERTS_ENABLED`, `OPS_ALERT_RECIPIENT`, `DB_WARNING_BYTES`. |

`.env.example` is a template, not proof of live configuration. Razorpay has a separate variable reference. `STAGING_MODE=true` intentionally blocks current root startup; historical staging instructions may be obsolete.

Separate long-running processes: `worker:reminders`, `worker:mail`, `worker:monitor`, `worker:razorpay-webhooks`. Starting the website does not establish workers are running. Heartbeats, restart supervision, alerts, matching code/schema and key consistency need acceptance. Cleanup is separately data-changing; its schedule was not verified.

Files are limited/scanned, encrypted and stored as managed database payloads. Source rejects upload without scan/key/encryption configuration. Optional external image URLs require allowed hosts. SIA's provider adapter is an operator-managed HTTPS gateway; rules can work without it. Manual invitation sharing through an email/WhatsApp app is distinct from automatic transport. No working SMS/WhatsApp/TalkinLabs delivery was established.

## 9. Subscriptions and Razorpay report reconciliation

Server-side commercial policy gates business work in addition to role permissions. Buying a plan does not make staff owners. Versioned terms preserve agreements. Free listing and authorized historical reading are separated from new operational writes, still subject to lifecycle and record authority.

New trial activation is disabled. Historical trial records/access remain supported; the presence of `free-trial.js` does not mean customers can invoke it successfully through the current route. Migration 050 changes new-company policy to subscription required.

Checkout records explicit owner consent and terms before provider creation. Ambiguous creation is left for reconciliation rather than blindly repeated. Browser return and mandate authorization do not grant paid access. Charge processing verifies provider subscription, captured INR payment, paid invoice, amount/context and billing period. Cancellation stops future charges; it does not issue a refund or erase recorded paid time. Self-service upgrade/downgrade/proration and integrated refunds are not established.

Reports must be read in order:

1. `MY_SOLAR_MASTER_COMPLETION_REPORT.md` (28 October) reports broad mocked verification and release gates. Its missing-checkout assessment is historical; newer billing source supersedes it.
2. `MY_SOLAR_NO_AUTOPAY_TRIAL_FLOW.md` (29 October) describes a seven-day free trial; current route and 050 supersede its new-trial offer.
3. `MY_SOLAR_RAZORPAY_SUBSCRIPTION_READINESS_AUDIT.md` (6 November) is explicitly NO-GO for real subscriptions: legal/tax, approved prices, provider mappings and acceptance incomplete.
4. `MY_SOLAR_RAZORPAY_WEBHOOK_RELIABILITY_REPORT.md` describes the pre-inbox design: serial provider reads could consume up to 30 seconds of timeout budget before acknowledgment. This was not measured live latency.
5. `MY_SOLAR_RAZORPAY_WEBHOOK_INBOX_IMPLEMENTATION_REPORT.md` supersedes that architecture locally. Current code accepts authenticated raw webhook content into an encrypted durable inbox before acknowledgment, with separate worker and admin retry visibility. Raw webhook route is mounted before general JSON parsing.

Worker source has SKIP LOCKED claiming, 120-second leases, eight attempts, exponential retry and review/dead states. Entitlement application and inbox completion are transactionally linked. These are source properties, not proof of SQL/concurrency/recovery success.

The inbox report says migration 047 was not executed; DB acceptance and committed acknowledgment timing remain outstanding. Its 25.6 ms figure was mocked. The older reliability report recorded 216 passed, five failed and 59 skipped tests; these are historical, not current results. Later assertion fixes may supersede individual failures. This audit established no current test count.

**Direct legal blocker:** `server/legal/review.json` contains no document approvals, no grievance contact and tax status pending. Commercial readiness fails closed. Actual professional approval must replace this missing evidence, not placeholder values. Effective production provider settings were not inspected.

## 10. Roles and permissions

Company baseline roles include owner, sales, supervisor, field engineer, inventory manager and accounts; source also recognizes auditor and part-time sales extensions. Customer access is to owned records. Platform administrator grants are separate. Boss is a label for owner experience, not a new security role.

The database permission catalogue and later migrations are authoritative; the initial JavaScript catalogue is not the complete final grant list. Company profiles restrict ordinary roles, with explicit delegated quotation-approval handling. Assignment restrictions exist in supported workflows, not proof of universal branch isolation. Subscription caps/features add another gate.

Company activation/publication requires platform review; saving setup does not self-approve. Distributor owners should not automatically receive platform administration.

## 11. Complete intended business journey versus current implementation

| Step | Implemented source | Remaining evidence or difference |
| --- | --- | --- |
| Visit website | Landing/public discovery/onboarding links | Live domain, accurate claims, actual listings. |
| Register | Email challenges, registration, sessions/recovery | Real OTP receipt, successful real signup and configured policies. |
| Set up company | Create company/owner, address/business/team setup, resume/review | SQL/concurrency, deployed version and independent activation. |
| Free listing | Profile/offers/coverage and review/publication | Approval required; saved details do not imply visible listing or guaranteed enquiries. |
| Start automation trial | Historical seven-day support | **New trials intentionally disabled.** Owner must resolve policy/documentation conflict. |
| Use tools | CRM/quotes/orders/stock/projects/finance/service | New managed companies may need subscription first; full persistence/worker acceptance pending. |
| Choose subscription | Proposals and owner-only available plan selection | Final published plans, legal/GST terms, mappings/capacities unknown. |
| Pay | Guarded checkout, signed inbox, verification worker | Actual test/live capture, durable processing, renewal/cancel acceptance absent here. |
| Continue Solar OS | Time-bounded access and server permission guards | Current deployment/schema, expiry/reconciliation and support service levels. |

## 12. GitHub, deployment and domains

Local origin: `https://github.com/maxpasegroup-debug/mysolar.git`. Visible references: local `main`, cached `origin/main`, cached `origin/HEAD` → `origin/main`. No fetch occurred; these do not prove current server-side branches or GitHub status.

`railway.json` declares pre-deploy `npm run db:migrate`, readiness `/readyz`, timeout 120 seconds. Package scripts declare start and separate workers. Actual Railway project/services, branch integration, variables, region, database, deployed commit and worker processes were not verified.

A deployment-connected push can apply every pending migration. Release control therefore matters as much as code editing. `ROOT_DEPLOYMENT.md` describes root consolidation; historical staging reports describe removed tooling and must not be copied blindly.

`mysolar.online` appears in routing/cutover guidance. DNS, certificates, Railway bindings and redirects were not checked. Platform domain delivery and customer custom domains are separate questions. `server/domains/provider.js` explicitly supplies an unconfigured adapter rejecting hostname/certificate operations; registry/proof code is not completed hosting.

## 13. Current status, critical issues and readiness

No runtime bug was reproduced. These are visible blockers or missing evidence, not invented failures:

1. Running commit/schema/workers are unknown; local cleanliness does not prove production parity.
2. No current full database rehearsal of this revision: tenant isolation, upgrade, quote/order/stock/finance concurrency and reconciliation remain unverified.
3. Automatic pre-deploy migrations plus historical 034 compatibility concerns require target ledger, writer control and restorable backup before release.
4. Paid launch: incomplete legal/tax review, unverified final plans/mappings and no accepted provider payment/renewal/cancellation workflow.
5. Webhook inbox: schema/worker/lease recovery, retries, actual committed acknowledgment timing and retention remain acceptance gates.
6. Signup/recovery may be blocked operationally without actual email delivery, encryption and supervised mail worker; these were not verified.
7. Trial promises conflict with current direct-subscription source.
8. Domains, general agents, TalkinLabs and automated messaging must not be advertised as delivered capabilities.
9. Secure uploads require a working scanner and recoverable encryption key; runtime setup unknown.
10. Backup retention, alert receipt, payment reconciliation, support and incident accountability need named owners.

No whole business module is Complete and verified in this audit. Most operational modules are Implemented but not fully verified. SIA/commercial/domain workflows are partial or blocked; broad agents are planned/UI only. Broken production behavior cannot be inferred from old test failures or deliberately disabled routes.

## 14. Recommended development priorities

1. Confirm authoritative checkout, release owners and running commit. Separately inventory hosting/settings read-only without exposing secrets.
2. Decide direct subscription versus trial; approve precise prices, GST, capacities/features, cancellation/refund terms and coming-soon claims.
3. In a separately authorized disposable PostgreSQL environment, verify the full migration chain/upgrade/repeat behavior and linked company → team/customer → quote → order → stock/purchase → installation → invoice/collection → service journey. Include concurrency, reconciliation and cross-company denials.
4. Accept real email signup/recovery/invitations, supervised workers, scanner/key recovery, backups/restores and actual alert receipt.
5. After commercial/legal approval, accept Razorpay test mode: mapped plans, capture vs authorization, duplicates, delayed/out-of-order events, durable retry/lease recovery, cancellation, failed renewals and reconciliation. Measure acknowledgment after real committed inbox writes.
6. Conduct owner/employee/customer pilot with written go/no-go evidence and support ownership. Production migrations, deployment and live billing require their own later release decision.
7. Prioritize missing features from paying-customer needs after the core workflow is accepted.

## 15. Questions requiring owner decisions

- Is this C: checkout authoritative, and who controls GitHub, Railway, DNS and secrets?
- Were new trials intentionally discontinued? Which public promises/contracts must change?
- Who is the first paying distributor/installer, and what exact workflow is the launch promise?
- What are final prices, GST, billing cycles, capacities, Enterprise and setup-fee terms?
- Who approves legal/tax documents and owns grievances, refunds, cancellations and uncertain payments?
- Who reviews activation/listings, and what verification/turnaround is promised?
- Who supervises workers, alerts, backups and revocation? What downtime/data-loss limits are acceptable?
- Are domains, TalkinLabs, messaging and general agents launch requirements or later additions?
- What are file/webhook/data retention policies and key-recovery arrangements?
- Which real owner, employees and customer will accept the pilot, with what go/no-go evidence?

## Five things to understand before taking control

1. This is both marketplace and company operating system. Listing, approval, software access and payment are separate states.
2. Real code exists, but menus and mocked test counts do not certify persistence or production workflows.
3. Current source disables new trials; older seven-day documents do not describe today's new-company purchase path.
4. Paid readiness is not established. Server-verified captured payment/invoice evidence, legal approvals, mappings and worker acceptance matter.
5. Deployment may execute migrations. Know the schema, compatible code/workers, backup/recovery plan and accountable release owner before pushing.

### Evidence index

Direct sources: `package.json`, `src/app.js`, `src/account.js`, `src/business-access.js`, `server/index.js`, `server/config.js`, `server/auth/`, `server/permissions.js`, `server/tenancy/context.js`, `server/operations/`, `server/db/pool.js`, `server/db/migrations.js`, `server/db/migrations/`, `server/commercial/os-routes.js`, `server/commercial/os-access.js`, `server/commercial/razorpay.js`, `server/commercial/razorpay-webhook-worker.js`, `server/documents.js`, `server/domains/provider.js`, `server/legal/review.json`, `.env.example`, `railway.json`.

Historical/reference documents reviewed: master functionality audit/completion report; no-autopay trial report; Razorpay readiness, reliability and inbox implementation reports; root/Railway deployment guides and backup/recovery references. Other acceptance/runbook documents are follow-up resources, not proof their procedures passed today. Reports were reconciled against newer source where conflicts were found.

Audit stops here. Only this report was added; no implementation or operational changes were made.
