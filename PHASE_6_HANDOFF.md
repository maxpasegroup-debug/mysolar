# Phase 6 — Distributor operating system

Phase 6 implements persisted business operations in the existing MY SOLAR application. Phase 7 has not begun. This is an implementation handoff, not a verification or deployment-readiness claim.

## 1. Architecture reused

The dependency-free frontend, hash router, reusable account/resource/form services, responsive marketplace/workspace visual system, Express 5 and PostgreSQL remain. No dependencies, external APIs, payment providers or background infrastructure were added. Operations reuse server-derived company context, active membership/role grants, CSRF, HttpOnly sessions, transaction/audit helpers, actual catalogue references, enquiry recipients, customer users, immutable quotation versions and Phase 5 integer monetary calculations.

The new `server/operations/` repositories separate authorization, relationship checks, stock rules, commercial acceptance, delivery and financial records. All company operations enter the existing `withCompany` transaction and require an active company. Company locking serializes mutations, with additional record/stock/receipt locks and revision counters. Frontend controls are convenience controls; repositories enforce permissions and transitions.

## 2. Files

Created:

- `server/db/migrations/006_operations.sql`
- `server/operations/core.js`: tenant context, permissions, assignment scopes, validation, idempotency, stock invariants, activity and notifications.
- `server/operations/crm.js`: company contacts, safe registered-customer linkage, leads and follow-up transitions.
- `server/operations/orders.js`: quoted/manual commercial snapshots, explicit customer agreement, distributor acceptance, fulfilment and cancellation.
- `server/operations/stock.js`: maintained stock, adjustments, reservations, suppliers, purchase approvals and transactional partial receipts.
- `server/operations/delivery.js`: projects, teams, milestones, tasks and service desk.
- `server/operations/finance.js`: operational invoices, payable records, collections and append-only collection reversals.
- `server/operations/read.js`: paginated operational lists/details, role-scoped dashboard, record pickers, document metadata and private notes.
- `server/operations/customer.js`: customer-owned orders/projects/invoices/service, explicit order confirmation and service reporting.
- `server/operations/notifications.js`: combined Phase 5 and Phase 6 in-app feeds.
- `src/operations.js`, `operations.css`, `PHASE_6_HANDOFF.md`.

Modified: `server/index.js`, `server/db/pool.js`, `index.html`, `src/account.js`, `src/app.js`, `src/purchase.js`, `README.md`. Environment configuration and dependencies are unchanged. Earlier migrations and the immutable Phase 2 role-catalogue snapshot are unchanged.

## 3. Migration and tables

Migration 006 adds 22 tables:

| Area | Tables |
| --- | --- |
| CRM | `company_contacts`, `crm_leads` |
| Commercial orders | `business_orders`, `business_order_items` |
| Stock | `inventory_items`, `inventory_reservations`, `inventory_movements` |
| Procurement | `suppliers`, `purchase_orders`, `purchase_order_items` |
| Delivery | `installation_projects`, `project_assignments`, `project_milestones`, `business_tasks` |
| Finance | `customer_invoices`, `customer_collections`, `supplier_bills` |
| Service | `service_requests` |
| Shared operations | `operations_events`, `operations_documents`, `operations_notifications`, `operations_idempotency` |

Composite company/record foreign keys bind dependent records to the same tenant. Exact quotation revisions have a company-aware reference; migration 006 adds the supporting unique key to the existing quotation table without changing migration 005. Unique customer-user/contact identifiers, company references, order-source revisions, order invoices, purchase lines and reversal links protect against duplication. Indexes support company/status lookups, stock ledgers, assignments, due dates, collections, record timelines and notifications.

`company_contacts` is a company's CRM relationship, not a replacement authentication/customer identity. Registered customers are linked by `user_id`; users and customer profiles are reused. Manual business/individual contacts can exist without a login. Shared enquiry contacts are reused per company/user. Matching email/normalized digit-phone values flag duplicates rather than silently merging different customers. Linking a manual contact to an enquiry customer requires matching shared contact information and rejects retrospective linkage when that manual contact already has private orders/projects/service records.

