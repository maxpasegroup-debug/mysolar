# MY Solar Solutions - master functionality audit

28 October 2026. **Overall: PARTIALLY IMPLEMENTED; BLOCKED — AUTHORIZATION REQUIRED / RELEASE GATE for database-backed completion.**

This is a source-based inventory and current local verification record, not a production inspection or a claim that every persisted workflow works. No database was created, connected, migrated, seeded or modified. No Railway or production operation was performed. Historical local PostgreSQL reports are context, not current acceptance evidence for the modified code.

## Scope and evidence rules

Initial branch `main`, HEAD `122c83f`, unchanged index, no conflicts. The existing Boss Dashboard work was already modified/untracked; all of it is preserved. Full initial status and 389 non-secret project-file hashes are retained in ignored `.verification/master-completion-initial.json`.

Protected paths: `src/customer-dashboard.js`, `customer-dashboard.css`, `src/customer-locale.js`, `src/solar-marketplace.js`, `assets/my-solar-solutions-logo.png`. Shared `src/locale.js` is a separate interface helper: its new company-location registrations were corrected to use `window.I18n` without changing protected customer translations.

Framework: vanilla browser JavaScript with hash routes; Express ESM; PostgreSQL SQL migrations with checksum ledger and generated permission entry; Argon2/session/CSRF; role/profile/assignment and commercial-policy guards. There is one application, no duplicate tenant/auth/payment store and no new runtime dependency.

Read the current Boss report; Phase 2 release review, 2B, 2C, 2D and 2E reports; foundation, business-presets, practical-setup and phases 4-8 handoffs; actual account/tenant/setup/platform, operations/purchase, inventory/finance/project, workers, SIA, commercial, public/white-label/domain and test sources. No applicable `AGENTS.md` was found. Environment values, recovery archives and production data were not read.

### Status interpretation

- **IMPLEMENTED AND VERIFIED:** reserved here for directly exercised deterministic components, not an entire database-dependent module.
- **IMPLEMENTED — MOCK-VERIFIED ONLY:** source and local mocked/browser evidence exist; database persistence/reconciliation remains unverified in this task.
- **PARTIALLY IMPLEMENTED:** a supported subset exists; a material part of the requested workflow remains missing or unproven.
- **MISSING:** no operational implementation was identified.
- **BLOCKED — AUTHORIZATION REQUIRED:** database rehearsal or other prohibited operation needs separate approval.
- **BLOCKED — EXTERNAL CONFIGURATION:** provider, verified delivery or operator commercial configuration is missing/unverified.
- **BLOCKED — RELEASE GATE:** production migration/cutover/recovery acceptance remains separate.

A test filename in the following matrix is a coverage mapping, **not** a claim that its integration suite ran. All `*.integration.test.mjs`, database, upgrade, concurrency and restore suites were not executed here. The exact allowlisted unit command and final counts are in the completion report.

## Confirmed findings and local remediation

| Finding | Change / current boundary |
| --- | --- |
| Company creation had no server retry identity; repeated requests could create multiple companies/owners | Current-user-derived retry UUID + original request digest in existing audit metadata; existing owner check on replay; identical owned-company guard after a reload. Runs after the existing `lockedUser` row lock in the same transaction. No migration. Real concurrency/rollback remains a database gate. |
| Manual quotations were excluded by the enquiry-only expiry reminder predicate | Maintained manual company/contact sources are eligible for staff reminders. No customer identity or consent is inferred from a manual contact. Converted orders and closed/cancelled enquiry work are excluded. Worker execution/delivery remains unverified. |
| A quotation notification could be hidden from a quotation-authorized employee without `leads.read`, while old workflow feed access relied only on lead permission | Shared company notification visibility checks the current module permission and source company on both combined and legacy feeds and on mark-read. Current membership/user ownership checks remain authoritative. |
| Legacy notification renderer could link a manual quotation to `enquiry?id=null` | No enquiry link without an actual enquiry; real version link retained. Main operations feed already prefers the real version. |
| Search on a filtered operational list discarded view/assignee context | Hidden view/assignee values now preserve the current filter when applying search. No backend scope is taken from these fields. |
| Existing locale tests failed after company-location registrations used an unqualified global `I18n` | Use the explicitly assigned `window.I18n`. Six failed tests were rerun successfully without weakening their assertions. |
| Closed-drawer browser assertion sampled the existing 200ms transition at 150ms | Wait for the settled closed position, then keep the same geometric/hit-testing assertions. No application overflow or security assertion was removed. |

## Important incomplete capabilities

1. No current database-backed proof of new company retry semantics, notification visibility SQL or manual reminder persistence. New rehearsal tests/checklists are prepared; do not treat their source as test success.
2. New accounts still need email provider/sender/encryption settings and a running mail worker. Receipt is not proved by entering the OTP screen or by queue acceptance. No live email was sent here.
3. Company activation requires the existing authorized, independent platform review. Completing owner setup does not activate, publish or establish a paid subscription.
4. Seven-day owner-activated automation trial is not a complete self-service journey. Existing plans allow configurable trial terms and authorized operator assignment; no new entitlement or price is granted by this task.
5. Starter/Pro/Elite/Enterprise is an intended product package, not verified live configuration. Historical FREE/ELITE/PRO and the special `pro` network eligibility must be reconciled by an operator before advertising the new packages. No subscription configuration was changed.
6. Payment sessions, renewal charging, payment webhooks and payment reconciliation are intentionally unavailable. The existing adapter fails closed. No automatic billing is implemented.
7. Attendance, leave and payroll are not delivered by team counts or role templates. Dedicated manufacturer/supplier onboarding and dealer-specific credit/distribution channels are not complete standalone products.
8. Durable low-stock notifications, automatic new-lead assignment/task creation, automatic escalation/status mutation and scheduled daily emailed Boss summaries are not implemented by the current date-based reminder catalogue. The dashboard can show maintained stock exceptions and current summaries; do not advertise these as autonomous background workflows.
9. Existing reminders need approved rules, effective permissions/entitlements/preferences and a healthy worker. In-app persistence, mail transport acceptance and inbox receipt are different stages. Runtime health and delivery are unverified here.
10. SIA is evidence selection/rule assistance plus the implemented, explicitly approved enquiry-response proposal. It is not a general autonomous CEO, accounting engine or marketing-agent platform. TalkinLabs remains Coming Soon / Not Connected.
11. Domain ownership/registry foundation exists; the provider is explicitly `UnconfiguredDomainProvider`. No domain/TLS/DNS provisioning or tenant hostname traffic is delivered here. Per-brand custom work needs a separately approved scope and provider.
12. Secure uploads fail closed without a configured scanner and encryption key. Account recovery/delivery and real malware scanning require external acceptance. CSV/print exports are not statutory GST filing or a certified accounting system.
13. Maintained stock locations are company-scoped; a strict branch/warehouse-specific authorization model is not established merely by employee/team metadata. Do not promise branch-isolated ERP access without separate implementation/testing.
14. India is the supported company-onboarding country; states/UTs and district choices have an explicit manual fallback. The bundled directory is not a live government register, GPS/Uber-style proximity or real-time availability service.

## Functional module / persistence / coverage matrix

The following matrix and appendices are generated from the current source inventory. API declarations are relative to their router mounts; they are not live HTTP observations. Dynamic route/operation families must be expanded and exercised during authorized acceptance. Source-declared schema objects do not prove the installed schema or migration ledger.

