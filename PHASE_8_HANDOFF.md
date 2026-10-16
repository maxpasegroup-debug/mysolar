# MY SOLAR — Phase 8 implementation handoff

Phase 8 implements SIA's customer and distributor foundation over Phases 1–7. No tests, test suites, linting, formatting checks, audits, builds, server startup, database migrations or deployment-readiness checks were run. No external model request was made during this implementation. This report makes no claim of verification or production readiness. Phase 9 has not started.

## 1. Existing architecture reused

The HTML/CSS/classic JavaScript application and hash router remain. SIA composes existing Account, shared layouts, translation fallback, responsive styles and source-record links. Express and PostgreSQL retain authenticated sessions, CSRF, expected account/company context, database permissions, locked tenant/customer repositories, publication projections, integer-paise calculations and business auditing. There is no framework replacement, new package or separate datastore.

`businessOverview` was extracted from the existing operational dashboard handler and reused by both routes. Customer tools reuse `publishedProduct`, `ownEnquiry`, `quoteRecord`, quotation items, the existing missing-detail `assistance` rules, `ownRecord`, and operational permission/assignment scopes. Follow-up execution calls the existing `sendMessage` service. Supplemental read aggregates supply the requested ageing/schedule/expiry/outstanding indicators without introducing new business transitions.

## 2. Files created or modified

Created:

- `server/sia/config.js`: optional feature flag, provider settings, timeout and request budgets.
- `server/sia/provider.js`: provider adapter, bounded HTTPS requests, strict evidence-selection output validation and safe fallback.
- `server/sia/tools.js`: explicit tool contracts, strict inputs, allowlisted facts/questions and scoped retrieval.
- `server/sia/routes.js`: status/options/history/messages, usage reservation, events and explicit follow-up proposal/decision routes.
- `server/db/migrations/007_sia.sql`: request metadata, usage, events, proposals and permission extensions. Earlier migrations remain unchanged.
- `src/sia.js`: shared customer/Virtual CEO interface, replaceable avatar, context pickers, evidence responses, request history and approval panel.
- `sia.css`: responsive warm customer and burgundy business SIA presentation.
- `PHASE_8_HANDOFF.md`: this report.

Modified:

- `server/operations/read.js`: extracted the shared `businessOverview` function; existing dashboard response remains available.
- `server/index.js`: mounted customer/company SIA routes and explicitly allowlisted new public assets.
- `index.html`: loaded SIA CSS and frontend module before the main application script.
- `src/account.js`: delegated authenticated SIA pages after existing guards; supplied an expected-account guard for SIA reads as well as mutations.
- `src/app.js`: customer route/navigation, shared avatar delegation, contextual decoration and phase labels.
- `sw.js`: added only public SIA static assets and bumped the cache version; all private API exclusions remain.
- `.env.example`: optional SIA configuration; no actual credentials.
- `README.md`: Phase 8 summary and retained prior implementation history.

## 3. AI provider interface and configuration

Business modules do not depend on a particular model SDK. The adapter receives a bounded question, server-generated evidence and supported clarification questions. It returns either a validated selection of existing IDs or a safe rule-based fallback. It never returns executable tools, arbitrary URLs or model-written business facts. All evidence remains visible; AI-selected items are highlighted instead of hiding material caveats. This is constrained AI assistance, not unrestricted chat generation.

Optional environment configuration:

| Variable | Default | Meaning |
| --- | --- | --- |
| `SIA_ENABLED` | `true` | Set exactly `false` to disable SIA while retaining ordinary workflows. |
| `SIA_PROVIDER` | `disabled` | Supported optional adapter: `json-selector-v1`. |
| `SIA_PROVIDER_URL` | empty | Operator-managed, compatible HTTPS JSON model gateway endpoint. No embedded credentials, query or fragment. |
| `SIA_API_KEY` | empty | Server-only bearer credential for that endpoint. |
| `SIA_MODEL` | empty | Operator-selected model identifier. |
| `SIA_TIMEOUT_MS` | `12000` | Timeout, permitted range 1000–30000 ms. |
| `SIA_REQUESTS_PER_MINUTE` | `8` | Per-user message rate, permitted range 1–30. |
| `SIA_USER_DAILY_LIMIT` | `30` | Maximum reserved external attempts per user per UTC day. |
| `SIA_COMPANY_DAILY_LIMIT` | `150` | Maximum reserved external attempts per company per UTC day. |