## 4. CRM and customer management

Existing incoming enquiry screens remain at `/#/distributor/leads` and `/#/distributor/enquiry`. Create a linked lead from a received open enquiry, or use `/#/distributor/crm` for manual leads against a company contact. Pipeline stages are new → contacted → qualified → opportunity → won, with explicit lost/reopen transitions. Stage, priority, representative, next action, follow-up and interaction notes are persisted and audited. Pipeline groups show the currently paginated records, not invented all-company stage totals.

`/#/distributor/customers` supports individual/business contacts, contact details, billing/service addresses and updates. Detail pages show private notes, related authorized leads/orders/projects/invoices/service records, linked quotation versions and original enquiry conversations. Relationship lists and histories are paginated. Sales can qualify an opportunity; project creation remains a manager action. A standalone project can link a qualified opportunity without inventing an order or payment.

## 5. Commercial agreement and orders

`/#/distributor/orders` supports two sources:

- The exact current issued quotation revision belonging to the company and its intended customer. Unknown tax or estimated amounts require a clarified fixed commercial version first. A second active/fulfilled order for the same quotation thread is rejected. A source revision cannot be reused accidentally.
- Explicit agreed line items for an existing company contact, including manually acquired customers. The server reuses Phase 5 decimal validation and BigInt calculation for quantities, discounts, taxes, delivery/installation charges and totals. Manual agreements are labelled as agreed order terms, not fabricated marketplace quotations. Tax treatment must be supplied. Catalogue links are optional and validated when used.

Both paths save immutable commercial snapshots and line quantities in a private draft. Neither creates acceptance, payment, stock movement or a project. The operator explicitly requests confirmation. In-app agreement requires the linked authenticated customer to confirm the displayed terms and addresses. For a manual customer without a login, external agreement requires an actual reference plus explanatory notes; it is labelled as a staff-entered record, not independently verified consent.

Only the owner permission can confirm or cancel. Distributor confirmation remains separate even after in-app customer confirmation. Quote-backed orders recheck current quotation validity before confirmation. Confirmed → processing → partially fulfilled → fulfilled transitions require explicit actions, with actual fulfilment references. Unconsumed reservations must be consumed or released before full fulfilment. Cancellation releases outstanding reservations transactionally, but rejects consumed-stock, unresolved issued-invoice and non-cancelled-project cases requiring separate resolution. Fulfilment never marks an invoice paid.

## 6. Inventory and procurement

`/#/distributor/inventory` creates stock items with company SKU, optional catalogue association, unit, warehouse and reorder threshold. A new item has no invented receipt or physical count. Opening stock is an explicit positive movement allowed once before other movements; subsequent signed adjustments need a reason. Threshold changes leave quantities unchanged.

On-hand and reserved quantities are sums of the append-only movement ledger. Available = on hand − reserved. Reserve only against a confirmed/open order line, matching its product association and unit; total reserved plus consumed cannot exceed agreed quantity. Reservation increases reserved stock only. Release decreases reserved only. Explicit consumption decreases both on-hand and reserved. Negative physical/available/reserved balances are rejected. Catalogue offer availability remains a separate distributor declaration and does not create physical stock.

`/#/distributor/suppliers` stores private supplier profiles; `/#/distributor/procurement` stores purchase orders with actual supplied quantities, expected dates and optional costs/taxes. Either supply all line costs or leave all costs blank. Every purchase requires owner approval; inventory staff can prepare and receive but cannot approve. Partial/full receipts verify outstanding quantities, append physical stock movements and update receipt state in one transaction. Over-receipt exceptions are unavailable and rejected. Cancellation preserves prior receipts and their history. References and request idempotency prevent accidental duplicates/replayed receipts.

## 7. Projects and field tasks

