# Deployment

**Status:** current as at 2026-10-10. The two tracks are read from
`.github/workflows/deploy.yml`, `.github/workflows/ci.yml`, `server/README.md` and
`server/.htaccess`. Section 5 is the one list of server work not yet uploaded. **Everything about the live server state is
UNVERIFIED**: no server, database, FTP account or DNS record was contacted during this work.

---

## 1. Two tracks, one document root

| Track | What moves | Mechanism | Trigger |
|---|---|---|---|
| Client | `dist/` only | GitHub Actions, `SamKirkland/FTP-Deploy-Action@v4.4.0` | CI passing on a push to `main` |
| Server | `server/*.php`, `.htaccess`, `schema.sql` | Manual upload by a person | A decision, never automatic |

Both land in the same cPanel document root for `gakinz.com`. The workflow uploads with
`server-dir: ./` into an FTP account already scoped to that folder.

**A change under `server/` is not live when it is committed.** A schema change is not applied
when it is written. This is the single most common way work here looks finished and is not.

## 2. Client deploy

`.github/workflows/deploy.yml`:

```
on: workflow_run of "CI", completed, branch main   (since 2026-10-10)
if: CI concluded success AND the CI run was a push
  actions/checkout@v5     ref: the exact commit CI verified
  actions/setup-node@v5   node-version: 22
  npm ci
  npm run build
  SamKirkland/FTP-Deploy-Action@v4.4.0
    server / username / password from repository secrets
    local-dir: ./dist/
    server-dir: ./
```

Credentials come from `secrets.FTP_SERVER`, `secrets.FTP_USERNAME` and
`secrets.FTP_PASSWORD`. None of the three values belongs in this repository.

Everyday loop:

```bash
git add . && git commit -m "..." && git push
```

Then watch the repository's Actions tab. The deploy starts only after the CI workflow passes
on that push; a red CI run means nothing is deployed.

### Before you push

```bash
npm run build          # runs tsc -b first, so a type error blocks the deploy
npm test               # unit tests (src/)
npm run test:server    # PHP endpoints against a throwaway local *_test database
npm run lint:ratchet   # fails if the lint backlog (K-002) grows
npm run docs:check     # links, and the document-sync rule in AGENTS.md
```

CI runs all five, plus `php -l` over `server/`, and the deploy waits for it.

### Release policy

Approved 2026-10-10. Until then CI ran no tests and the deploy did not wait for it (K-035).

- **Keep the Vite build and the existing client and server model.** CI runs unit tests, the
  server tests and PHP syntax, and gains targeted synthetic endpoint and browser checks as
  they become available.
- **Lint is a ratchet first, then a gate.** `npm run lint:ratchet` enforces the ceiling
  in `scripts/lint-ratchet.mjs`; the current figure is in `docs/STATUS.md` (K-002). Clear the errors in small batches, then make
  lint blocking. `continue-on-error` alone is advisory, not a ratchet.
- **Production deploys only after the required checks pass**, or through a deliberate,
  approved release trigger. Every push to `main` deploys `dist/`, so documentation or planning
  work is not pushed to `main` without considering that.
- **Server files and SQL stay deliberate operator actions**, recorded in section 5 with their
  evidence and rollback.
- **Small reviewed batches**, one concern each, on feature branches. Never `npm audit fix
  --force`, a framework change, or every improvement merged into one unreviewable release.
- **Dependencies.** Identify reachable advisories, update compatible versions in small
  batches, and remove unnecessary exports only with approval (K-041). A CSV-only export may
  remove the `xlsx` problem if nobody needs workbooks (K-017). A Tailwind major migration is
  never an automatic audit fix. Any lockfile update needs a fresh build and test run.

## 3. Server deploy

The server has no Node, so nothing is built there. PHP files are uploaded as source.

Gate before uploading any PHP:

```bash
find server -name '*.php' -print0 | xargs -0 -n1 php -l
```

Then upload the changed files to the document root. `config.php.example` and `README.md` stay
out of the document root: the `.htaccess` denies `.md` and `.sql` anyway, but there is no
reason to put them there.

`config.php` on the server is never overwritten by a deploy and never leaves the server.