The JSON endpoint is an explicit operator integration contract, not a claim of direct compatibility with every vendor API. A configured gateway translates it to the operator's chosen model API. No endpoint/account/credential is provisioned automatically. Missing configuration yields unavailable-provider status and deterministic help. Unknown adapter names remain unavailable. The user must opt into an external request on each question; no earlier conversation is sent.

Request contract: POST JSON with `model`, fixed `instructions`, `prompt`, `facts:[{id,text,label}]`, `questions:[{id,text}]` and `max_output_tokens:600`, plus server-side `Authorization: Bearer ...`. HTTPS redirects are rejected. Serialized model input is capped at 64 KiB and response streaming at 12 KiB. Output must be exactly `{factIds:string[],questionIds:string[],usage?:{input_tokens:integer,output_tokens:integer}}`, with unique IDs from the supplied evidence only. Arbitrary text/fields/tool calls are rejected. Usage is optional and validated; token usage and exact costs are never invented. Failure, timeout, unsafe output or usage exhaustion produces labelled rule-based help without automatic retries. Provider consent and data-processing policies still require operator review before configuration.

## 4. Customer purchase assistance

`/#/customer/sia` supports general category/terminology guidance, published catalogue search, up to three selected product specification comparisons, owned enquiry status, up to three quotation versions for the same enquiry, and owned order/project/invoice/service explanations. Record pickers use bounded authorized search and preselect context from the source screen. Private tracking can also be opened directly from its existing record link.

Quotation comparison uses stored server-calculated totals and integer differences; it identifies tax/estimate flags, delivery/installation charges, supplied scope, inclusions/exclusions and missing-term questions from the existing assistance rules. It does not rank vendors or equate a lower headline price with savings. Zero installation charge does not establish included installation. Catalogue attributes, warranty and quotation text are explicitly supplied information, not independent verification. Long text is labelled as an excerpt; source links lead to full terms.

Facts, distributor-provided statements, educational guidance and missing information have distinct labels. No sizing, payback, subsidy eligibility, ratings, certification, warranty entitlement, stock availability or installation date is inferred. Order, project and recorded collection statuses stay separate. Contextual entry links are added to product, enquiry, quotation, comparison and customer record screens. Core purchase workflows remain usable without SIA or a provider.

## 5. Distributor Virtual CEO

`/#/sia` supports authorized business summaries and bounded record searches. The existing dashboard supplies actual open leads, quotation actions, orders, projects, tasks, maintained-stock alerts, receipts, invoices, collections and scoped recent events. Additional indicators define new leads as created within seven days, ageing open leads as created at least fourteen days ago, quotation expiry within seven days, and projects past their recorded schedule. Missing milestone-specific due dates are explicitly acknowledged; project schedule lateness is not represented as proven milestone lateness.

Finance aggregates, including outstanding issued balances, require `finance.read`; inventory and procurement require their existing read permissions. Field engineers retain assigned project/service/task scope and receive no unrestricted finance data. Source periods and bounded list limits are visible. No free-form text is used to calculate financial totals. Links open the relevant existing modules. The owner and permitted staff can enter SIA from workspace navigation and operational screens.

## 6. Trusted tools and authorization

Every tool definition supplies purpose, permissions, validated input shape, ownership/tenant scope, allowed model fields and read-only status. Tools are chosen explicitly by the user. The provider receives no database connection and cannot invoke tools.

