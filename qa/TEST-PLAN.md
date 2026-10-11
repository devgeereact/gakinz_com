# Test plan

**Status of the suite on 2026-10-10:** unit tests and server integration tests pass, the
latter against a throwaway local database. The counts are in `docs/STATUS.md` section 0. This document records what exists, what does not,
the order in which the gaps are worth closing, and the acceptance scenarios a release must
pass (section 7).

---

## 1. What runs today

| Layer | Tool | Coverage | Result |
|---|---|---|---|
| Types | `tsc -b`, inside `npm run build` | Whole client | **PASS**, 2026-10-10 |
| Unit | Vitest, `npm test` | `src/lib/access.ts`, `csv.ts`, `format.ts`, `session-revoke.ts`, `src/marketing/lib/articleFormat.ts`, `src/marketing/data/cmsResult.ts` | **PASS**, 2026-10-10 |
| Server integration | Vitest, `npm run test:server` | Sign-in, My account, payments, quote acceptance, blog editing, create ids, enquiry follow-ups, the work ledger (`work.php`) and the `support.php` client branch, against a local `*_test` database (D-036) | **PASS**, 2026-10-10 |
| PHP syntax | `php -l` | Every server file | **PASS**, 2026-10-10 |
| Lint | ESLint, `npm run lint`, held by `npm run lint:ratchet` | Whole client | **FAIL**; the ratchet passes (K-002) |
| Documentation | `npm run docs:check` | Links and the document-sync rule (`AGENTS.md`) | **PASS**, 2026-10-10 |
| Accessibility | axe-core 4.10.2 in Chrome, plus computed contrast, focus, reflow and target-size sweeps | All 16 public routes | **PASS**, 0 violations, 2026-09-22. `qa/ACCESSIBILITY-AUDIT.md` |
| Performance | Chrome DevTools trace and Lighthouse, production build served locally | Public surface | **PARTIAL.** Lab only, no field data, 2026-09-22. `qa/PERFORMANCE-AUDIT.md` |
| Component | none | n/a | **NOT TESTED** |
| Other endpoints | none | Everything outside the server suite | **NOT TESTED** |
| End-to-end | none | n/a | **NOT TESTED** |
| Screen reader | none | n/a | **NOT TESTED**. The largest remaining accessibility gap |

`src/lib/access.test.ts` covers `canAccess`, `moduleKeyForPath` and `defaultPathForRole`,
with the client-isolation rules asserted explicitly. It is deliberately narrow: role gating is
where a mistake is silent and expensive. See `docs/DECISIONS.md` D-016.

## 2. Gates before any change is complete

Run them all. Report the real output, including a failure. CI runs the same set and the deploy
waits for it (`docs/DEPLOYMENT.md` section 2).

```bash
npm run build                                              # tsc -b then vite build
npm test                                                   # unit tests
npm run test:server                                        # PHP endpoints, local *_test database
npm run lint:ratchet                                       # the lint backlog must not grow
npm run docs:check                                         # documents current, links resolve
find server -name '*.php' -print0 | xargs -0 -n1 php -l     # any touched PHP
```

The lint backlog does not block, but it **must not grow**. See `docs/KNOWN-ISSUES.md` K-002.

## 3. What cannot be tested from this repository

Stated plainly so nobody claims otherwise.

- Any PHP behaviour outside the server suite. `php -l` proves syntax and nothing more. The
  rules for the synthetic test path are in `docs/OPERATIONS.md` section 8.
- Anything depending on the live server, database, mailbox, DNS or configuration.
- Every external integration: OpenRouter, OpenWeather, SMTP, IMAP, Twilio, Stripe, PayPal,
  Google, GitHub, Figma, Slack, Calendly. None is configured locally, and none should be
  exercised without approval, because several of them send real messages or move real money.
  The server suite uses a fake payment provider and a mail stub instead.

The dev server calls the **live** API, so no write-path test runs through it.

## 4. Risk-ranked gaps

Ordered by what a defect would cost.

### Priority 1 · Server-side authorisation

The highest-value untested logic in the project. Every endpoint calls `require_auth` on its
own, with no shared middleware, so a missing call is a silent hole.

What a test would assert, per endpoint and per branch, including read branches:

- An anonymous request returns 401.
- A valid token with a disallowed role returns 403.
- A `client`-role token reaches `portal.php`, the client branch of `support.php` and its own
  account actions in `auth.php`, and nothing else.
- `portal.php` ignores `?client_id` for a `client` caller and returns only that client's rows.
  `support.php` already has this coverage (`tests/server/support-client.test.ts`).
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

