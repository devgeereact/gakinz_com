# Test plan

**Status of the suite today:** 11 unit tests, one file, covering access control. Everything
else is unmeasured. This document records what exists, what does not, and the order in which
the gaps are worth closing.

---

## 1. What runs today

| Layer | Tool | Coverage | Result on 2026-09-04 |
|---|---|---|---|
| Types | `tsc -b`, inside `npm run build` | Whole client | PASS |
| Unit | Vitest, `npm test` | `src/lib/access.ts` only | PASS, 11 tests, 87 ms |
| PHP syntax | `php -l` | All 44 server files | PASS |
| Lint | ESLint, `npm run lint` | Whole client | **FAIL**, 60 errors, 7 warnings |
| Component | none | | |
| Endpoint | none | | |
| End-to-end | none | | |
| Accessibility | none | | **NOT TESTED** |
| Performance | build output only | | |

`src/lib/access.test.ts` covers `canAccess`, `moduleKeyForPath` and `defaultPathForRole`,
with the client-isolation rules asserted explicitly. It is deliberately narrow: role gating is
where a mistake is silent and expensive. See `docs/DECISIONS.md` D-016.

## 2. Gates before any change is complete

Run all four. Report the real output, including a failure.

```bash
npm run build                                              # tsc -b then vite build
npm test                                                   # vitest run
npm run lint                                               # must not add a new error
find server -name '*.php' -print0 | xargs -0 -n1 php -l     # any touched PHP
```

The lint backlog of 60 errors does not block, but it **must not grow**. See
`docs/KNOWN-ISSUES.md` K-002.

## 3. What cannot be tested from this repository

Stated plainly so nobody claims otherwise.

- Any runtime behaviour of the PHP API. `php -l` proves syntax and nothing more. There is no
  local PHP, no local MySQL and no fixture database.
- Anything depending on the live server, database, mailbox, DNS or configuration.
- Every external integration: OpenRouter, OpenWeather, SMTP, IMAP, Twilio, Stripe, PayPal,
  Google, GitHub, Figma, Slack, Calendly. None is configured locally, and none should be
  exercised without approval, because several of them send real messages or move real money.
- Browser rendering of any page.

Development calls the **live** API. There is no safe environment in which to run a
write-path test.

## 4. Risk-ranked gaps

Ordered by what a defect would cost.

### Priority 1 · Server-side authorisation

The highest-value untested logic in the project. Every endpoint calls `require_auth` on its
own, with no shared middleware, so a missing call is a silent hole.

What a test would assert, per endpoint and per branch, including read branches:

- An anonymous request returns 401.
- A valid token with a disallowed role returns 403.
- A `client`-role token reaches `portal.php` and nothing else.
- `portal.php` ignores `?client_id` for a `client` caller and returns only that client's rows.
- An expired token, a soft-deleted user and a non-active account are all rejected.

A static check is a cheap partial substitute: assert that every routed file in `server/`
contains `require_auth` in every request branch.

### Priority 2 · The `access.ts` mirror against the server

`src/lib/access.ts` duplicates the server role constants by hand and nothing checks the two.
A script that parses the `STAFF`, `ADMINS`, `EDITORS`, `MAIL_ROLES` and `PAY_STAFF` constants
out of `server/*.php` and compares them with `MODULE_ROLES` would close K-011 and could run in
the same command as the tests.

### Priority 3 · Money paths

Errors here are visible to clients and hard to reverse.

- VAT: subtotal from items, `vat_rate` applied at read, total inclusive. Asserted the same way
  in `invoices.php`, `portal.php`, `clients.php` and `cron.php`, so a change to one must not
  drift from the others.
- Proposal acceptance producing the 40, 30, 30 invoice schedule.
- The Stripe webhook: a valid signature, a bad signature, a replayed timestamp, a
  `checkout.session.completed` that is not `payment_status = paid`, and a repeat of an event
  for an already-paid invoice.

### Priority 4 · Public entry points

`contact.php`, `verify.php`, `blog.php`, `testimonials.php`, and the two token endpoints. For
each: the happy path, a malformed input, and for the token endpoints an invalid, an expired and
a deleted target.

### Priority 5 · Accessibility

See `qa/ACCESSIBILITY-AUDIT.md`. Nothing is measured today.

### Priority 6 · Component behaviour

Lowest value per unit of effort here, because the type checker already catches a large class
of these and the modules are thin over the API.

## 5. Manual smoke test

Until endpoint tests exist, this is the check to run by hand after a server upload. It
requires production access, so it is a deliberate act, not a routine one.

1. Load the public home page. Confirm it renders and the blog section populates.
2. Submit the contact form with a real message. Confirm it appears in Leads.
3. Sign in. Confirm the role lands on the right default route.
4. Open one module per role group and confirm no error banner.
5. Sign in as a `client`-role account. Confirm only the portal is reachable, and that editing
   the URL to another client's identifier changes nothing.
6. Check Platform, Integrations, and confirm the booleans match what was configured.
7. Check the Care Plan module for a site returning a non-2xx status.

Record what was checked and what was not. A partial smoke test reported as a full one is worse
than no smoke test.

## 6. Adding a test

Vitest runs with the project defaults; there is no `vitest.config`. A `*.test.ts` file beside
the unit under test is picked up automatically and is not bundled into `dist/`.

Keep tests free of network calls. Nothing in the suite should be able to reach the live API.
