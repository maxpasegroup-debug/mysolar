# MY SOLAR SOLUTIONS — Existing to Simplified Menu Mapping

## Audit baseline

Reviewed the distributor route table in `src/app.js`, the shared navigation in `src/workspace.js`, the owner navigation in `src/boss-dashboard.js`, route permission checks and preview gates in `src/account.js`, and the business page dispatch in `src/operations.js`, `src/purchase.js`, and `src/automation.js`. Customer workspace components are separate and are not part of this navigation change.

Navigation links are only a presentation layer. `Account.navAllowed()` and the API's server-side authorization remain authoritative. The `?demo=1` views and several later-phase records are examples or explicitly unavailable; their presence in a route table does not mean operational capability is live.

## Existing menu → new section mapping

| Existing label / route | New section and label | Page / workflow status observed | Notes |
|---|---|---|---|
| Today / `/distributor/dashboard` | **Home** | Real owner dashboard uses company-scoped operations data; employee dashboard is role-scoped. | Retain the existing real-data dashboards and their empty/unavailable states. |
| Lead pipeline / CRM / `/distributor/crm` | **Customers → New enquiries & follow-ups** | Existing company operations workflow. | Keep distinct from registered customer records. |
| Leads & CRM / `/distributor/leads` | **Customers → New enquiries** | Existing enquiry/quotation workflow dispatched by `src/purchase.js`. | Similar wording to CRM currently causes confusion; do not merge the underlying records. |
| Leads / `/distributor/marketplace-leads` | **Customers → MY SOLAR enquiries** | Company setup/marketplace lead route with permission checks. | Preserve marketplace source distinction. |
| Customers / `/distributor/customers` | **Customers → All customers** | Existing company operations customer workflow. | Separate from prospects/enquiries. |
| Import records / `/distributor/import` | **Customers → Import customers** | Existing route requires `customers.manage`. | Keep role-gated. |
| Quotations / `/distributor/quotations`; `/distributor/quotation/new`; `/distributor/quotation` | **Sales → Quotations / Create quotation** | Existing quote and detail workflows in `src/purchase.js`. | Keep validation, versioning, quote state and permissions. |
| Quotation templates / `/distributor/templates` | **Sales → Quotation templates** | Existing route gated by `quotations.read`. | Preserve. |
| Orders / `/distributor/orders` | **Sales → Orders** | Existing company operations workflow. | Order creation and confirmation remain governed by current business rules. |
| Inventory / `/distributor/inventory` | **Stock & purchases → Available stock** | Existing company-scoped stock ledger and inventory workflows. | Rename only; preserve stock movement controls. |
| Energy catalogue / `/distributor/catalogue` | **Stock & purchases → Products & items** | Existing catalogue/offer workflow. | Shared catalogue administration remains platform-only. |
| My offers / `/distributor/offers`; `/distributor/offer` | **Stock & purchases → Product offers** | Existing offer routes and permissions. | Preserve distinction between catalogue products and company offers. |
| Procurement / `/distributor/procurement` | **Stock & purchases → Purchases** | Existing company operations purchase workflow. | Avoid technical label. |
| Suppliers / `/distributor/suppliers` | **Stock & purchases → Suppliers** | Existing supplier records. | Preserve procurement permissions. |
| Tasks / `/distributor/tasks` | **My work → My tasks** | Existing role-scoped task workflow. | Never expose outside permission checks. |
| Field work / `/distributor/field` | **My work → Field work** | Existing own/assigned field work route. | Role-scoped. |
| Work updates / `/distributor/work-reports` | **My work → Work updates** | Existing self-reported work update route. | No hidden tracking implied. |
| Projects / `/distributor/projects` | **My work → Installations** | Existing company/assigned installation workflow. | Keep role-specific project access. |
| Equipment / `/distributor/equipment` | **My work → Equipment records** | Existing route links equipment to orders. | Preserve. |
| Service / `/distributor/service` | **My work → Service requests** | Existing service workflow. | Preserve. |
| Maintenance commitments / `/distributor/service-contracts` | **My work → Maintenance plans** | Existing service contract workflow. | Label is simplified; terms remain precise on the page. |
| Funding / `/distributor/funding` | **More → Loans & subsidies** | Existing permission-gated funding route. | Keep assigned-read exception. |
| Customer invoices / `/distributor/accounts` | **More → Money to collect / invoices** | Existing finance workflow; collections are company-recorded, not provider-verified. | Preserve accounting meaning and labels in detailed views. |
| Supplier bills / `/distributor/payables` | **More → Supplier bills** | Existing finance workflow. | Finance permission required. |
| Reports / `/distributor/reports` | **More → Business performance** | Existing permission-scoped reports. | Do not expose without an allowed underlying read permission. |
| Audit trail / `/distributor/audit` | **More → Activity history** | Existing audit-read route. | Keep precise audit details within the page. |
| Notifications / `/distributor/notifications` | **More → Notifications** | Existing in-app updates. | No unsupported email/SMS/WhatsApp delivery claims. |
| Profile & settings / `/distributor/settings` | **More → Profile & settings** | Existing company profile, membership and security activity. | Preserve owner/role access. |
| Company setup / `/distributor/setup` | **More → Company setup** | Existing SIA-guided setup/draft flow. | Retain save/resume behavior. |
| Team / `/distributor/team` | **More → Team** | Existing company membership and role management. | Adding registered accounts does not itself send invitation email. |
| My Public Profile / `/distributor/public-profile` | **More → Public company profile** | Existing company listing/profile route. | Publication and marketplace review remain separate. |
| Plan & access / `/distributor/subscription`; activation `/distributor/activate` | **More → Plan & access** | Existing commercial access pages. | Do not imply payment or activation before verified state. |
| Reminders & automation / `/distributor/automation` | **More → Reminders** | Existing reminder preferences/automation views. | Delivery failures and supported channels are shown by the feature. |
| B2B Partner Network / `/distributor/partners` | **More → Business partners** | Existing partners route. | Preserve permission. |
| Brand identity / `/distributor/branding`; branded page `/distributor/website`; `/distributor/white-label` | **More → Branding & website** | Existing brand settings and consultation route. | White-label page is consultation information, not automated provisioning. |
| Sales Booster / `/distributor/sales-booster` | **Sales → Sales Booster** with a **Coming soon** badge | No operational module or integration was found. It now opens a static availability notice. | Shows on Home and under Sales only to users with the existing company-management permission. No marketing or WhatsApp integration is claimed. |
| Sign out | Persistent account control | Existing logout action. | Remains accessible on desktop and mobile. |

## Duplicate or overlapping entries found

- `/distributor/crm`, `/distributor/leads`, and `/distributor/marketplace-leads` all use lead/enquiry language but represent different workflow sources and/or record models. They will be grouped under **Customers**, not merged.
- Customer records at `/distributor/customers` are distinct from enquiry/prospect routes and remain separate.
- Orders are linked from both Sales and operating workflows in the current business, but will appear once in the simplified primary navigation.
- The owner dashboard (`BossDashboard`) and shared workspace menu had separate navigation implementations. Both now share the same six-section information architecture while preserving owner-only dashboard behavior.
- SIA appeared as a separate sidebar block in addition to the route menu. It now appears once under More; the existing SIA panel on Home remains a distinct feature entry point.

## Routes and behavior explicitly out of scope

- All `/customer/*` screens and customer navigation.
- Existing APIs, database models, business validation and server-side authorization.
- Platform administration routes (catalogue, commercial settings, operations, audit and company review).
- Login, company membership selection, account security and onboarding credentials.

