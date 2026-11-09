# Status

**As at:** 2026-11-01. `main` is `ee1281f`; the last code release is `fdc5d94` (2026-10-31), live on
gakinz.com through `scripts/release.mjs`. The order of work and what is left are in
[WORKBOOK.md](WORKBOOK.md); open issues are in [KNOWN-ISSUES.md](KNOWN-ISSUES.md).

This is the one home for measured counts: other documents point here rather than repeat a number.
Anything about signed-in use of the live system is NOT TESTED unless a row says otherwise (K-044).

**History.** Until 2026-11-01 this file also carried every batch record from 2026-09-22 to
2026-10-30. Those sections left the tree under D-044 and are read with
`git show ee1281f:docs/STATUS.md`:

| Old section | What it held |
|---|---|
| 0.1 | Production and privacy readiness audit, 2026-10-17 |
| 0.2 to 0.7 | Client journeys, batches one to six, 2026-10-18 to 2026-10-19 |
| 0.8 | Clerk sign-in, 2026-10-30 (D-052) |
| 1 | Audit and readiness, 2026-10-10 |
| 2 | Delivery phases |
| 3 | Open work as at 2026-10-19 (now [WORKBOOK.md](WORKBOOK.md) section 3) |
| 4 | What changed on each branch before the 2026-10-21 merge |
| 6 | The 2026-09-22 record (baseline, measurements, work ledger, server security changes) |

---

## 0. Current measurements