Since 2026-10-10 the server suite covers the VAT-inclusive Stripe amount, amount and currency
mismatch, event de-duplication and the PayPal switch (`tests/server/payments.test.ts`), and
sent-only, single-use quote acceptance (`tests/server/proposals.test.ts`). The cross-endpoint
VAT agreement and the remaining webhook cases are still open.

### Priority 4 · Public entry points

`contact.php`, `verify.php`, `blog.php`, `testimonials.php`, and the two token endpoints. For
each: the happy path, a malformed input, and for the token endpoints an invalid, an expired and
a deleted target.

### Priority 5 · Accessibility

See `qa/ACCESSIBILITY-AUDIT.md`. The public surface was measured on 2026-09-22; the CMS and
real assistive technology are not measured at all.

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
5. Sign in as a `client`-role account. Confirm only the portal and My account are reachable,
   and that editing the URL to another client's identifier changes nothing. Do not send a
   portal message unless a real client conversation calls for one.
6. Check Platform, Integrations, and confirm the booleans match what was configured.
7. Check the Care Plan module for a site returning a non-2xx status.

Record what was checked and what was not. A partial smoke test reported as a full one is worse
than no smoke test.

## 6. Adding a test

`vitest.config.ts` picks up any `src/**/*.test.{ts,tsx}` file beside the unit under test; it is
not bundled into `dist/`. Server tests live in `tests/server/` and run under
`vitest.server.config.ts`. A money, sign-in or ownership change adds a server case.

Keep tests free of network calls. Nothing in either suite should be able to reach the live API.

## 7. Release acceptance scenarios

These supplement the module acceptance criteria in `docs/PRODUCT-SPEC.md` section 5.5 and the
production gates in `docs/OPERATIONS.md` section 9. They are checks, not twelve new modules,
and none has passed at runtime unless its status says so. Phases are the delivery phases in
`docs/STATUS.md` section 2. Before coding, each approved batch names its endpoints and screens,
its acceptance cases, its rollback and its remaining owner inputs.

| ID | Scenario | Phase and proof | Status on 2026-10-10 |
|---|---|---|---|
| J01 | The owner handles a new enquiry, follow-up, confirmed call and one conversion without duplicate records | Phase 2; a synthetic journey plus retry | NOT TESTED |
| J02 | A reference alone, or with the wrong email, discloses no customer record or account existence | Phases 1 and 2; response and throttling checks | NOT TESTED. The reference flow is not built |
| J03 | A link expires, re-use fails, concurrent consumption allows at most one redemption, and privileged two-factor cannot be skipped | Phase 1; isolated authentication tests | PARTIAL. Magic-link single use under concurrency and the two-factor rule pass in `tests/server/auth.test.ts`; the reference and email link is not built |
| J04 | Client A cannot read or write Client B's projects, tickets, messages, files, invoices or feedback by changing identifiers | Phase 2; endpoint tests with two fake clients | PARTIAL. Tickets and messages pass locally, `tests/server/support-client.test.ts` (K-039); projects, files, invoices and feedback NOT TESTED |
| J05 | A customer message survives a failed send; a retry creates no duplicate, and the owner sees the notification failure | Phase 2; transport fixtures | NOT TESTED |
| J06 | Permitted customer updates work; financial and internal fields and unverified email changes are rejected | Phase 2; positive and negative endpoint cases | NOT TESTED |
| J07 | Private feedback stays private; publication needs recorded permission and approval | Phases 2 to 4; publish, unpublish and response inspection | NOT TESTED |
| J08 | The project brief stays client-linked, shared milestones exclude owner notes, and the export omits restricted information | Phases 2 and 3; record and sanitised export checks | NOT TESTED |
| J09 | The enquiry-to-handover task works on phone and desktop with keyboard, zoom and reduced motion | Phases 3 and 4; observable owner and client usability checks | NOT TESTED |
| J10 | Accurate quote, invoice and payment evidence, backup restoration, and publish and edit checks pass | Phases 1 to 4; the production gates | NOT TESTED |
| J11 | A draft or declined quote cannot be accepted or converted; a sent quote converts exactly once under double-click and concurrent requests | Phase 1; endpoint tests | PASS locally, `tests/server/proposals.test.ts` (K-028). Not on the live server |
| J12 | The Stripe charge equals the invoice's payable total including VAT; a mismatched amount or currency is rejected and not marked paid | Phase 1; sandbox fixtures | PASS locally against a fake provider, `tests/server/payments.test.ts` (K-025). Not on the live server |

No credible schedule exists until the deployed state and recovery have been established.
