# Pilot commercial and operating-cost review

Review date: 19 October 2026. **Code/configuration findings below are verified locally; live plans, subscription assignments, provider bills, real usage and margin remain unverified.** Railway CLI still returned “Unauthorized” when retried after the operator authorized read-only access. No prices, entitlements, subscriptions or provider settings were changed. The operator will onboard the real company; no participant records or invitations were created by the assistant.

## Current implementation

| Area | Verified implementation | Required live evidence |
| --- | --- | --- |
| FREE | No seeded canonical published plan. Code/tests recognize that non-PRO codes do not unlock PRO growth tools. | Actual current plan code/version, publication state, terms, limits and company assignments |
| ELITE | Same generic versioned plan framework; no seeded final ELITE price or entitlement matrix | Same live evidence; do not infer price or features from the display name |
| PRO | Reserved code `pro`; new PRO terms require `599900` paise, INR, monthly, exclusive tax. Existing UI/template displays ₹5,999 + GST/month. Growth access requires current active/trial subscription dates and active company/membership context. | Actual published plan/version and historical assigned terms; existing snapshots can differ and remain authoritative |
| PRO capabilities | B2B Partner Network and Part-Time Sales Executive Management use current PRO eligibility, plus role permissions/base feature limits | Confirm the exact assigned plan and role for each pilot business; a name containing PRO grants nothing |
| Base features | Central flags cover storefront, catalogue, CRM, quotes, orders, team, inventory, projects, finance, service, white-label, SIA CEO and future custom domains | Current features/limits from `commercial_policy`, not a marketing grid |
| Pre-billing | Initial migration permits base features under explicit pre-billing defaults; this is not an assigned FREE plan or evidence of payment. It does not grant PRO growth eligibility. | Current effective settings and any assigned subscriptions override assumptions about defaults |
| Setup proposal | Initial reference: ₹35,000, configurable, plus applicable tax; commercial settings version it and assignments snapshot terms. Initial fee proposal is disabled. | Current fee enabled/required flags, tax treatment, effective version and company agreement snapshot |
| Billing | Payment gateway/checkout and verified subscription-payment processing are absent; administrative activation is recorded separately | Approved external SaaS receipts if any; never infer paid revenue from an active status |

Sources in the repository: `server/commercial/growth.js`, `server/commercial/policy.js`, `server/commercial/routes.js`, `server/commercial/validation.js`, `server/db/migrations/003_company_setup.sql`, `server/db/migrations/008_commercial.sql`, `src/commercial.js`, `src/growth.js`, `PRO_NETWORK_HANDOFF.md`.

Keep FREE/ELITE/PRO names while reviewing the actual records. Do not introduce Core/Growth/Branded names, rewrite old agreements, publish a draft plan or promise an unavailable capability during the trial. Changing new PRO pricing would require an explicit reviewed policy/code change as well as plan publication; changing a browser label is insufficient.

## Collect actual costs

Keep invoice/usage evidence privately and record the exact period, currency, tax/credit treatment and allocation. Unknown costs remain **unknown**, including any free-tier assumptions. A configured API key is not evidence of free usage or successful delivery.

| Cost or receipt | Evidence to obtain | Current result |
| --- | --- | --- |
| Railway web application | Service usage plus actual workspace invoice/credits for the same period | Unknown |
| PostgreSQL | Actual service compute, storage/volume and relevant networking/backup charges | Unknown |
| Reminder worker | Actual separate process/service usage; do not omit its cost | Unknown; live worker not verified |
| Resend | Actual account tier, usage, invoice/credits and any overage; separate transactional and marketing products | Unknown |
| SIA | Whether an external provider is enabled, actual request/token metadata where available, model rates and actual provider bill | Unknown; no cost inferred from request counts |
| Monitoring/storage/domains | Actual approved charges for services actually used; include backup/restore retention where billed | Unknown |
| Assisted setup | Actual minutes × approved internal loaded hourly cost, plus any actual design/setup work | Unknown |
| Recurring support | Actual support minutes and internal cost per company; include troubleshooting/reminder operations | Unknown |
| Acquisition | Actual pilot recruitment/demonstration spend and labour, tracked separately | Unknown |
| MY SOLAR revenue | Actual net SaaS receipts and setup receipts under approved terms, with their period and source | Unknown; distributor customer collections are not MY SOLAR SaaS revenue |

Railway documents subscription/resource usage and included-credit treatment; reconcile the invoice rather than adding a plan fee to every resource charge indiscriminately. See [Understanding Your Bill](https://docs.railway.com/pricing/understanding-your-bill). Resend publishes product/tier allowances and overage terms; compare the actual account and product with its [transactional pricing](https://resend.com/pricing?product=transactional). These public sources were reviewed on the date above; they do not establish this operator's current bill. No provider list price, INR exchange rate or assumed free allowance is substituted for actual records here.

## Decision model

Use a consistent tax basis and measured period, agreed with the operator/accountant. Keep actuals and forecasts separate:

- Actual recurring contribution = actual net MY SOLAR recurring receipts − attributable platform/provider/support operating costs for that period.
- Contribution per paying company = recurring contribution ÷ actual paying companies. If none are paying, this is not evaluable as paid unit economics; record the pilot's actual cost separately.
- Candidate-offer contribution = explicitly proposed net recurring price − estimated per-company recurring cost, with assumptions and measured support/usage bands shown. This is a scenario, not actual revenue or proof that customers will pay.
- Setup contribution = actual/proposed net setup revenue − corresponding actual/estimated onboarding, design and provisioning cost. Do not count one-time setup fees as recurring revenue.
- A two-week forecast to a month remains an estimate; capture a full billing period or label the forecast and uncertainty. Do not count the same provider credit, tax or setup expense twice.

No final offer, margin, break-even claim or automatic charge is approved by this review. Finalise only after repeat adoption, support effort, actual costs and a specific willingness-to-pay response have been observed. Keep customer acquisition/payback assumptions explicit rather than promising competitor superiority.
