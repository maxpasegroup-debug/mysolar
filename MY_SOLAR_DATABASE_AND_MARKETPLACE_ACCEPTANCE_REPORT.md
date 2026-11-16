# MY SOLAR — Database and Marketplace Acceptance Report

16 November 2026. **Overall: BLOCKED at the PostgreSQL installation/download boundary. Not accepted for deployment.**

The request explicitly says to stop and report if PostgreSQL installation or external infrastructure is required, or if database safety cannot be established. That boundary was reached in Step 1. No application/test repairs, schema execution or fictional business journey was attempted afterward. No mocked result replaces database acceptance.

## 1. Repository and environment inspected

| Item | Observed in this attempt |
| --- | --- |
| Repository | `C:\Users\kkyad\OneDrive\Desktop\mysolar\mysolar` |
| Branch | `main`, tracking cached `origin/main` |
| HEAD | `c51ebe562cb57a3071a44af09bfa4df6f5e54c30` — `feat: Add Admin-to-Customer Acceptance Report with verification details and results` |
| Starting worktree | Clean; no tracked or untracked changes reported |
| PostgreSQL commands | `postgres`, `initdb`, `pg_ctl`, `psql` not found through `Get-Command` |
| Standard installation folders | No PostgreSQL/Docker/Podman installation directory found in the Program Files checks |
| Running PostgreSQL | No process found by `Get-Process postgres` |
| Existing harness runtime | `.verification/postgres/pgsql/bin/postgres.exe` absent |
| Other checked binary path | `C:\pgsql\bin\postgres.exe` absent |
| Container commands | Docker and Podman not found through `Get-Command` |
| WSL | `wsl.exe` exists; read-only `wsl.exe --list --quiet` succeeded and returned no distributions |
| Approved test target | No process `TEST_DATABASE_URL` set; no `POSTGRES_BIN` set |
| Container configuration | No matching Docker/Compose files found in the repository inventory |

These checks establish that no usable, positively designated test runtime/target was available through the inspected locations and configuration. They are not an exhaustive claim about every disk location or remote service. No unknown connection was inferred or probed. `DATABASE_URL` values and secret `.env` files were not read or loaded. No new database connection was made.

`scripts/verify-postgres.mjs` was inspected. It requires `postgres`, `initdb` and `pg_ctl` before cluster creation. With the default runtime absent, it cannot proceed. The previous acceptance report already records its `ENOENT` preflight failure; that command was not redundantly rerun in this attempt.

## 2. Database environment used

**None.** No PostgreSQL server or container was installed, downloaded or started. No database/schema, user, company, grant, enquiry, quotation or access agreement was created. No migration ran.

The intended existing harness is suitable for further review once binaries are available: it creates a new workspace-local cluster, binds `127.0.0.1` on a dynamically selected port, uses a random bootstrap password, creates `mysolar_test_phase1`, passes an explicit test URL to child tests and stops its cluster afterward. It does not load the production `.env`.

Its integration tests must still be reviewed for the exact acceptance scenario. Existing historical-company fixtures sometimes set activation/publication flags directly or remove enrolment metadata. Such shortcuts cannot prove the requested registration → real administrator review → publication journey.

## 3. Exact setup instructions — not executed

The existing harness can use portable Windows PostgreSQL binaries without requiring a permanent database service. PostgreSQL's official Windows download page explicitly links an installer-free binary ZIP option: [PostgreSQL Windows downloads](https://www.postgresql.org/download/windows/), [EDB binary archives](https://productsdl.enterprisedb.com/download-postgresql-binaries).

1. On the official PostgreSQL Windows page, follow **zip archive of the binaries** to EDB. Select a supported Windows x64 release appropriate to the local machine. Record the selected PostgreSQL version; production-major compatibility is not yet established.
2. Download and extract the complete archive, preserving its layout. Arrange it so these files exist under this checkout:

```text
.verification\postgres\pgsql\bin\postgres.exe
.verification\postgres\pgsql\bin\initdb.exe
.verification\postgres\pgsql\bin\pg_ctl.exe
```

Do not copy just the three executables; preserve their libraries and the rest of the distribution. Do not replace any existing database data directory or register a shared database service. If an OS dependency/installer is required to run the binaries, that is another installation boundary to resolve explicitly.

3. In PowerShell at the project root, verify the binaries only:

```powershell
Set-Location 'C:\Users\kkyad\OneDrive\Desktop\mysolar\mysolar'
& '.\.verification\postgres\pgsql\bin\postgres.exe' --version
& '.\.verification\postgres\pgsql\bin\initdb.exe' --version
& '.\.verification\postgres\pgsql\bin\pg_ctl.exe' --version
```

If the complete binaries already live elsewhere, configure only the current PowerShell process with the known binary directory:

```powershell
$env:POSTGRES_BIN = 'C:\approved-local-path\pgsql\bin'
```

Replace that example with the actual local directory. Do not set `DATABASE_URL` to a guessed connection and do not alter the project `.env`, Railway or system-wide production settings.

4. Once local runtime readiness and test scope are reviewed, the existing disposable harness entry point is:

```powershell
node scripts/verify-postgres.mjs database.test.mjs
```

**This is a future test command, not an executed result.** It initializes a disposable cluster and the named integration suite applies migrations and changes fictional data inside its isolated target. The broad existing suite is schema/regression evidence, not by itself proof of all 15 requested UI/business steps. A connected acceptance scenario must preserve the genuine admin-driven state transitions and exercise the current new-company policy.

An alternative is a newly and explicitly approved dedicated loopback database named `mysolar_test_*` using the existing tests' safety checks. No such target was provided here. Do not repurpose an existing database merely because its name or URL looks like development.

No download, extraction, installation, environment-variable change or future command above was performed in this task.

## 4. Migration verification — BLOCKED

