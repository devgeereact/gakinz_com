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

All four run. Report the actual output.

- [ ] `npm run build` passes. This runs `tsc -b` first, so it is also the type check.
- [ ] `npm test` passes.
- [ ] `npm run lint` adds **no new error**. The existing 60 errors and 7 warnings do not block,
      but the count must not grow. Record the number.
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
- [ ] Update the outstanding list in `docs/DEPLOYMENT.md` section 5 to record what is now
      genuinely uploaded, with the date.

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
