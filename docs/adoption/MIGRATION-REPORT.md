# Documentation migration report — GAkinz

Companion to `docs/adoption/AUDIT.md`. Nothing has been deleted.

**Status: the migration has been carried out.** The slim root `CLAUDE.md` is adopted and is the
live Claude-specific pointer. The previous 29 kB `CLAUDE.md` was replaced in place; its content
remains in git history and is classified in `docs/adoption/AUDIT.md`.
`docs/adoption/CLAUDE.proposed.md` was the draft of that replacement. It is retained only as an
adoption record, not as a pending proposal, and it is not current instruction.

Sections 1 to 5 below are the proposal exactly as it was written before approval, kept unedited
as the record of what was put forward. Where they describe the root `CLAUDE.md` as a draft, or
as untouched pending approval, they describe that moment and not the current state. Section 6
records what was actually built.

---

## 1. Proposed documentation structure

The rule is one fact, one home. Today the same fact appears in up to four places, and the
stale copy is the one that gets trusted.

```
AGENTS.md                 shared contract, every agent, written        [DONE]
CLAUDE.md                 Claude-specific pointer, slim                [DRAFT at docs/adoption/CLAUDE.proposed.md]
README.md                 human entry point, currently the stock Vite template
.agent/
  PROJECT.yml             project contract                             [DONE]
  CURRENT-TASK.md         task contract                                [DONE]
  MCP-PROFILE.yml         integration authority                        [DONE]
docs/
  ARCHITECTURE.md         surfaces, routes, data flow, module anatomy
  API.md                  the 44 endpoints, roles, request and response shape
  DATA-MODEL.md           31 tables, ownership, the migration situation
  DESIGN.md               the brand actually implemented, from index.css and tailwind config
  SECURITY.md             auth, seven roles, client isolation, AI caps, upload and CORS rules
  DEPLOYMENT.md           the two-track deploy, outstanding uploads, outstanding SQL
  STATUS.md               what is built, partial, unverified. The only file that changes often
  DECISIONS.md            dated decision records, replacing the narrative in CLAUDE.md section 13
  adoption/
    AUDIT.md              this adoption's claim audit                  [DONE]
    MIGRATION-REPORT.md   this file                                    [DONE]
    CLAUDE.proposed.md    the draft replacement                        [DONE]
    HOLDING.md            material with no agreed home yet             [see section 5]
GAkinzOS.html             original product specification, unchanged, still the product authority
DESIGN-SYSTEM.md          unimplemented design contract, fate undecided
server/README.md          server-side deploy notes, needs correcting
```

Two things that will not live in this repository at all: hosting and DNS policy, and the
dev-server port registry. Both already have an authoritative home in the operator's global
notes, and both have caused damage when a second copy drifted.

## 2. Migration map

Every section of the previous `CLAUDE.md` has a destination. `HOLD` means it needs a decision
before it moves.

