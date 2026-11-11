# V1.2: public-site trust (design)

Date: 2026-11-11 · Owner: Gideon Akinlotan · Status: approved by the owner ("Go ahead", D-065), awaiting the builder check
and the owner's go to build. The frozen item list is in `docs/ROADMAP.md`; the plan that implements this is
`docs/superpowers/plans/2026-11-11-v1-2-public-trust.md`.

## Intent

gakinz.com is a one-person web studio's site. Its public pages are the shop window, and what a visitor, a search engine or
a client's lawyer reads there has to be true. V0 to V1.1 made the site safe and the CMS workable. V1.2 closes the
remaining places where the public site says something false, shows something that does not exist, or invites abuse:

- the cookie policy describes a sign-in (Google) that was removed in Phase 5 and never mentions Clerk, which the site now uses;
- two of the three articles in the sitemap are not in the live CMS, so a visitor who follows them sees "That page is not here" (K-147);
- anything typed at an address that does not exist gets a "200 OK" page, which Search Console reports as a soft 404;
- the contact form has only a per-IP throttle, and that IP may be Cloudflare's, not the visitor's (K-102);
- the home headline is in the page twice for crawlers.

## Goals

1. A visitor, a crawler and the cookie policy agree about what is stored in the browser.
2. Every URL in the sitemap shows its own article, and a check keeps it that way.
3. A real person is never blocked or loses their message; a form-filling bot gets nothing and learns nothing.
4. The server can record the real visitor IP behind Cloudflare, with no change until the owner turns it on.
5. An unknown URL answers 404 with the site's own not-found page, while real CMS-only articles and work pages still load.
6. The home headline is read once.

## Non-goals

- The legal "[to supply]" gaps on Privacy, Terms and Pricing: they need the owner's and the adviser's facts (V1 item 4).
- Prerendering CMS-published posts and work automatically (parked, V2). New CMS posts keep working in the browser.
- A CAPTCHA or any third-party script on public pages (the build refuses third-party code on public pages).
- The phone tables in the CMS (K-148).

## Anti-goals (a failure even if the tests pass)

- A genuine enquiry is lost or refused without the sender being told.
- A real CMS article or work page returns 404.
- The honeypot or timing check makes the form harder for a keyboard, screen-reader or password-manager user.
- The cookie policy claims something about Clerk, Cloudflare or the law that the supplier's documentation does not support.
- Anything is pushed, deployed or applied to the host by the build agents.

## Constraints

- Work only in this project folder on branch `goal/v1.2`; no outside worktree; local only (`AGENTS.md`).
- No new dependency, no schema change, no secret in any file. `server/.htaccess` and `config.php` keys are applied by the owner.
- Public pages stay free of cookies, storage and third-party code (`public-layout.test.ts` and the prerender guard).
- Tests first; the full ladder and axe pass at 375 and 1280 px; records updated in the same commits.

## Decisions made with the owner

- The list of six items, as written in `docs/ROADMAP.md`.
- Drop the two built-in articles the CMS does not hold; the built-in set mirrors the CMS (the owner's "Go ahead").
- Change the home headline markup (the owner's OK was needed and given).

## Calls made by the planner (the owner may overrule)

- The built-in articles are a hand-kept snapshot of the CMS instead of the build reading the live CMS, so the build stays
  offline and repeatable. The cost is that it drifts when the CMS changes; `check:live` is the alarm.
- The honeypot silently drops a bot's post (looks like success); a too-fast post gets a visible friendly retry, because a
  real person with autofill might trigger it. The minimum is 2.5 seconds.
- The honeypot field is `hp_site`, not `website`, because password managers fill `website`.
- A missing timing field is no signal, so older clients and direct posts still work; the limit of this protection is stated
  in `docs/SECURITY.md`: it stops form-filling bots, and a script that posts JSON directly is limited only by the IP throttle.
- The 404 rule covers unknown first path segments only; `app`, `login`, `set-password`, `p`, `verify`, `work`, `resources`
  and `blog` keep the app shell, because the CMS can publish pages there that the build never saw.
- `ErrorDocument 404 /404.html` also gives the site's page to other Apache-generated 404s (an empty directory, a missing `.php`).
  Status codes are unchanged, and PHP's own JSON 404 bodies are not replaced.
- Cloudflare's address ranges are copied from cloudflare.com/ips with the date; the key is `$TRUST_CLOUDFLARE_IP`, off by default.
- Wording on the cookie page is facts and a citation of Clerk's documentation, not legal advice; the adviser reviews it.

## Left to the builder

Class and file names inside the files named in the plan, the exact markup and CSS of the honeypot, test helpers, how the
Apache check script builds its temporary config, and the copy of the friendly retry message beyond "That was quick".

## Done when

Each item's check in `docs/ROADMAP.md` passes, the ladder and axe are clean, a fresh reviewer has read the whole branch, and
what needs the owner is listed (upload `server/.htaccess`, set `$TRUST_CLOUDFLARE_IP`, the adviser's review of the cookie
wording).