## 4. First-time server setup

Adapted from `server/README.md`, which has been corrected as part of this migration.

1. Upload the contents of `server/` to the document root, except `config.php.example` and
   `README.md`.
2. Copy `config.php.example` to `config.php` on the server and fill in the real values.
3. Run `schema.sql` against the project database through phpMyAdmin.
4. Create `server/uploads/` in the document root and make it writable. `files.php` creates it
   and drops a deny-all `.htaccess` on first use, but a pre-created directory avoids a
   permissions surprise.
5. Confirm `GET /api.php` returns `{ ok, php, db }` (D-031).

There is no `/smoke` route any more. The public smoke-test page and its route were removed
during the demo-surface cleanup, so step 5 of the old instructions could not pass.

## 5. Not yet uploaded

This is the one list of server work that is committed and not known to be live. It covers
every server change since `c57eb4a` (`main`, 2026-10-10) on the stacked branches in PR #8, and,
conditionally, the 2026-09-22 relaunch set already on `main`. Keep it current: a change under
`server/` updates this section in the same pull request (`AGENTS.md`, "Keeping documents
current"), and `npm run docs:check` enforces that in CI.

**Status of the live server: UNVERIFIED** (K-006). No server, database or FTP account was
contacted while any of this work was done. The repository cannot say which of these files or
statements are already live; only someone with server access can (section 5.6).

### 5.1 Operator actions, in order

1. **Delete `seed_admin_password.txt` from the live document root if it is there** (K-015).
   `auth.php` used to write a generated super-admin password into that file, and the old
   `.htaccess` did not deny `.txt`. If it was there, treat the password as public: sign in,
   change it, and revoke the account's sessions. Confirm the credential from git history is
   rotated at the same time (K-001).
2. **Upload `server/.htaccess` first.** It denies `.txt` except `robots.txt` and `llms.txt` (2026-09-22) and
   every `_*.php` include (K-013), so both are in force before anything else lands.
3. **Run the SQL in section 5.2**, in the order given.
4. **Set or check the configuration in section 5.4.** In particular leave `$PAYPAL_ENABLED`
   unset or `false` (K-026).
5. **Upload the PHP in section 5.3** as one set. Several files depend on each other:
   `payments.php` requires the new `_money.php`, and uploading one without the other breaks
   every payment action.
6. **Check invoices already paid through Stripe** (K-025). Before this change Stripe charged
   the ex-VAT subtotal and marked the invoice fully paid. For every invoice with
   `vat_rate > 0` marked paid by the Stripe webhook (`audit_log.action =
   'invoice_paid_stripe'`), compare the amount in the Stripe dashboard with the invoice total
   including VAT, and reconcile any shortfall with the client by hand.
7. **Prepare the redesign content (D-046)**, once SQL 7 and 8 have run and `site.php` and
   `work.php` are uploaded. In the CMS, publish the owner's real projects in Work with client
   consent stored, switch on up to five for the homepage hero in the order wanted, and attach
   the desktop and mobile screenshots with alt text. Publish Site content sections only when
   their copy is final. A published Work record also shows on the live `/work` page at once,
   because the client already deployed reads `work.php` too (source inspection of
   `src/marketing/data/work.ts` at `c57eb4a`), so publish only finished records.
8. **Owner test before merging**, on the other computer after `git pull --ff-only` on
   `feat/redesign-2026`: the Work hero switches and order, one Site content publish, Enquiries
   drag and drop between stages, and the Client Portal signed in as a client. Development
   calls the live API, so each of these is a real write (`docs/KNOWN-ISSUES.md` K-044).
9. **Merge to `main`** only when you want `dist/` deployed. CI must pass first, and the merge
   deploys the client that expects these server changes.
10. **Walk the post-upload checks** in section 5.6.

### 5.2 SQL, in order

Every statement is at the foot of `server/schema.sql`. There is no migration runner; nothing is
applied until someone runs it (`docs/DECISIONS.md` D-008). Older statements in the
`MIGRATIONS` comment block are listed in `docs/DATA-MODEL.md` section 4; whether they have run
is UNVERIFIED, so check them before step 1.

| # | Statement | Source | Notes |
|---|---|---|---|
| 1 | `SELECT share_token, COUNT(*) c FROM files WHERE share_token IS NOT NULL GROUP BY share_token HAVING c > 1;` | 2026-09-22 relaunch, skip if already run | A pre-check, not a change. It must return **zero rows**. If not, stop and resolve the duplicates: statement 2 would fail, and a duplicate token is already a live bug, because the public lookup in `files.php` uses `LIMIT 1` |
| 2 | `ALTER TABLE files ADD UNIQUE KEY uk_file_share (share_token);` | 2026-09-22 relaunch | `files.share_token` is the sole credential on an unauthenticated download (D-029) |
| 3 | `CREATE TABLE IF NOT EXISTS work (...)` | 2026-09-22 relaunch | The work ledger. Safe to run twice |
| 4 | `CREATE TABLE IF NOT EXISTS work_images (...)` | 2026-09-22 relaunch | After `work`; it carries a foreign key to it |
| 5 | `CREATE TABLE IF NOT EXISTS payment_events (...)` | 2026-10-10, K-025 | Additive, safe to run twice. Until it runs, the Stripe webhook still checks amounts but cannot de-duplicate redelivered events or keep the evidence row |
| 6 | `ALTER TABLE enquiries ADD COLUMN next_action_at ..., ADD COLUMN next_action_note ..., ADD COLUMN priority ...;` | 2026-10-10, enquiry follow-ups | Additive. Run once only; a second run fails on the duplicate column. Until it runs, `leads.php` lists and updates enquiries but answers `followup: false` and stores no follow-up |
| 7 | `ALTER TABLE work ADD COLUMN hero_order ..., ADD COLUMN brand_colour ..., ADD COLUMN hero_word ..., ADD COLUMN hero_desktop_file_id ..., ADD COLUMN hero_desktop_alt ..., ADD COLUMN hero_mobile_file_id ..., ADD COLUMN hero_mobile_alt ..., ADD KEY idx_hero (hero_order);` | 2026-10-14, homepage hero | After statement 3. Additive. Run once only; a second run fails on the duplicate column. The full statement is the commented block at the foot of `server/schema.sql`. Until it runs, `work.php` serves every existing action with the hero fields as `null`, `?action=hero` returns `[]`, and `setHero` / `heroOrder` (or a create/update carrying a hero value) answer 503 |
| 8 | `CREATE TABLE IF NOT EXISTS site_content (...)` | 2026-10-14, editable site copy | New table, safe to run twice. Until it runs, `site.php?action=get` returns `{}` (the public site keeps its built-in copy) and the CMS actions answer 503 |

No existing data is migrated by any of these statements.

### 5.3 PHP to upload

**Changed on the branch since `c57eb4a`**, from `git diff --name-only c57eb4a -- server`.
Upload all of them, with `.htaccess`:

```
.htaccess
_money.php (new)  auth.php         blog.php         clients.php
comms.php         contact.php      content.php      contracts.php
design.php        dev.php          files.php        knowledge.php
leads.php         oauth.php        payments.php     projects.php
proposals.php     resourcing.php   site.php (new)   support.php
tasks.php         testimonials.php time.php         users.php
work.php
```

`site.php` and `work.php` are the 2026-10-14 redesign batch (homepage hero and editable site
copy). Upload them **after** SQL statements 7 and 8 if you want the new features at once;
either order is safe, because both degrade until their statement has run.

**If the 2026-09-22 relaunch set was never uploaded**, which is UNVERIFIED, also upload these
ten files from `main`. The other relaunch files are in the list above already.

```
_bootstrap.php  _monitor.php  ai.php      api.php      figma.php
invoices.php    mail.php      portal.php  weather.php  work.php (new)
```

`support.php` now serves `client`-role callers and is security-critical, like `portal.php`
(`docs/SECURITY.md` section 3). `README.md`, `schema.sql` and `config.php.example` stay out
of the document root.

### 5.4 Configuration this set needs

| Key | Why it matters now |
|---|---|
| `$PAYPAL_ENABLED` | Leave unset or `false`. PayPal checkout refuses to start unless it is `true`, because there is no PayPal webhook yet (K-026) |
| `$SEED_ADMIN_EMAIL` | `auth.php` no longer falls back to a hard-coded address. With this unset, a first run against an empty `users` table creates **no account at all** |
| PHP `fileinfo` extension | `files.php` sniffs the real type of an upload with `finfo_file()`. Without it, uploads return 503 rather than accepting anything |

The full key list is in section 5.7.

### 5.5 Behaviour changes to expect

From the 2026-09-22 relaunch set, if it was not already live:

- **Care-plan monitoring may report sites as down.** TLS peer verification is on and redirects
  are no longer followed, so an expired certificate fails and a redirecting site reports its
  own 301. Check the certificate first. Internal addresses are no longer checked at all.
- **`employee`, `editor` and `trainer` lose the Portal screen.** The staff preview branch of
  `portal.php` is now super_admin, admin and manager, matching `invoices.php`.
- **`api.php` is a read-only health check** returning `{"ok":true,"php":"8.x.y","db":true}`.
  The unauthenticated POST is gone (K-004).
- **Attaching an image to a work record makes that file permanently public** and clears any
  earlier share expiry. Detaching does not revoke the link; revoke it in Files.
- **Existing file rows keep their stored MIME type**, filtered through the allowlist on
  download. Files already in `uploads/` with a now-rejected extension need a manual review.

From the branch:

- **Stripe pay links charge the VAT-inclusive total**, matching the invoice, PDF and portal.
- **The Stripe webhook refuses mismatched payments.** A different amount or currency leaves
  the invoice unpaid and writes an `invoice_payment_mismatch` audit row.
- **PayPal checkout is switched off** (button removed, endpoint 503).
- **Magic links sign in client accounts only**, and not one with two-factor on. Google sign-in
  refuses accounts with two-factor on (K-027).
- **Quotes can be accepted only from "sent" and before `valid_until`, exactly once**, and an
  accepted quote can no longer go back to draft (K-028).
- **Create endpoints return the new record's id**, not the audit-log row id (K-029).
- **Editing a blog post keeps its body** (K-016).
- **`files.php` quotes the column `stored`**, so it works on MySQL 8 as well as MariaDB
  (K-040). The live table needs no change.
- **Clients can message the studio** from the portal through `support.php`: list, read, start
  and reply to their own tickets only. Staff replies show to clients as "GAkinz" (K-039).
- **Enquiries carry a next-action date, a note and an owner priority** once SQL statement 6
  has run.
- **`auth.php?action=me` also returns `totp_enabled`**, which My account reads (K-024).
- **Work records can go on the homepage hero** (2026-10-14): at most five, published only.
  Unpublishing or removing a record takes it out of the hero. Attaching a hero screenshot
  makes that file permanently public, exactly as attaching a work image does.
- **Public-site copy can be edited in the CMS** through `site.php` (2026-10-14). Nothing
  changes on the public site until a section is published.

### 5.6 Post-upload checks

1. `https://gakinz.com/api.php` returns `{"ok":true,...,"db":true}`. A 500 or a missing `db`
   means `config.php` cannot reach the database.
2. `https://gakinz.com/robots.txt`, `/llms.txt` and `/sitemap.xml` are served, not 403.
3. An invented `.txt` name in the document root returns 403, and so do
   `https://gakinz.com/_money.php` and `https://gakinz.com/_smtp.php`.
4. `GET /work.php?action=list` returns `[]` from a signed-out browser. A 500 means the work
   tables were not created.
5. In the CMS, open an existing blog post for editing: the body appears before Save is enabled.
6. Open Enquiries and set a follow-up date on a real enquiry you intend to chase. If the
   response says the follow-up was not stored, statement 6 has not run.
7. The next time you create a real record (client, project, task), confirm it opens straight
   away. No test record needs creating on the live system for this.
8. After publishing a work record with an image, open its public page in a signed-out browser
   and confirm the image loads.
9. `GET /work.php?action=hero` and `GET /site.php?action=get` return `[]` and `{}` from a
   signed-out browser before anything is flagged or published, and the flagged records and
   published sections afterwards. A 500 means the upload is
   wrong, not that a statement is missing: both degrade without their statement.
10. Do **not** test a real payment or a real send. Stripe behaviour is covered by
   `npm run test:server` against a fake provider; a live check needs Stripe test-mode keys on a
   non-production copy.

**Establishing the real state.** For each PHP file, compare the server copy with the
repository copy; for each statement, check whether the table, column or key exists. Record the
result in `docs/STATUS.md` and close K-006 only then. Until that is done, no release note
describes this project as deployed.

**Rollback for this set.** Re-upload the previous versions of the listed PHP files and
`.htaccess`, kept before overwriting. The new tables and columns can stay; nothing else reads
them. See section 6.

### 5.7 Configuration keys

From `server/config.php.example`. Absent keys degrade the matching feature rather than
breaking the application.

| Key group | Enables |
|---|---|
| `DB_*` | Required. Nothing works without it |
| `ALLOWED_ORIGINS` | Required. `_bootstrap.php` fatals without the constant |
| `OPENROUTER_KEY`, `OR_MODEL`, `OR_SITE` | Every AI feature |
| `OPENWEATHER_API_KEY` | Header weather widget |
| `$SMTP_*` | Outgoing mail, invoice chasing, invites, magic links, the weekly digest |
| `$IMAP_*` | The in-app inbox. Also needs the PHP `imap` extension |
| `$TWILIO_SID`, `$TWILIO_TOKEN`, `$TWILIO_FROM` | SMS |
| `$TWILIO_WHATSAPP_FROM` | WhatsApp |
| `$STRIPE_SECRET`, `$STRIPE_WEBHOOK_SECRET`, `$STRIPE_SUCCESS_URL`, `$STRIPE_CANCEL_URL` | Stripe pay links |
| `$PAYPAL_CLIENT_ID`, `$PAYPAL_SECRET`, `$PAYPAL_MODE`, `$PAYPAL_ENABLED` | PayPal, off unless `$PAYPAL_ENABLED` is `true` |
| `$GOOGLE_CLIENT_ID`, `$GOOGLE_CLIENT_SECRET`, `$GOOGLE_REDIRECT`, `$APP_URL` | Google SSO |
| `$CRON_KEY`, `$REPORT_RECIPIENTS` | Scheduled jobs and the digest |
| `$GITHUB_TOKEN`, `$FIGMA_TOKEN`, `$SLACK_WEBHOOK_URL`, `$CALENDLY_URL` | The four external connectors |

**The tracked template carries placeholders, not values.** `DB_NAME`, `DB_USER`,
`$SEED_ADMIN_EMAIL`, `$SMTP_HOST` and `$IMAP_HOST` are `REPLACE_` placeholders. The mail host
used to name a server retired in the 2026-07 migration; whether the **live** `config.php` still
does is UNVERIFIED (K-003). The real mail hostname is a hosting fact held in the operator's
notes, not here.

## 6. Rollback

| Track | Rollback |
|---|---|
| Client | Revert the commit and push. Actions rebuilds and re-uploads |
| Server | Re-upload the previous version of the file. Keep a copy before overwriting |
| Schema | There is no down migration. A column addition is additive and safe to leave; an `UPDATE` such as the timesheet grandfathering is not reversible |

## 7. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Actions run fails at `npm ci` | `package-lock.json` out of step with `package.json` |
| Actions run fails at `npm run build` | A TypeScript error. `tsc -b` runs first |
| Actions run fails at the FTP step | One of the three secrets is wrong or the host changed |
| API returns "Database connection failed" | Wrong credentials in the server `config.php`, or the user lacks privileges |
| API returns a 500 on a feature that works locally | A migration has not been run |
| A feature returns 503 | Its configuration key is not set on the server |
| Browser reports a CORS failure in development | The dev port drifted from 5102, or the live `ALLOWED_ORIGINS` does not list it |
| An endpoint 404s | The PHP file was never uploaded |

DNS, TLS certificates, mail hosting and Cloudflare proxy state are **out of scope for this
repository**. Earlier revisions of the project documentation gave instructions in those areas
that were wrong and caused outages. Read the operator's global notes instead.