| From | Content | To | Treatment |
|---|---|---|---|
| §1 | Repo, domain, document root, deploy branch | `docs/DEPLOYMENT.md` | Keep |
| §1 | Database name and user | Remove from tracked files | Already in `config.php.example`; `docs/DATA-MODEL.md` names the pattern, not the value |
| §1 | FTP username | Remove | The workflow reads it from a secret. Record only "stored in `secrets.FTP_USERNAME`" |
| §2 | cPanel, home directory, server IP placeholders | Global notes | Remove from here, point at the global record |
| §2, §5, §7.5, §11, §12 | Cloudflare grey-cloud instructions | Delete, do not migrate | Contradicted by dated evidence and directly harmful. Preserved in `AUDIT.md` and in git history |
| §3 | What the project is | `docs/ARCHITECTURE.md` and the new `CLAUDE.md` | Rewrite: 44 endpoints, not one |
| §4 | Data-flow diagram | `docs/ARCHITECTURE.md` | Keep, correct `api.php` to `server/*.php` through `_bootstrap.php` |
| §5 | Tech stack | New `CLAUDE.md` | Rewrite to React 19 and TypeScript |
| §6 | Key files | `docs/ARCHITECTURE.md` | Rewrite: `vite.config.ts`, and `server/` is tracked |
| §7 | Golden rules | New `CLAUDE.md` "Non-negotiable constraints" | Keep 1 to 4, drop 5, reword 6 to reflect the hand-uploaded server track |
| §8 | Local development | New `CLAUDE.md` "Commands" | Keep, verified |
| §9 | Build and deploy | `docs/DEPLOYMENT.md` | Keep, verified |
| §10 | Adding features with data | `docs/API.md` and `docs/DATA-MODEL.md` | Keep, correct the `require` line |
| §11 | Troubleshooting | `docs/DEPLOYMENT.md` | Keep the deploy and API entries, drop the DNS entries |
| §12 | What not to do | New `CLAUDE.md` | Merge into the constraints, drop the Cloudflare line |
| §13 | Kit choice, language decision, app structure | `docs/DECISIONS.md` | Convert to dated decision records |
| §13 | Brand palette and fonts, all three versions | `docs/DESIGN.md` | Rewrite from `src/index.css` and `tailwind.config.js`. Keep the superseded palettes in `DECISIONS.md` as history |
| §13 | Module inventory, capability paragraphs | `docs/STATUS.md` and `docs/API.md` | Rewrite as a current-state table of 22 modules, not a session log |
| §13 | Auth, seven roles, client isolation, AI caps | `docs/SECURITY.md` | Keep, verified against `access.ts` and the endpoint role lists |
| §13 | Every "DEPLOYED AND LIVE" and "NEEDS RE-DEPLOY" marker | `docs/DEPLOYMENT.md` | HOLD. Consolidate into one outstanding-uploads list, but the true state needs a server check |
| §13 | New config keys per sprint | `server/config.php.example` | Already there. Delete the duplicate list |
| §13 | Migration statements per sprint | `docs/DEPLOYMENT.md` | Point at `server/schema.sql` line 291 onwards rather than restating |
| §13 | Tests and accessibility pass | `docs/STATUS.md` | Keep the test claim, downgrade the accessibility claim to unverified |
| §13 | "Still NOT built" list, Xero, QuickBooks, Drive, Zoom | `docs/STATUS.md` | Keep as a backlog section |
| §13 | Local unpushed commit references | Delete | Stale references to commits already in history |
| `README.md` | Stock Vite template | Rewrite | Replace with a real project entry point |
| `server/README.md` | 9 of 44 files, `/smoke` step | Correct in place | The `/smoke` route no longer exists, so step 5 of the setup fails |
| `DESIGN-SYSTEM.md` | "Forest Editorial", never implemented | HOLD | See section 5 |
| `GAkinzOS.html` | Product specification | Keep as is | Still referenced by the endpoint comments |

## 3. Credentials and sensitive material to remove

Ordered by severity. None of these has been changed by this task.

| # | Item | Location | Why it matters | Action |
|---|---|---|---|---|
| 1 | Live super-admin login `dev@gakinz.com` with a plaintext password | `CLAUDE.md` §13, deploy note under item 2 | A working credential for the production CMS, in a tracked file, therefore also in git history and in every clone. It grants `super_admin`, which reaches the mailbox, client data, invoices and payment links | Treat as compromised. Rotate the password on the live system now, then remove the line. Decide separately whether history needs scrubbing, since rotation alone leaves the old value readable |
| 2 | FTP username `gakinz_com@gakinz.com` | `CLAUDE.md` §1 | Half of a live deploy credential. Publishing the username narrows an attack to the password alone, and the FTP account is scoped to the live document root | Remove. Reference `secrets.FTP_USERNAME` instead |
| 3 | Database name and user, both `devgeereact_gakinz_com` | `CLAUDE.md` §1, `server/config.php.example` lines 26 to 27 | Not secret by itself, but it is the account name for the live database and it is duplicated into a tracked example file | Remove from `CLAUDE.md`. In `config.php.example`, replace with a placeholder and note the cPanel prefix convention |
| 4 | Seed admin email `dev@gakinz.com` | `server/config.php.example` line 59 | Names the seeded super-admin account, which pairs with item 1 | Replace with a placeholder |
| 5 | Mailbox address `hello@gakinz.com` as `SMTP_USER` and `IMAP_USER` | `server/config.php.example` lines 68, 77 | Public-facing address, so low severity, but it is a live mailbox username paired with a password field | Acceptable to keep. Flagged for completeness |
| 6 | Retired mail host `premium152.web-hosting.com` | `server/config.php.example` lines 65, 75; `CLAUDE.md` §13 | Not a credential, but a real defect. The retired host still resolves and still answers on port 465, so a config copied from this example fails silently rather than loudly | Update to `premium17.web-hosting.com` |