`/#/distributor/projects` supports projects from confirmed orders and authorized standalone work. Order projects copy non-financial agreed scope and supplied equipment only; no supplier costs or commercial prices enter field project records. Capacity is supplied text, never a generated design. Standalone work needs an explicit authorization reason and scope, without forcing inventory records.

Managers assign/reassign project managers and field teams. Milestones cover survey, design, materials, scheduling, installation, inspection, commissioning and handover. Completing a milestone requires earlier stages to be completed or have manager-recorded non-applicability. Inspection/commissioning/handover completion requires a supporting record reference. These are staff-entered progress/evidence references, not claims of independently verified regulatory/grid/subsidy approval. Final completion requires all milestones resolved and an actual completion/handover reference.

Field Engineers can read assigned projects and update permitted survey/installation progress. They cannot mark manager-only inspection, commissioning or handover outcomes. `/#/distributor/tasks` connects work to permitted customer/order/project/service relationships, checks related customers/records and active eligible assignees, and supports assignment/reassignment, priorities, due dates, blocked/in-progress/completed states and completion notes. Project tasks require project team membership. Employees read only their own tasks unless they hold task-management permission. Overdue flags use persisted dates and database India-calendar time. Task/project completion is independent of collections.

Forms remain open with explicit offline messaging; no offline persistence, synchronization or queued writes are claimed.

## 8. Operational finance

`/#/distributor/accounts` provides full-order invoice drafts from confirmed commercial snapshots, immutable line/tax amounts, actual issue date, editable draft due dates, explicit issuance and controlled voiding. This phase uses one full invoice per order; partial billing and credit-note accounting are not implemented.

Collections are positive INR minor-unit entries against issued invoices, with actual collection date, method, optional external reference and receipt/reason. Future-dated collections, duplicate nonempty external references and over-collection are rejected. Outstanding = invoice gross amount − net recorded collections. No browser-supplied paid flag is accepted. Owner-only reversal appends an equal negative record referring to the original; it never edits/deletes history. A collection can be reversed once. An invoice with remaining net collections cannot be voided.

`/#/distributor/payables` records supplier bill references, supplier/purchase relationships, supplied gross amount, explicit reported tax amount/treatment, due date and supporting document reference. It does not silently generate a supplier bill or supplier payment from a purchase receipt.

PostgreSQL calendar DATE values stay as YYYY-MM-DD strings through the shared pool parser; timestamps remain instants. This avoids timezone conversion in quotation-validity and operational date inputs. All monetary calculations use integer paise and the Phase 5 rounding rules. Collections are manual transaction records, not bank/provider verification. This is not full accounting, statutory tax certification, automatic revenue recognition or a payment gateway.

## 9. Service and warranty

`/#/distributor/service` connects company customers and applicable product/order/project records. Received → triaged → assigned → in progress/awaiting customer → resolved → closed transitions are enforced, with assigned eligible staff, follow-up and resolution notes. Supporting warranty terms require a record reference. Blank warranty data remains unconfirmed; no eligibility or resolution time is inferred.

Internal technician notes and explicit customer updates are separate events. Customers see their own status and explicitly public updates, not technician notes, private documents or supplier data. Field Engineers see only assigned service records and limited progress actions; managers triage, assign and close. Linked customers can report an issue from a confirmed order at `/#/customer/orders`; the company receives the real request without a warranty/service-time promise.

## 10. Permissions, privacy and notifications

Migration 006 extends database grants without changing the original role catalogue:

| Role | New operational access |
| --- | --- |
| Owner | All company workflows, commercial confirmation/cancellation, purchase approval, finance reversals |
| Sales | CRM/customers, order drafting/processing and own tasks; no purchase costs or finance module |
| Supervisor | Project/team/task management and service management; no finance or procurement records |
| Field Engineer | Assigned projects/service and own tasks, with limited progress actions |
| Inventory Manager | Stock/adjustments and purchase preparation/receipts; no owner purchase approval or customer finance |
| Accounts | Operational invoices, collections, supplier bill records and own tasks; no stock or project administration |
| Platform operator | No implicit access to private company operations; ordinary explicit company membership/grants are still required |