Measured on 2026-11-09 on the Mac on branch `phase-5/clerk-only` (from `main` at `e84f31f`) (the live checks and the host's PHP version the same day). Re-measure and update
this table when a count changes; the previous figures are in the history above.

| Measure | Command | Result |
|---|---|---|
| Unit tests | `npm test` | **PASS.** 632 tests in 55 files (Phase 5 removed the legacy client helpers and their tests and added `auth.store.test.ts`) |
| Server integration tests | `npm run test:server`, local throwaway `*_test` database | **PASS.** 562 tests in 44 files on local MariaDB 11.4.13 (Phase 5: `legacy-retired` 25 tests added; `auth`, `client-access` and `password-rehash` removed, `account`, `token-hashing`, `security-hardening`, `references` and `client-anonymise` adapted), run as `GK_TEST_DB=gakinz_p4full_test GK_TEST_PHP_PORT=5389 GK_TEST_PROVIDER_PORT=5390 npm run test:server`; CI (MySQL 8) passed on the previous release `b301ec7` |
| Server suite on MySQL 8 | `npm run test:server` against MySQL 8.0 (`docs/OPERATIONS.md` section 8) | Last PASS 2026-10-20 (519 tests). MySQL 5.7 NOT TESTED; the live engine is UNVERIFIED (K-099) |
| Type check and build | `npm run build` | **PASS.** 32 public pages and `app-shell.html` prerendered, `sitemap.xml` with 32 URLs |
| Lint | `npm run lint:ratchet` | **PASS** at the ceiling: 5 errors, 0 warnings. **`npm run lint` still fails** (K-002) |
| Documentation | `npm run docs:check` | **PASS.** 24 documents |
| PHP files | `ls server/*.php`, `php -l` | 66: 49 endpoints and 17 `_`-prefixed includes (`_ai.php` added), all passing `php -l` (PHP 8.5.12 locally; the host runs 8.4.27, checked 2026-11-08) |
| Tables | `grep -c "^CREATE TABLE IF NOT EXISTS" server/schema.sql` | 42 |
| CMS screens | `src/routes/index.tsx` under `/app` | 26: Today, 24 module routes and My account, in seven navigation groups |
| Client API groups | `grep -cE "^export const [a-zA-Z]+ *= *\{" src/lib/api.ts` | 46 (the unused `weather` group removed 2026-11-01) |
| `require_auth` | `grep -c "require_auth(" server/*.php` | Called in 43 of 66 files, 167 call sites (`_ai.php` is an include and calls none; `weather.php` is a 404 stub since 2026-11-02) |

`npm audit` on 2026-11-02: 0 critical, 0 high, 13 moderate (dev tooling, K-041). Semgrep 0 findings; gitleaks clean over the full history. Not measured on this run: anything signed in on the live system.
The design verification of 2026-10-31 (screens at five widths, axe 4.14) is in `docs/AUDIT.md`.

## 3. Open work

The order of work is [WORKBOOK.md](WORKBOOK.md) section 3. Issues and their state are in
[KNOWN-ISSUES.md](KNOWN-ISSUES.md).

## 5. Owner inputs outstanding

Each item unlocks the work named beside it. Tick it and add the date when it is decided, and
record a decision in `docs/DECISIONS.md` where it constrains future work. Silence is not
approval. **Never write a password, key or recovery code here.** Already decided on
2026-10-10: the design system (D-037), the six services (D-038), the GAkinz-led name (D-039),
the seven-destination navigation (D-040), the content and monetisation policy (D-041), the
feature list, the "deliberately not doing" list and phase 1 client access by password (D-043).
On 2026-10-14 the owner approved the redesign that replaces D-037's visual direction (D-046).

**Safety, before any real order (phase 1)**

- [x] The admin credential from git history rotated and all sessions revoked (K-001). Password rotated
      2026-10-12 (owner-reported); the account retired and its 32 sessions deleted 2026-10-30
- [x] The seed-password file is not in the live docroot (K-015). Checked 2026-10-21 before the deploy.
- [x] Which PHP files and SQL migrations are live, checked and recorded (K-006). 2026-10-21: SQL 1
      to 19 applied, every `server/*.php` uploaded (`docs/WORKBOOK.md` section 1). Since 2026-10-30
      each release uploads `server/*.php` itself.
- [ ] A backup restored somewhere safe and checked (K-010). Date:
- [ ] Recovery targets agreed. Proposed: back within one working day, lose no more than 24
      hours of changes (`docs/OPERATIONS.md` section 10). Agreed:
- [ ] Payment provider for launch. Recommended and applied reversibly: Stripe only, PayPal off
      until it has a webhook (D-034). Confirmed:
- [ ] Who can help if the owner loses access, and where recovery information is kept, outside
      this repository. Date:

**Business facts (phases 2 and 4)**

- [ ] Trading identity: sole trader or limited company, registered name and number if any
      (`site.ts` registration is `null`).
- [ ] VAT: registered or not, and whether shown prices include VAT.
- [ ] Website prices in `site.ts`, confirmed or replaced: Starter £1,500, Business £3,500,
      Ecommerce £6,000, Bespoke quoted, £180 per extra page, £350 copywriting, £600 brand mark,
      care £90 and £450 per month.
- [ ] New prices: general IT support (hourly or block) and IT consultancy (session or fixed
      review). The pages say "Priced per job, ask for a quote." until then (K-090).
- [ ] IT support coverage: remote only, or on-site, and which area, and the response time. The
      IT pages omit all three until answered, so spec 4.2 acceptance is unmet (K-090).
- [ ] The three exclusions inferred on the website pages: copywriting as an add-on, new pages
      at £180, and integrations quoted as Bespoke (K-092).
- [ ] Budget bands on the enquiry form: keep "Under £1,500" as the lowest, or add a smaller
      band for small IT jobs (K-091).
- [ ] Payment schedule: keep 40/30/30 (ex-VAT, due at acceptance, +30 and +60 days) or change
      it (D-035). Also whether partial payments are always separate instalment invoices.
- [ ] Cancellation, change and revision terms.
- [ ] Public contact details: email (`hello@gakinz.com` today), phone (`null` today), working
      hours, reply promise. This also sets the enquiry acknowledgement target in
      `docs/PRODUCT-SPEC.md` section 1.4.
- [ ] The operating targets in `docs/PRODUCT-SPEC.md` section 1.4, confirmed or changed.
- [ ] Data retention periods for enquiries, client records and invoices, and the other six
      rules in `docs/PRIVACY-READINESS.md` section 6. Since 2026-10-19 each period is a
      `$RETENTION_*` key in `config.php` (all `null`) that the read-only retention report counts
      against. Two of them, the enquiry and deleted-file periods, are also what the retention
      executor would delete by. **`$RETENTION_APPLY` stays `false` on the server** until these
      periods are agreed with an adviser, and the executor is not run with `--apply` before
      then (K-062, D-049).
- [ ] Deletion requests from clients (K-095): should "Data deletion request" tickets be
      created at high priority, carry a due date, show in Today, or email the owner? A request
      has a legal response deadline, generally one month, to be confirmed with an adviser.
- [x] **Client sign-in by reference and email** was withdrawn on 2026-11-09 (D-057): Clerk is the only sign-in, so there is nothing to switch on.
- [ ] **Adviser review of the client anonymisation rules** (K-108). Built 2026-10-20 and
      switched off. Before `$CLIENT_ANONYMISE_ENABLED = true`, an adviser confirms the
      decision table in the header of `server/_anonymise.php`: signed contracts do not block;
      the company name stays in `client_create` audit rows; Work and testimonial entries are
      edited by hand; free text is not searched; `proposals.acceptance_reference`,
      `client_feedback.owner_note` and `contracts.signed_name` are kept; and the refusal
      rules, then the owner agrees them. Decided:
- [ ] Work references (K-094): keep counting from 0001 each year, which lets a visitor or
      client infer roughly how many enquiries or projects came before theirs, or start each
      year at a random offset.
- [ ] Whether staff notes about a client go into a subject access export as they are, are
      reviewed first, or are left out (K-079, with an adviser).
- [ ] Legal pages reviewed by the owner, and by a professional if wanted (K-021).
- [ ] Parked by the owner on 2026-10-17, shown on the site as labelled placeholders until
      answered (`docs/PRIVACY-READINESS.md` section 10): ICO data protection fee and
      registration number; which integrations are live (mail provider, Stripe, Twilio, Google
      sign-in, Slack, OpenRouter) and the host and data location; whether AI drafting keeps
      client text (K-064); lawful bases and international transfers (with an adviser);
      governing law for the terms. The trading identity, VAT and retention items above are
      also placeholders on `/privacy`, `/terms` and `/pricing`.

**Brand and content (phase 4)**

- [ ] Main homepage message (draft in `docs/PRODUCT-SPEC.md` section 3).
- [x] ~~Sofia Sans licence file and weights confirmed.~~ Moot since D-046 (2026-10-14): the
      site now uses Bricolage Grotesque, Hanken Grotesk and JetBrains Mono, whose
      `@fontsource-variable` packages declare OFL-1.1.
- [ ] Owner portrait and short biography supplied.
- [ ] Up to three case studies, each with client permission, screenshots and an honest outcome.
      Screenshots of the owner's projects were captured on 2026-10-13 and ship in
      `public/images/work/`; the owner confirmed naming the client sites (D-046). Still to do:
      publish them as Work records with consent stored, so the CMS takes over from the
      built-in list.
      Say if a project cannot be screenshotted (an internal system, or a client who permits
      naming but not imagery), because it then needs a designed answer rather than an empty
      frame.
- [ ] Sectors page: keep with genuine examples, or fold into Services.
- [ ] Motion preview reviewed on desktop and phone before it is applied everywhere. The D-046
      working prototypes, motion included, were approved on 2026-10-14; whether they were
      reviewed on a phone is not recorded.

**Product scope (phases 2 and 3)**

- [ ] "Measurement" in project briefs means agreed scope and delivery evidence
      (`docs/PRODUCT-SPEC.md` section 6.4), or something else:
- [ ] Keep XLSX export, or CSV only (K-017).
- [ ] Raised by the 2026-10-18 journeys batch (old section 0.2), each built the simplest way until
      decided: whether a client's calendar file and portal show the meeting link (K-070);
      whether the owner is notified of a portal update request, call request or supplied
      asset, and how (K-071); whether the 40/30/30 schedule is shown on the public shared
      quote (it is part of the accepted-terms fingerprint but not displayed); and the earliest
      allowed "acceptance received" date, which is the quote's creation day today because a
      quote has no sent date.
- [ ] Raised by the third batch (old section 0.4): review the wording of the five project
      templates in `server/_templates.php` (tasks, client checklist items and measurements,
      written by an agent and checked only for length, em dashes and banned words) before
      using them with a client, because a ticked checklist reaches the client's portal at once
      (K-086). Also whether IT support time logged from a ticket should start as billable (it
      does today).

**Monetisation and social (phases 5 and 6)**

- [ ] Existing social accounts and handles checked; preferred `@gakinz`, fallback
      `@gakinzstudio`.
- [ ] Profile copy for Instagram, Facebook, LinkedIn, TikTok and WhatsApp Community
      (`docs/CONTENT-AND-GROWTH.md` section 6).
- [ ] Amazon Associates account status and the approved site or channels.
- [ ] Affiliate disclosure wording for articles (D-027). Since 2026-10-19 an article with an
      affiliate recommendation block shows the labelled gap "[Affiliate disclosure: owner to
      supply]" once, before the first card, until the wording replaces
      `AFFILIATE_DISCLOSURE_GAP` in `src/marketing/components/ArticleBody.tsx`. Publish no
      affiliate block before then: a visible "to supply" gap on a public page goes against the
      D-039 narrowing of D-027.
- [ ] AdSense account status, and agreement to use a certified consent platform first.
- [ ] **Ad pilot decisions** (D-050), before the tracked settings are switched on: which
      certified CMP (checked against Google's list, K-106, and whether it needs more than a
      URL, K-107); the AdSense publisher and in-article slot IDs; whether showing ads only
      with Purpose 1 consent is right, given that it suppresses limited ads for visitors who
      refuse; Auto ads kept off in the account; the CMP's and AdSense's cookies added to the
      cookie table and notices; and a "Privacy choices" link, or reliance on the CMP's own,
      so consent can be withdrawn. Decided:
- [ ] Weekly time available for content. Proposed: two to three hours.

**Outside this repository**

- [ ] Any change to global GEE OS files or `~/.claude` rules and hooks, approved separately.

---
