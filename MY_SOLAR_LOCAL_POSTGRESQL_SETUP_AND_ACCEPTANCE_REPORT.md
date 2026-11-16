# MY SOLAR — Local PostgreSQL Setup and Acceptance Report

16 November 2026, Asia/Calcutta.

**Outcome: PASS for the scoped local backend/database journey.** A fresh local PostgreSQL environment was established without a Windows administrator installation. All 15 requested business steps passed with real HTTP and PostgreSQL operations. All five previously reported unit failures are resolved. This is not production deployment, live payment, external email-delivery or browser UX certification.

## 1. Checkout and safety

Repository: `C:\Users\kkyad\OneDrive\Desktop\mysolar\mysolar`.

Branch: `main`; starting HEAD `ba60e18be87c73a8515cc1322201c7de39b34c2e` — `feat: Add Database and Marketplace Acceptance Report detailing PostgreSQL installation issues and deployment blockers`.

The starting worktree was clean. No application `.env`, production credentials, customer records or unknown database URL was opened or used. No XYZ record was queried, copied, recreated or modified. No Railway, Razorpay, live billing, production setting, Git staging, commit, push or deployment operation occurred.

## 2. Host inspection and choice

| Check | Observed |
| --- | --- |
| Architecture | Windows x64 |
| OS build | Runtime `10.0.26200`; registry build `26200`, UBR `9974`, display version `25H2` |
| Registry product label | `Windows 10 Home Single Language` (reported as stored; not inferred from marketing version) |
| RAM at inspection | 8,214,204,416 bytes total, about 1,004,658,688 bytes free |
| C: free disk at inspection | 17,756,598,272 bytes, about 16.5 GiB |
| Elevation | Initial Windows token reported `ElevatedAdministrator=False` |
| Existing PostgreSQL/container runtime | No PostgreSQL, Docker or Podman command found; no approved test URL/binary path configured |
| Local write permissions | Temporary probe in `.verification/postgres` succeeded and was removed |

The initial CIM query was denied by the execution sandbox. Runtime APIs, registry and DriveInfo supplied the needed host details with normal host access. Additional execution/network access used for download and test processes did not install or invoke a Windows administrator installer.

**Choice: standalone portable PostgreSQL ZIP.** Docker would add a container/VM runtime on a machine with limited currently free memory. The ZIP works with the existing test harness, needs no service or reboot, and does not modify PATH or registry. Bundled optional tools were extracted but were not installed as services or run.

## 3. Official download and local preparation

Sources verified during this task:

