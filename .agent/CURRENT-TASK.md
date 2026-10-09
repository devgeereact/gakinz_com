# Current Task Contract

## Outcome

GEE OS is adopted in this repository as an instruction system. The previous 29 kB `CLAUDE.md`,
which mixed instruction, hosting policy, session history and a live credential, is replaced by
a slim pointer plus a documentation set in which each fact has one home. Every claim in the
previous file has been classified, and the historical documents are preserved.

**Status: complete for the documentation layer.** The work that remains needs server access or
an owner decision, and is listed under "Handover" below.

## Mode

Maintain an Existing Application, in recovery posture for the documentation layer only.

## Scope

**In scope, and done:**

- Auditing the previous `CLAUDE.md` claim by claim (`docs/adoption/AUDIT.md`).
- Writing the migration map, the sensitive-material list and the baseline results
  (`docs/adoption/MIGRATION-REPORT.md`).
- Writing `README.md`, `CLAUDE.md`, `AGENTS.md` and the three `.agent/` contracts.
- Writing the `docs/` set: `PRODUCT-SPEC`, `ARCHITECTURE`, `DATA-MODEL`, `API-SPEC`,
  `DESIGN-SYSTEM`, `SECURITY`, `DEPLOYMENT`, `OPERATIONS`, `STATUS`, `DECISIONS`,
  `KNOWN-ISSUES`.
- Writing the `qa/` set: `TEST-PLAN`, `SECURITY-AUDIT`, `ACCESSIBILITY-AUDIT`,
  `PERFORMANCE-AUDIT`, `RELEASE-CHECKLIST`.
- Correcting `server/README.md` where the audit proved it outdated.
- Replacing the real production identifiers and the retired mail host in
  `server/config.php.example` with `REPLACE_` placeholders. This is the one tracked file
  outside the documentation set that was edited, and it changes no behaviour: the live
  `config.php` is untouched and the template is only read when someone fills in a new one.
- Marking the root `DESIGN-SYSTEM.md` as superseded, without removing any of its content.
- Re-running the verification baseline: `npm test`, `npm run build`, `npm run lint`, `php -l`.

**Out of scope, and not done:**

- Any change to application behaviour, styling, routes, endpoints or schema.
- Fixing the lint backlog. It is recorded in `docs/KNOWN-ISSUES.md` K-002 by decision.
- Any change to `server/*.php`, including the one-line seed-admin fallback in `auth.php`.
- Deleting `DESIGN-SYSTEM.md`, `GAkinzOS.html` or any historical document.
- Touching the live server, database, mailbox, DNS or payment providers.
- Rotating credentials. That is an owner action on the live system.
- Rewriting git history.

## Authority

| Action | Authorised |
|---|---|
| Research the local repository and the operator's global notes | Yes |
| Create and edit documentation and contract files | Yes |
| Edit application code | No |
| Use external services | No |
| Change production | No |
| MCP reads | Local filesystem and git only |
| MCP mutations | None |

## Evidence

Required checks, all re-run on 2026-09-04 against `065a234`:

| Check | Result |
|---|---|
| `npm test` | PASS, 11 tests, 87 ms |
| `npm run build` | PASS, `tsc -b` clean, built in 2.83 s |
| `php -l` over 44 files | PASS |
| `npm run lint` | FAIL, 60 errors and 7 warnings across 42 files |

Completion conditions, all met: every section of the previous `CLAUDE.md` has a destination or
a recorded reason for removal; every new document is populated from repository evidence;
unverifiable claims are marked NOT TESTED or UNVERIFIED rather than repeated; no application
file was modified.

## Handover

These need server access or an owner decision, and cannot be closed from the repository.

1. **Rotate the super-admin credential** published in the previous `CLAUDE.md`
   (`docs/KNOWN-ISSUES.md` K-001). Highest priority, and independent of everything else.
   Then decide separately whether git history needs scrubbing.
2. **Establish the real server state**: which `server/*.php` files are uploaded, which schema
   migrations have run, and whether the live `ALLOWED_ORIGINS`, mail hosts, `GK_DEBUG` and
   cron entry are as expected (`docs/DEPLOYMENT.md` section 5).
3. **Decide the lint backlog**: fix, ratchet with a baseline, or accept (K-002).
4. **Run a fresh accessibility audit** and replace the NOT TESTED entries
   (`qa/ACCESSIBILITY-AUDIT.md`).
5. **Close `api.php`'s unauthenticated POST** and add abuse control to `contact.php`
   (K-004, K-005).
6. **Remove the hard-coded seed-admin fallback** in `server/auth.php` (K-014). One line, and
   it is the last production identifier in tracked source.
