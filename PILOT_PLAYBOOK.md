# Controlled business pilot

Status: **NOT STARTED — participant authorization and live release evidence pending.**

This playbook prepares Phase 5. Local tests from earlier phases are engineering evidence, not evidence that real companies use or will pay for MY SOLAR. No participant has been recruited, registered or contacted by this preparation.

## Approve the scope first

Proposed starting cohort: up to three companies covering distributor, installer/EPC and combined operations, with an owner, a relevant employee and two consenting customers per company. Proposed initial observation window: 14 days, extended when genuine installation/service milestones take longer. These are proposals for the operator to approve, not booked participants or evidence of demand. One company can establish the first onboarding case; repeatability requires additional independent cases.

Before any real account creation or invitation, record:

- The named companies and people approved to participate; intended roles and approved contact addresses.
- Whether assistance may create records on their behalf, send invitations, review relevant records and observe their work. Let each participant set their own password through the existing flow.
- Permission for any screen sharing/recording, separately. Record observations without capturing credentials, invitation/recovery tokens or unrelated customer information.
- The production environment/release authorized for the trial, a start/end date, support contact and the person who can pause the pilot.
- Approved trial/access terms. No payment, paid status, discount, plan publication or custom-domain connection is implied by joining the pilot.

Keep participant contact details and observations in ignored `.pilot/` or an approved private system. The committed templates contain no real participant information. `.gitignore` is an accidental-commit safeguard, not encrypted storage.

## Live entry gate

Record actual evidence for the intended target. Do not infer it from a successful local test or a public healthy response alone.

| Gate | Required evidence | Current pilot status |
| --- | --- | --- |
| Correct release | Intended deployed release identifier and target confirmed | Not verified |
| Database | Supported migration history/checksums include 012; no pending mismatch | Not verified live |
| Worker | Correct release, recent heartbeat, observed trial notification, restart without duplicate | Not verified live |
| Access/privacy | Owner/employee/customer access and cross-company denial in the released environment | Not verified live |
| Email | Approved invitation/recovery address actually receives a valid, expiring link; failures handled | Not verified live |
| Recovery/operations | Current restore evidence, accountable support contact and failure monitoring | Current applicability not verified |
| Commercial scope | Current access mode, published versions, actual entitlements, trial/end dates and limits recorded | Live review blocked by Railway authentication |
| Participants | Explicit approved roster and invitation/observation scope | Not supplied |

No new staging environment is created by this phase. Use the explicitly approved existing target and its actual release evidence. A missing gate stays open; do not bypass it to claim the pilot started.

## Assisted onboarding — first session

1. The owner creates their personal account using **Get Started → Distributor**, or signs in to their existing account. Avoid duplicate companies/accounts.
2. Register the company in the existing onboarding flow. Choose the correct business preset and complete profile, customer-facing brand/contact details and actual services/coverage. Optional visual details can wait.
3. The independent platform operator reviews/activates the company through the existing protected interface. Record the waiting time separately from time spent filling the setup forms.
4. Review **Plan & access status** against the actual approved terms. Pre-billing access is not the same thing as an assigned FREE plan or paid activation. Use current published plans only; new trial terms/plan changes require their own authorized commercial action.
5. Invite the employee with the least appropriate role that enables their real work. Share only the recipient-bound invitation using the existing supported flow. The employee chooses their own password and opens their assigned workspace.
6. Open **Today**. Save the first genuine customer/lead and next follow-up. Explain the difference between CRM follow-ups and customer-submitted enquiries.
7. For customer discovery, check genuine published catalogue/offer information and truthful PIN/service coverage. Public listing/offer approval and publication remain separate from company activation.
8. The consenting customer uses their own customer account. Link an existing company contact through the existing reviewed customer invitation; do not substitute an owner's or shared staff login.
9. Open personal reminder preferences. Initially approve a staff-only reminder rule against maintained dates. Observe one stored reminder and delivery record. Add customer reminders only when the owner and the customer experience/preferences have been reviewed.
10. Record first-session time, assistance required and the first useful saved record using the private observation template. Do not mark unaided onboarding when an operator completed the form for the participant.

## Observe ordinary work