| Module | UI route / component | API / service | Data model | Required authority | Status | Persistence evidence | Dependency / missing behavior | Coverage mapping | Remaining gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Registration/email OTP | /register; /distributor/onboarding; account/onboarding | /api/auth/register[/confirm]; auth/email-registration.js | registration_challenges, users, mail_jobs | Anonymous session + same-origin/CSRF; account type validation | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Encrypted queue/provider and actual OTP inbox receipt unverified; no second auth system | email-signup.integration, unique-email-upgrade, account-channels.integration; security/config unit | Authorized database acceptance + release gate |
| Login, sessions, recovery | /customer/login; /distributor/login; /recover; /account-security; Account/MobileAuth | /api/auth; auth/routes,password-reset,protection,sessions | sessions, account_security, password_reset_challenges, mobile_credentials | Server session/user; privileged MFA and recovery ownership | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Primary email/password with legacy mobile path retained; live reset delivery/current session storage unverified | authentication, password-codes, recovery, mobile-pin integration; security/config unit | Authorized database acceptance + release gate |
| Company creation/retry/selection | /distributor/onboarding; /companies; Account | POST /api/companies; tenancy/routes,company-creation | companies, company_memberships, sessions, audit_events | Business account; locked current user; owner membership on replay | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | New retry guard needs real rollback/concurrency proof; natural duplicate returns conflict, never merges companies | master-completion unit; NEW master-onboarding.integration NOT RUN | Authorized database acceptance + release gate |
| Practical setup and India address | /distributor/setup; Organization/CompanyLocation/Workspace | /api/companies/current/setup*; /onboarding/*; setup/* | company_profiles, company_setup_choices, company_onboarding | company.setup.read; company.onboarding.manage; revision/lifecycle | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | India only; district manual fallback; saved persistence/resume not rerun against DB | company-location unit; company-location/practical-setup/company-onboarding integration | Authorized database acceptance + release gate |
| Activation and public review | /platform/company; /distributor/setup?step=review; Organization | platform/routes; setup/routes,service | company_reviews, companies, audit_events | Independent platform.onboarding/lifecycle/marketplace permissions | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Owner cannot self-activate; independent operator and eligibility configuration required | tenancy/company-onboarding/business-presets integration | Authorized database acceptance + release gate |
| Brand and public profile | /distributor/public-profile; /branding; Organization | /branding; /marketplace-request; setup/* | company_branding, company_business_profiles, company_service_areas | company.brand.read/manage; company.setup.read/onboarding.manage; entitlements | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Approved hosted logo rules; no custom domain provision/publication from local form | tenancy/public-discovery/white-label-commercial integration | Authorized database acceptance + release gate |
| Boss dashboard and employee Today | /distributor/dashboard; BossDashboard/Operations/Workspace | /api/companies/current/operations/dashboard; boss-summary,read,reporting | Existing orders/quotes/stock/finance/tasks/members, no duplicate metric store | workspace.read plus each module read; owner role for Boss | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Source reconciliation/query capacity needs DB; no attendance or fabricated trends | boss-dashboard/workspace/solar-os-ui unit; browser; business-access/release-concurrency integration | Authorized database acceptance + release gate |
| Customer contacts / business contacts | /distributor/customers; /new?kind=contacts; Operations | operations/crm,read,customer-360 | company_contacts, operations_events/idempotency | customers.read/manage; company context | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Business contacts are supported; no dedicated dealer-credit channel product claimed | customer-360/people-sales/manual-sales integration | Authorized database acceptance + release gate |
| Customer 360 | /distributor/record?kind=contacts; Operations | operations/customer-360,read | Lead/quote/order/project/invoice/service and document relations | customers.read plus each module/assignment/finance permission | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Financial totals/source links require database reconciliation; no cross-module permission lift | customer-360/manual-sales integration; browser | Authorized database acceptance + release gate |
| Lead pipeline and qualification | /distributor/crm; /record?kind=leads; Operations | operations/crm,growth; people-sales controls | crm_leads, company_sales_controls, lead_growth_records | crm.read/manage, employee relationship scope, qualification policy | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Human assignment/follow-up supported; no arbitrary automatic new-lead/task rule engine | people-sales/manual-sales/management-automation integration; browser | Authorized database acceptance + release gate |
| Marketplace enquiries/private messages | /distributor/leads; /enquiry; Purchase | purchase/company,customer,service | customer_enquiries, enquiry_recipients/messages/events | leads.read; enquiries.manage; customer ownership/consent | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Actual published coverage/listings and consent/state must be DB-verified; no fabricated enquiries | purchase/connected-journey/public-discovery integration | Authorized database acceptance + release gate |
| Quotations/revisions/manual sources | /distributor/quotation/new; /quotation; Purchase | purchase/company,sources,service,validation; active.js | enquiry_quotations, quotation_versions/line_items, crm_leads | quotations.read/manage/send plus source permissions; qualification | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Depends on 034/037 contracts; exact historical snapshot pair and persistence/concurrency must be rehearsed | quotation-source-compatibility unit; os-phase2/manual-sales/people-sales integration | Authorized database acceptance + release gate |
| Quote review/discounts/templates | /distributor/templates; quotation detail; ReleaseTools/Purchase | purchase/review; sales-tools; people-sales | quotation_review_events, quotation_templates, company_sales_controls | quotations.review/send/manage; delegated discount/owner override rules | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Revision/policy-bound approvals; no automatic approval; actual DB policy evidence pending | people-sales/sales-tools/os-phase2 integration | Authorized database acceptance + release gate |
| Orders/credit/acceptance | /distributor/orders; /new?kind=orders; Operations | operations/orders,credit; pending list view | business_orders/items, company_contacts credit fields | orders.read/manage/confirm; finance control permission; exact acceptance | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | No payment implied; manual/customer acceptance, duplicate threads and credit reconciliation need real DB | manual-sales/business-access/purchase/operational-finance integration | Authorized database acceptance + release gate |
| Fulfilment/returns | /record?kind=orders; Operations | operations/fulfilment | order_fulfilment_entries, inventory_movements, cost allocations | orders.manage; inventory authority when maintained stock is affected | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | 038 dependency; evidence/quantities and original-cost customer return proof pending | manual-sales/installation-materials integration; browser | Authorized database acceptance + release gate |
| Platform master catalogue | /platform/catalogue,/product,/categories; Marketplace | marketplace/admin | catalogue_categories/products | catalogue.read/manage platform grants | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | No invented inventory/prices. Master taxonomy seed is source-defined; current records not inspected | marketplace-discovery/purchase integration; browser | Authorized database acceptance + release gate |
| Company offers and coverage | /distributor/catalogue,/offers,/offer,/service-areas; Marketplace | marketplace/company,validation,service | distributor_offers, offer_reviews, company_service_areas | offers.read/manage; company setup; catalogue/storefront features | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Only approved/published eligible offers can appear; PIN data and availability are declared, not GPS/live | purchase/public-discovery/marketplace-discovery integration | Authorized database acceptance + release gate |
| Stock/warehouses/costing | /distributor/inventory; Operations | operations/stock,materials,material-ledger | stock_locations, inventory_items/reservations/movements/cost_lots | inventory.read/manage plus current company; ledger rules | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | No unexplained stock; cross-tenant/quantity/cost/concurrency proof pending; branch-specific access not complete | installation-materials/manual-sales/operational-finance integration | Authorized database acceptance + release gate |
| Purchases/suppliers/receipts | /distributor/procurement,/suppliers; Operations | operations/stock,materials,read | suppliers, purchase_orders/items, receipt movements | procurement.read/manage; inventory permissions; supplier relation | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Partial receipt/returns present; PO is not receipt or payment; stock/supplier reconciliation pending | business-access/installation-materials/manual-sales integration | Authorized database acceptance + release gate |
| Projects/tasks/departure handoff | /distributor/projects,/tasks,/field; Operations/Experience | operations/delivery,project-coordination,work-handoffs | installation_projects, assignments, milestones, business_tasks, dependencies/checklist | projects.read/manage or assigned; tasks.own/manage; transfer permissions | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | No orphaned-work or revoked-access proof without DB; field writes need connection | project-coordination/solar-os-foundation/management-automation integration; browser | Authorized database acceptance + release gate |
| Installation readiness and utility | Project detail; ReleaseTools/Operations | solar-delivery; operations/installation,materials | site_surveys, installation_checks/controls, project_materials, utility_progress | projects.manage plus material/crew permission; evidence-bound approval | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Survey/safety/technical/materials/commissioning/handover required; utility tracking separate; no actual readiness acceptance here | installation-materials integration and upgrade; browser | Authorized database acceptance + release gate |
| Invoices/recorded collections | /distributor/accounts; invoice detail; Operations | operations/finance,finance-ledger,finance-posting | customer_invoices/collections, invoice_financial_balances | finance.read/manage + post/credit/refund/reverse permissions; feature guards | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Posted records are not verified bank transactions or statutory GST compliance; source balance/concurrency proof pending | operational-finance/business-access/manual-sales integration; money unit | Authorized database acceptance + release gate |
| Advances/credits/refunds/expenses/supplier payments | Order/project/bill detail; Operations | operations/finance-posting,finance-ledger | order_advances, invoice_credit_notes, customer_refunds, project_expenses, supplier_payments/bills | Granular finance posting/reversal permissions and idempotency | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Contract/invoiced/unbilled/available advance amounts distinct; profit only with reliable costs; accountant review pending | operational-finance integration and upgrade; finance-csv/money unit | Authorized database acceptance + release gate |
| Financial exports | Finance detail/export controls; Operations | operations/finance-export; customer/record-export | Allowlisted current ledger/view projections, paginated CSV | finance.read or customer-owned export authority | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | CSV page is not a frozen full-book snapshot or tax filing; UI encoding helpers directly tested | finance-csv/customer-record-export unit; manual-sales integration | Authorized database acceptance + release gate |
| Loans/subsidies | /distributor/funding; Operations | operations/funding | funding_applications/disbursements and history/documents | funding.read/manage or assigned.read/update; finance feature | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Internal tracking; requested/approved/disbursed remain separate; never official eligibility/receipt proof | funding integration and upgrade; browser | Authorized database acceptance + release gate |
| Service/warranty/retention | /distributor/service,/equipment; Operations/ReleaseTools | operations/retention; solar-delivery | service_requests/resolutions/feedback/retention_records, equipment_assets | service.read/manage/assigned; customer linked feedback; explicit shared data | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Customer-confirmed closure/reopen preserved; warranty issuer terms are supplied, not independently certified | after-sales-retention integration and upgrade; browser | Authorized database acceptance + release gate |
| Maintenance contracts/visits | /distributor/service-contracts; ReleaseTools | service-contracts | service_contracts, contract_visits | service.read/manage + linked order/feature checks | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | No automatic renewal/payment; actual records and opted-in reminder delivery require acceptance | service-communications/management-automation integration | Authorized database acceptance + release gate |
| Employees/invites/team/profiles | /distributor/team; Organization/Growth/ReleaseTools | setup/invitations,staff; tenancy/routes; people-sales | company_invitations/memberships/teams/role_profiles | members.read/manage; owner ceiling; role/profile scope; team/PRO limits | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Actual invite delivery and acceptance/revocation/departure contention need DB; no owner overwrite | company-onboarding/people-sales/pro-network/project-coordination integration | Authorized database acceptance + release gate |
| Attendance/leave/payroll/branch-only authority | No implemented HR workflow; workforce template disclosures | No operational HR/payroll engine | No attendance/payroll ledger identified | Existing roles confer no new HR authority | MISSING | No implemented writer | Do not advertise these from dashboard counts/templates; requires separate requirements/schema/privacy review | workforce-templates source; no HR acceptance suite | New scope/schema/rules approval |
| Unified notifications | /distributor/notifications; Operations; legacy Purchase fallback | operations/notifications; purchase/notifications,notification-scope | operations_notifications, workflow_notifications | Current user/company AND current source-module/assignment permission | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Current-role filtering and manual null-enquiry fixes are mock/source/browser verified; SQL rows/read mutation pending | master-completion unit; browser; business-access/automation integration | Authorized database acceptance + release gate |
| Approved durable reminders | /distributor/automation; Automation | automation/catalogue,engine,routes,worker | automation_rules/jobs/deliveries/attempts/worker_state, reminder_preferences | automation.read/manage + per-rule module permission/features/recipient consent | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Manual quote staff path repaired; real leases/retries/concurrent delivery and worker runtime need authorization/configuration | master-completion unit; automation/management-automation integration | Authorized database acceptance + release gate |
| Autonomous assignment/stock alert/task/escalation/daily email | Unavailable as automatic business operations | No complete date-independent stock/assignment mutation engine | Current reminder schema supports the documented date catalogue | MISSING | Requires explicit rules, migrations/approvals if new kinds, permissions and tests; dashboard exceptions are not autonomous jobs | Schema and writer/read path inspected; not executed against DB | Source catalogue/engine audit; no completion claim | undefined | Authorized database acceptance + release gate |
| SIA assistance | /sia; /customer/sia; SIA | sia/routes,tools,provider; controlled evidence selector | sia_requests/usage/events/proposals | sia.read + tool/module scope, current session/company, external budgets | PARTIALLY IMPLEMENTED | Schema and writer/read path inspected; not executed against DB | Rule/evidence assistance implemented; configured model optional; general marketing agents absent | provider unit; purchase/commercial/management-automation integration | Authorized database acceptance + release gate |
| SIA approved action | Existing enquiry-response proposal panel; SIA | POST proposals and exact decision; purchase/sendMessage | sia_proposals + existing enquiry conversation/audit | enquiries.manage, leads.read, session/payload/revision-bound approval | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Only documented enquiry response; no autonomous quotation/order/financial/stock mutation | purchase/commercial integration; provider unit | Authorized database acceptance + release gate |
| TalkinLabs/WhatsApp/SMS | Boss tools Coming Soon / Not Connected; user-opened WhatsApp draft | communications-boundary unconfigured adapters | No configured external messaging transport/delivery ledger for these channels | No channel privilege activated by UI | BLOCKED — EXTERNAL CONFIGURATION | Source foundation only; external runtime unverified | TalkinLabs is separate; no accounts/messages/billing activation permitted | Boss/browser availability; communications-boundary source | External configuration + release approval |
| Commercial plans/history/pre-billing | /platform/commercial,/plans,/subscriptions; /distributor/subscription; Commercial | commercial/routes,validation,policy; ownerCommercial | Versioned settings/plans, company subscriptions/events/usage | Explicit platform commercial grants; company subscription.read; role AND entitlement | PARTIALLY IMPLEMENTED | Schema and writer/read path inspected; not executed against DB | Actual active terms unknown; free listing vs automation, seven-day owner trial and new packaging need operator review | commercial/pro-growth/white-label-commercial integration; business policy source | Authorized database acceptance + release gate |
| Live payment/recurring billing | Unavailable; no operational checkout | commercial/payments.js fails BILLING_DISABLED | No verified provider payment integration | No browser callback may grant paid status | BLOCKED — EXTERNAL CONFIGURATION | Source foundation only; external runtime unverified | Provider/consent/verified event/reconciliation implementation and authorization required; not simulated here | Source adapter boundary; commercial integration intended | External configuration + release approval |
| PRO partner network/executives | /distributor/partners,/team; Growth | partners/routes; commercial/growth | company_partner_relationships, memberships/invitations | partners.* + current PRO; part-time executive role eligibility/assignment | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Naming must retain special pro eligibility; expiry/revocation/concurrent acceptance needs DB proof | pro-network/pro-growth/company-onboarding integration | Authorized database acceptance + release gate |
| Secure files/print/export | Existing record file controls; PrivateDownload/ReleaseTools/PrintRecord | documents,print-record,customer/records | managed_files encrypted payload + operations_documents references | Record ownership/current permissions; scanner/key/quota; no-store downloads | PARTIALLY IMPLEMENTED | Schema and writer/read path inspected; not executed against DB | Configured clean scanning and encryption are mandatory; actual uploads/download integrity not exercised | documents-delivery/connected-journey integration; export unit | Authorized database acceptance + release gate |
| Imports/duplicate review | /distributor/import; ReleaseTools | sales-tools reviewed preview/confirm/rollback | import_batches, contacts/leads/opening records | customers.manage and data-specific finance/inventory permission | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Review and actual persisted rollback/dependency checks required; no unchecked bulk import executed | practical-setup/sales-tools integration; browser | Authorized database acceptance + release gate |
| Public marketplace/storefront | /products,/vendors,/product,/vendor,/storefront; protected marketplace and Experience | marketplace/public; customer/experience; published views | Published categories/products/offers/vendors/coverage only | Public eligible views; customer enquiry consent/ownership on submission | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Zero listings cannot be diagnosed without approved DB inspection; no product/rating/price/availability invented | public-discovery/marketplace-discovery/purchase integration; existing browser checks | Authorized database acceptance + release gate |
| Branded page/consultation | /distributor/website,/white-label; ReleaseTools/Workspace | white-label; /sites/:id | company_websites, website_versions, white_label_requests | company.brand.read/manage, feature/publication review; explicit owner request | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Two existing templates and versioned content; no per-brand custom code automatically delivered | white-label-commercial integration; browser | Authorized database acceptance + release gate |
| Custom domains/TLS/traffic | Company domain console/registry, not operational domain hosting | domains/routes,service,proof,resolution,provider | company_domains, domain_operations | domains.read/manage; platform authority; verified lifecycle; feature gates | BLOCKED — EXTERNAL CONFIGURATION | Source foundation only; external runtime unverified | Unconfigured provider; DNS/TLS/proxy/cookies/cache/traffic activation separately authorized | domain-foundation unit; domains integration NOT RUN | External configuration + release approval |
| Reports and field work | /distributor/reports,/field; Operations/Experience | operations/reporting seven families | Authorized source aggregates; no reporting shadow ledger | Per-report module permissions and assignment scope | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Actual source reconciliation/performance and financial completeness need DB; field offline writes unavailable | management-automation/manual-sales integration; browser | Authorized database acceptance + release gate |
| Operations health/mail/alerts/recovery | /platform/operations,/mail,/costs; ReleaseTools | operations-health, mail-queue, monitor workers; scripts/runbooks | process_heartbeats, operational_events/incidents, mail_jobs/attempts, costs | Platform grants; separate worker/process and recipient settings | BLOCKED — EXTERNAL CONFIGURATION | Source foundation only; external runtime unverified | No live Railway/backup/restore/alert delivery inspected; old recovery evidence not current release approval | mail-config/failure/monitor unit; operations-monitor/recovery integration | External configuration + release approval |
| PWA/offline/accessibility | Existing mobile navigation and static service worker | sw.js; safe browser harness | Invariant static caches only; no private API caching | Authentication required online for private records/writes | IMPLEMENTED — MOCK-VERIFIED ONLY | Schema and writer/read path inspected; not executed against DB | Offline is a useful fallback, not offline ERP synchronization; browser/keyboard checks fictional | pwa/journey/workspace unit; full browser run | Authorized database acceptance + release gate |


## Automation contract

The date-based catalogue supports task, individual stage, funding, procurement, service escalation, customer resolution review, maintenance visit, contract renewal, lead follow-up, quotation expiry, project schedule, collection and service reminders.

For each: trigger = eligible maintained source date within the approved lead-day window; eligibility = active company, approved rule revision, feature policy, current approver/recipient membership and required module/assignment permissions; action = in-app notice, with separately approved/opted-in verified email where configured. Exact per-kind permission, feature, date, audience and condition are in `server/automation/catalogue.js`.

`automation_jobs` has a company/kind/source/recipient/channel/occurrence uniqueness boundary. Planning uses company/rule locks and bounded cursors; claiming uses leases and `FOR UPDATE SKIP LOCKED`; abandoned claims retry or become dead after five attempts. Delivery rechecks approval, current source date/state, permission and preference, writes notification/delivery/attempt/audit records transactionally, and mail uses its own queue/lease/retry records. These are inspected source properties; this task did not execute the worker or prove SQL/concurrency behavior.

Approval occurs when an authorized user confirms the exact reminder rule, including audience, channel, hour, lead days and reason. It is not permission to create orders, adjust stock, post finance, collect money or auto-close service. Disabling/changing approval cancels affected pending/running jobs. Failures are visible in the existing automation console. Staff-only manual quotations cannot obtain a customer recipient by matching contact data.

The mail worker (`npm run worker:mail`), reminder worker (`npm run worker:reminders`) and monitoring worker (`npm run worker:monitor`) are separate long-running processes in the source design. None was launched here. A dashboard render starts no background action or provider request.

## Security and integration boundaries

- Authenticated user, session, membership, role/profile and company come from existing server context. Browser company/account headers are consistency checks, not authority.
- `withCompany` locks/revalidates current identity/membership, checks permission and commercial guard. Source/read queries additionally enforce assignments where supported. Owners retain actual role names; Boss is only a UI greeting.
- Mutations preserve same-origin JSON/CSRF checks, validation, revision checks, company serialization, operation-key duplicate guards, audit and existing source snapshots. New retry protection does not overwrite companies or grant membership to a different account.
- Quotation sources reject inconsistent or missing historical product/offer pairs rather than refreshing one half. Orders preserve issued/agreed terms and documented acceptance. Existing integer-paise finance and stock/cost ledgers remain authoritative.
- Permission removal can hide old notification sources as well as prevent new actions. Customer-owned notification/record rules remain on the existing customer branch.
- Live subscription change, finance/stock action, employee invitation, provider configuration, message delivery, publication and domain activation were not performed.

## Source inventory appendices

### Inventory counts and limitations

108 static hash-route entries; 316 source-local API declarations; 51 literal named form declarations; 367 CREATE schema-object declarations across 39 SQL files; 194 server/UI source paths. Migration 002 is generated by the existing runner, so SQL-file count is not ledger-entry count. These counts include templates/declarations and are not runtime coverage percentages. Generic operations forms, loop-generated actions, nested routers and conditional dialogs are mapped by family above; they require real acceptance in addition to this lexical inventory.

### Router mount map (server/index.js)

| Mount | Mounted source router(s) |
| --- | --- |
| /api | async(req,res,next |
| /api/auth | auth |
| /api | postal |
| /api | whiteLabel |
| /api | documents,solarDelivery,serviceContracts |
| /api/platform/operations | operationsHealth |
| /api/reminders/preferences | reminderPreferences |
| /api/companies/current/automation | automation |
| /api/platform/domains | platformDomains |
| /api/companies/current/domains | companyDomains |
| /api/platform/commercial | commercial |
| /api/companies/current/subscription | ownerCommercial |
| /api/customer/sia | siaRoutes() |
| /api/companies/current/sia | siaRoutes(true) |
| /api/customer/experience | customerExperience,customerRecords |
| /api/companies/current/operations | operations,crm,customerInvitations,orders,warehouse,materials,delivery,installation,coordination,finance,financialPosting,funding,retention,reporting,notificationRoutes() |
| /api/customer/operations | customerOperations,notificationRoutes(true) |
| /api/customer | purchaseCustomer,customerNotifications |
| /api/companies/current/controls | peopleSales |
| /api/companies/current | salesTools |
| /api/companies/current | purchaseCompany,companyNotifications |
| /api/public | discovery |
| /api/companies/current | listings |
| /api/platform/catalogue | catalogueAdmin |
| /api/companies/current | setup |
| /api | partners |
| /api | invitations |
| /api/platform | platform |
| /api/companies | companies |
| /api/customer | customer |

### Every static hash-route entry

Renderer and permission contract: `src/app.js:pageContent`, `Account` route gates, then the module component/service in the matrix above. A label of public for a platform hash route is a shell classification, not permission to access admin data; backend grants remain mandatory. Explicit demo/preview routes are not operational data.

| Route | Shell | Title |
| --- | --- | --- |
| /distributor/service-contracts | distributor | Maintenance commitments |
| /customer/service-contracts | customer | My maintenance |
| /distributor/equipment | distributor | Equipment passports |
| /customer/equipment | customer | My equipment |
| /platform/locations | public | PIN mapping import |
| /platform/mail | public | Mail queue |
| /platform/costs | public | Recorded operating costs |
| /platform/white-label-requests | public | Branded platform enquiries |
| /distributor/website | distributor | Your branded page |
| /platform/operations | public | Operations health |
| /distributor/import | distributor | Import records |
| /distributor/templates | distributor | Quotation templates |
| /account/reminders | public | My reminder preferences |
| /account-security | public | Account security |
| /distributor/partners | distributor | B2B Partner Network |
| /platform/commercial | public | Commercial controls |
| /platform/plans | public | Subscription plans |
| /platform/plan | public | Plan terms |
| /platform/subscriptions | public | Company subscriptions |
| /platform/subscription | public | Company commercial details |
| /platform/commercial-history | public | Commercial history |
| /distributor/subscription | distributor | Plan and access status |
| /customer/sia | customer | SIA Purchase Assistant |
| /app-info | public | MY SOLAR on mobile |
| /customer/documents | customer | Documents and snapshots |
| /distributor/reports | distributor | Management reports |
| /distributor/field | distributor | My field work |
| /distributor/crm | distributor | Lead pipeline |
| /distributor/customers | distributor | Customers |
| /distributor/orders | distributor | Orders |
| /distributor/procurement | distributor | Procurement |
| /distributor/suppliers | distributor | Suppliers |
| /distributor/payables | distributor | Supplier bills |
| /distributor/tasks | distributor | My tasks |
| /distributor/record | distributor | Business record |
| /distributor/new | distributor | Create business record |
| /customer/business-record | customer | Business record |
| /customer/invoices | customer | My invoices |
| /customer/service | customer | Service requests |
| /customer/enquiry/new | customer | Request a quotation |
| /customer/enquiry | customer | Enquiry details |
| /customer/quotation | customer | Quotation details |
| /customer/notifications | customer | Notifications |
| /distributor/enquiry | distributor | Enquiry details |
| /distributor/quotation/new | distributor | Prepare quotation |
| /distributor/quotation | distributor | Quotation details |
| /distributor/notifications | distributor | Notifications |
| /categories | public | Energy categories |
| /search | public | Search products |
| /product | public | Product details |
| /vendor | public | Distributor profile |
| /distributor/catalogue | distributor | Energy catalogue |
| /distributor/offers | distributor | My offers |
| /distributor/offer | distributor | Edit offer |
| /distributor/service-areas | distributor | Service areas |
| /platform/catalogue | public | Shared catalogue |
| /platform/product | public | Product definition |
| /platform/categories | public | Category management |
| /platform/offers | public | Offer review queue |
| /platform/offer | public | Review offer |
| /distributor/public-profile | distributor | My Public Profile |
| /distributor/white-label | distributor | Your Branded Platform |
| /distributor/setup | distributor | Company setup |
| /distributor/branding | distributor | Brand identity |
| /distributor/audit | distributor | Company audit trail |
| /distributor/team | distributor | Team |
| /platform | public | Platform administration |
| /platform/company | public | Company review |
| /platform/settings | public | Proposed commercial settings |
| /platform/audit | public | Platform activity |
| /invitation | public | Accept company invitation |
| /storefront | public | Company storefront |
| /customer/login | public | Customer sign in |
| /register | public | Create account |
| /recover | public | Password recovery |
| /reset-password | public | Reset password |
| /companies | public | Choose company |
| / | public | Home |
| /customer | public | Customer entry |
| /distributor | public | Distributor entry |
| /products | public | Product categories |
| /vendors | public | Find a distributor |
| /products/rooftop-solar | public | Product details |
| /vendors/sunfield | public | Distributor details |
| /customer/reminders | customer | Reminder preferences |
| /distributor/automation | distributor | Reminders & automation |
| /customer/journey | customer | Track my request |
| /customer/dashboard | customer | Customer dashboard |
| /customer/enquiries | customer | My enquiries |
| /customer/quotations | customer | My quotations |
| /customer/compare | customer | Compare quotations |
| /customer/orders | customer | My orders |
| /customer/installation | customer | Installation progress |
| /customer/settings | customer | Profile & settings |
| /distributor/login | public | Distributor login |
| /distributor/onboarding | public | Set up your business |
| /distributor/dashboard | distributor | Today |
| /distributor/leads | distributor | Leads & CRM |
| /distributor/quotations | distributor | Quotations |
| /distributor/projects | distributor | Projects & installations |
| /distributor/inventory | distributor | Inventory |
| /distributor/funding | distributor | Loans & subsidies |
| /distributor/accounts | distributor | Accounts |
| /distributor/service | distributor | Customer service |
| /distributor/settings | distributor | Team & settings |
| /sia | distributor | Virtual CEO |
| /storefront/preview | public | Storefront preview |
| /states | public | Interface states |

### Every source-local API declaration

Relative paths below must be combined with the mount map and nested `use` calls. Parameters/templates and dynamic operation families are source contracts, not invented working URLs. Row location is a source-navigation aid, not proof of authorization or test success; see family permission and evidence columns above.

| File:line | Router | Method | Relative path |
| --- | --- | --- | --- |
| server/auth/email-registration.js:20 | emailRegistration | POST | /register |
| server/auth/email-registration.js:35 | emailRegistration | POST | /register/confirm |
| server/auth/password-reset.js:17 | passwordReset | POST | /request |
| server/auth/password-reset.js:30 | passwordReset | POST | /confirm |
| server/auth/pin-routes.js:38 | pinRoutes | POST | /register/request |
| server/auth/pin-routes.js:49 | pinRoutes | POST | /register/confirm |
| server/auth/pin-routes.js:62 | pinRoutes | POST | /login |
| server/auth/pin-routes.js:82 | pinRoutes | POST | /enrol/request |
| server/auth/pin-routes.js:94 | pinRoutes | POST | /enrol/confirm |
| server/auth/pin-routes.js:105 | pinRoutes | POST | /reset/request |
| server/auth/pin-routes.js:116 | pinRoutes | POST | /reset/confirm |
| server/auth/protection.js:22 | accountProtection | GET | /security |
| server/auth/protection.js:23 | accountProtection | POST | /verification/request |
| server/auth/protection.js:24 | accountProtection | POST | /verification/confirm |
| server/auth/protection.js:25 | accountProtection | POST | /password/change |
| server/auth/protection.js:26 | accountProtection | POST | /mfa/setup |
| server/auth/protection.js:27 | accountProtection | POST | /mfa/confirm |
| server/auth/protection.js:28 | accountProtection | POST | /mfa/step-up |
| server/auth/protection.js:29 | accountProtection | POST | /mfa/disable |
| server/auth/routes.js:44 | auth | GET | /session |
| server/auth/routes.js:54 | auth | POST | /login |
| server/auth/routes.js:79 | auth | POST | /logout |
| server/auth/routes.js:88 | auth | POST | /logout-all |
| server/auth/routes.js:93 | auth | POST | /recover |
| server/auth/routes.js:102 | auth | POST | /reset-password |
| server/auth/security.js:18 | req | GET | origin |
| server/auth/security.js:18 | req | GET | sec-fetch-site |
| server/auth/sessions.js:26 | req | GET | x-csrf-token |
| server/automation/routes.js:16 | automation | GET | / |
| server/automation/routes.js:24 | automation | PUT | /rules/:kind |
| server/automation/routes.js:40 | automation | POST | /jobs/:id/retry |
| server/automation/routes.js:46 | reminderPreferences | GET | / |
| server/automation/routes.js:47 | reminderPreferences | PUT | / |
| server/commercial/routes.js:19 | commercial | GET | /settings |
| server/commercial/routes.js:20 | commercial | POST | /settings |
| server/commercial/routes.js:21 | commercial | GET | /plans |
| server/commercial/routes.js:22 | commercial | GET | /plans/:id |
| server/commercial/routes.js:23 | commercial | POST | /plans |
| server/commercial/routes.js:24 | commercial | POST | /plans/:id/versions |
| server/commercial/routes.js:25 | commercial | POST | /plans/:id/state |
| server/commercial/routes.js:26 | commercial | GET | /subscriptions |
| server/commercial/routes.js:27 | commercial | GET | /companies/:id |
| server/commercial/routes.js:30 | commercial | POST | /companies/:id/subscriptions |
| server/commercial/routes.js:33 | commercial | POST | /companies/:id/subscriptions/:subscriptionId/actions |
| server/commercial/routes.js:34 | commercial | GET | /history |
| server/commercial/routes.js:36 | ownerCommercial | GET | / |
| server/customer/experience.js:10 | customerExperience | GET | /marketplace-context |
| server/customer/experience.js:15 | customerExperience | GET | /overview |
| server/customer/experience.js:43 | customerExperience | GET | /documents/:kind/:id |
| server/customer/records.js:15 | customerRecords | GET | /journeys/:id |
| server/customer/records.js:27 | customerRecords | GET | /exports/:kind/:id |
| server/customer/routes.js:16 | customer | GET | /profile |
| server/customer/routes.js:20 | customer | PATCH | /profile |
| server/customer/routes.js:30 | customer | GET | /modules/:module |
| server/documents.js:16 | documents | GET | /companies/current/files |
| server/documents.js:17 | documents | POST | /companies/current/files |
| server/documents.js:19 | documents | GET | /companies/current/files/:id |
| server/documents.js:19 | documents | GET | /customer/files/:id |
| server/documents.js:20 | documents | GET | /customer/files |
| server/documents.js:21 | documents | DELETE | /companies/current/files/:id |
| server/domains/routes.js:27 | companyDomains | GET | / |
| server/domains/routes.js:28 | companyDomains | GET | /:id |
| server/domains/routes.js:29 | companyDomains | POST | / |
| server/domains/routes.js:30 | companyDomains | POST | /:id/actions |
| server/domains/routes.js:41 | platformDomains | GET | / |
| server/domains/routes.js:42 | platformDomains | GET | /:id |
| server/domains/routes.js:43 | platformDomains | POST | /:id/actions |
| server/domains/routes.js:61 | companyDomains | POST | /:id/verify |
| server/domains/routes.js:62 | platformDomains | POST | /:id/verify |
| server/index.js:69 | app | GET | /healthz |
| server/index.js:71 | app | GET | /readyz |
| server/index.js:74 | req | GET | sec-fetch-site |
| server/index.js:81 | req | GET | x-account-id |
| server/index.js:111 | app | GET | /api/platform/audit |
| server/index.js:116 | app | GET | /${asset} |
| server/index.js:120 | app | GET | / |
| server/marketplace/admin.js:13 | catalogueAdmin | GET | /editor |
| server/marketplace/admin.js:24 | catalogueAdmin | GET | /categories |
| server/marketplace/admin.js:28 | catalogueAdmin | GET | /categories/:id |
| server/marketplace/admin.js:37 | catalogueAdmin | POST | /categories |
| server/marketplace/admin.js:37 | catalogueAdmin | PUT | /categories/:id |
| server/marketplace/admin.js:38 | catalogueAdmin | GET | /products |
| server/marketplace/admin.js:43 | catalogueAdmin | GET | /products/:id |
| server/marketplace/admin.js:56 | catalogueAdmin | POST | /products |
| server/marketplace/admin.js:56 | catalogueAdmin | PUT | /products/:id |
| server/marketplace/admin.js:57 | catalogueAdmin | GET | /offers |
| server/marketplace/admin.js:61 | catalogueAdmin | GET | /offers/:id |
| server/marketplace/admin.js:64 | catalogueAdmin | POST | /offers/:id/review |
| server/marketplace/company.js:12 | listings | GET | /offer-template |
| server/marketplace/company.js:13 | listings | GET | /offers |
| server/marketplace/company.js:21 | listings | GET | /offers/:id |
| server/marketplace/company.js:47 | listings | POST | /offers |
| server/marketplace/company.js:47 | listings | PUT | /offers/:id |
| server/marketplace/company.js:48 | listings | POST | /offers/:id/actions |
| server/marketplace/company.js:61 | listings | GET | /service-areas |
| server/marketplace/company.js:64 | listings | PUT | /service-areas |
| server/marketplace/public.js:9 | discovery | GET | /categories |
| server/marketplace/public.js:14 | discovery | GET | /products |
| server/marketplace/public.js:32 | discovery | GET | /products/:id |
| server/marketplace/public.js:41 | discovery | GET | /vendors |
| server/marketplace/public.js:52 | discovery | GET | /vendors/:id |
| server/operations/credit.js:15 | credit | POST | /contacts/:id/credit |
| server/operations/crm.js:10 | crm | GET | /contacts/duplicates |
| server/operations/crm.js:11 | crm | POST | /leads/:id/qualification |
| server/operations/crm.js:12 | crm | POST | /contacts/:id/update |
| server/operations/crm.js:14 | crm | POST | /contacts |
| server/operations/crm.js:15 | crm | POST | /contacts/:id/link |
| server/operations/crm.js:17 | crm | POST | /leads |
| server/operations/crm.js:18 | crm | POST | /leads/:id/update |
| server/operations/customer-invitations.js:11 | customerInvitations | POST | /contacts/:id/invitations |
| server/operations/customer-invitations.js:37 | customerInvitations | POST | /contacts/:id/invitations/:inviteId/revoke |
| server/operations/customer.js:12 | customerOperations | GET | /list/:kind |
| server/operations/customer.js:13 | customerOperations | GET | /record/:kind/:id |
| server/operations/customer.js:18 | customerOperations | POST | /orders/:id/confirm |
| server/operations/customer.js:19 | customerOperations | POST | /orders/:id/service |
| server/operations/customer.js:21 | customerOperations | POST | /service/:id/respond |
| server/operations/customer.js:22 | customerOperations | POST | /service/:id/reopen |
| server/operations/customer.js:23 | customerOperations | POST | /projects/:id/service |
| server/operations/delivery.js:8 | delivery | POST | /projects |
| server/operations/delivery.js:9 | delivery | POST | /projects/:id/assign |
| server/operations/delivery.js:10 | delivery | POST | /projects/:id/milestones |
| server/operations/delivery.js:11 | delivery | POST | /projects/:id/actions |
| server/operations/delivery.js:12 | delivery | POST | /tasks |
| server/operations/delivery.js:13 | delivery | POST | /tasks/:id/update |
| server/operations/delivery.js:15 | delivery | POST | /service |
| server/operations/delivery.js:16 | delivery | POST | /service/:id/update |
| server/operations/finance-export.js:6 | financeExports | GET | /finance/export |
| server/operations/finance-posting.js:10 | financialPosting | GET | /finance/summary |
| server/operations/finance-posting.js:11 | financialPosting | POST | /finance/orders/:id/advances |
| server/operations/finance-posting.js:12 | financialPosting | POST | /finance/invoices/:id/apply-advance |
| server/operations/finance-posting.js:13 | financialPosting | POST | /finance/invoices/:id/credits |
| server/operations/finance-posting.js:14 | financialPosting | POST | /finance/refunds |
| server/operations/finance-posting.js:18 | financialPosting | POST | /finance/projects/:id/expenses |
| server/operations/finance-posting.js:19 | financialPosting | POST | /finance/bills/:id/payments |
| server/operations/finance-posting.js:20 | financialPosting | POST | /finance/bills/:id/project |
| server/operations/finance-posting.js:21 | financialPosting | POST | /finance/projects/:id/review-costs |
| server/operations/finance-posting.js:23 | financialPosting | POST | /finance/entries/:kind/:id/reverse |
| server/operations/finance.js:4 | finance | POST | /invoices/:id/due-date |
| server/operations/finance.js:6 | finance | POST | /invoices |
| server/operations/finance.js:7 | finance | POST | /invoices/:id/actions |
| server/operations/finance.js:8 | finance | POST | /invoices/:id/collections |
| server/operations/finance.js:9 | finance | POST | /collections/:id/reverse |
| server/operations/finance.js:10 | finance | POST | /bills |
| server/operations/fulfilment.js:9 | fulfilment | POST | /orders/:id/fulfilment |
| server/operations/funding.js:20 | funding | POST | /funding |
| server/operations/funding.js:28 | funding | POST | /funding/:id/update |
| server/operations/funding.js:33 | funding | POST | /funding/:id/progress |
| server/operations/funding.js:39 | funding | POST | /funding/:id/decision |
| server/operations/funding.js:43 | funding | POST | /funding/:id/disbursements |
| server/operations/funding.js:46 | funding | POST | /funding/:id/disbursements/:entry/reverse |
| server/operations/growth.js:3 | growth | POST | /leads/:id/attribution |
| server/operations/growth.js:13 | growth | POST | /leads/:id/response |
| server/operations/installation.js:41 | installation | POST | /projects/:id/installation/control |
| server/operations/installation.js:44 | installation | POST | /projects/:id/installation/checks |
| server/operations/installation.js:45 | installation | POST | /projects/:id/installation/checks/:checkId |
| server/operations/installation.js:46 | installation | POST | /projects/:id/installation/approve |
| server/operations/installation.js:47 | installation | POST | /projects/:id/utility |
| server/operations/materials.js:5 | materials | GET | /stock/locations |
| server/operations/materials.js:6 | materials | POST | /stock/locations |
| server/operations/materials.js:7 | materials | POST | /stock/transfer |
| server/operations/materials.js:8 | materials | POST | /projects/:id/materials |
| server/operations/materials.js:9 | materials | POST | /stock/projects/:id/reserve |
| server/operations/materials.js:10 | materials | POST | /stock/reservations/:id/actions |
| server/operations/materials.js:11 | materials | POST | /stock/projects/:id/return |
| server/operations/materials.js:12 | materials | POST | /stock/supplier-return |
| server/operations/notifications.js:7 | router | GET | /notifications |
| server/operations/notifications.js:13 | router | POST | /notifications/:source/:id/read |
| server/operations/orders.js:9 | orders | POST | /orders |
| server/operations/orders.js:29 | orders | POST | /orders/:id/actions |
| server/operations/project-coordination.js:33 | coordination | POST | /projects/:id/stages |
| server/operations/project-coordination.js:43 | coordination | POST | /tasks/:id/coordination |
| server/operations/project-coordination.js:48 | coordination | POST | /tasks/:id/dependencies |
| server/operations/project-coordination.js:54 | coordination | POST | /tasks/:id/checklist |
| server/operations/project-coordination.js:55 | coordination | POST | /tasks/:id/checklist/:itemId |
| server/operations/project-coordination.js:56 | coordination | POST | /projects/:id/transfer/preview |
| server/operations/project-coordination.js:57 | coordination | POST | /projects/:id/transfer |
| server/operations/read.js:14 | operations | GET | /list/:kind |
| server/operations/read.js:15 | operations | GET | /options |
| server/operations/read.js:24 | operations | GET | /record/:kind/:id |
| server/operations/read.js:46 | operations | POST | /record/:kind/:id/notes |
| server/operations/read.js:47 | operations | POST | /record/:kind/:id/documents |
| server/operations/read.js:84 | operations | GET | /dashboard |
| server/operations/reporting.js:52 | reporting | GET | /reports |
| server/operations/reporting.js:53 | reporting | GET | /field |
| server/operations/retention.js:44 | retention | POST | /service/:id/retention |
| server/operations/stock.js:5 | warehouse | POST | /inventory/:id/threshold |
| server/operations/stock.js:6 | warehouse | POST | /inventory |
| server/operations/stock.js:7 | warehouse | POST | /inventory/:id/adjust |
| server/operations/stock.js:8 | warehouse | POST | /inventory/:id/reserve |
| server/operations/stock.js:9 | warehouse | POST | /reservations/:id/actions |
| server/operations/stock.js:10 | warehouse | POST | /suppliers |
| server/operations/stock.js:11 | warehouse | POST | /purchases |
| server/operations/stock.js:12 | warehouse | POST | /purchases/:id/actions |
| server/operations/stock.js:13 | warehouse | POST | /purchases/:id/receive |
| server/operations-health.js:11 | operationsHealth | GET | / |
| server/operations-health.js:13 | operationsHealth | GET | /mail |
| server/operations-health.js:14 | operationsHealth | POST | /mail/:id |
| server/partners/routes.js:16 | partners | GET | /companies/current/partners |
| server/partners/routes.js:25 | partners | POST | /companies/current/partners |
| server/partners/routes.js:37 | partners | PATCH | /companies/current/partners/:id |
| server/partners/routes.js:63 | partners | POST | /invitations/preview |
| server/partners/routes.js:67 | partners | POST | /companies/current/partners/accept |
| server/people-sales.js:31 | peopleSales | GET | / |
| server/people-sales.js:32 | peopleSales | POST | /teams |
| server/people-sales.js:36 | peopleSales | POST | /profiles |
| server/people-sales.js:41 | peopleSales | POST | /people/:id |
| server/people-sales.js:50 | peopleSales | POST | /policy |
| server/people-sales.js:56 | peopleSales | POST | /people/:id/departure/preview |
| server/people-sales.js:57 | peopleSales | POST | /people/:id/departure |
| server/platform/routes.js:25 | platform | GET | /companies |
| server/platform/routes.js:40 | platform | GET | /companies/:id |
| server/platform/routes.js:50 | platform | POST | /companies/:id/actions |
| server/platform/routes.js:90 | platform | GET | /settings |
| server/platform/routes.js:91 | platform | PATCH | /settings |
| server/postal.js:9 | postal | GET | /public/locations/:pin |
| server/postal.js:10 | postal | POST | /platform/locations/import |
| server/public-pages.js:9 | publicPages | GET | /catalogue |
| server/public-pages.js:10 | publicPages | GET | /companies |
| server/public-pages.js:11 | publicPages | GET | /products/:id |
| server/public-pages.js:12 | publicPages | GET | /companies/:id |
| server/public-pages.js:13 | publicPages | GET | /solar-basics |
| server/public-pages.js:14 | publicPages | GET | /support |
| server/public-pages.js:15 | publicPages | GET | / |
| server/public-pages.js:16 | publicPages | GET | /robots.txt |
| server/public-pages.js:17 | publicPages | GET | /sitemap.xml |
| server/purchase/company.js:17 | purchaseCompany | GET | /quotation-sources |
| server/purchase/company.js:18 | purchaseCompany | GET | /enquiries |
| server/purchase/company.js:19 | purchaseCompany | GET | /enquiries/:id |
| server/purchase/company.js:20 | purchaseCompany | POST | /enquiries/:id/view |
| server/purchase/company.js:21 | purchaseCompany | POST | /enquiries/:id/notes |
| server/purchase/company.js:22 | purchaseCompany | POST | /enquiries/:id/messages |
| server/purchase/company.js:23 | purchaseCompany | GET | /quotations |
| server/purchase/company.js:24 | purchaseCompany | GET | /quotations/:id |
| server/purchase/company.js:30 | purchaseCompany | GET | /manual-leads/:id |
| server/purchase/company.js:41 | purchaseCompany | POST | /enquiries/:id/quotations |
| server/purchase/company.js:42 | purchaseCompany | POST | /manual-leads/:id/quotations |
| server/purchase/company.js:43 | purchaseCompany | PUT | /quotations/:id |
| server/purchase/company.js:50 | purchaseCompany | POST | /quotations/:id/actions |
| server/purchase/company.js:70 | purchaseCompany | POST | /quotations/:id/review |
| server/purchase/customer.js:12 | purchaseCustomer | GET | /enquiry-options |
| server/purchase/customer.js:18 | purchaseCustomer | POST | /enquiry-matches |
| server/purchase/customer.js:19 | purchaseCustomer | POST | /enquiries |
| server/purchase/customer.js:35 | purchaseCustomer | GET | /enquiries |
| server/purchase/customer.js:36 | purchaseCustomer | GET | /enquiries/:id |
| server/purchase/customer.js:37 | purchaseCustomer | POST | /enquiries/:id/actions |
| server/purchase/customer.js:43 | purchaseCustomer | POST | /enquiries/:id/messages |
| server/purchase/customer.js:47 | purchaseCustomer | GET | /quotations |
| server/purchase/customer.js:48 | purchaseCustomer | GET | /quotations/:id |
| server/purchase/customer.js:49 | purchaseCustomer | POST | /quotations/:id/actions |
| server/purchase/customer.js:64 | purchaseCustomer | GET | /comparison |
| server/purchase/notifications.js:10 | r | GET | /notifications |
| server/purchase/notifications.js:11 | r | POST | /notifications/:id/read |
| server/sales-tools.js:15 | salesTools | GET | /quotations/templates |
| server/sales-tools.js:16 | salesTools | GET | /quotations/templates/:id |
| server/sales-tools.js:17 | salesTools | POST | /quotations/:id/template |
| server/sales-tools.js:18 | salesTools | POST | /imports/preview |
| server/sales-tools.js:22 | salesTools | POST | /imports/:id/confirm |
| server/sales-tools.js:23 | salesTools | POST | /imports/:id/rollback |
| server/sales-tools.js:25 | salesTools | GET | /records/:kind/:id/print |
| server/service-contracts.js:10 | serviceContracts | GET | /companies/current/service-contracts |
| server/service-contracts.js:11 | serviceContracts | POST | /companies/current/service-contracts |
| server/service-contracts.js:12 | serviceContracts | POST | /companies/current/service-contracts/:id/visit |
| server/service-contracts.js:13 | serviceContracts | POST | /companies/current/service-contracts/:id/update |
| server/service-contracts.js:14 | serviceContracts | GET | /customer/service-contracts |
| server/setup/invitations.js:21 | invitations | POST | /invitations/preview |
| server/setup/invitations.js:39 | invitations | GET | /companies/current/invitations |
| server/setup/invitations.js:43 | invitations | POST | /companies/current/invitations |
| server/setup/invitations.js:70 | invitations | POST | /companies/current/invitations/:id/revoke |
| server/setup/invitations.js:78 | invitations | POST | /invitations/accept |
| server/setup/invitations.js:102 | invitations | POST | /invitations/customer/accept |
| server/setup/routes.js:19 | setup | PATCH | /team/:id/details |
| server/setup/routes.js:31 | setup | GET | /setup |
| server/setup/routes.js:32 | setup | GET | /setup/delivery |
| server/setup/routes.js:33 | setup | GET | /setup/guide |
| server/setup/routes.js:34 | setup | PUT | /setup/decisions |
| server/setup/routes.js:47 | setup | GET | /team |
| server/setup/routes.js:54 | setup | GET | /branding |
| server/setup/routes.js:68 | setup | PUT | /onboarding/profile |
| server/setup/routes.js:77 | setup | PUT | /branding |
| server/setup/routes.js:81 | setup | PUT | /onboarding/business |
| server/setup/routes.js:84 | setup | POST | /onboarding/submit |
| server/setup/routes.js:98 | setup | POST | /onboarding/withdraw |
| server/setup/routes.js:107 | setup | POST | /marketplace-request |
| server/sia/routes.js:23 | router | GET | /options |
| server/sia/routes.js:28 | router | GET | /status |
| server/sia/routes.js:29 | router | GET | /history |
| server/sia/routes.js:30 | router | DELETE | /history |
| server/sia/routes.js:31 | router | POST | /messages |
| server/sia/routes.js:53 | router | POST | /proposals |
| server/sia/routes.js:58 | router | POST | /proposals/:id/decision |
| server/solar-delivery.js:10 | solarDelivery | GET | /companies/current/equipment |
| server/solar-delivery.js:11 | solarDelivery | POST | /companies/current/equipment |
| server/solar-delivery.js:12 | solarDelivery | GET | /customer/equipment |
| server/solar-delivery.js:13 | solarDelivery | GET | /companies/current/projects/:id/surveys |
| server/solar-delivery.js:14 | solarDelivery | POST | /companies/current/projects/:id/surveys |
| server/solar-delivery.js:15 | solarDelivery | GET | /customer/handover/:id |
| server/tenancy/context.js:12 | req | GET | x-company-id |
| server/tenancy/routes.js:24 | companies | POST | / |
| server/tenancy/routes.js:49 | companies | POST | /select |
| server/tenancy/routes.js:59 | companies | GET | /current |
| server/tenancy/routes.js:63 | companies | PATCH | /current |
| server/tenancy/routes.js:78 | companies | GET | /current/members |
| server/tenancy/routes.js:82 | companies | POST | /current/members |
| server/tenancy/routes.js:98 | companies | PATCH | /current/members/:membershipId |
| server/tenancy/routes.js:116 | companies | GET | /current/audit |
| server/tenancy/routes.js:120 | companies | GET | /current/modules/:module |
| server/white-label.js:14 | whiteLabel | POST | /companies/current/white-label-requests |
| server/white-label.js:15 | whiteLabel | GET | /platform/white-label-requests |
| server/white-label.js:16 | whiteLabel | POST | /platform/white-label-requests/:id |
| server/white-label.js:17 | whiteLabel | GET | /companies/current/website |
| server/white-label.js:18 | whiteLabel | POST | /companies/current/website/draft |
| server/white-label.js:19 | whiteLabel | POST | /companies/current/website/publish |
| server/white-label.js:21 | whiteLabel | GET | /companies/current/website/preview |
| server/white-label.js:22 | publishedWebsites | GET | /sites/:id |
| server/white-label.js:23 | whiteLabel | GET | /platform/costs |
| server/white-label.js:24 | whiteLabel | POST | /platform/costs |

### Every literal named form declaration

Conditional IDs and generic operation forms are additionally owned by the endpoint-driven Operations, SIA, Commercial, Automation and ReleaseTools handlers; their schema/permission source is mapped above.

| Component:line | Form ID |
| --- | --- |
| src/account.js:66 | account-login |
| src/account.js:78 | account-register |
| src/account.js:92 | account-company-create |
| src/account.js:109 | account-profile |
| src/account.js:110 | account-member-add |
| src/account.js:116 | account-company-profile |
| src/commercial.js:22 | settings |
| src/commercial.js:26 | plan-new |
| src/commercial.js:26 | plan-version |
| src/commercial.js:26 | plan-state |
| src/commercial.js:29 | assign |
| src/commercial.js:29 | subscription-action |
| src/growth.js:8 | filter |
| src/growth.js:8 | staff |
| src/growth.js:8 | executive |
| src/growth.js:9 | partner |
| src/growth.js:9 | relationship |
| src/growth.js:9 | relationship |
| src/marketplace.js:38 | market-offer |
| src/marketplace.js:42 | market-areas |
| src/marketplace.js:47 | market-product |
| src/marketplace.js:49 | market-category |
| src/marketplace.js:51 | market-review |
| src/mobile-auth.js:52 | account-login |
| src/organization.js:30 | org-profile |
| src/organization.js:32 | org-brand |
| src/organization.js:33 | org-business |
| src/organization.js:41 | org-setup-decisions |
| src/organization.js:47 | org-invite |
| src/organization.js:47 | account-member-add |
| src/organization.js:84 | org-accept-invite |
| src/organization.js:91 | org-review |
| src/organization.js:93 | org-commercial |
| src/purchase.js:20 | purchase-filter |
| src/purchase.js:28 | purchase-enquiry |
| src/purchase.js:31 | purchase-review |
| src/purchase.js:40 | purchase-message |
| src/purchase.js:41 | purchase-note |
| src/purchase.js:45 | purchase-request |
| src/purchase.js:54 | purchase-builder |
| src/release-tools.js:5 | files |
| src/release-tools.js:6 | survey |
| src/release-tools.js:8 | white-label-requests |
| src/release-tools.js:10 | postal-import |
| src/release-tools.js:12 | white-label-review |
| src/release-tools.js:13 | costs |
| src/release-tools.js:14 | contract-visit |
| src/release-tools.js:14 | contract-update |
| src/release-tools.js:14 | service-contracts |
| src/release-tools.js:16 | equipment |
| src/release-tools.js:19 | mail-action |

### Declared persistence / constraints / indexes

This inventories CREATE declarations only, including functions, triggers and indexes; it does not inspect an installed database, count unique live objects, verify ALTER execution or approve a historical checksum. See each listed SQL file and the existing migration manifest for the exact contract.

| Migration source | Object kind | Declared name |
| --- | --- | --- |
| server/db/migrations/001_identity.sql | TABLE | users |
| server/db/migrations/001_identity.sql | TABLE | customer_profiles |
| server/db/migrations/001_identity.sql | TABLE | roles |
| server/db/migrations/001_identity.sql | TABLE | permissions |
| server/db/migrations/001_identity.sql | TABLE | role_permissions |
| server/db/migrations/001_identity.sql | TABLE | companies |
| server/db/migrations/001_identity.sql | TABLE | company_memberships |
| server/db/migrations/001_identity.sql | INDEX | memberships_user_idx |
| server/db/migrations/001_identity.sql | TABLE | platform_admin_grants |
| server/db/migrations/001_identity.sql | TABLE | sessions |
| server/db/migrations/001_identity.sql | INDEX | sessions_user_idx |
| server/db/migrations/001_identity.sql | INDEX | sessions_expiry_idx |
| server/db/migrations/001_identity.sql | TABLE | password_reset_tokens |
| server/db/migrations/001_identity.sql | INDEX | reset_user_idx |
| server/db/migrations/001_identity.sql | TABLE | audit_events |
| server/db/migrations/001_identity.sql | INDEX | audit_company_idx |
| server/db/migrations/001_identity.sql | TABLE | rate_limit_buckets |
| server/db/migrations/003_company_setup.sql | TABLE | company_profiles |
| server/db/migrations/003_company_setup.sql | TABLE | company_branding |
| server/db/migrations/003_company_setup.sql | TABLE | company_business_profiles |
| server/db/migrations/003_company_setup.sql | TABLE | company_onboarding |
| server/db/migrations/003_company_setup.sql | FUNCTION | initialize_company_setup |
| server/db/migrations/003_company_setup.sql | TRIGGER | company_setup_created |
| server/db/migrations/003_company_setup.sql | TABLE | company_invitations |
| server/db/migrations/003_company_setup.sql | UNIQUE INDEX | pending_invitation_email |
| server/db/migrations/003_company_setup.sql | INDEX | invitations_company_idx |
| server/db/migrations/003_company_setup.sql | TABLE | company_reviews |
| server/db/migrations/003_company_setup.sql | INDEX | company_reviews_idx |
| server/db/migrations/003_company_setup.sql | TABLE | platform_settings |
| server/db/migrations/004_marketplace.sql | TABLE | catalogue_categories |
| server/db/migrations/004_marketplace.sql | TABLE | catalogue_products |
| server/db/migrations/004_marketplace.sql | INDEX | products_category_idx |
| server/db/migrations/004_marketplace.sql | INDEX | products_search_idx |
| server/db/migrations/004_marketplace.sql | INDEX | products_brand_idx |
| server/db/migrations/004_marketplace.sql | INDEX | products_name_model_idx |
| server/db/migrations/004_marketplace.sql | TABLE | distributor_offers |
| server/db/migrations/004_marketplace.sql | INDEX | offers_company_product_idx |
| server/db/migrations/004_marketplace.sql | INDEX | offers_public_idx |
| server/db/migrations/004_marketplace.sql | INDEX | offers_review_idx |
| server/db/migrations/004_marketplace.sql | TABLE | offer_reviews |
| server/db/migrations/004_marketplace.sql | INDEX | offer_reviews_tenant_idx |
| server/db/migrations/004_marketplace.sql | TABLE | company_service_areas |
| server/db/migrations/004_marketplace.sql | FUNCTION | synchronize_legacy_service_areas |
| server/db/migrations/004_marketplace.sql | TRIGGER | legacy_service_area_sync |
| server/db/migrations/004_marketplace.sql | INDEX | areas_company_idx |
| server/db/migrations/004_marketplace.sql | INDEX | areas_state_district_idx |
| server/db/migrations/004_marketplace.sql | INDEX | areas_pin_idx |
| server/db/migrations/004_marketplace.sql | INDEX | areas_locality_idx |
| server/db/migrations/004_marketplace.sql | INDEX | companies_public_idx |
| server/db/migrations/004_marketplace.sql | VIEW | marketplace_vendors |
| server/db/migrations/004_marketplace.sql | VIEW | marketplace_products |
| server/db/migrations/004_marketplace.sql | VIEW | marketplace_offers |
| server/db/migrations/005_enquiries_quotations.sql | TABLE | customer_enquiries |
| server/db/migrations/005_enquiries_quotations.sql | TABLE | enquiry_recipients |
| server/db/migrations/005_enquiries_quotations.sql | TABLE | enquiry_quotations |
| server/db/migrations/005_enquiries_quotations.sql | TABLE | quotation_versions |
| server/db/migrations/005_enquiries_quotations.sql | UNIQUE INDEX | quotation_one_draft_idx |
| server/db/migrations/005_enquiries_quotations.sql | TABLE | quotation_line_items |
| server/db/migrations/005_enquiries_quotations.sql | TABLE | enquiry_messages |
| server/db/migrations/005_enquiries_quotations.sql | TABLE | enquiry_internal_notes |
| server/db/migrations/005_enquiries_quotations.sql | TABLE | enquiry_events |
| server/db/migrations/005_enquiries_quotations.sql | TABLE | workflow_notifications |
| server/db/migrations/005_enquiries_quotations.sql | INDEX | enquiries_customer_idx |
| server/db/migrations/005_enquiries_quotations.sql | INDEX | enquiry_filter_idx |
| server/db/migrations/005_enquiries_quotations.sql | INDEX | recipients_company_idx |
| server/db/migrations/005_enquiries_quotations.sql | INDEX | quotations_company_idx |
| server/db/migrations/005_enquiries_quotations.sql | INDEX | quotation_expiry_idx |
| server/db/migrations/005_enquiries_quotations.sql | INDEX | quotation_enquiry_idx |
| server/db/migrations/005_enquiries_quotations.sql | INDEX | quotation_company_status_idx |
| server/db/migrations/005_enquiries_quotations.sql | INDEX | enquiry_timeline_idx |
| server/db/migrations/005_enquiries_quotations.sql | INDEX | enquiry_messages_idx |
| server/db/migrations/005_enquiries_quotations.sql | INDEX | enquiry_notes_idx |
| server/db/migrations/005_enquiries_quotations.sql | INDEX | workflow_notifications_user_idx |
| server/db/migrations/006_operations.sql | TABLE | company_contacts |
| server/db/migrations/006_operations.sql | UNIQUE INDEX | contact_user_unique |
| server/db/migrations/006_operations.sql | UNIQUE INDEX | contact_email_unique |
| server/db/migrations/006_operations.sql | UNIQUE INDEX | contact_phone_unique |
| server/db/migrations/006_operations.sql | TABLE | crm_leads |
| server/db/migrations/006_operations.sql | TABLE | business_orders |
| server/db/migrations/006_operations.sql | TABLE | business_order_items |
| server/db/migrations/006_operations.sql | TABLE | inventory_items |
| server/db/migrations/006_operations.sql | TABLE | inventory_reservations |
| server/db/migrations/006_operations.sql | TABLE | inventory_movements |
| server/db/migrations/006_operations.sql | TABLE | suppliers |
| server/db/migrations/006_operations.sql | TABLE | purchase_orders |
| server/db/migrations/006_operations.sql | TABLE | purchase_order_items |
| server/db/migrations/006_operations.sql | TABLE | installation_projects |
| server/db/migrations/006_operations.sql | TABLE | project_assignments |
| server/db/migrations/006_operations.sql | TABLE | project_milestones |
| server/db/migrations/006_operations.sql | TABLE | service_requests |
| server/db/migrations/006_operations.sql | TABLE | business_tasks |
| server/db/migrations/006_operations.sql | TABLE | customer_invoices |
| server/db/migrations/006_operations.sql | TABLE | customer_collections |
| server/db/migrations/006_operations.sql | UNIQUE INDEX | collection_reference_unique |
| server/db/migrations/006_operations.sql | TABLE | supplier_bills |
| server/db/migrations/006_operations.sql | TABLE | operations_events |
| server/db/migrations/006_operations.sql | TABLE | operations_documents |
| server/db/migrations/006_operations.sql | TABLE | operations_notifications |
| server/db/migrations/006_operations.sql | TABLE | operations_idempotency |
| server/db/migrations/006_operations.sql | INDEX | crm_company_stage |
| server/db/migrations/006_operations.sql | INDEX | contacts_company_name |
| server/db/migrations/006_operations.sql | INDEX | orders_company_status |
| server/db/migrations/006_operations.sql | INDEX | orders_company_contact |
| server/db/migrations/006_operations.sql | INDEX | leads_company_contact |
| server/db/migrations/006_operations.sql | INDEX | projects_company_contact |
| server/db/migrations/006_operations.sql | INDEX | invoices_company_contact |
| server/db/migrations/006_operations.sql | INDEX | service_company_contact |
| server/db/migrations/006_operations.sql | INDEX | stock_company_item |
| server/db/migrations/006_operations.sql | INDEX | reservations_order |
| server/db/migrations/006_operations.sql | INDEX | purchase_company_status |
| server/db/migrations/006_operations.sql | INDEX | projects_company_status |
| server/db/migrations/006_operations.sql | INDEX | assignments_employee |
| server/db/migrations/006_operations.sql | INDEX | tasks_employee_due |
| server/db/migrations/006_operations.sql | INDEX | service_employee |
| server/db/migrations/006_operations.sql | INDEX | invoices_due |
| server/db/migrations/006_operations.sql | INDEX | collections_invoice |
| server/db/migrations/006_operations.sql | INDEX | payable_due |
| server/db/migrations/006_operations.sql | INDEX | operations_timeline |
| server/db/migrations/006_operations.sql | INDEX | operations_documents_record |
| server/db/migrations/006_operations.sql | INDEX | operations_notification_user |
| server/db/migrations/007_sia.sql | TABLE | sia_requests |
| server/db/migrations/007_sia.sql | INDEX | sia_history_scope |
| server/db/migrations/007_sia.sql | TABLE | sia_usage |
| server/db/migrations/007_sia.sql | TABLE | sia_events |
| server/db/migrations/007_sia.sql | INDEX | sia_events_scope |
| server/db/migrations/007_sia.sql | TABLE | sia_proposals |
| server/db/migrations/007_sia.sql | INDEX | sia_proposal_owner |
| server/db/migrations/008_commercial.sql | FUNCTION | commercial_rules_valid |
| server/db/migrations/008_commercial.sql | TABLE | commercial_settings_versions |
| server/db/migrations/008_commercial.sql | TABLE | commercial_control |
| server/db/migrations/008_commercial.sql | TABLE | commercial_plans |
| server/db/migrations/008_commercial.sql | TABLE | commercial_plan_versions |
| server/db/migrations/008_commercial.sql | TABLE | company_subscriptions |
| server/db/migrations/008_commercial.sql | TABLE | company_commercial_state |
| server/db/migrations/008_commercial.sql | TABLE | commercial_subscription_events |
| server/db/migrations/008_commercial.sql | TABLE | commercial_usage |
| server/db/migrations/008_commercial.sql | INDEX | subscriptions_company_time |
| server/db/migrations/008_commercial.sql | INDEX | commercial_events_company |
| server/db/migrations/008_commercial.sql | INDEX | commercial_settings_effective |
| server/db/migrations/008_commercial.sql | FUNCTION | commercial_immutable |
| server/db/migrations/008_commercial.sql | TRIGGER | settings_immutable |
| server/db/migrations/008_commercial.sql | TRIGGER | plans_terms_immutable |
| server/db/migrations/008_commercial.sql | TRIGGER | subscription_events_immutable |
| server/db/migrations/008_commercial.sql | FUNCTION | commercial_snapshot_immutable |
| server/db/migrations/008_commercial.sql | TRIGGER | subscription_snapshot_immutable |
| server/db/migrations/008_commercial.sql | TRIGGER | subscriptions_no_delete |
| server/db/migrations/008_commercial.sql | FUNCTION | commercial_policy |
| server/db/migrations/008_commercial.sql | FUNCTION | commercial_public_allowed |
| server/db/migrations/008_commercial.sql | VIEW | marketplace_vendors |
| server/db/migrations/008_commercial.sql | VIEW | marketplace_offers |
| server/db/migrations/009_shared_invitations.sql | TABLE | customer_access_invitations |
| server/db/migrations/009_shared_invitations.sql | UNIQUE INDEX | customer_access_pending |
| server/db/migrations/009_shared_invitations.sql | INDEX | customer_access_company |
| server/db/migrations/010_domain_registry.sql | TABLE | company_domains |
| server/db/migrations/010_domain_registry.sql | UNIQUE INDEX | domain_hostname_claim |
| server/db/migrations/010_domain_registry.sql | UNIQUE INDEX | domain_primary_company |
| server/db/migrations/010_domain_registry.sql | INDEX | domain_company_directory |
| server/db/migrations/010_domain_registry.sql | INDEX | domain_platform_directory |
| server/db/migrations/010_domain_registry.sql | INDEX | domain_provider_reconcile |
| server/db/migrations/010_domain_registry.sql | INDEX | domain_removed_cleanup |
| server/db/migrations/010_domain_registry.sql | FUNCTION | domain_assignment_immutable |
| server/db/migrations/010_domain_registry.sql | TRIGGER | domain_assignment_guard |
| server/db/migrations/010_domain_registry.sql | TABLE | domain_operations |
| server/db/migrations/010_domain_registry.sql | INDEX | domain_operation_queue |
| server/db/migrations/010_domain_registry.sql | INDEX | domain_operation_history |
| server/db/migrations/011_pro_network.sql | INDEX | memberships_territory |
| server/db/migrations/011_pro_network.sql | TABLE | company_partner_relationships |
| server/db/migrations/011_pro_network.sql | UNIQUE INDEX | partner_pending_email |
| server/db/migrations/011_pro_network.sql | UNIQUE INDEX | partner_accepted_pair |
| server/db/migrations/011_pro_network.sql | INDEX | partners_owner |
| server/db/migrations/011_pro_network.sql | INDEX | partners_recipient |
| server/db/migrations/012_automation.sql | TABLE | reminder_preferences |
| server/db/migrations/012_automation.sql | TABLE | automation_rules |
| server/db/migrations/012_automation.sql | TABLE | automation_jobs |
| server/db/migrations/012_automation.sql | INDEX | automation_ready |
| server/db/migrations/012_automation.sql | INDEX | automation_abandoned |
| server/db/migrations/012_automation.sql | INDEX | automation_company_history |
| server/db/migrations/012_automation.sql | INDEX | automation_rules_scan |
| server/db/migrations/012_automation.sql | TABLE | automation_deliveries |
| server/db/migrations/012_automation.sql | TABLE | automation_attempts |
| server/db/migrations/012_automation.sql | INDEX | automation_attempt_job |
| server/db/migrations/012_automation.sql | TABLE | automation_worker_state |
| server/db/migrations/013_release_accounts.sql | TABLE | account_security |
| server/db/migrations/013_release_accounts.sql | TABLE | email_verifications |
| server/db/migrations/013_release_accounts.sql | INDEX | email_verification_user |
| server/db/migrations/013_release_accounts.sql | TABLE | mail_jobs |
| server/db/migrations/013_release_accounts.sql | INDEX | mail_jobs_due |
| server/db/migrations/013_release_accounts.sql | INDEX | mail_jobs_company |
| server/db/migrations/013_release_accounts.sql | TABLE | mail_attempts |
| server/db/migrations/013_release_accounts.sql | TABLE | process_heartbeats |
| server/db/migrations/014_operations_health.sql | TABLE | operational_events |
| server/db/migrations/014_operations_health.sql | INDEX | operational_events_time |
| server/db/migrations/014_operations_health.sql | TABLE | operational_incidents |
| server/db/migrations/015_public_discovery.sql | TABLE | postal_locations |
| server/db/migrations/015_public_discovery.sql | INDEX | postal_region |
| server/db/migrations/016_sales_tools.sql | TABLE | quotation_templates |
| server/db/migrations/016_sales_tools.sql | TABLE | import_batches |
| server/db/migrations/016_sales_tools.sql | INDEX | import_company |
| server/db/migrations/017_documents_delivery.sql | TABLE | managed_files |
| server/db/migrations/017_documents_delivery.sql | INDEX | managed_files_record |
| server/db/migrations/017_documents_delivery.sql | TABLE | site_surveys |
| server/db/migrations/017_documents_delivery.sql | TABLE | equipment_assets |
| server/db/migrations/017_documents_delivery.sql | INDEX | assets_order |
| server/db/migrations/018_service_communications.sql | UNIQUE INDEX | mail_reminder_identity |
| server/db/migrations/018_service_communications.sql | TABLE | service_contracts |
| server/db/migrations/018_service_communications.sql | TABLE | contract_visits |
| server/db/migrations/019_white_label_commercial.sql | TABLE | white_label_requests |
| server/db/migrations/019_white_label_commercial.sql | TABLE | website_versions |
| server/db/migrations/019_white_label_commercial.sql | TABLE | company_websites |
| server/db/migrations/019_white_label_commercial.sql | TABLE | platform_cost_entries |
| server/db/migrations/020_release_indexes.sql | INDEX | survey_project_history |
| server/db/migrations/020_release_indexes.sql | INDEX | service_contract_due |
| server/db/migrations/020_release_indexes.sql | INDEX | service_contract_expiry |
| server/db/migrations/020_release_indexes.sql | INDEX | private_quotation_templates |
| server/db/migrations/020_release_indexes.sql | INDEX | import_batch_owner |
| server/db/migrations/020_release_indexes.sql | INDEX | mail_job_expiry |
| server/db/migrations/020_release_indexes.sql | INDEX | operational_events_recent |
| server/db/migrations/020_release_indexes.sql | INDEX | white_label_review |
| server/db/migrations/020_release_indexes.sql | FUNCTION | preserve_website_version |
| server/db/migrations/020_release_indexes.sql | TRIGGER | website_version_immutable |
| server/db/migrations/021_mobile_pin.sql | TABLE | mobile_credentials |
| server/db/migrations/021_mobile_pin.sql | TABLE | pin_challenges |
| server/db/migrations/021_mobile_pin.sql | INDEX | pin_challenges_email_purpose |
| server/db/migrations/021_mobile_pin.sql | INDEX | pin_challenges_expiry |
| server/db/migrations/022_marketplace_discovery.sql | INDEX | categories_discovery_idx |
| server/db/migrations/023_people_sales_controls.sql | TABLE | company_role_profiles |
| server/db/migrations/023_people_sales_controls.sql | TABLE | company_teams |
| server/db/migrations/023_people_sales_controls.sql | FUNCTION | membership_people_revision |
| server/db/migrations/023_people_sales_controls.sql | TRIGGER | membership_people_revision |
| server/db/migrations/023_people_sales_controls.sql | TABLE | company_sales_controls |
| server/db/migrations/023_people_sales_controls.sql | FUNCTION | initialize_sales_controls |
| server/db/migrations/023_people_sales_controls.sql | TRIGGER | initialize_sales_controls |
| server/db/migrations/023_people_sales_controls.sql | TABLE | quotation_review_events |
| server/db/migrations/023_people_sales_controls.sql | FUNCTION | preserve_quote_review |
| server/db/migrations/023_people_sales_controls.sql | TRIGGER | preserve_quote_review |
| server/db/migrations/023_people_sales_controls.sql | INDEX | company_role_assignment |
| server/db/migrations/023_people_sales_controls.sql | INDEX | company_team_assignment |
| server/db/migrations/023_people_sales_controls.sql | INDEX | lead_pipeline_step |
| server/db/migrations/023_people_sales_controls.sql | INDEX | quote_review_pending |
| server/db/migrations/023_people_sales_controls.sql | INDEX | quote_review_history |
| server/db/migrations/024_project_coordination.sql | TABLE | task_dependencies |
| server/db/migrations/024_project_coordination.sql | TABLE | task_checklist |
| server/db/migrations/024_project_coordination.sql | INDEX | task_dependency_reverse |
| server/db/migrations/024_project_coordination.sql | INDEX | task_checklist_record |
| server/db/migrations/024_project_coordination.sql | INDEX | project_open_tasks |
| server/db/migrations/024_project_coordination.sql | INDEX | stage_employee_work |
| server/db/migrations/025_operational_finance.sql | INDEX | invoices_order |
| server/db/migrations/025_operational_finance.sql | TABLE | order_advances |
| server/db/migrations/025_operational_finance.sql | TABLE | invoice_credit_notes |
| server/db/migrations/025_operational_finance.sql | TABLE | customer_refunds |
| server/db/migrations/025_operational_finance.sql | TABLE | project_expenses |
| server/db/migrations/025_operational_finance.sql | TABLE | supplier_payments |
| server/db/migrations/025_operational_finance.sql | TABLE | project_cost_reviews |
| server/db/migrations/025_operational_finance.sql | VIEW | invoice_financial_balances |
| server/db/migrations/025_operational_finance.sql | VIEW | advance_financial_balances |
| server/db/migrations/025_operational_finance.sql | VIEW | supplier_bill_balances |
| server/db/migrations/025_operational_finance.sql | INDEX | advance_order |
| server/db/migrations/025_operational_finance.sql | INDEX | credit_invoice |
| server/db/migrations/025_operational_finance.sql | INDEX | refund_invoice |
| server/db/migrations/025_operational_finance.sql | INDEX | refund_advance |
| server/db/migrations/025_operational_finance.sql | INDEX | collection_advance |
| server/db/migrations/025_operational_finance.sql | INDEX | expense_project |
| server/db/migrations/025_operational_finance.sql | INDEX | payment_bill |
| server/db/migrations/025_operational_finance.sql | INDEX | bill_project |
| server/db/migrations/025_operational_finance.sql | UNIQUE INDEX | advance_reference_unique |
| server/db/migrations/025_operational_finance.sql | UNIQUE INDEX | refund_reference_unique |
| server/db/migrations/025_operational_finance.sql | UNIQUE INDEX | expense_reference_unique |
| server/db/migrations/025_operational_finance.sql | UNIQUE INDEX | supplier_payment_reference_unique |
| server/db/migrations/025_operational_finance.sql | FUNCTION | preserve_financial_entry |
| server/db/migrations/025_operational_finance.sql | TRIGGER | preserve_advance |
| server/db/migrations/025_operational_finance.sql | TRIGGER | preserve_collection |
| server/db/migrations/025_operational_finance.sql | TRIGGER | preserve_credit |
| server/db/migrations/025_operational_finance.sql | TRIGGER | preserve_refund |
| server/db/migrations/025_operational_finance.sql | TRIGGER | preserve_expense |
| server/db/migrations/025_operational_finance.sql | TRIGGER | preserve_supplier_payment |
| server/db/migrations/025_operational_finance.sql | FUNCTION | validate_financial_correction |
| server/db/migrations/025_operational_finance.sql | TRIGGER | validate_advance |
| server/db/migrations/025_operational_finance.sql | TRIGGER | validate_collection |
| server/db/migrations/025_operational_finance.sql | TRIGGER | validate_credit |
| server/db/migrations/025_operational_finance.sql | TRIGGER | validate_refund |
| server/db/migrations/025_operational_finance.sql | TRIGGER | validate_expense |
| server/db/migrations/025_operational_finance.sql | TRIGGER | validate_supplier_payment |
| server/db/migrations/025_operational_finance.sql | FUNCTION | preserve_bill_terms |
| server/db/migrations/025_operational_finance.sql | TRIGGER | preserve_bill |
| server/db/migrations/025_operational_finance.sql | FUNCTION | preserve_issued_invoice_terms |
| server/db/migrations/025_operational_finance.sql | TRIGGER | preserve_invoice |
| server/db/migrations/025_operational_finance.sql | TABLE | financial_cash_references |
| server/db/migrations/025_operational_finance.sql | FUNCTION | claim_financial_cash_reference |
| server/db/migrations/025_operational_finance.sql | TRIGGER | claim_collection_reference |
| server/db/migrations/025_operational_finance.sql | TRIGGER | claim_advance_reference |
| server/db/migrations/025_operational_finance.sql | TRIGGER | claim_refund_reference |
| server/db/migrations/025_operational_finance.sql | TRIGGER | claim_supplier_payment_reference |
| server/db/migrations/026_installation_materials.sql | TABLE | stock_locations |
| server/db/migrations/026_installation_materials.sql | FUNCTION | resolve_stock_location |
| server/db/migrations/026_installation_materials.sql | TRIGGER | stock_location_identity |
| server/db/migrations/026_installation_materials.sql | TABLE | project_installation_controls |
| server/db/migrations/026_installation_materials.sql | TABLE | installation_checks |
| server/db/migrations/026_installation_materials.sql | FUNCTION | initialize_installation_controls |
| server/db/migrations/026_installation_materials.sql | TRIGGER | installation_controls_new |
| server/db/migrations/026_installation_materials.sql | TABLE | project_materials |
| server/db/migrations/026_installation_materials.sql | TABLE | inventory_cost_lots |
| server/db/migrations/026_installation_materials.sql | TABLE | stock_issue_allocations |
| server/db/migrations/026_installation_materials.sql | TABLE | stock_return_allocations |
| server/db/migrations/026_installation_materials.sql | TABLE | utility_progress |
| server/db/migrations/026_installation_materials.sql | INDEX | material_project |
| server/db/migrations/026_installation_materials.sql | INDEX | lots_fifo |
| server/db/migrations/026_installation_materials.sql | INDEX | allocation_movement |
| server/db/migrations/026_installation_materials.sql | INDEX | return_allocation |
| server/db/migrations/026_installation_materials.sql | INDEX | movement_project |
| server/db/migrations/026_installation_materials.sql | INDEX | checks_project |
| server/db/migrations/026_installation_materials.sql | TRIGGER | preserve_stock_movement |
| server/db/migrations/026_installation_materials.sql | TRIGGER | preserve_stock_issue |
| server/db/migrations/026_installation_materials.sql | TRIGGER | preserve_stock_return |
| server/db/migrations/026_installation_materials.sql | FUNCTION | preserve_bill_terms |
| server/db/migrations/026_installation_materials.sql | TRIGGER | preserve_survey |
| server/db/migrations/026_installation_materials.sql | INDEX | lot_sequence |
| server/db/migrations/026_installation_materials.sql | VIEW | project_stock_movements |
| server/db/migrations/027_financing_subsidy.sql | TABLE | funding_applications |
| server/db/migrations/027_financing_subsidy.sql | UNIQUE INDEX | funding_external_identity |
| server/db/migrations/027_financing_subsidy.sql | INDEX | funding_customer |
| server/db/migrations/027_financing_subsidy.sql | INDEX | funding_project |
| server/db/migrations/027_financing_subsidy.sql | INDEX | funding_follow_up |
| server/db/migrations/027_financing_subsidy.sql | TABLE | funding_disbursements |
| server/db/migrations/027_financing_subsidy.sql | INDEX | funding_disbursement_application |
| server/db/migrations/027_financing_subsidy.sql | FUNCTION | funding_disbursement_guard |
| server/db/migrations/027_financing_subsidy.sql | TRIGGER | funding_disbursement_bounds |
| server/db/migrations/027_financing_subsidy.sql | TRIGGER | funding_disbursement_history |
| server/db/migrations/027_financing_subsidy.sql | FUNCTION | preserve_funding_identity |
| server/db/migrations/027_financing_subsidy.sql | TRIGGER | funding_identity |
| server/db/migrations/028_after_sales_retention.sql | TABLE | service_resolutions |
| server/db/migrations/028_after_sales_retention.sql | TABLE | service_feedback |
| server/db/migrations/028_after_sales_retention.sql | TABLE | service_retention_records |
| server/db/migrations/028_after_sales_retention.sql | INDEX | service_retention_history |
| server/db/migrations/028_after_sales_retention.sql | INDEX | service_confirmation_work |
| server/db/migrations/028_after_sales_retention.sql | INDEX | service_escalations |
| server/db/migrations/028_after_sales_retention.sql | FUNCTION | preserve_service_history |
| server/db/migrations/028_after_sales_retention.sql | TRIGGER | service_resolution_history |
| server/db/migrations/028_after_sales_retention.sql | TRIGGER | service_feedback_history |
| server/db/migrations/028_after_sales_retention.sql | TRIGGER | service_retention_history |
| server/db/migrations/028_after_sales_retention.sql | FUNCTION | service_feedback_relationship |
| server/db/migrations/028_after_sales_retention.sql | TRIGGER | service_feedback_scope |
| server/db/migrations/028_after_sales_retention.sql | FUNCTION | service_equipment_scope |
| server/db/migrations/028_after_sales_retention.sql | TRIGGER | service_equipment_relationship |
| server/db/migrations/029_management_automation.sql | INDEX | tasks_due_reminders |
| server/db/migrations/029_management_automation.sql | INDEX | stage_due_reminders |
| server/db/migrations/029_management_automation.sql | INDEX | procurement_due_reminders |
| server/db/migrations/029_management_automation.sql | INDEX | expenses_reporting |
| server/db/migrations/030_separate_account_channels.sql | UNIQUE INDEX | users_email_account_type |
| server/db/migrations/030_separate_account_channels.sql | FUNCTION | preserve_account_type |
| server/db/migrations/030_separate_account_channels.sql | TRIGGER | account_type_immutable |
| server/db/migrations/030_separate_account_channels.sql | FUNCTION | business_membership_identity |
| server/db/migrations/030_separate_account_channels.sql | TRIGGER | business_membership_account |
| server/db/migrations/030_separate_account_channels.sql | INDEX | pin_challenge_identity |
| server/db/migrations/031_password_reset_codes.sql | TABLE | password_reset_challenges |
| server/db/migrations/031_password_reset_codes.sql | INDEX | password_reset_challenge_user |
| server/db/migrations/031_password_reset_codes.sql | INDEX | password_reset_challenge_expiry |
| server/db/migrations/032_verified_unique_email_signup.sql | UNIQUE INDEX | users_email_global_ci |
| server/db/migrations/032_verified_unique_email_signup.sql | TABLE | registration_challenges |
| server/db/migrations/032_verified_unique_email_signup.sql | INDEX | registration_challenge_identity |
| server/db/migrations/032_verified_unique_email_signup.sql | INDEX | registration_challenge_expiry |
| server/db/migrations/034_quotation_sources.sql | INDEX | quotation_source_lead_idx |
| server/db/migrations/034_quotation_sources.sql | INDEX | quotation_line_offer_idx |
| server/db/migrations/036_practical_setup.sql | TABLE | company_setup_choices |
| server/db/migrations/037_manual_sales.sql | UNIQUE INDEX | manual_quotation_lead |
| server/db/migrations/038_order_fulfilment.sql | TABLE | order_fulfilment_entries |
| server/db/migrations/038_order_fulfilment.sql | INDEX | fulfilment_order |
| server/db/migrations/040_growth_attribution.sql | TABLE | lead_growth_records |

### Complete server and UI file inventory

All paths were enumerated for route/form/placeholder/guard/service review. This list is a scope inventory, not a claim that every conditional branch or runtime integration is verified. Scripts, tests and handoffs cited in the matrix supplement this inventory.

- `server/admin.js`
- `server/auth/account-type.js`
- `server/auth/email-registration.js`
- `server/auth/password-reset.js`
- `server/auth/pin-routes.js`
- `server/auth/pin-security.js`
- `server/auth/protection.js`
- `server/auth/registration.js`
- `server/auth/routes.js`
- `server/auth/sealed.js`
- `server/auth/security.js`
- `server/auth/sessions.js`
- `server/auth/totp.js`
- `server/automation/catalogue.js`
- `server/automation/engine.js`
- `server/automation/quotation-scope.js`
- `server/automation/routes.js`
- `server/automation/worker.js`
- `server/commercial/growth.js`
- `server/commercial/payments.js`
- `server/commercial/policy.js`
- `server/commercial/routes.js`
- `server/commercial/validation.js`
- `server/communications-boundary.js`
- `server/config.js`
- `server/customer/experience.js`
- `server/customer/home.js`
- `server/customer/record-export.js`
- `server/customer/records.js`
- `server/customer/routes.js`
- `server/db/cleanup.js`
- `server/db/migrate.js`
- `server/db/migrations/001_identity.sql`
- `server/db/migrations/003_company_setup.sql`
- `server/db/migrations/004_marketplace.sql`
- `server/db/migrations/005_enquiries_quotations.sql`
- `server/db/migrations/006_operations.sql`
- `server/db/migrations/007_sia.sql`
- `server/db/migrations/008_commercial.sql`
- `server/db/migrations/009_shared_invitations.sql`
- `server/db/migrations/010_domain_registry.sql`
- `server/db/migrations/011_pro_network.sql`
- `server/db/migrations/012_automation.sql`
- `server/db/migrations/013_release_accounts.sql`
- `server/db/migrations/014_operations_health.sql`
- `server/db/migrations/015_public_discovery.sql`
- `server/db/migrations/016_sales_tools.sql`
- `server/db/migrations/017_documents_delivery.sql`
- `server/db/migrations/018_service_communications.sql`
- `server/db/migrations/019_white_label_commercial.sql`
- `server/db/migrations/020_release_indexes.sql`
- `server/db/migrations/021_mobile_pin.sql`
- `server/db/migrations/022_marketplace_discovery.sql`
- `server/db/migrations/023_people_sales_controls.sql`
- `server/db/migrations/024_project_coordination.sql`
- `server/db/migrations/025_operational_finance.sql`
- `server/db/migrations/026_installation_materials.sql`
- `server/db/migrations/027_financing_subsidy.sql`
- `server/db/migrations/028_after_sales_retention.sql`
- `server/db/migrations/029_management_automation.sql`
- `server/db/migrations/030_separate_account_channels.sql`
- `server/db/migrations/031_password_reset_codes.sql`
- `server/db/migrations/032_verified_unique_email_signup.sql`
- `server/db/migrations/033_solar_os_workforce.sql`
- `server/db/migrations/034_quotation_sources.sql`
- `server/db/migrations/035_business_presets.sql`
- `server/db/migrations/036_practical_setup.sql`
- `server/db/migrations/037_manual_sales.sql`
- `server/db/migrations/038_order_fulfilment.sql`
- `server/db/migrations/039_credit_controls.sql`
- `server/db/migrations/040_growth_attribution.sql`
- `server/db/migrations.js`
- `server/db/pool.js`
- `server/documents.js`
- `server/domains/hostname.js`
- `server/domains/proof.js`
- `server/domains/provider.js`
- `server/domains/resolution.js`
- `server/domains/routes.js`
- `server/domains/service.js`
- `server/errors.js`
- `server/html.js`
- `server/index.js`
- `server/mail-config.js`
- `server/mail-queue.js`
- `server/mail-worker.js`
- `server/mail.js`
- `server/marketplace/admin.js`
- `server/marketplace/company.js`
- `server/marketplace/presentation.js`
- `server/marketplace/public.js`
- `server/marketplace/service.js`
- `server/marketplace/validation.js`
- `server/monitor-probes.js`
- `server/monitor-worker.js`
- `server/operations/boss-summary.js`
- `server/operations/core.js`
- `server/operations/credit.js`
- `server/operations/crm.js`
- `server/operations/customer-360.js`
- `server/operations/customer-invitations.js`
- `server/operations/customer.js`
- `server/operations/delivery.js`
- `server/operations/finance-export.js`
- `server/operations/finance-ledger.js`
- `server/operations/finance-posting.js`
- `server/operations/finance.js`
- `server/operations/fulfilment.js`
- `server/operations/funding.js`
- `server/operations/growth.js`
- `server/operations/installation.js`
- `server/operations/material-ledger.js`
- `server/operations/materials.js`
- `server/operations/notifications.js`
- `server/operations/orders.js`
- `server/operations/project-coordination.js`
- `server/operations/read.js`
- `server/operations/reporting.js`
- `server/operations/retention.js`
- `server/operations/stock.js`
- `server/operations/work-handoffs.js`
- `server/operations-health.js`
- `server/partners/routes.js`
- `server/people-sales.js`
- `server/permissions.js`
- `server/platform/routes.js`
- `server/postal.js`
- `server/print-record.js`
- `server/public-pages.js`
- `server/purchase/active.js`
- `server/purchase/assistance.js`
- `server/purchase/company.js`
- `server/purchase/customer.js`
- `server/purchase/money.js`
- `server/purchase/notification-scope.js`
- `server/purchase/notifications.js`
- `server/purchase/review.js`
- `server/purchase/service.js`
- `server/purchase/sources.js`
- `server/purchase/validation.js`
- `server/sales-tools.js`
- `server/service-contracts.js`
- `server/setup/delivery.js`
- `server/setup/guide.js`
- `server/setup/invitation-delivery.js`
- `server/setup/invitations.js`
- `server/setup/location.js`
- `server/setup/presets.js`
- `server/setup/routes.js`
- `server/setup/service.js`
- `server/setup/staff.js`
- `server/setup/validation.js`
- `server/sia/config.js`
- `server/sia/provider.js`
- `server/sia/routes.js`
- `server/sia/tools.js`
- `server/solar-delivery.js`
- `server/support.js`
- `server/tenancy/company-creation.js`
- `server/tenancy/context.js`
- `server/tenancy/routes.js`
- `server/validation.js`
- `server/white-label.js`
- `server/workforce-templates.js`
- `src/account-security.js`
- `src/account.js`
- `src/app.js`
- `src/automation.js`
- `src/boss-dashboard.js`
- `src/commercial.js`
- `src/company-location.js`
- `src/customer-dashboard.js`
- `src/customer-locale.js`
- `src/experience.js`
- `src/growth.js`
- `src/india-geography.js`
- `src/journey.js`
- `src/landing.js`
- `src/locale.js`
- `src/marketplace.js`
- `src/mobile-auth.js`
- `src/onboarding.js`
- `src/operations.js`
- `src/organization.js`
- `src/print-record.js`
- `src/private-download.js`
- `src/public-header.js`
- `src/purchase.js`
- `src/pwa.js`
- `src/release-tools.js`
- `src/sia.js`
- `src/solar-discovery.js`
- `src/solar-marketplace.js`
- `src/workspace.js`