| Tool | Input | Required access and scope |
| --- | --- | --- |
| `categories` | Empty object | Authenticated SIA access; fixed general guidance only. |
| `catalogue` | Search text ≤100 characters | Customer SIA; only current published catalogue views, up to eight results. |
| `products` | 1–3 distinct product UUIDs | Customer SIA; each resolved with `publishedProduct`. |
| `enquiry` | Enquiry UUID | `customer.enquiries.own`; authenticated ownership; quote statuses require quote access separately. |
| `quotations` | 1–3 distinct quotation-version UUIDs | `customer.quotations.own`; every version owned, non-draft, same enquiry; existing missing-detail rules. |
| `tracking` | Allowed kind and UUID | Owned record; `customer.installation.own` for projects, otherwise `customer.orders.own`. |
| `business` | Empty object | `sia.read`, active selected company and existing per-module/assignment permissions. |
| `records` | Allowed kind, search ≤100 characters | Current company and existing operational read/assignment scopes, up to eight results. |

Customer API prefix: `/api/customer/sia`. Company API prefix: `/api/companies/current/sia`, requiring the existing expected-company header. Shared routes are GET `status`, `options`, `history`; POST `messages`; DELETE `history`. Company-only proposal routes are POST `proposals` and POST `proposals/:id/decision`. Picker labels/IDs are also ownership/publication scoped and never authorize the final read. Unsupported keys, identity claims, record kinds and invalid IDs are rejected.

Migration 007 adds `customer.sia.own` and extends `sia.read` to existing staff roles. Existing module grants are not expanded: SIA access cannot expose a module a staff member could not already read. Prior immutable role catalogue and migrations are preserved.

## 7. Action proposal and confirmation

The supported execution pattern is a customer-facing follow-up saved inside an existing enquiry conversation. An authorized employee writes or reviews the draft; POST `proposals` checks `sia.read`, `enquiries.manage`, `leads.read`, active company, received enquiry and open status. It returns the exact message, record, role, customer-visible impact, absence of financial change and inability to recall the sent message through this interface. The model cannot create or mutate this payload.

Proposals expire after ten minutes. Each is bound to the authenticated user, company, permission-scope digest, session hash, exact canonical payload hash and enquiry revision. A random confirmation token is returned once and kept only in frontend memory; only its digest is stored. Approval requires a checked review control and explicit confirmation request. The decision accepts no replacement action payload. Session/context/permission/record changes require a new review. Rejection executes no business action.

Approval locks the proposal and enquiry, rechecks current authorization/status/revision, then calls the existing `sendMessage` service. Its existing events/notifications/business rules apply. Execution result and status are committed together; repeated approval of that same proposal returns its prior result instead of sending twice. The UI only reports success after the service response. This saves an in-app conversation entry, not email, Slack, SMS or another external communication.

Other workflows are reached through ordinary record links. SIA has no order-acceptance, stock-change, collection-reversal, procurement-approval or payment-execution tool. Extending the proposal catalogue later must reuse those workflows' existing validation and explicit human approvals.

## 8. Conversation persistence and retention

`sia_requests` stores the authenticated user/company, permission-scope digest, request ID/fingerprint, chosen tool/input references, user prompt, status, mode, timestamps and optional provider-reported token counts. History returns only the current user's exact company/role/permission scope, eight entries per page. Retrieved business facts and generated answer snapshots are deliberately not persisted or replayed as history. Prior prompts are visible as the user's own conversation requests; a new request is needed for current business information and fresh authorization. History never grants record access.

Explicit clear-history confirmation deletes request/prompt metadata for that scope and rejects/redacts its pending proposals. It does not delete underlying enquiry messages or business audit records. Executed/rejected proposals redact their message payload; expired pending payloads remain until operator cleanup or scope-history clearing. Usage counters and audit/event records remain separately retained. There is no automatic retention/deletion scheduler added, and the existing authentication cleanup command is unchanged. Operators must document retention periods, backup handling and any later cleanup policy. Prompt fields are limited to 1200 characters; the interface asks users not to include secrets or unnecessary personal details.

## 9. Abuse controls, usage and observability

Existing global request-body/origin/CSRF/session protections apply. SIA messages additionally use a PostgreSQL-backed per-user minute rate and shared API IP limits. Proposals have a separate creation limit. External attempts reserve both user and company UTC-day budgets transactionally before network access; partial reservations roll back if either budget is exhausted. Budgets count attempts, not successful answers or currency cost. Disabled/unconfigured-provider rule requests do not consume the external-attempt budget. A request ID/fingerprint prevents repeating an external call for the same claimed request; duplicate requests receive current rule data rather than replaying a private answer snapshot.

