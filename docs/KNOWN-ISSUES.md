# Known issues

Open problems, each with evidence and a status. **Nothing in this list was fixed during the
documentation migration**, by decision: that work does not touch application code.

Severity is judged on impact to the live business, not on how hard it is to fix.

| ID | Issue | Severity | Status |
|---|---|---|---|
| K-001 | A live super-admin credential is in git history | Critical | Open, rotation UNVERIFIED |
| K-002 | Lint fails: 60 errors, 7 warnings | Medium | Open, recorded not fixed |
| K-003 | `config.php.example` named a retired mail host | Medium | **Fixed in the template.** Server value UNVERIFIED |
| K-004 | `api.php` accepts an unauthenticated POST | Medium | Open |
| K-005 | `contact.php` has no spam protection | Medium | Open |
| K-006 | Deployed server state is unknown | Medium | Open, needs server access |
| K-007 | No MIME allowlist on upload | Low to medium | Open |
| K-008 | Accessibility is unmeasured | Medium | Open, NOT TESTED |
| K-009 | Marketing entry chunk is 556.94 kB | Low | Open |
| K-010 | No backup procedure is known to exist | High | Open, outside this repository |
| K-011 | `access.ts` can drift from the server role lists | Low | Open, no automated check |
| K-012 | Stale design residue in `src/index.css` | Cosmetic | Open |
| K-013 | Four shared includes are outside the `.htaccess` deny rule | Informational | Open |
| K-014 | `auth.php` hard-codes a fallback seed-admin address | Low | Open |

---

## K-001 · A live super-admin credential is in git history
**Severity:** critical · **Status:** open, rotation UNVERIFIED

The previous `CLAUDE.md` recorded a working login for the production CMS, with a plaintext
password, in a tracked file. That file is in every clone and in the history.
The account holds `super_admin`, which reaches the mailbox, client records, invoices and
payment links.

The same account is named in `server/config.php.example` as the `$SEED_ADMIN_EMAIL` value.
Read it there rather than restating it here.

**What was done here:** the credential is not carried into any new document. The slim
`CLAUDE.md` does not contain it.

**What removing it from a file does not do:** it does not remove it from history. Rotation on
the live system is the only thing that closes this. Whether that has happened is UNVERIFIED.

**Action:** rotate the password on the live system. Then decide separately whether history
needs rewriting, which is a force push and was explicitly excluded from this migration.

---

## K-002 · Lint fails
**Severity:** medium · **Status:** open, recorded not fixed

`npm run lint` on 2026-09-04 reports **60 errors and 7 warnings across 42 files**. Six errors
are auto-fixable.

| Count | Severity | Rule |
|---|---|---|
| 39 | error | `react-hooks/set-state-in-effect` |
| 7 | error | `react-refresh/only-export-components` |
| 4 | error | `react-hooks/refs` |
| 4 | error | `unused-imports/no-unused-imports` |
| 2 | error | `prefer-const` |
| 1 | error | `react-hooks/immutability` |
| 1 | error | `react-hooks/purity` |
| 1 | error | `@typescript-eslint/no-unused-expressions` |
| 1 | error | `@typescript-eslint/no-explicit-any` |
| 5 | warning | `unused-imports/no-unused-vars` |
| 1 | warning | `react-hooks/exhaustive-deps` |
| 1 | warning | `react-hooks/incompatible-library` |

Worst files: `src/app/modules/Platform.tsx` (7),
`src/components/calendar/shadcn-full-calendar.tsx` (5), then `Contracts.tsx`,
`DevPipeline.tsx`, `src/components/ui/sidebar.tsx` and `src/marketing/pages/Sectors.tsx` at 3
each.

**Reading of it:** 39 of the 60 are one rule, which usually means one repeated pattern
(setting state in an effect to react to a route change or a prop) rather than 39 separate
mistakes. The unused-import errors are trivial. The `react-hooks/refs`, `purity` and
`immutability` errors are the ones worth reading individually.

**Rule going forward:** the backlog must not grow. A change that adds a new lint error is not
complete. Whether to fix, ratchet with a baseline, or accept it is the owner's call.

---

## K-003 · `config.php.example` named a retired mail host
**Severity:** medium · **Status:** fixed in the template on 2026-09-04. The live server value
is **UNVERIFIED**

`server/config.php.example` set both `$SMTP_HOST` and `$IMAP_HOST` to a host that was retired
in the July 2026 migration.

**Why it was worse than a stale string:** a retired host of that kind still resolves and still
answers on port 465, so a `config.php` copied from the template connects to a machine where
the mailboxes no longer exist. It fails as an authentication error at best, and silently at
worst. It never fails as "host not found", which is the failure people watch for.

**What was done:** both values are now `REPLACE_smtp_host` and `REPLACE_imap_host`, with a
comment stating that the real hostname is a hosting fact held in the operator's notes and not
in this repository, and warning about the silent-failure mode. A placeholder fails loudly on
connection, which is the behaviour wanted from a template.

**What is still open:** whether the **live** `config.php` on the server points at the retired
host. That cannot be checked from here. See `docs/DEPLOYMENT.md` section 5.

**Related, same change:** `DB_NAME`, `DB_USER` and `$SEED_ADMIN_EMAIL` were also replaced with
placeholders. They were real production identifiers sitting in a tracked file. `DB_NAME` and
`DB_USER` now carry the cPanel `<cpanel_user>_<database>` convention as a comment instead of
the values.

---

## K-004 · `api.php` accepts an unauthenticated POST
**Severity:** medium · **Status:** open

`server/api.php` is the original smoke test. `GET` lists rows from `items`; `POST {name}`
inserts one. Neither calls `require_auth`.

