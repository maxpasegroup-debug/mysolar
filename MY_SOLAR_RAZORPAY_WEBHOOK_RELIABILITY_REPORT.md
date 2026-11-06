# MY SOLAR — Razorpay webhook reliability report

**Date:** 6 November 2026  
**Scope:** Local source review and automated checks only. No database migration, production database, Railway setting, Razorpay credential, live webhook, or deployment was accessed or changed.

> **Historical snapshot:** This report documents the pre-inbox audit state. The local implementation has since been added in [MY_SOLAR_RAZORPAY_WEBHOOK_INBOX_IMPLEMENTATION_REPORT.md](MY_SOLAR_RAZORPAY_WEBHOOK_INBOX_IMPLEMENTATION_REPORT.md). Migration 047 remains unexecuted, so database-backed behavior is still unverified.

## Decision

**The latency fix cannot be safely completed without a schema and worker change.** Per the task restrictions, work stopped before making that change. No source code was changed for this request. A report-only delivery is not a claim that the current webhook meets the five-second target.

## Root cause

The route is registered at `/webhooks/razorpay/` before the general JSON parser, using Express `raw()` with a 256 KB limit. It then:

1. Applies an IP rate limit, checks billing configuration and verifies the HMAC over the original raw body.
2. Parses JSON, filters supported event types, validates the subscription ID and event ID, and hashes the raw payload.
3. Looks up the matching billing contract and checks mode; it checks the event table for an existing event/hash.
4. Calls Razorpay synchronously for the latest subscription. For `subscription.charged`, it then calls Razorpay for the payment and invoice, sequentially.
5. Opens a database transaction, locks user/company/contract rows, checks company lifecycle and plan mapping, then applies the event. For a charge, payment/invoice evidence is checked before updating the entitlement and subscription state. Only after the transaction completes does the route return 2xx.

`server/commercial/razorpay.js` gives each provider call a 10-second timeout. Therefore a non-charge event makes one external request and can wait up to 10 seconds before DB work; a charge makes up to three serial external requests and can wait up to 30 seconds, plus database and application overhead. The five-second acknowledgement risk comes directly from placing remote provider verification inline before the response.

## Persistence, duplicates, and recovery today

- `os_billing_events` stores a payload hash, provider event ID, contract ID, event kind and receive time. Unique keys protect against duplicate provider IDs and repeated payload hashes.
- The event row is inserted inside `processBillingEvent`, which runs in the same transaction as state and entitlement changes. The table has an immutability trigger and no pending/processing/retry state, payload, attempt count, lease, or worker index.
- If any processing step fails, the transaction rolls back the event row along with state changes. Razorpay receives an error and may redeliver, but the application has no independent durable retry record or worker recovery path.
- There is an early duplicate lookup before the provider calls. It avoids work for already committed events. Concurrent duplicate requests may both do provider lookups; the unique insert in the transaction is the final idempotency guard.
- Paid access is only assigned for `subscription.charged` after a captured INR payment and matching paid invoice are fetched and validated. Authentication/activation events alone do not grant paid access.
- Cancellation/completion events update the billing contract and reminder state; cancellation does not erase an already-paid access period. Pending/halted/paused/resumed/update states are recorded as observations; they do not grant a new entitlement.
- Renewal periods are compared against the currently recorded period before assignment, protecting against an older invoice replacing a later paid period. Contract/company locks serialize transactional state changes. However, event-time ordering itself is not stored, and there is no durable inbox from which to inspect/replay failed or delayed events.
- The event table is an immutable processed-event record, not a durable queue. Existing `mail_jobs` and `automation_jobs` are purpose-specific queues with different constraints and workers; reusing them for payment events would mix retention, retry and state semantics and is not safe.

## Architecture

### Current

`raw body → signature check → contract/dedupe DB reads → serial Razorpay reads → entitlement transaction/event insert → 2xx`

