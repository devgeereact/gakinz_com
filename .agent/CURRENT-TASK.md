# Current Task Contract

## Outcome

**V1.2 (public-site trust, D-065) is BUILT locally on `goal/v1.2`, not pushed or released; FINISHED. Awaiting the owner: review, release, or open a V1.3 scope.** Five of five open items are ticked in `docs/ROADMAP.md` on local evidence (item 4, the real visitor IP, was dropped as already true). V0, V1 (8 of 10) and V1.1 are live as `ed5a724`; V1.2 is not live until the owner releases it.

| # | Item | Evidence (final ladder, `docs/VERIFICATION.md`) | Live |
|---|---|---|---|
| 1 | The cookie policy tells the truth | `storage-items.test.ts` 6, `cookies.test.tsx` 5; `/cookies` and `/privacy` axe 0 | after release; adviser's review and a look at Clerk's cookie names are the owner's |
| 2 | The sitemap lists exactly the articles that exist (K-147) | `insights.test.ts` 3, `live-check.test.mjs` 24; 32 pages and 32 sitemap URLs | after release; `check:live` checks every sitemap article |
| 3 | The contact form turns bots away (honeypot `hp_site`, `fillMs` minimum 2.5 s, D-067) | `contact-bots.test.ts` 15, `contact.test.ts` (browser) 12 | after release; the manual autofill pass is NOT TESTED |
| 4 | ~~Real visitor IP~~ | dropped: already true (K-123) | n/a |
| 5 | An unknown URL gets a real 404 | `not-found.test.ts` 3, `notfound.test.ts` 3, `check:htaccess` 67 of 67 | BLOCKED until the owner uploads `server/.htaccess` |
| 6 | The home headline is read once | `home-heading.test.tsx` 1; axe 0 on `/` | after release |

Final ladder (2026-11-11, fresh, after the review fix wave): types clean, lint 0, 701 unit, 687 server, build 32 pages plus `404.html`, 148 browser three runs in a row with axe 0, `check:htaccess` 67 of 67, `php -l` 69 of 69, `pnpm run verify` PASS, `docs:check --base main` PASS. NOT TESTED: real phones, Safari, Firefox, a real password manager, a real screen reader, LiteSpeed, anything on the live host, Clerk's real cookie names.

## Next actions (the owner's)

1. Read the branch (`git log d355c49..goal/v1.2`) and say whether to release, change something, or open a V1.3 scope (`docs/ROADMAP.md`, "How a new version opens").
2. **Release:** the owner says "approved:"; then a pull request, or a push to `main` (a push to `main` releases through CI and `scripts/release.mjs`). After the release: back up and upload `server/.htaccess` by hand (`docs/DEPLOYMENT.md` section 5), then `pnpm run check:live` (the `unknown URL answers 404` check fails on purpose until the upload).
3. **V1.2 owner steps** (`docs/ROADMAP.md`, "Needs the owner", rows h to l): the `.htaccess` upload; a manual autofill pass on the contact form (Chrome, Safari, Firefox, one password manager) and a few weeks watching `enquiry_bot_dropped` rows (each holds the sender's email); sign in at `/app` once and read the cookie names in the browser's developer tools; the adviser's review of the cookie wording; optionally decide whether to redirect the two retired article URLs (`what-makes-a-site-fast`, `accessibility-is-not-optional`).
4. **Still the owner's from before:** V1 items 4 and 10 (business facts, retention periods), rotate the OpenRouter key, delete the Clerk dev user, rename the `TEST owner` row, look once signed in at Today and the restyled CMS.

## Where things are

- Spec: `docs/superpowers/specs/2026-11-11-v1-2-public-trust-design.md`. Plan (all steps ticked): `docs/superpowers/plans/2026-11-11-v1-2-public-trust.md`. Decisions: D-065 (list), D-066 (method), D-067 (honeypot).
- The build record: `docs/AUDIT.md` (one V1.2 section: reviews and fixes), `docs/VERIFICATION.md` ("Final ladder" and "First ladder"), `docs/CHANGELOG.md`, `.agent/HANDOFF.md` (V1.2 entry). The per-task reports and the ledger lived in `.superpowers/sdd/2026-11-11-v1-2-public-trust/` (scratch, gitignored, deleted after reading).
- Parked from this build (`docs/ROADMAP.md` parking lot): hero eyebrow shows "London" twice, an `audit_log (ip, action, created_at)` index, wrong-case public paths answer 404, `gk_oneline` strips only C0 controls, the privacy export and erasure do not find a honeypot-only address.

## Resume

1. `cd ~/Developer/Projects/gakinz_com`, `git switch goal/v1.2` (or `main` for the released state); `pnpm install --frozen-lockfile` (Node 24). The untracked `.gitattributes` is from `graphify hook install`; it is not part of this work.
2. Local database for the server and browser tests: `mariadbd --no-defaults --datadir=<repo>/.local-test/mariadb/data --port=3329 --bind-address=127.0.0.1 --socket=<repo>/.local-test/mariadb/mysqld.sock --skip-name-resolve` (passwordless root, local only; stop it with `mariadb-admin -S <socket> -uroot shutdown`), then
   `GK_TEST_DB_HOST=127.0.0.1 GK_TEST_DB_PORT=3329 GK_TEST_DB_USER=root GK_TEST_DB=gakinz_dev_test GK_TEST_PHP_PORT=5441 GK_TEST_PROVIDER_PORT=5442 pnpm run test:server`.
3. Gate: `pnpm exec tsc -b --noEmit`, `pnpm run lint`, `pnpm test`, `pnpm run test:server`, `pnpm run build && pnpm run test:browser` (add `GK_AXE=<axe.min.js>` for axe), `pnpm run check:htaccess`, `pnpm run verify`, `pnpm run docs:check --base main`. Results: `docs/VERIFICATION.md`.
4. `pnpm run dev` talks to the live API: any save is real.

## Mode, authority

Existing Application, production risk. Work on a branch, then a pull request or the owner's "approved:" for any push to `main` (a push to `main` releases). No push, merge to `main`, deploy, server change, real send or real payment without the owner's "approved:". SQL, `.htaccess` and `config.php` keys are applied by a person.

## Previous contracts

The 2026-11-01 to 11-09 contract (go-live, Phases 1 to 7) is in git at `d30e95b:.agent/CURRENT-TASK.md`; its releases are in `docs/WORKBOOK.md` section 1. The V1.2 in-progress contract is in git history on `goal/v1.2` before the closing records commit.
