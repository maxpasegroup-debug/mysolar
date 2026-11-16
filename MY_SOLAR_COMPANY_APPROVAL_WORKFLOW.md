# MY SOLAR — Company Approval Workflow

16 November 2026. Implemented locally and mock verified. **XYZ has not been approved or otherwise changed.** This document describes the review procedure after separately accepted deployment; it is not a report of live decisions.

## Administrator access

Use an existing account with an authorized record in `platform_admin_grants`. The existing operator procedure is `server/admin.js` (`admin:grant`/`admin:revoke` package scripts). It is not a public registration role, and it was not executed here. No account or password was created.

An operator signs in at `/#/distributor/login`, then uses **Platform administration** or opens `/#/platform`. Company owners/customers without platform grants see an access-required state; API requests are independently denied. Existing verified-email/MFA policies still apply when configured. An operator affiliated with a company cannot approve, reactivate, approve its marketplace listing or publish it.

## Dashboard

The existing `/platform` dashboard now offers:

1. Pending company applications — `queue=onboarding`.
2. Approved companies — `queue=approved` (active company lifecycle; not marketplace approval).
3. Rejected or returned applications — `queue=returned` (includes returned setup history and rejected/withdrawn listing states).
4. Pending marketplace listings — `queue=marketplace`.
5. Published listings — `queue=published` (stored publication flag; public visibility has additional gates).

Search company/public name/city, apply lifecycle/marketplace filters, then click **Review company**. Detail URL: `/#/platform/company?id=<company-id>`.

Review legal name, public name, business contact, address, public description/contact, services, declared areas, structured marketplace coverage, latest application submission date, activation, marketplace state and publication state. Review history and audit activity appear below. No submitted date is invented if none is recorded. Histories are bounded to the existing most-recent lists, not an unlimited audit export.

## Company activation

Submission remains explicit: the owner's setup submission enters `pending_review`; it never activates the company automatically.

| Administrator decision | Permission | Existing-state result |
| --- | --- | --- |
| Approve activation | `platform.onboarding.review` | `pending_review` → `active`; publication stays off. Setup readiness and independent review required. |
| Reject application | `platform.onboarding.review` | `pending_review` → `onboarding`; unpublished; reason required. |
| Request company corrections | `platform.onboarding.review` | Same existing `onboarding` return state; distinct decision in audit; reason required. |
| Suspend company | `platform.lifecycle.manage` | `suspended`; previous lifecycle retained; unpublished; reason required. |
| Reactivate | `platform.lifecycle.manage` | Restores recorded previous lifecycle; remains unpublished; independent review required. |

**There is no new terminal activation-rejected state.** Rejection and corrections reuse the existing return-to-onboarding workflow, allowing the owner to edit and resubmit. The explicit decision audit distinguishes rejection from correction. Introducing an irreversible rejection state would need a separate product/schema decision and is not included.

Choose a decision explicitly; none is preselected. Negative decisions, corrections, suspension and unpublication require a plain-text reason of 10–500 characters. Review uses the current revision; stale forms are rejected instead of overwriting another review.

## Marketplace approval and publication

These remain separate from activation and from each other:

| Decision | Preconditions | Result |
| --- | --- | --- |
| Approve marketplace application | Active lifecycle, pending marketplace state, complete setup, owner's marketplace request and independent operator | Marketplace `approved`; still unpublished. |
| Reject marketplace application | Marketplace `pending`; reason | Marketplace `rejected`; unpublished. |
| Return listing for corrections | Marketplace `pending`; reason | Existing `withdrawn` state; unpublished. Company activation unchanged. |
| Publish approved storefront | Active company/status, marketplace `approved`, complete profile/contact, recorded approval, existing public-listing policy, independent operator | `storefront_published=true`. |
| Unpublish storefront | Currently published; reason | Flag false. Activation and listing approval retained. |

All marketplace decisions require `platform.marketplace.review`. Owners can correct a returned/rejected listing and explicitly request review again using the existing company workflow. Editing relevant profile information withdraws publication for renewed review. No owner edit automatically approves anything.

Free listing publication uses `commercial_public_allowed(company,'storefront')`, matching the public view. Existing OS-enrolled companies have a free-storefront exception; paid OS writability is no longer incorrectly required by the publish action. Existing legacy policy denials still fail closed. No plan is assigned and no payment is initiated.

## Visibility conditions

Public discovery reads `marketplace_vendors`. It requires active status and lifecycle, marketplace approval, publication flag, related profile/branding/business rows, nonempty public name/description, preferred public email/phone, recorded marketplace approval and public-storefront policy eligibility.

Company registration, setup submission, activation alone or marketplace approval alone is insufficient. Product offers have additional product/category/offer review and revision gates; an approved company can have a profile without published offers. Marketplace publication does not certify business quality.

## Audit and concurrency

Every review uses the existing server transaction and company row lock, checks the revision, records `company_reviews` and existing lifecycle/marketplace audit events, and now adds `company.review_decision` metadata containing exact decision, previous/new state, reason and revision. Operator identity and time come from authenticated audit storage, not submitted names. Failure while journaling propagates to the transaction rollback path.

These properties were exercised with mocked queries/control flow. SQL execution, transactional durability, simultaneous reviewers and database constraint behavior are **not yet verified against disposable PostgreSQL**.

## XYZ-specific procedure — not executed

Given the owner's reported pending activation, pending marketplace and unpublished states:

1. An authorized independent operator locates the existing XYZ record. Do not create another company.
2. Review its actual submitted data, public contact and recorded service coverage.
3. Choose activation approval or return/reject with a real reason.
4. If activation is approved, separately review its marketplace application.
5. If that is approved, separately choose publication.
6. Verify its actual public directory/profile result, then perform a separately authorized customer enquiry acceptance test.

This task performed none of those live steps. Existing administrator accounts, XYZ record data, target schema and deployed behavior remain unknown. No migration was needed or executed, and no deployment was performed.