Every repository authenticates, verifies membership/role, derives tenant from the selected session, validates relationships and applies assignment restrictions. Browser company IDs, balances, totals, statuses and assignees are not authority. Customer APIs join to the authenticated contact user and expose allowlisted fields; private company notes, supplier costs, technicians' notes and documents are excluded. Record/document/activity repositories validate typed company relationships before use. Private reads use no-store responses and existing same-origin/session protections.

Idempotency keys store a payload/operation fingerprint and successful response in the same transaction as the mutation. Reusing a key with different data fails. Revision counters reject stale state-changing forms. The explicit static-asset allowlist adds only the frontend assets. Twenty bounded manual order lines have a 48 KB body limit; ordinary operational writes retain 16 KB.

Dashboard counts and activity are role/assignment scoped and come from actual records: enquiries, opportunities, pending quotation work, confirmed orders, active projects, outstanding receipts, maintained-stock alerts, invoice/overdue counts, net recorded collections, service requests and own tasks. Empty states remain empty.

Combined in-app notifications preserve Phase 5 enquiry/quotation events and add order agreement, assignment, receipt, milestone, project, collection and service updates. Notifications belong to user plus company context; role/assignment scope is applied before exposing record-linked content. Read state is persisted. No email/SMS/WhatsApp delivery is claimed. Source permissions and ownership are repeated when records are opened.

## 11. Setup and known limits

No new environment variables, dependencies, payment providers or external services are required. Existing PostgreSQL/session/company configuration remains necessary. Apply migration 006 with the existing sequential migration runner at the agreed setup/verification stage, after 001–005. No migrations were executed in this phase. All operational data begins empty; no sample sales, stock, projects or financial amounts were inserted.

Secure file storage is absent. Private document metadata stores plain-text references/title/date/notes only; no arbitrary uploads, hosted downloads or file-delivery claims are implemented. Reference evidence is a recorded staff/customer statement, not an independently verified document. New text is English; existing English/Malayalam/Tamil navigation foundations are retained without a full-translation claim. Lists/pickers/timelines are bounded and paginated; updates are refreshed on navigation/focus rather than pushed live.

Operational records use conservative immutable commercial snapshots. Correct a mistaken commercial draft by cancellation/replacement; quote-source replacements require an appropriate new revision. Purchase changes use cancellation/replacement rather than rewriting issued/received quantities. One stock item represents a SKU/unit/warehouse; transfers, serial numbers, automated returns and over-receipt overrides are not included. Consumed-stock orders cannot be cancelled through the basic cancellation action. One full invoice per order, no credit-note/partial-invoice accounting or supplier-payment ledger is claimed.

## 12. Deferred features and Phase 10 concerns

Deferred: secure attachments, offline sync, external notification delivery, bank/payment gateway integration, statutory accounting/certified tax processing, subscription billing, custom-domain provisioning, live SIA execution and automated AI financial actions. The reusable server rules and explicit permissions prepare later SIA integration without giving an assistant unrestricted mutation authority.

Per instruction, no tests, suites, linting/formatting checks, audits, builds, server startup, migration execution or deployment-readiness checks were run. Runtime behavior has not passed verification. Phase 10 must cover migration compatibility, role/assignment denial paths, cross-company/customer isolation, customer consent versus distributor acceptance, quotation expiry/change during acceptance, decimal/rounding boundaries, replayed/competing receipts/reservations/collections, invoice void/reversal rules, cancellation dependencies, milestone evidence, notification scopes, pagination and mobile/keyboard/screen-reader behavior. Validate recovery from network failures without duplicate writes and document the operational limits before deployment.

Stop at Phase 6. Phase 7 remains unstarted.
