# Current Task Contract

## Outcome

**House-standard rollout, stages 0 to 3, 2026-11-14: READY TO BUILD (local only, branch `chore/house-standard`, not pushed).** `main` is `a30a018` (clean, in step with `origin/main`, CI run 43499565198 green). The docs are one tree and one task file, Tailwind v4 and the working method are adopted (D-069). The product state is unchanged: V1.2 released as `ea6164c`; **V1.3 is frozen at 0 of 6 ticked and not started** (`docs/ROADMAP.md`, D-068). Gate on this branch: types clean, lint 0, 701 unit, 687 server, build 32 pages, `pnpm run verify` PASS, `docs:check` PASS; `pnpm run test:browser` NOT TESTED on this Ubuntu computer (BLOCKED: Playwright needs `chromium_headless_shell-1248`, which is not installed; the docs-only diff touches no browser-tested file).

Below: the V1.2 release record, kept as it was.

**V1.2 (public-site trust, D-065, D-066, D-067) is RELEASED (2026-11-13, `ea6164c`); FINISHED. Awaiting the owner: the steps below, or open a V1.3 scope.** Five of five open items are ticked in `docs/ROADMAP.md` (item 4, the real visitor IP, was dropped as already true). V0, V1 (8 of 10; items 4 and 10 BLOCKED on the owner), V1.1 and V1.2 are live. `main` is `ea6164c` (PR #34, 22 commits, a fast-forward from `ed5a724`); CI run 43389323251 was green on every job; the release ran 2026-11-13 08:06 UTC (snapshot `~/backups/gakinz_com/releases/20261113T080551Z`, smoke checks passed). `server/.htaccess` had been uploaded by hand earlier that day (07:41 UTC, backup `htaccess.before-v1.2-404.20261113T074141Z`) and was re-checked byte-identical before the merge.

| # | Item | Evidence | Live |
|---|---|---|---|
| 1 | The cookie policy tells the truth | `storage-items.test.ts` 6, `cookies.test.tsx` 5; axe 0 | `/cookies/` names `gk-auth` and `__session`, no `gk_oauth_state` or `gk-locked`; adviser's review and a look at Clerk's cookie names are the owner's |
| 2 | The sitemap lists exactly the articles that exist (K-147) | `insights.test.ts` 3, `live-check.test.mjs` 24 | the live sitemap lists exactly the three CMS articles; `check:live` 20 of 20 |
| 3 | The contact form turns bots away (honeypot `hp_site`, `fillMs` minimum 2.5 s, D-067) | `contact-bots.test.ts` 15, `contact.test.ts` (browser) 12 | released; the contact form was not exercised live and the manual autofill pass is NOT TESTED |
| 4 | ~~Real visitor IP~~ | dropped: already true (K-123) | n/a |
| 5 | An unknown URL gets a real 404 | `not-found.test.ts` 3, `notfound.test.ts` 3, `check:htaccess` 67 of 67 | verified live: 404, branded page, `noindex`, `no-store`, same CSP; `/blog/old` 404 |
| 6 | The home headline is read once | `home-heading.test.tsx` 1; axe 0 on `/` | the home `<h1>` carries the `aria-label` sentence |

Local ladder (2026-11-11, `docs/VERIFICATION.md`): types clean, lint 0, 701 unit, 687 server, build 32 pages plus `404.html`, 148 browser three runs in a row with axe 0, `check:htaccess` 67 of 67, `php -l` 69 of 69, `pnpm run verify` PASS. Live (read-only, 2026-11-13): `pnpm run check:live` 20 of 20 (17 of 20 before the release). NOT TESTED: the contact form live, the branded 404 and the honeypot in a real browser, Safari, Firefox, a real phone, a real password manager or screen reader, Clerk's real cookie names.

## Next actions (the owner's)

1. **V1.2 owner steps** (`docs/ROADMAP.md`, "Needs the owner", rows i to l): a manual autofill pass on the contact form (Chrome, Safari, Firefox, one password manager) and a few weeks watching `enquiry_bot_dropped` rows (each holds the sender's email); sign in at `/app` once and read the cookie names in the browser's developer tools; the adviser's review of the cookie wording; optionally decide whether to redirect the two retired article URLs (`what-makes-a-site-fast`, `accessibility-is-not-optional`).
2. **Still the owner's from before:** V1 items 4 and 10 (business facts, retention periods), rotate the OpenRouter key, delete the Clerk dev user, rename the `TEST owner` row, look once signed in at Today and the restyled CMS.
3. **Next build:** V1.3 is frozen (6 items, 0 ticked, D-068): say "go" and `/finish-app` works it on `goal/v1.3`. Before that, approve the push of `chore/house-standard` (docs only; a merge to `main` deploys nothing, but `main` is deploy-on-push: ask first).
4. Undo for the release, if ever needed: `pnpm run release -- --rollback --go` (the script's closing line says `npm run release`: same command).

## Where things are

- Spec: `docs/superpowers/specs/2026-11-11-v1-2-public-trust-design.md`. Plan (all steps ticked): `docs/superpowers/plans/2026-11-11-v1-2-public-trust.md`. Decisions: D-065 (list), D-066 (method), D-067 (honeypot).
- The build record: `docs/AUDIT.md` (one V1.2 section: reviews and fixes), `docs/VERIFICATION.md` ("Final ladder" and "First ladder"), `docs/CHANGELOG.md`, `.agent/HANDOFF.md` (V1.2 entry). The per-task reports and the ledger lived in `.superpowers/sdd/2026-11-11-v1-2-public-trust/` (scratch, gitignored, deleted after reading).
- Parked from this build (`docs/ROADMAP.md` parking lot): hero eyebrow shows "London" twice, an `audit_log (ip, action, created_at)` index, wrong-case public paths answer 404, `gk_oneline` strips only C0 controls, the privacy export and erasure do not find a honeypot-only address.

## Resume

1. `cd ~/Developer/Projects/gakinz_com`, `git switch main`; `pnpm install --frozen-lockfile` (Node 24). Work in a worktree under `.local-state/wt-<branch>` (gitignored). `.gitattributes` comes from the graphify hook on the Mac; the branch `origin/chore/graphify-merge-attribute` (1 line, unmerged) tracks it.
2. Local database for the server and browser tests (the socket path must stay under 107 characters, so use a short one such as `/tmp/gk3329.sock`; a worktree path is too long): `mariadbd --no-defaults --datadir=<repo>/.local-test/mariadb/data --port=3329 --bind-address=127.0.0.1 --socket=/tmp/gk3329.sock --skip-name-resolve` (passwordless root, local only; stop it with `mariadb-admin -S <socket> -uroot shutdown`), then
   `GK_TEST_DB_HOST=127.0.0.1 GK_TEST_DB_PORT=3329 GK_TEST_DB_USER=root GK_TEST_DB=gakinz_dev_test GK_TEST_PHP_PORT=5441 GK_TEST_PROVIDER_PORT=5442 pnpm run test:server`.
3. Gate: `pnpm exec tsc -b --noEmit`, `pnpm run lint`, `pnpm test`, `pnpm run test:server`, `pnpm run build && pnpm run test:browser` (add `GK_AXE=<axe.min.js>` for axe), `pnpm run check:htaccess`, `pnpm run verify`, `pnpm run docs:check --base main`. Results: `docs/VERIFICATION.md`.
4. `pnpm run dev` talks to the live API: any save is real.

## Mode, authority

Existing Application, production risk. Work on a branch, then a pull request or the owner's "approved:" for any push to `main` (a push to `main` releases). No push, merge to `main`, deploy, server change, real send or real payment without the owner's "approved:". SQL, `.htaccess` and `config.php` keys are applied by a person.

## Previous contracts

The 2026-11-01 to 11-09 contract (go-live, Phases 1 to 7) is in git at `d30e95b:.agent/CURRENT-TASK.md`; its releases are in the release log of `docs/CHANGELOG.md`. The V1.2 in-progress contract is in git history on `goal/v1.2` before the closing records commit; V1.2's release is recorded in `docs/CHANGELOG.md` (release log).
