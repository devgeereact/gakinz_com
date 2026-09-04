# Deployment

**Status:** the two tracks below are verified from `.github/workflows/deploy.yml`,
`server/README.md` and `server/.htaccess`. **Everything about the live server state is
UNVERIFIED**: no server, database, FTP account or DNS record was contacted during this work.

---

## 1. Two tracks, one document root

| Track | What moves | Mechanism | Trigger |
|---|---|---|---|
| Client | `dist/` only | GitHub Actions, `SamKirkland/FTP-Deploy-Action@v4.4.0` | Push to `main` |
| Server | `server/*.php`, `.htaccess`, `schema.sql` | Manual upload by a person | A decision, never automatic |

Both land in the same cPanel document root for `gakinz.com`. The workflow uploads with
`server-dir: ./` into an FTP account already scoped to that folder.

**A change under `server/` is not live when it is committed.** A schema change is not applied
when it is written. This is the single most common way work here looks finished and is not.

## 2. Client deploy

`.github/workflows/deploy.yml`:

```
on: push, branches: [ main ]
  actions/checkout@v5
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

Then watch the repository's Actions tab.

### Before you push

```bash
npm run build     # runs tsc -b first, so a type error blocks the deploy
npm test
npm run lint      # currently fails, see docs/KNOWN-ISSUES.md K-002
```

`npm run build` is the gate that matters: the workflow runs the same command, so anything that
fails locally fails the deploy.

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
5. Confirm `GET /api.php` returns `[]`.

There is no `/smoke` route any more. The public smoke-test page and its route were removed
during the demo-surface cleanup, so step 5 of the old instructions could not pass.

## 5. Outstanding server work

**This list cannot be reconciled from the repository.** The previous `CLAUDE.md` accumulated
roughly 25 "deployed and live" and "needs re-deploy" markers across sessions, with no single
current list, and no server was contacted during this migration.

**Status of every item below: UNVERIFIED.**

### Files that may need uploading

Every PHP file added or changed since the last confirmed upload. Because the last confirmed
upload is itself unknown, the safe assumption is that any of the 44 files in `server/` may be
behind the repository. The files the previous notes named at least once as outstanding:

```
_smtp.php  _sms.php  _slack.php  _monitor.php
ai.php  announcements.php  auth.php  careplan.php  clients.php  comms.php
contracts.php  cron.php  design.php  dev.php  figma.php  files.php  github.php
integrations.php  invoices.php  knowledge.php  leads.php  mail.php  oauth.php
payments.php  portal.php  projects.php  proposals.php  reports.php  resourcing.php
slack.php  time.php  users.php  weather.php  _bootstrap.php
```

`weather.php` was recorded as being stale on the server in a way that broke CORS for its GET.
The repository copy routes through `_bootstrap.php` correctly. Live state is **UNVERIFIED**.

### Schema statements that may need running

All of them are at the foot of `server/schema.sql` from line 291, as comments. The grouped
list is in `docs/DATA-MODEL.md` section 4. Which have already been applied is **UNVERIFIED**.

### Configuration keys that may need setting

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
| `$PAYPAL_CLIENT_ID`, `$PAYPAL_SECRET`, `$PAYPAL_MODE` | PayPal |
| `$GOOGLE_CLIENT_ID`, `$GOOGLE_CLIENT_SECRET`, `$GOOGLE_REDIRECT`, `$APP_URL` | Google SSO |
| `$CRON_KEY`, `$REPORT_RECIPIENTS` | Scheduled jobs and the digest |
| `$GITHUB_TOKEN`, `$FIGMA_TOKEN`, `$SLACK_WEBHOOK_URL`, `$CALENDLY_URL` | The four external connectors |

**The tracked template carries placeholders, not values.** As of 2026-09-04 `DB_NAME`,
`DB_USER`, `$SEED_ADMIN_EMAIL`, `$SMTP_HOST` and `$IMAP_HOST` are all `REPLACE_` placeholders.
Two of them used to hold real production identifiers, and the mail host used to name a server
retired during the 2026-07 migration, which fails silently rather than loudly because a
retired host of that kind still resolves and still answers. The real mail hostname is a
hosting fact held in the operator's notes; this repository does not state hosting facts. See
`docs/KNOWN-ISSUES.md` K-003.

**This changed the template only.** Whether the **live** `config.php` still points at the
retired mail host is UNVERIFIED and is one of the checks in the next section.

### How to establish the real state

Nothing in this list can be closed from here. Closing it needs someone with server access to,
for each PHP file, compare the server copy with the repository copy, and for each migration,
check whether the column or table exists. Until that is done, this section stays marked
UNVERIFIED and no release note should claim otherwise.

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