- [Official PostgreSQL Windows downloads](https://www.postgresql.org/download/windows/) links the EDB binary ZIP option.
- [EDB binary archives](https://www.enterprisedb.com/download-postgresql-binaries) supplied the Windows x64 PostgreSQL 16.16 archive through its official download link.
- Resolved archive: `https://get.enterprisedb.com/postgresql/postgresql-16.16-1-windows-x64-binaries.zip`.

Archive size: **378,078,504 bytes**. Downloaded to `.verification/postgres/postgresql-16.16-1-windows-x64-binaries.zip`. The SHA-256 matched the publisher's HTTPS `.sha256` sidecar:

```text
5c0d06f3d26a929ecb36dd931409f1e51a4181355794a259b90aae8bffc57a9f
```

The archive and runtime directory were checked before creation; existing files/installations were not overwritten. Complete archive layout was extracted under `.verification/postgres/pgsql`. Native version checks returned PostgreSQL/initdb/pg_ctl **16.16**. No UAC approval, system service, global installation or OS dependency installation was needed.

These local artifacts are covered by the existing `.verification/` Git ignore. Runtime files and stopped disposable cluster files remain there for local verification work; they are not deployment inputs. No real production PostgreSQL major version was inspected or assumed.

## 4. Disposable database proof

Used the inspected existing harness:

```text
node scripts/verify-postgres.mjs admin-marketplace-acceptance.integration.test.mjs
```

The harness creates a **new UUID-named cluster on every run**, under this checkout's `.verification/postgres/cluster-*`, using `initdb`, a generated SCRAM password and `pg_ctl`. It binds only `127.0.0.1` on a dynamically selected local port, creates `mysolar_test_phase1` in that new cluster and passes an explicit process-only test connection to child tests. It does not fall back to production configuration.

Before applying any migration, the acceptance test checked the actual server responses:

- `current_database()` starts with `mysolar_test_`.
- `host(inet_server_addr())` is exactly `127.0.0.1`.
- `current_schema()` is the unique generated `mysolar_integration_*` schema.
- `SHOW data_directory` is under this checkout's newly created `.verification/postgres/cluster-*` path.

Actual version: **PostgreSQL 16.16, compiled by Visual C++ build 1944, 64-bit**.

The application pool points to that generated schema only. Test users/companies use `[TEST]` names and `example.invalid` email addresses. Passwords/session/encryption values are generated locally; no production secret was copied or printed. SMTP delivery workers, SIA providers, operational alerts and Razorpay are not used in this journey.

The integration helper drops its generated schemas and closes the application server/pool. The harness stops its cluster in `finally`. Final checks found no PostgreSQL processes and no `postmaster.pid` in any generated cluster directory. Bootstrap plaintext password files are removed by the harness. No server was left running.

## 5. Migration and schema verification — PASS, scoped

Real database evidence from `tests/admin-marketplace-acceptance.integration.test.mjs`:

1. Fresh schema applied **51 manifest entries** in the existing runner's order.
2. Installed names/checksums exactly matched `migrationManifest()`.
3. Running migrations again preserved all 51 names/checksums without duplicate application.
4. Required tables were present: users, platform grants, companies/reviews, enquiry recipients, quotation versions and lines.
5. Named constraints were present, including company lifecycle/publication gates and quotation tenant/source relationships.
6. A second newly created empty schema was migrated through `033_solar_os_workforce.sql`, then upgraded through 050. All earlier checksums were preserved and the final ledger matched the complete manifest.
7. Both distinct 047 filenames were tracked: Razorpay inbox and round-robin lead assignment. Generated entry 002 was included.
8. Actual application reads/writes exercised company/member/profile, review/audit, enquiry/recipient, manual commercial access and quotation relationships against that schema.

**No migration source file was changed or added.** These checks prove fresh installation, repeat tracking and an empty historical-schema upgrade. They do not prove migration cutover over representative production data, every historical-data combination, backup restoration or compatibility of an unknown currently deployed ledger. Production pending migrations remain unknown.

## 6. Five regression failures and repairs

| Failure | Root cause | Safe repair and retained safeguards | Result |
| --- | --- | --- | --- |
| Boss dashboard, `tests/boss-dashboard.test.mjs:53` | Test expected the older Sales Booster coming-soon sentence | Assert current team-assisted offer and its action link; retain real-data/role checks and add denial of automatic-lead/connected-channel claims | **PASS** |
| Commercial team cap, `tests/commercial.test.mjs:17` | Test assumed the capacity query was second; an enrolment lookup changed order | Match the capacity query by purpose; verify active members, pending/unexpired invitations and excluded invitation binding; test both full and spare capacity and null exclusion | **PASS** |
| Legal proposals, `tests/legal-controls.test.mjs:10` | Old no-mandate free-trial sentence conflicted with current direct-subscription policy | Assert no new trial, explicit supported paid authorization, setup creates no charge and historical-trial handling; preserve amount, draft/digest, tax/annual and disabled-commercial assertions | **PASS** |
| SIA orb control, `tests/sia-orb.test.mjs:5` | Application lacked the expected motion-control API | Restore an accessible native pause/resume button and mount it on pages containing the SIA orb; preserve safe bounded states, escaped labels and absence of external execution | **PASS** |
| SIA click behavior, `tests/sia-orb.test.mjs:10` | No manual motion-toggle handler existed | Toggle only the root motion attribute and matching buttons; CSS pauses the orb; retain reduced-motion support, no document-text rewriting, and verify correct control state after rerender | **PASS** |

Application changes are limited to `src/sia-orb.js`, `src/app.js` and `sia-orb.css`. The other repairs correct stale or brittle tests; no business permission, billing rule, capacity implementation or tax calculation was weakened to obtain a pass.

Final existing fixed safe unit allowlist: **185 passed, 0 failed, 0 skipped**. The separate existing focused admin unit/VM suite: **19 passed, 0 failed, 0 skipped**. These unit results are reported separately from the real database journey.

## 7. Real customer-to-business acceptance — all 15 PASS

Fictional primary business: `[TEST] Acceptance Aurora Solar`. Secondary business: `[TEST] Acceptance Boreal Solar`. Participants were three business accounts and two customer accounts, all created through real registration endpoints.

No company activation/publication flag was seeded or directly updated to make discovery pass. No enrolment metadata was deleted. No successful API or database result was mocked.

| # | Step | Result and observed evidence |
| --- | --- | --- |
| 1 | Business registration | **PASS** — real email-first request/verify/complete endpoints created verified persisted accounts; no public admin grants were issued |
| 2 | Company profile completion | **PASS** — company, legal/public identity, business profile and exact PIN coverage saved and reread through APIs/SQL |
| 3 | Activation submission | **PASS** — owner submitted; lifecycle became pending review, marketplace pending and publication false; pending queue included the company |
| 4 | Admin authentication | **PASS** — independent operator logged out/in with real password/session; persisted test-only operator grant loaded; anonymous/customer/owner admin access and missing-CSRF mutation were denied |
| 5 | Admin approval | **PASS** — real activation API; two concurrent same-revision approvals produced one 200 and one 409; active queue updated; secondary company correction/return/resubmission also worked |
| 6 | Marketplace review | **PASS** — separate marketplace approval changed approval state while publication remained false; secondary listing return/resubmission worked independently |
| 7 | Marketplace publication | **PASS** — explicit publish API made the listing public with zero company subscriptions; review records separately captured activation, marketplace approval and publication |
| 8 | Customer search | **PASS** — `/api/public/vendors?search=Acceptance%20Aurora&pin=682001` returned exactly the persisted primary company |
| 9 | Public profile | **PASS** — public vendor API and `/companies/<id>` returned the saved name/coverage; private account/ownership field names were absent from vendor projection |
| 10 | Direct enquiry | **PASS** — real match API selected that company; submission committed exactly one recipient; retry with the same submission key returned the same enquiry |
| 11 | Business receipt | **PASS** — correct business read the incoming enquiry before subscription; company-scoped in-app notification rows existed |
| 12 | Prepare/send quotation | **PASS** — explicit fictional manual-access plan assigned through platform APIs; linked lead/qualification saved; draft created and hidden from customer; issue action stored `sent` and enquiry `quotation_received` |
| 13 | Customer quotation view | **PASS** — owning customer read issued reference/status, performed view action and then saw `viewed`; database `viewed_at` persisted |
| 14 | Data isolation | **PASS** — secondary business/customer could not read the primary private records; other company inbox excluded the enquiry; forged company header returned 409 and unauthorized company selection 403 |
| 15 | Unpublished restrictions | **PASS** — never-published secondary company absent; unpublishing primary via admin removed it from search and public API/clean profile URL; authorized private enquiry/quotation history remained readable |

### Registration and email evidence boundary

The real registration handlers generated OTPs and encrypted mail jobs in PostgreSQL. The test read those genuine queued payloads using the ephemeral test encryption key and submitted the generated codes through the real verification APIs. It did **not** mock signup success, SMTP acceptance, HTTP responses or SQL results. No mail worker was started or email sent. This proves the backend registration/verification transaction, not external inbox delivery.

The independent administrator grant was an explicit bootstrap inside the verified disposable schema after proving registration created no grants. It was not a production grant or public-registration privilege path. Administrator authentication afterward used the actual login/session APIs.

### Quotation entitlement boundary

Free publication and receipt were tested with **no subscription**. Before operational quotation writes, the operator created/activated a fictional plan and assigned access through the existing manual-administration APIs. This records test access terms, not payment. No Razorpay checkout/mandate was created; `os_billing_contracts` remained empty. The test did not bypass business access guards.

The consultation quotation used an exempt-tax fixture with the application's required blank line/charge tax-rate inputs. Invalid zero-rate input under that treatment was explicitly rejected with 400 before the valid draft was created. No tax code was changed.

## 8. Commands and evidence

| Check | Final result |
| --- | --- |
| `node scripts/verify-master-local.mjs` | 185 passed, zero failed/skipped |
| `node --test --test-isolation=none tests/platform-admin.test.mjs` | 19 passed, zero failed/skipped |
| `node scripts/check.mjs` | 1,796 static checks passed, zero failed |
| `node scripts/verify-postgres.mjs admin-marketplace-acceptance.integration.test.mjs` | 18 counted tests passed, zero failed/skipped; includes the 15 journey steps, two schema subtests and the parent test |
| `git diff --check` | Passed |

Ignored local evidence:

- `.verification/local-postgres-unit.log`
- `.verification/local-postgres-admin-unit.log`
- `.verification/local-postgres-static.log`
- `.verification/local-postgres-acceptance.log` — final green real-database run
- `.verification/local-postgres-acceptance-first-db-attempt.log` — retained earlier failed fixture run
- `.verification/postgres/cluster-*/server.log` — generated local-cluster logs

Counts have different scopes; they are not coverage percentages. The entire repository-wide integration/recovery suite and browser harness were not run. The new test is a connected real backend/API/database scenario, not a headless browser click script.

### Earlier attempts retained honestly

1. An initial `initdb` attempt ran before ZIP extraction completed and failed on missing timezone files. No server started. Complete extraction and version checks resolved it.
2. The first safety assertion saw PostgreSQL's CIDR text `127.0.0.1/32`. The query was corrected to `host(inet_server_addr())`; strict equality to `127.0.0.1` was retained. No migration ran before that safety assertion passed.
3. The first full database attempt passed migrations and journey steps 1–11, then rejected the invalid exempt-tax fixture. Later dependent checks failed because no quotation ID existed. The fixture was corrected to the established API contract and an explicit invalid-input rejection test was retained. Final steps 1–15 all passed.

Each retry used a new disposable cluster; no previous/shared database was reused to obtain the final result. All generated clusters are now stopped.

## 9. Remaining limits and recommendation

**Local result: the administrator approval → free marketplace discovery → selected-company enquiry → authorized quotation journey now has real database-backed evidence. The local environment blocker and five known unit failures are resolved.**

Still outside this acceptance:

- Real SMTP/OTP/invitation receipt and supervised external delivery workers.
- Browser layout, keyboard/manual workflow acceptance and visual verification of the restored motion control.
- Live subscription/payment/Razorpay behavior and legal/tax production approval.
- Populated historical-data migration 034 cutover, production ledger comparison, backup/restore and recovery drills.
- Broader module workflows, all alternate quote/product/tax scenarios, all staff roles and the full existing integration suite.
- Railway configuration, DNS/TLS, deployed revision and production runtime resources.

No new schema migration is required by the regression repairs or this acceptance test. Existing migration files, package manifests, Railway and commercial/provider source were unchanged. Production may still have pending existing migrations; its state was not inspected.

**Recommendation:** proceed to a separately reviewed staging/release assessment and browser acceptance, using this local evidence. Do not interpret this report as approval to deploy, run production migrations or enable billing. No further local installation or manual permission intervention is currently needed for this portable PostgreSQL environment.

Only local test/UI repairs, the new acceptance specification, ignored runtime/evidence files and this report were created/changed. XYZ and production were untouched. No commit, push or deployment occurred.