`sia_events` records request initiation/completion/failure, tool invocation/revalidation, provider unavailable/failure/timeout, usage/rate-limit exhaustion, proposal creation, approval/rejection, execution and history clearing. Events contain IDs and fixed event names, not raw prompts, evidence or credentials. Consequential proposal/execution events also use the existing audit system; `sendMessage` still creates its original business records. Provider request counts and reported tokens are attributed to the authenticated actor/company in request metadata. Feature flags and configurable caps provide a Phase 9 foundation without billing or subscriptions.

## 10. Isolation, privacy and prompt injection

Every protected request re-enters existing locked authenticated tenant/customer context. Each tool applies its existing module, ownership, publication and assignment restrictions. User/company/role inputs and arbitrary SQL, shell commands, scripts, URLs or code execution are not accepted from the model. The browser carries only expected-context guards; it cannot grant access by changing them. SIA GETs also carry the expected account ID so a stale tab is rejected if another tab changes the signed-in account before its status/history load. Both mutations and approvals use existing CSRF protection.

Provider prompts contain only the current question and allowlisted bounded evidence/question text. They omit session/CSRF secrets, role grants, raw connections, credentials, unrelated module data and earlier conversations. Retrieved text and provider output are untrusted. Output can only identify pre-existing server facts/questions, so instructions embedded in catalogue or quotation text cannot create a tool call or replace business values. Text is rendered escaped. All server-generated facts and caveats remain visible even when AI highlights a subset.

Source access is revalidated after provider latency. Changed facts/questions replace the stale snapshot with current rule data and discard old selections. Frontend async results are discarded when identity/company/permission scope or route changes. SIA state is memory-only; no conversation, proposal token or private answer is added to browser persistent storage. The service worker still bypasses APIs and navigations remain network-only. Only public SIA JavaScript/CSS joined the static allowlist.

## 11. Manual setup and known limits

Existing environment/PostgreSQL setup and migrations 001–007 must be applied by the operator at the agreed later stage; none were run here. No new dependencies are required. Until migration 007 is applied, new routes/grants/tables are unavailable. Normal authentication and operational setup remain necessary. Actual records and prior company/catalogue publication rules govern what SIA can show. No missing vendors, quotations or business activity is seeded.

Rules require no model credential. To enable optional AI, configure a compatible operator-managed JSON gateway, model and server-only key after reviewing data processing and budgets. The adapter is not a vendor SDK and does not silently provision a gateway. Provider availability means configuration appears complete, not that a connection has passed verification. Gateway compatibility, network latency, credentials and model behavior remain unverified. A failed provider still returns rules when source access remains valid. No full Malayalam/Tamil assistant translation, independent engineering calculation, secure document parsing/upload or unrestricted natural-language tool planner is claimed. The avatar remains a replaceable placeholder.

## 12. Deferred work and Phase 10 concerns

Phase 9 may extend feature entitlements, quota policy and commercial packaging; no subscription or charge was implemented. Additional provider adapters and narrowly validated proposal types can be added after their contracts and data policies are agreed. Native apps, domain provisioning, unrestricted automation, payments, autonomous financial/stock changes and unavailable secure storage remain out of scope. Phase 9 has not started.

Reserve for Phase 10: fresh/upgrade migration 007 and permission grants; disabled/unconfigured-provider behavior; gateway JSON compatibility/timeouts/oversized streams/redirect rejection; budget concurrency and rate windows; duplicate request claims and interrupted requests; proposal replay, expiry, canonical hash, changed revision, rejected/cleared proposal and cross-session approval; tenant/company/account switching; permission and assignment revocation during model latency; customer quote/product/record tampering; publication withdrawal; immutable snapshots and integer comparisons; prompt-injection payloads and escaping; history isolation/deletion/pagination and audit retention; token attribution without cost claims; form preservation, contextual record pickers and mobile keyboard/screen-reader behavior; and static-cache exclusions after logout. No item is represented as passed.
