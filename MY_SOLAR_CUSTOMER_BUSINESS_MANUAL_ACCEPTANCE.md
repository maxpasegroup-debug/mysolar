# Customer and business dashboard — owner acceptance

Updated 30 October 2026. The latest instruction assigns further testing to the owner. This checklist records what to try and what remains a configuration/release gate; it is not a claim of completed live acceptance.

## Current delivery status

The working tree contains the unreleased foundation, legal and shared-SIA onboarding changes. No commit, push, deployment, production migration or production configuration update occurred. Testing the current public website will not exercise these local changes until a separately approved release is deployed.

Customer dashboard design and official logo are unchanged. Business onboarding now reaches an account welcome dashboard after secure OTP sign-in; it no longer forces a company wizard before that welcome screen. Company setup is a separate workspace task with explicitly saved encrypted drafts.

## Before beginning

- Use an email inbox you control for each account. Customer and business accounts require different registered email addresses.
- Check which application release is being tested. Do not assume these local changes are already live.
- Use the visible actual company/product/plan state. No published seller, offer or quotation should be invented to make an empty screen appear successful.
- Do not share passwords, OTPs, recovery codes, customer documents or banking credentials in feedback. A page URL, action, time, screenshot with private details hidden and error reference are sufficient.

## A. New customer

1. Choose the customer journey. A single SIA-guided popup asks for name, email and password. It must fit your phone without horizontal scrolling.
2. Request verification. The password disappears from the popup; the requested email and an eight-digit OTP input appear. A queued/provider-accepted message must not claim inbox receipt.
3. Check Inbox and Spam yourself. Try one wrong code: remain signed out with a clear error. Enter the valid code in the same browser: the popup closes and the customer dashboard opens directly.
4. Verify the account name, no invented quotation/order counts, and useful product/enquiry/support actions. Profile details can be completed later in settings.
5. Try changing the email before verification. Name/email may be reused on the form; password must be entered again. The old proof must not create a duplicate identity.
6. Sign out, sign in and recover the password through the customer-purpose email OTP journey. Check actual email receipt and that the old password stops working after a real reset. Do not send the code to support.
7. Explore categories, product details, search, PIN/service-area discovery and real seller offers. An empty published catalogue must say so; images or category cards alone do not establish availability.
8. Submit a genuine enquiry to an approved seller. Check it appears once under the same account. Compare quotations only after a distributor has actually issued them; check equipment, installation, taxes, validity and totals.
9. Follow the existing order confirmation, installation updates, documents and after-sales paths using the same connected records. No screen should claim payment, delivery, installation or resolution before the corresponding operation is recorded/confirmed.
10. Try another customer's private record link while signed into your own account: it must not disclose the record.

## B. New business owner

1. Choose the business journey. It uses the same SIA popup pattern and secure email/password signup, with business account purpose.
2. Enter a valid OTP. A business welcome dashboard opens directly, using your real name. Signup must not create a company, grant platform administration, start a trial or publish a listing.
3. Open Company setup from Welcome. Choose only a supported preset: equipment distributor, dealer/retailer, installer/EPC or combined sales/installation.
4. Enter some details and select **Save and finish later**. Return to Welcome, reload the page and reopen setup. Confirm the saved details and step resume. This saves a private draft only.
5. In a second tab, save a newer draft; an older tab must report a revision conflict rather than silently overwrite it.
6. Finish company details, India/state/district, product/service choices and planned role counts. Review and confirm. Exactly one private company should be created for that retry key; planned positions must not create employees or grant permissions.
7. Refresh/retry after completion. Do not create another company accidentally. A newer draft for a different operation must not be cleared by retrying an older company operation.
8. Complete the saved company profile, coverage, catalogue/offers and communication settings. Activation, marketplace publication and OS access must show their actual separate states.
9. Add/invite employees using supported roles. Invitations must not count as accepted memberships. Check each employee's actual account sees only its permitted work; never distribute a shared owner password.
10. For an eligible, active company, review the configured trial scope and explicitly activate it. It must require no autopay mandate and display recorded start/end dates. Trial expiry must restrict new operational actions without deleting company records or implying a payment.
11. Exercise Today, customers/CRM, quotations, orders, stock/purchasing, projects/materials, collections/service and reports using actual records and suitable roles. Follow a customer across those records without duplicate entry or inconsistent totals. Record any specific broken action for correction.
12. Confirm cross-company isolation with two authorised companies: switching must change the visible scope; stale links or another company's IDs must not expose records or permit writes.

## C. SIA, access and support

- Pause/resume the SIA orb; page content must remain intact. System reduced-motion settings must stop animation. Escape should close an idle signup popup without leaving a backdrop.
- Switch customer/business journeys: only one signup popup should remain open. Switching the signed-in account must clear the other account's unfinished form.
- Read errors and email retry status. Do not treat opening an OTP screen, a WhatsApp draft, a preference toggle or a SIA suggestion as completed external delivery/business action.
- Use the Legal & privacy centre for your own receipts, optional marketing preference and grievances. Draft policies remain visibly unapproved. A real company agreement requires the current owner; it is separate from authorising payment.

## Real gates still open

The last read-only commercial inspection on 30 October found no active published plans, no configured trial scope and disabled billing. Therefore a working welcome dashboard is not proof that trial activation or paid automation is available in production. Configuration must use approved scope, authoritative plan records and explicit operator actions; do not bypass entitlements for a manual test.

Public marketplace discovery requires real approved company profiles and published catalogue/offer records. Equipment payment settlement, actual email delivery, real installations and after-sales outcomes require their own evidence. The application must never simulate those outcomes.

Phase 1 live recovery/release evidence, Phase 2 legal/tax review, grievance-officer appointment and GST details remain outstanding. This document does not waive those gates or certify either dashboard as production-ready.

## Reporting a result

For each failed step send: customer/business role, page URL, action attempted, expected result, actual result, time and redacted screenshot/error reference. Mark a journey passed only after you completed it with the connected records. No further automated test was started after the manual-testing instruction.