**Impact:** anyone who can reach the domain can insert rows into a production table
indefinitely. It is not a data-disclosure path, since `items` holds no business data, but it
is an unauthenticated write to the live database and an easy way to fill the disk.

**Options:** gate the POST behind `require_auth`, or remove `api.php` from the document root
now that it has served its purpose. Note that `server/README.md` still uses `GET /api.php`
returning `[]` as the post-install check, so removing it means replacing that step.

---

## K-005 · `contact.php` has no spam protection
**Severity:** medium · **Status:** open

The public enquiry endpoint validates a name, an email format and a message of at least 10
characters, then inserts into `enquiries` with the caller IP. There is no rate limit, no
honeypot, no captcha and no duplicate check.

**Impact:** the leads pipeline is the studio's front door. Automated submissions land directly
in it as apparently real leads.

**Note:** the pattern to reuse already exists. `auth.php` throttles by counting recent
`audit_log` rows for the same email or IP.

---

## K-006 · Deployed server state is unknown
**Severity:** medium · **Status:** open, needs server access

Which of the 44 PHP files on the host match the repository, and which of the schema migrations
have been applied, cannot be determined from here. See `docs/DEPLOYMENT.md` section 5.

**Impact:** a feature can be complete in the repository and absent in production, and nothing
in this repository will say so. It also means no release note can honestly claim the system is
up to date.

---

## K-007 · No MIME allowlist on upload
**Severity:** low to medium · **Status:** open

`files.php` caps size at 20 MB, generates a random stored name and sanitises the extension to
alphanumerics, but accepts any file type.

**Mitigation in place:** the upload directory gets a generated `.htaccess` with
`Require all denied` and `Deny from all`, and everything is streamed back through PHP with
`X-Content-Type-Options: nosniff`.

**Residual risk:** the whole defence against an uploaded script being executed is that one
generated `.htaccess`. If it is missing, unreadable or not honoured by the web server, an
uploaded PHP file sits in a directory under the document root. That the deny works on the live
host is **NOT TESTED**.

---

## K-008 · Accessibility is unmeasured
**Severity:** medium · **Status:** open, NOT TESTED

A previous session recorded an axe run with zero violations on three pages. That claim is
withdrawn: no report was kept, the run is not reproducible from this tree, there is no
accessibility tooling in `package.json`, and the palette has been replaced twice since.

See `qa/ACCESSIBILITY-AUDIT.md` and `docs/DECISIONS.md` D-020.

---

## K-009 · The marketing entry chunk is over the warning threshold
**Severity:** low · **Status:** open

556.94 kB raw, 173.79 kB gzipped, against Vite's 500 kB warning. The heavy libraries are
already lazy; this is the eager public-site entry.

Previous documentation recorded 539 kB, so it has grown. See `qa/PERFORMANCE-AUDIT.md`.

---

## K-010 · No backup procedure is known to exist
**Severity:** high · **Status:** open, outside this repository

Nothing in the repository defines or performs a database or uploads backup.
`server/uploads/` is gitignored, so client file uploads exist in exactly one place.

Backup arrangements belong to the hosting account, not to this repository, so this entry is a
pointer rather than a task. It is recorded because the absence is easy to mistake for a
solved problem.

---

## K-011 · `access.ts` can drift from the server role lists
**Severity:** low · **Status:** open

`src/lib/access.ts` duplicates the per-endpoint role constants by hand. Nothing checks the two
against each other. Drift shows up as a module a user can open but every request inside it
returning 403, or as a hidden module the user could actually use.

`src/lib/access.test.ts` covers the client side only.

---

## K-012 · Stale design residue in `src/index.css`
**Severity:** cosmetic · **Status:** open

- A Pulse-kit block of `gradient-red` through `gradient-cyan` helpers and a `.dark-blue`,
  `.gaussian-black`, `.classic-light` scrollbar rule, none of which belongs to this brand.
- Two section comments still say "Forest Editorial", and one points at `DESIGN-SYSTEM.md §5`.
  The rules under them are current; only the labels are stale.

Not fixed because this migration does not touch application code.

---

## K-013 · Four shared includes are outside the `.htaccess` deny rule
**Severity:** informational · **Status:** open

`server/.htaccess` denies `config.php` and `_bootstrap.php` by name. It does not deny
`_smtp.php`, `_sms.php`, `_slack.php` or `_monitor.php`.

All four contain function definitions only and produce no output when requested directly, so
the practical impact is nil today. It is recorded because the rule's intent was to cover
shared includes, and a future include that runs code at load would be exposed.

The same `FilesMatch` also still names only `(api|contact|ai|verify)\.php` in its
non-rewrite rule, which is a stale list. It is harmless, because an earlier rule already lets
every real file through.

---

## K-014 · `auth.php` hard-codes a fallback seed-admin address
**Severity:** low · **Status:** open

`server/auth.php` line 484:

```php
$email = $GLOBALS['SEED_ADMIN_EMAIL'] ?? 'dev@gakinz.com';
```

`ensure_seed()` runs only against an empty `users` table, so this fires once on a fresh
install and never again. It is the last remaining production identifier hard-coded in tracked
source, now that `config.php.example` uses a placeholder.

**Impact:** low. It names the seeded super-admin account in a public-readable file, and on a
fresh install with an unfilled config it would silently create an account under an address the
operator may not control.

**Not fixed here** because it is application code, and this documentation migration does not
change behaviour. The fix is one line: fail with a clear message when `$SEED_ADMIN_EMAIL` is
unset or still a placeholder, rather than defaulting.