| Task | Owner / employee observation | Customer observation | Evidence |
| --- | --- | --- | --- |
| Daily work | Opens Today, identifies a next action, updates a real follow-up/assigned task | Understands current request/order status | Saved record and observation |
| Discovery/enquiry | Maintains truthful offers and service coverage; responds to received enquiry | Searches own PIN, reviews real products/providers and submits own need | Same enquiry and recipient records |
| Quote/comparison | Issues correct equipment, quantities, tax and installation scope | Understands exclusions/validity, asks questions, compares available versions | Actual issued versions for the same enquiry |
| Agreement/order | Prepares the order from current agreed terms and separately accepts | Explicitly confirms exact terms; preference alone does not place an order | Linked quotation/order and confirmation events |
| Installation | Records actual milestones and shared updates | Finds the linked progress and understands unrecorded/uncertain details | Actual project linked to that order |
| Service | Triages/assigns/resolves an actual issue with a customer update | Can request service from a confirmed order and follow it | Actual service record and shared history |
| Automation | Reviews approved rules, dates and failed deliveries | Can opt out; sees only owned reminders | Job/delivery identities plus the actual inbox |

Use two quotations only when two genuinely eligible distributors serve the customer's request. Do not fabricate another vendor, widen coverage falsely, invent a purchase or report a fake after-sales problem to fill the scorecard. If a real installation/service event has not occurred, record **not yet observed** and extend observation or use the separately identified local training exercise. Automated fixture results are not real pilot outcomes.

Suggested rhythm: brief owner/employee check-in each working day, a customer check-in after their next real decision, a midpoint review, and an end-of-window review. No check-in messages have been sent by the assistant; sending them requires the approved scope.

## Fix feedback in order

1. Stop real onboarding/affected actions for any privacy, cross-company access, lost-record or incorrect-money defect. Preserve evidence privately and assess affected records before resuming.
2. Reproduce confirmed workflow failures locally with fictional records; fix the existing flow and run focused regressions before the authorized release.
3. Resolve confusing labels, missing next actions and mobile friction demonstrated by observations. Retest with the same role and ask the participant to repeat the task unaided.
4. Keep enhancement requests separate from launch blockers. Avoid rebuilding implemented CRM/operations or promising payroll, autonomous AI, payment checkout, external reminder delivery, uploaded-file storage or connected custom domains that this release does not provide.

No new defect was inferred from an unreported real user's experience in this preparation.

## Agree the success measures before scoring

Suggested measures, subject to operator approval:

- Each company reaches a useful saved record and at least one employee completes their assigned task using their own account.
- Count distinct observed working days and repeat use after the first assisted session, not just account creation.
- Record completed-unaided, completed-assisted, blocked and not-yet-observed separately for every key workflow. Calculate unaided completion only from actually observed attempts.
- Record onboarding minutes, support minutes, task duration and customer explanation/comparison comprehension. Ask what they would otherwise use and whether they would choose to keep using MY SOLAR.
- Reconcile sampled enquiry → issued quote → order → project/service links and exact totals with authorized records. Any unresolved security or incorrect commercial-record defect blocks expansion.
- Observe reminders, opt-out and recovery on the released worker. A stored delivery is not a read receipt; personal feedback is separate evidence.
- Record willingness to pay against a specific, verified offer and collect actual operating/support costs. Willingness is not a verified payment.

Do not select a final price or declare a commercially viable offer until costs, access terms, scope and repeat adoption have been reviewed. Set numeric thresholds explicitly with the operator; none has been silently adopted as a pass gate.

## Read-only evidence collection

`scripts/pilot-snapshot.mjs` reads only approved cohort IDs and aggregate records in a completed window. It does not onboard people, change plans, send messages or run migrations. It never loads `.env` automatically.

1. Copy `pilot/cohort.example.json` to ignored `.pilot/cohort.json`.
2. Record the explicit approval reference/time and actual approved company, customer and participant UUIDs. Use a completed, timezone-qualified window after approval. Keep names, emails, passwords and invitation links outside this file.
3. An authorized operator supplies the intended PostgreSQL connection through the existing process environment. Verify the target without printing credentials. After separate live-read approval:

   ```powershell
   node scripts/pilot-snapshot.mjs .pilot/cohort.json --confirm-read-only-production > .pilot/snapshot.json
   ```

   For a disposable loopback database named `mysolar_test_*`, use `--local-test` instead. No production snapshot was collected by this preparation.

The tool checks the full checkout migration history, starts a PostgreSQL read-only/repeatable-read transaction, and returns sanitized commercial settings/plans, cohort-scoped counts, recorded activity days, known provider token metadata and reminder statuses. It excludes names, emails, record bodies, credentials and unrelated company records. Database size is an observation, not a provider charge. Activity is not proof of unaided use or satisfaction. It does not prove that the deployed web code matches the checkout.

Finish the pilot with a signed-off evidence review: **continue**, **extend with specific questions**, or **pause and fix**. An automated report cannot substitute for that business decision.
