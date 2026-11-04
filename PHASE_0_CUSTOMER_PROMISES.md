# Phase 0 — Customer promises and capability baseline

**Status: product decisions recorded; live-environment acceptance is pending.**

This document records the customer-facing rules agreed in the product discussion and distinguishes them from capabilities verified in the current workspace. It is the source for customer wording in later implementation phases. A screen, API declaration, migration, or prior mock test is not proof that a live service is currently available.

## Agreed customer rules

1. MY SOLAR will not use SMS codes. Email OTP is the verification and recovery channel.
2. Mobile number plus six-digit PIN is the convenient everyday sign-in method when the required mail and PIN configuration is active.
3. Customer and business accounts are separate identities. Each account needs its own email address and mobile login number. A customer account does not become a business account by changing a selector.
4. People may browse public solar products and information without signing in. They must sign in to submit a customer request or view private customer records.
5. The mobile number is a login identifier, not an SMS-verified proof of phone ownership. Explain this when collecting it; never claim that MY SOLAR verified the phone by SMS.
6. Do not invent seller availability, response times, prices, payment completion, installation progress, or warranty eligibility.

## Exact meaning of customer-facing records

| Term | Promise to the customer | Do not imply |
|---|---|---|
| **Quote request / enquiry** | The customer submitted a request and it is visible to the selected eligible recipients recorded by the system. | That a seller has replied, that a quote exists, or that a purchase has started. |
| **Quotation** | A seller issued a versioned offer with the terms and validity details shown in that record. Estimate and tax-uncertain flags remain visible. | That the price is guaranteed beyond its terms, that the platform independently certified the product, or that a quotation is an order. |
| **Preferred quotation** | The customer marked an offer as preferred for discussion or next steps. | That the customer accepted the commercial terms or placed an order. |
| **Order** | An order record contains the terms and acceptance state shown. For in-app confirmation, customer confirmation alone does not mean the distributor has accepted it. | That an order is final when a required party has not accepted, or that opening a record confirms anything. |
| **Invoice** | An issued business invoice and its recorded totals, due date, and collection entries are shown. | That an invoice has been paid just because a collection entry exists. |
| **Payment / collection recorded** | A business-side transaction entry is recorded in MY SOLAR. | That a bank, card, UPI, or payment provider independently confirmed receipt. Live payment processing is not enabled by the current payment adapter. |
| **Installation progress / complete** | The responsible company recorded the milestone, completion date, or reference displayed. | That MY SOLAR independently inspected the installation or verified workmanship. |
| **Warranty** | Supplied warranty terms and references may be displayed; the responsible seller or manufacturer determines eligibility. | That a product is certified by MY SOLAR, that warranty coverage is guaranteed, or that a claim is approved. |
| **Message / contact** | A message saved in the MY SOLAR enquiry or service workflow is recorded. A WhatsApp link opens a prepared external message for the customer to review. | That opening WhatsApp sends the message, creates a ticket, or notifies the seller. No SMS channel is configured. |
| **Shared document** | A document explicitly shared with the customer is available if secure storage and scanning are configured. | That every company file is customer-visible, that an upload is available in every environment, or that a document is a statutory filing/certification. |
| **Referral reward** | No customer referral reward is currently promised. | Any payout, discount, eligibility, or tracking until a separately approved referral programme exists. |

## Support and language disclosure

- Source currently defines a public support phone number (`+918136906653`) and a WhatsApp message draft. A source comment says these channels were owner-confirmed, but this workspace does not establish current staffing, operating hours, delivery, response targets, or whether the contact is monitored. UI must not promise live support or a response time until an owner re-confirms those details.
- The customer language selector lists English, Hindi, Malayalam, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, Odia, Punjabi, Assamese, and Urdu. The translation catalogue marks only English, Hindi, and Malayalam as complete; other languages must be described as partial/fallback until reviewed and completed. Legal, commercial, safety, and warranty text must remain accurate and reviewed before translation.
- Public product information is based on published catalogue/seller data. Product specifications and seller offers are supplied information, not platform certification, live inventory, or a guarantee of local availability.

## Capability check in this workspace

| Capability | Source finding | Current evidence status |
|---|---|---|
| Public browsing | Public catalogue and product discovery routes exist. Customer-owned enquiry and record APIs require a signed-in user. | Source inspected; live browsing/API not exercised in this phase. |
| Email OTP signup and account verification | Signup challenges and queued email are implemented in source. | Live inbox delivery not verified. |
| Mobile + PIN sign-in and email OTP recovery | PIN routes and screens exist. Availability requires `AUTH_PIN_PEPPER`; signup/recovery additionally require `DATA_ENCRYPTION_KEY`, configured mail, and a running mail worker. | Not operationally verified in this workspace. |
| Separate customer/business credentials | Email is globally unique in the account model; mobile credentials are unique. Signup routes retain `accountType`. | Source/schema declarations inspected; no live database acceptance in this phase. |
| Quotations, orders, invoices, installation, service | Customer and company routes and records exist, with ownership and permission checks in source. | No real company/customer workflow executed in this phase; existing project audit classifies database-backed areas as mock-verified only pending acceptance. |
| Online payments | Payment adapter fails closed if there is no validated provider context; project audit reports no live payment processing. | Not available/verified. Do not show an online pay action. |
| Secure documents/uploads | Customer-visible document reads are scoped in source; secure uploads require configured encryption and scanning services. | External scanner/storage configuration and real file acceptance not verified. |
| Referral rewards | No customer referral reward flow was identified in the inspected customer source. | Not available. |
| Local database/email environment | No `.env` file or process values for database, session secret, mail sender/provider, encryption key, or PIN pepper are present in this workspace. | Database and email workflows could not be exercised locally. |
| Intended production environment | No production provider configuration, deployment variables, database state, or mailbox was inspected during this phase. | Current production readiness and live support availability remain unverified. |

## Phase 0 exit decision

**Product promises and account rules are documented. Phase 0 is not fully accepted for a live launch** because the intended deployment environment was not supplied or inspected, and this workspace has no local database/mail configuration. Before treating signup, recovery, business workflows, support channels, or secure documents as live, obtain environment-specific evidence: healthy database/schema, configured PIN/email services and actual OTP receipt, representative customer-to-seller workflow acceptance, secure file acceptance if documents are offered, and owner reconfirmation of support channels and hours.

No live environment, database, or email service was changed or contacted to produce this baseline.

## Source references

- `src/account.js`, `src/mobile-auth.js`, `src/onboarding.js`
- `server/auth/pin-routes.js`, `server/auth/pin-security.js`, `server/auth/routes.js`
- `server/marketplace/public.js`, `server/purchase/customer.js`
- `server/customer/experience.js`, `server/customer/home.js`, `server/operations/customer.js`
- `src/experience.js`, `src/customer-dashboard.js`, `src/customer-locale.js`
- `server/support.js`, `server/commercial/payments.js`, `.env.example`
- `MY_SOLAR_MASTER_FUNCTIONALITY_AUDIT.md`