The prior read-only manifest inventory reported 51 entries through `050_direct_subscription_no_trial.sql`, including generated role catalogue entry 002 and both distinct 047 migrations. That is source inventory, not successful schema execution.

In this attempt:

- Migration intended-order execution: **BLOCKED**.
- Fresh schema and repeat/checksum tracking: **BLOCKED**.
- Required tables, constraints, foreign keys and relationships: **BLOCKED**.
- Current application/schema compatibility and readiness: **BLOCKED**.
- Upgrade/transaction/rollback/concurrency behavior: **BLOCKED**.

No new migration was identified in the preceding work, but no claim is made here that the current chain executes successfully. No deployed ledger was inspected and no pending production migration list is known.

## 5. Five regression failures — not repaired at this boundary

The last executed evidence in `MY_SOLAR_ADMIN_TO_CUSTOMER_ACCEPTANCE_REPORT.md` is **180 passed, five failed, zero skipped** from `node scripts/verify-master-local.mjs`. Those results were obtained in the previous attempt and were **not rerun here**. Step 1's explicit stop condition prevented proceeding with Step 3 repairs.

| Test | Previously established root cause | Relationship to admin/marketplace work | Resolution in this attempt |
| --- | --- | --- | --- |
| `tests/boss-dashboard.test.mjs:53` | Expected old Sales Booster “Online lead automation · Coming soon” wording; source now presents a team-assisted service offer | No demonstrated connection to company review or quotation routing | **BLOCKED / not attempted**; reconcile the approved feature/copy contract and retain role/real-data assertions |
| `tests/commercial.test.mjs:17` | Assertion assumes invitation-cap query is second; enrolment lookup makes it third | Existing commercial test contract, not demonstrated new routing defect | **BLOCKED / not attempted**; assert SQL purpose/bound exclusion rather than brittle call position; prove real capacity/concurrency afterward |
| `tests/legal-controls.test.mjs:10` | Expects old no-mandate-trial sentence despite current direct-subscription policy | Pre-existing policy/test mismatch, not proof of a failed enquiry | **BLOCKED / not attempted**; test the current approved policy while preserving billing/legal safeguards |
| `tests/sia-orb.test.mjs:5` | Expects `SiaOrb.control()`, absent from current exported API | No demonstrated direct admin/quotation dependency | **BLOCKED / not attempted**; resolve whether manual motion control is a required feature; do not simply delete accessibility assertions |
| `tests/sia-orb.test.mjs:10` | Expects a manual motion-toggle click handler that is absent | Same SIA UI/accessibility contract gap | **BLOCKED / not attempted**; implement/accept required control or intentionally settle the contract, preserving reduced-motion behavior |

These are prior diagnoses, not newly successful repairs. The suite must not be described as green. Actual legal/tax approval and the intended SIA accessibility scope remain distinct launch considerations.

## 6. End-to-end acceptance results

All database-backed steps are **BLOCKED**, not FAIL: they were not executed. No fictional records or mocked success responses were used as substitutes.

| # | Requested acceptance step | Result | Missing evidence |
| --- | --- | --- | --- |
| 1 | Business registration | **BLOCKED** | Real database-backed fictional registration/login |
| 2 | Company profile completion | **BLOCKED** | Persisted profile, branding, service and coverage records |
| 3 | Company activation submission | **BLOCKED** | Pending state through actual owner submission |
| 4 | Administrator authentication | **BLOCKED** | Persisted independent operator/session and server-side grant checks |
| 5 | Administrator approval | **BLOCKED** | Real activation action, revision and review/audit writes |
| 6 | Marketplace review | **BLOCKED** | Separate approval action and persisted state |
| 7 | Marketplace publication | **BLOCKED** | Explicit publish action and public-view eligibility |
| 8 | Customer searches for business | **BLOCKED** | Directory query over the persisted published company |
| 9 | Customer views public profile | **BLOCKED** | Actual profile response from the disposable application |
| 10 | Customer sends direct enquiry | **BLOCKED** | Real selected-recipient eligibility and committed enquiry |
| 11 | Business receives enquiry | **BLOCKED** | Correct recipient row, authorized inbox and detail reads |
| 12 | Business prepares/sends quotation | **BLOCKED** | Valid fictional OS entitlement, quotation policy and committed draft/issue operations |
| 13 | Customer views quotation | **BLOCKED** | Issued quote ownership, status and viewed transition |
| 14 | Cross-company isolation | **BLOCKED** | Actual negative requests across two businesses and two customers |
| 15 | Unpublished-company restrictions | **BLOCKED** | Actual unpublish action followed by directory/profile exclusion |

For later testing, free listing and enquiry receipt do not imply free quotation writes. The existing server requires eligible operational access for the business to prepare/send quotations. Use a fictional agreement through the existing authorized manual-access model inside the disposable target; do not enable Razorpay or delete enrolment metadata to bypass that requirement. No such agreement was assigned here.

## 7. Remaining blockers and deployment recommendation

1. Provide the local PostgreSQL binaries or an explicitly approved disposable target. Download/installation is the present boundary.
2. Execute and reconcile the existing migration chain in that target.
3. Repair and rerun the five regression contracts without weakening behavior/security/accessibility expectations.
4. Run the complete connected acceptance chain using genuine backend/database operations and fictional participants, including negative isolation/visibility cases.
5. Record browser behavior and the actual request/record/audit evidence before accepting the journey.

**Recommendation: BLOCKED / not ready for deployment approval.** The intended journey has not been proved. This report does not authorize a production migration or deployment.

XYZ, production/shared data, Railway, Razorpay and live billing were untouched. No unknown database was accessed. No application/test code, migration or environment configuration was changed. No commit, push or deployment occurred. Only this requested report was added; the task stops at the installation boundary.