Checked and clean: no `.env` file, no `config.php`, no API key, token or password value in the
tracked tree. `.gitignore` covers `config.php`, `server/uploads/` and the usual editor and
build artefacts. Every secret field in `config.php.example` is an empty string or a
`REPLACE_` placeholder.

## 4. Baseline test and build results

Run on 2026-09-04 against `chore/gee-os-adoption` at `065a234`, on the local machine. No live
server, database or network service was contacted.

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | PASS. 1 file, 11 tests, 93 ms. All in `src/lib/access.test.ts`, covering role gating and client isolation |
| Type check and build | `npm run build` | PASS. `tsc -b` clean, Vite built in 2.82 s |
| PHP syntax | `php -l` over 44 files in `server/` | PASS. No syntax errors |
| Lint | `npm run lint` | **FAIL. 67 problems: 60 errors, 7 warnings.** 6 are auto-fixable |

Lint breakdown by rule:

| Count | Rule |
|---|---|
| 39 | `react-hooks/set-state-in-effect` |
| 7 | `react-refresh/only-export-components` |
| 7 | `react-hooks/exhaustive-deps` |
| 5 | `unused-imports/no-unused-vars` |
| 4 | `unused-imports/no-unused-imports` |
| 4 | `react-hooks/refs` |
| 1 each | `react-hooks/purity`, `react-hooks/incompatible-library`, `react-hooks/immutability`, `@typescript-eslint/no-unused-expressions`, `@typescript-eslint/no-explicit-any` |

Build output, the parts worth watching:

| Chunk | Raw | Gzip |
|---|---|---|
| `index` (marketing entry) | 556.94 kB | 173.79 kB |
| `card` | 384.82 kB | 105.84 kB |
| `jspdf.es.min` | 386.00 kB | 124.94 kB |
| `csv` (xlsx) | 283.25 kB | 94.21 kB |
| `html2canvas.esm` | 201.04 kB | 47.07 kB |

Vite warns that chunks exceed 500 kB. The heavy libraries are correctly lazy loaded; the
entry chunk itself is the one over the line, and `CLAUDE.md` records it as 539 kB, so it has
grown since that measurement.

What was NOT tested:

- Any runtime behaviour of the PHP API. `php -l` proves syntax, nothing more.
- Every claim about live server state, including which files are uploaded, which migrations
  have run, whether `weather.php` is stale, and whether the live `ALLOWED_ORIGINS` contains
  `http://localhost:5102`.
- The accessibility claim of zero violations. No axe run was performed and no report exists.
- Email, SMS, WhatsApp, Stripe, PayPal, GitHub, Figma, Slack and Calendly integrations. None
  is configured locally and none should be exercised without approval.
- Browser rendering of any page.

## 5. Held for your decision

Preserved, not moved, not deleted.

