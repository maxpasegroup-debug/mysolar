# Phase 10 verification checklist

This checklist tracks scope, not results. Evidence and final dispositions belong in `PHASE_10_HANDOFF.md`.

- Immediate: Node syntax/import checks, dependency/lock consistency, pure-rule unit regressions, frontend asset/manifest/icon references, service-worker harness, configuration failures and secret-safe error handling.
- Dedicated disposable PostgreSQL required: fresh and upgrade migrations, HTTP authentication/CSRF, tenant/customer/assignment isolation, publication, enquiry/quotation transitions, operations/finance/stock, SIA proposals and commercial entitlements/quotas. Never use an unidentified configured database for these checks.
- Browser/tooling required: real navigation, console errors, mobile layout, keyboard/forms, translated navigation, installation/offline behavior. Harness checks do not substitute for real browser coverage.
- Operator configuration required: live SMTP delivery and compatible SIA provider. Do not send external requests or expose credentials while discovering configuration.
- Deployment access required: Railway live service, production migrations with backup/rollback approval, external health/TLS/proxy behavior and `mysolar.online` DNS/domain confirmation. No live deployment/domain/payment operation is implied by local verification.

The initial workspace is not a Git repository. Preserve existing files and record a baseline hash inventory before implementation edits. No reset, cleanup or reinitialization is authorized to conceal this limitation.
