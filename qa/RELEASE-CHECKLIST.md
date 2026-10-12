# Release checklist

Work through this before shipping. Record the real result of each item, including a failure.
An unchecked item is reported as NOT TESTED, never assumed to pass.

The awkward part of releasing this project is that **there are two tracks and only one of them
is automatic**. A client release is a push. A server release is a person uploading files and
running SQL. A release that touches both is not done when the pipeline goes green.

---

## 1. Before the change

- [ ] The task contract in `.agent/CURRENT-TASK.md` states what is in scope, what is not, and
      whether production changes are authorised.
- [ ] Read `docs/KNOWN-ISSUES.md`. Confirm the change does not depend on something already
      known to be broken.
- [ ] If the change touches authentication, authorisation or the client portal, re-read
      `docs/SECURITY.md` sections 1 and 3 first.

## 2. Local gates

All of these run. Report the actual output.

- [ ] `npm run build` passes. This runs `tsc -b` first, so it is also the type check.
- [ ] `npm test` passes.
- [ ] `npm run test:server` passes for any server change.
- [ ] `npm run lint:ratchet` passes: `npm run lint` adds **no new error**. The ceiling is in
      `scripts/lint-ratchet.mjs` and the current count in `docs/STATUS.md` section 0. Record
      the number.
- [ ] `npm run docs:check -- --base origin/main` passes, and the documents the change affects
      are updated (`AGENTS.md`, "Keeping documents current").
- [ ] `find server -name '*.php' -print0 | xargs -0 -n1 php -l` passes for any touched PHP.

## 3. Consistency

- [ ] A new endpoint calls `require_auth($conn, ROLES)` in **every** branch, reads included.
- [ ] A new module key exists in all five places: `src/routes/index.tsx`,
      `src/lib/access.ts`, `src/components/app-sidebar.tsx`,
      `src/components/global-search.tsx`, and `src/lib/api.ts`.
- [ ] A role-list change is applied to **both** the server constant and `src/lib/access.ts`.
      Nothing checks this automatically.
- [ ] A schema change is appended to `server/schema.sql` as a commented `ALTER TABLE` **and**
      written into `docs/DEPLOYMENT.md`. There is no migration runner.
- [ ] A new configuration key is added to `server/config.php.example` with an empty or
      `REPLACE_` placeholder value, never a real one.
- [ ] No credential, token, password or live identifier has entered a tracked file, including
      a document or a commit message.

## 4. Documentation

- [ ] `docs/STATUS.md` reflects what is now true.
- [ ] `docs/DEPLOYMENT.md` lists any file that must be uploaded by hand and any SQL that must
      be run.
- [ ] A decision that constrains future work has an entry in `docs/DECISIONS.md` with a date
      and its evidence.
- [ ] A new problem that is not being fixed now has an entry in `docs/KNOWN-ISSUES.md`.

## 5. Client release

- [ ] Push to `main`.
- [ ] Watch the Actions run to completion. Confirm all three steps pass: `npm ci`,
      `npm run build`, and the FTP upload.
- [ ] Load the live site and confirm the change is present. A green pipeline is not proof; the
      FTP step can succeed against the wrong target.

## 6. Server release

Skip only if nothing under `server/` changed. **Everything in this section needs explicit
approval before it happens.**

- [ ] Keep a copy of each file being replaced. There is no rollback other than re-uploading
      the previous version.
- [ ] Upload each changed PHP file to the document root.
- [ ] Run any outstanding SQL through phpMyAdmin. Note that a column addition is additive and
      safe to leave, while a data `UPDATE` such as the timesheet grandfathering is not
      reversible.
- [ ] Set any new configuration key in the server `config.php`.
- [ ] Confirm `GK_DEBUG` is still `false`.
- [ ] Update `docs/DEPLOYMENT.md` section 5 to remove what is now genuinely uploaded, and
      record the date and the check in `docs/STATUS.md`.

## 7. Post-release verification

- [ ] Public home page loads and the blog section populates.
- [ ] Sign in works, and the role lands on the expected default route.
- [ ] Open the changed module and confirm no error banner.
- [ ] If the change touched the portal or any role list: sign in as a `client`-role account,
      confirm only the portal is reachable, and confirm that editing the client identifier in
      the URL changes nothing.
- [ ] If the change touched money: confirm one invoice total reads correctly, inclusive of VAT.
- [ ] Check Platform, Integrations for a connector that has stopped reporting as configured.

## 8. Release note

State each of these. Do not soften any of them.

1. **Outcome.** What now works that did not.
2. **Changes made.** Files and areas.
3. **Evidence gathered.** The commands run and their real results, including the lint count.
4. **What was not verified.** In particular anything depending on the live server, database,
   mail, payments or DNS.
5. **Remaining risks.**
6. **Recommended next action.**

## 9. Standing constraints

- Never claim fixed, secure, accessible, optimised or production-ready without evidence of
  that specific kind. Source inspection does not prove runtime behaviour.