1. **`DESIGN-SYSTEM.md`.** It calls itself "the rebrand contract" and "the single source of
   truth", and specifies a forest green and cream scheme with a Caudex display face. The
   implementation is a monochrome core with lavender and rose accents, in Manrope and Space
   Grotesk. Only Manrope survived. Either it is a stale proposal that should move to
   `docs/DECISIONS.md` as a rejected direction, or it is a pending rebrand that has not been
   built. That distinction is yours, and it changes what an agent should do when asked to
   restyle anything.
2. **The outstanding server uploads.** Roughly twenty five "NEEDS RE-DEPLOY" markers have
   accumulated across sessions. They cannot be reconciled from here. Either confirm the live
   state so `docs/DEPLOYMENT.md` can carry one accurate list, or the list stays marked
   unverified.
3. **The accessibility claim.** Keep it as history in `DECISIONS.md`, or re-run axe and make
   it a current fact in `docs/STATUS.md`.
4. **The lint backlog.** 60 errors is a real signal, and `react-hooks/set-state-in-effect`
   appearing 39 times usually points at a repeated pattern rather than 39 separate mistakes.
   Whether to fix it, ratchet it or accept it is a scope decision, not a documentation one.
5. **Git history.** Removing the credential from the file does not remove it from history.
   Scrubbing needs a force push and coordination with the deploy workflow.
6. **Whether `CLAUDE.md` should keep its section 13 narrative anywhere.** The proposal turns
   it into `DECISIONS.md` plus `STATUS.md`. If you would rather keep the running log, say so
   and it becomes `docs/JOURNAL.md` instead, with the current-state facts still lifted out.

---

## 6. Outcome — the migration as executed (2026-09-04)

Added after the owner approved the migration. Sections 1 to 5 above are left exactly as they
were written, as the record of what was proposed. This section records what was actually
built, and where it differs.

### Approved decisions

1. `DESIGN-SYSTEM.md` is a **superseded design proposal**. Its historical meaning is preserved
   in `docs/DECISIONS.md`; it is not treated as the implemented design.
2. All unconfirmed production deployments, server uploads and database migrations are marked
   **UNVERIFIED**.
3. Accessibility is marked **NOT TESTED** until a fresh audit is performed.
4. The lint failures are recorded in `docs/KNOWN-ISSUES.md`. No application code was fixed.
5. The old `CLAUDE.md` narrative is split between `docs/STATUS.md` and `docs/DECISIONS.md`.
   No session journal was created.
6. DNS, hosting, TLS and mail-server operations stay outside this repository.
7. Plaintext credentials and unnecessary production identifiers are removed from the proposed
   documentation.
8. Git history is not rewritten and production is not changed.

### Where the final structure differs from section 1

The approved document set is larger and uses different names. The mapping:

| Proposed in section 1 | Final |
|---|---|
| `docs/ARCHITECTURE.md` | `docs/ARCHITECTURE.md`, unchanged |
| `docs/API.md` | **`docs/API-SPEC.md`** |
| `docs/DATA-MODEL.md` | `docs/DATA-MODEL.md`, unchanged |
| `docs/DESIGN.md` | **`docs/DESIGN-SYSTEM.md`**, which is distinct from the superseded root file of the same name |
| `docs/SECURITY.md`, `DEPLOYMENT.md`, `STATUS.md`, `DECISIONS.md` | unchanged |
| not proposed | **`docs/PRODUCT-SPEC.md`**, **`docs/OPERATIONS.md`**, **`docs/KNOWN-ISSUES.md`** |
| not proposed | the whole **`qa/`** set: `TEST-PLAN.md`, `SECURITY-AUDIT.md`, `ACCESSIBILITY-AUDIT.md`, `PERFORMANCE-AUDIT.md`, `RELEASE-CHECKLIST.md` |
| `docs/adoption/HOLDING.md` | **not created.** Every held item found a home: the design-system question in `docs/DECISIONS.md` D-006 and D-019, the outstanding uploads in `docs/DEPLOYMENT.md` section 5, the accessibility claim in D-020 and `qa/ACCESSIBILITY-AUDIT.md`, the lint backlog in D-021 and K-002, and the history question in K-001 |
| `docs/adoption/CLAUDE.proposed.md` | **adopted.** The slim root `CLAUDE.md` is the live file. The draft is left in place only as an adoption record, and carries no instruction authority |