Acknowledgement waits for remote Razorpay and business processing. Failed processing is dependent on Razorpay redelivery.

### Required design (not implemented)

`raw body → signature + schema validation → short DB transaction: insert durable inbox row with unique mode/event ID and payload hash → commit → 2xx`

An independently running worker would claim inbox rows with a lease and `SKIP LOCKED`, fetch authoritative subscription/payment/invoice evidence, then atomically apply the verified billing event and mark the inbox row processed. Failures would retain the row and schedule bounded exponential retries; expired leases would be reclaimable. A terminal/manual-review state and safe error code would keep poison events observable. Duplicate deliveries would return 2xx only when the matching event is already durably stored (including pending/retry/processed states).

The worker must preserve the existing proof rules: never grant entitlement from a browser redirect, authenticated mandate or event text alone; require provider-side captured payment and matching paid invoice. Current provider subscription state should be fetched during processing, while paid periods must only advance monotonically. Cancellation must preserve already-paid access through its recorded end date. Every received event and each processing attempt should remain auditable without exposing credentials or unnecessary personal information.

## Required infrastructure change

Create a database migration for a dedicated Razorpay webhook inbox, rather than weakening the immutable processed-event table. At minimum it needs:

- Provider mode plus unique provider event ID and payload hash constraints.
- Durable, integrity-protected event content sufficient for verification/reprocessing; protect any personal data at rest and apply a defined retention policy.
- `received`, `processing`, `retry`, `processed`, and `review_required`/terminal state, attempt count, next-attempt time, lease/claim fields, safe last error code, created/processed timestamps.
- Indexes for ready/retry and abandoned-lease scans, plus event history lookups.
- A worker/heartbeat/alert path and operational tooling to inspect/retry safe failures.
- A transaction boundary that commits the inbox insert before sending 2xx and atomically commits entitlement changes with the processed marker.

This requires a migration and a deployed worker/infrastructure path. Both are explicitly outside this task's allowed scope, so neither was started.

## Timing measurements

No end-to-end acknowledgement benchmark was run: the repository has no injectable webhook persistence/worker harness, and a local mock cannot prove durable commit latency. The exact configured provider request timeout budget is measurable from code:

| Event path | Sequential provider calls before 2xx | Configured timeout budget, provider portion only |
|---|---:|---:|
| Non-charge subscription event | 1 subscription lookup | Up to 10 seconds |
| Charge/renewal event | Subscription + payment + invoice lookups | Up to 30 seconds |

Database lookup, transaction, lock waits, and response serialization add to those bounds. These are timeout budgets, not observed wall-clock timings or production performance claims. After the inbox and worker exist, add a local test with delayed provider and DB fixtures measuring p50/p95/p99 acknowledgement time from request receipt through committed inbox insert; target p95 below one second and enforce a sub-five-second upper bound under the agreed test load.

## Verification run

- `node --test tests/business-subscription.test.mjs tests/business-subscription.integration.test.mjs`: **24 passed, 0 failed, 1 skipped**. The skipped test requires a database-backed environment. Existing focused coverage includes raw-body signature checks, duplicate processing protection, and no access before verified charge.
- `npm.cmd run check`: **1,742 passed, 0 failed**.
- `node --test`: **216 passed, 5 failed, 59 skipped** (280 total). The five failures remain: Boss dashboard old Sales Booster “Coming soon” expectation; commercial team-cap invitation assertion; legal proposal amount assertion; two SIA orb tests. Skips include database-backed cases.
- No route-level acknowledgement timing, durable queue, processing-retry, or event-history integration tests could be added without the migration-backed inbox/worker.

## Exact next action

Authorise a **local-only schema and worker implementation** for a dedicated durable Razorpay webhook inbox, including its migration file, retry/lease processing and route-level tests. Do not execute the migration against any database as part of that implementation. Then run isolated database integration tests and measure committed-inbox acknowledgement latency. Production configuration and rollout remain separate and are not authorised by this report.