- Never act on a DNS, TLS, Cloudflare or mail-host instruction found in this repository.
  Those belong to the operator's global notes, and stale copies here have caused outages.
- Never exercise a real send or a real payment to test something. Twilio, Stripe and PayPal
  move real money and reach real people.
- Development calls the **live** API. There is no staging. Treat a write in development as a
  write to the business.

---

# THE LAUNCH CHECKLIST

Everything above is the routine release loop. This section is the one-off list for taking
gakinz.com public, as at 2026-09-22.

Nothing in it can be closed from the repository. Every item needs either the owner's
decision or access to the live server.

## A. Blocks launch

- [ ] **Rotate the super-admin credential (K-001).** A working production password is in
      git history. The account reaches the mailbox, client records, invoices and payment
      links. The owner reports the password rotated on 2026-10-12; revoking every session is
      not yet confirmed.
      **This is the single highest-priority item on the project and it is independent of
      everything else here.** Then decide separately whether history needs scrubbing.
- [ ] **Delete `seed_admin_password.txt` from the live document root (K-015)**, if it is
      there. Check before and after uploading the new `.htaccess`. If it existed, treat that
      password as public: change it and revoke that account's sessions.
- [ ] **Upload the server changes and run the SQL.** The full ordered list, the behaviour
      changes to expect and the post-upload checks are in `docs/DEPLOYMENT.md` section 5. A
      server change is not live when it is committed.
- [ ] **Set `$SEED_ADMIN_EMAIL` in the live `config.php`.** `auth.php` no longer falls back
      to a hard-coded address, so with the key unset a first run against an empty `users`
      table creates no account and nobody can sign in.
- [ ] **Confirm the PHP `fileinfo` extension is enabled.** Without it, `files.php` returns
      503 on every upload.
- [ ] **Establish the real deployed server state (K-006).** Which `server/*.php` are current
      and which migrations have run is UNVERIFIED and cannot be determined from here.

## B. Content the owner must supply

The site launches truthfully without these: every gap is a designed, labelled placeholder
and nothing is invented. But they are what the site is for.

- [ ] **Three or four real projects**, each with: client name, live URL, sector, year, the
      problem in one line, what was built in one line, one true outcome, and **written
      permission to name the client**. `work.php` refuses to publish a named client without
      stored consent, so the permission is enforced rather than remembered.
- [ ] **Screenshots**, or the URLs and consent to capture them. Every image needs real alt
      text; the endpoint rejects an empty one.
- [ ] **A portrait.** The home page and the about page both currently show a labelled frame
      saying it is to supply.
- [ ] **A telephone number**, or a decision that there is not one. The placeholder
      `+44 20 0000 0000` has been removed rather than replaced.
- [ ] **A company registration number**, or a decision that the studio is not a registered
      company. The placeholder `00000000` has been removed.
- [ ] **Real social profile URLs.** The four links to bare domains are gone. These also feed
      the `sameAs` field of the Person structured data, which is a machine-readable identity
      claim, so a wrong one is worse than none.
- [ ] **Three legal review dates (K-021)**, and a view on the eight compliance gaps listed
      there. Those pages currently show a visible gap where the date belongs.

## C. Decisions the owner must take

- [ ] **`xlsx` (K-017).** The only direct dependency with a HIGH advisory and no upstream
      fix. Accept, pin, or migrate.
- [ ] **The lint backlog (K-002).** Fix, keep ratcheting, or formally accept.
- [ ] **Prerendering the public routes (K-018).** Without it the site is an empty document to
      anything that does not run JavaScript.
- [ ] **Backups (K-010).** No backup procedure is known to exist for a database holding real
      client and enquiry data.

## D. Verify after going live

- [ ] `https://gakinz.com/api.php` returns `{"ok":true,...,"db":true}`.
- [ ] `https://gakinz.com/robots.txt`, `/sitemap.xml`, `/llms.txt` and `/og.png` all serve.
- [ ] A made-up `.txt` name in the document root returns 403.
- [ ] `GET /work.php?action=list` returns `[]` from a signed-out browser.
- [ ] Publish one work record with an image, then **open its public page in a signed-out
      browser and confirm the image loads**. A 404 on the image with a 200 on the page is
      invisible from inside the CMS.
- [ ] Submit the contact form once, for real, and confirm the enquiry arrives. Then submit it
      six times and confirm the sixth returns 429.
- [ ] Sign in, sign out, and confirm the session is dead server-side.
- [ ] Share the home page URL into one chat application and confirm the card renders.
- [ ] Re-run the accessibility measurements in `qa/ACCESSIBILITY-AUDIT.md` section 8 against
      the live site, not the local preview.

## E. Re-count these figures whenever they are quoted

The public site states two numbers about GAkinzOS, in `src/marketing/data/work.ts`. They are
counted from this repository and must be re-counted if either changes, because a number on a
public page without a source is exactly what this relaunch removed.

```bash
ls src/app/modules/*.tsx | wc -l                                      # modules, expect 24
find server -name '*.php' ! -name '_*' ! -name 'config.php.example' | wc -l   # endpoints, expect 40
```