### One factual correction to the audit

`docs/adoption/AUDIT.md` and section 5 above record `DESIGN-SYSTEM.md` as describing a scheme
that "was never implemented". **The commit history shows otherwise.** Forest Editorial was
built across 2026-06-14 in the five rollout steps that document itself lists (`57c5134`,
`3f55cdd`, `9700984`, `965cf9a`, `ea52132`, `3c28a74`), and was then replaced the same day by
`d9b27a2`, whose commit body reads "Full palette + typography swap, replaces Forest Editorial".

The practical difference matters. The palette and the Caudex display face were swapped out.
The **system** work survived and is still live: the custom focus ring, branded selection,
themed scrollbars, branded placeholders, the 200ms interactive baseline, the radius ladder, the
grain, the themed empty states and the numeric table alignment. That is why several global
details in `src/index.css` still carry Forest Editorial comments.

The audit is left unedited as the record of that audit. The correction is carried in
`docs/DECISIONS.md` D-006.

### Sensitive material, as handled

| # from section 3 | Item | Action taken |
|---|---|---|
| 1 | Live super-admin login and plaintext password | **Not carried into any new document.** Recorded as `docs/KNOWN-ISSUES.md` K-001 and `qa/SECURITY-AUDIT.md` S-001. Rotation is an owner action on the live system and is UNVERIFIED |
| 2 | FTP username | Removed. The documentation now names `secrets.FTP_USERNAME` only |
| 3 | Database name and user | Removed from all new documentation, and **replaced with `REPLACE_` placeholders** in `server/config.php.example`. The cPanel `<cpanel_user>_<database>` convention is now a comment instead of a value |
| 4 | Seed admin email | **Replaced with a placeholder** in the template. Note that `server/auth.php` still defaults to a literal when the value is unset; that is application code and was left alone, recorded as K-014 |
| 5 | Mailbox address | Left. Public-facing, low severity |
| 6 | Retired mail host | **Fixed in the template**: both `$SMTP_HOST` and `$IMAP_HOST` are placeholders with a comment pointing at the operator's hosting notes and a warning about the silent-failure mode. The **live** `config.php` value remains UNVERIFIED. See K-003 |

Items 3, 4 and 6 were completed on 2026-09-04 on the owner's instruction to update everything
that needed updating. The edit changes no behaviour: the live `config.php` is untouched, and
the template is read only when someone fills in a new one. The decision is recorded as
`docs/DECISIONS.md` D-022.

### Verification baseline, re-run

Against `chore/gee-os-adoption` at `065a234` on 2026-09-04.

| Check | Result |
|---|---|
| `npm test` | PASS. 1 file, 11 tests, 87 ms |
| `npm run build` | PASS. `tsc -b` clean, Vite built in 2.83 s |
| `php -l` over 44 files | PASS |
| `npm run lint` | FAIL. 60 errors, 7 warnings, 42 files |

The lint per-rule breakdown in section 4 above was measured from console output and is
slightly off. The figures taken from the ESLint JSON report are in `docs/STATUS.md` section 1
and `docs/KNOWN-ISSUES.md` K-002; the totals of 60 and 7 are the same.

### Files edited outside the documentation set

One: `server/config.php.example`, as described in the sensitive-material table above. No file
that the running application reads was changed. `src/`, every `server/*.php`, `schema.sql`,
`.htaccess` and every build and CI configuration file are untouched.

### Nothing deleted

`CLAUDE.md` was replaced in place, and its previous content remains in git history and is
classified in `docs/adoption/AUDIT.md`. `DESIGN-SYSTEM.md`, `GAkinzOS.html` and both adoption
documents are still present. The only edit to a historical document is a superseded banner
prepended to `DESIGN-SYSTEM.md`; none of its original content was altered.
