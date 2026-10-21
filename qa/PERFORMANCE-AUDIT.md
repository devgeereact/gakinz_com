# Performance audit

**Scope:** the public surface at `/`.
**Date of this run:** 2026-09-22, re-measured for D-046 on 2026-10-16 (section 9)
**Result: large, measured improvements to what ships. Core Web Vitals are
measured only in a local lab, and that is not the same as field performance.**

**Later evidence (2026-10-10).** After the D-037 rebuild, Lighthouse 12.8.2 mobile against the
local production build reported performance 96 and first contentful paint 2.1 s on `/`, with
the Google Fonts `@import` still render-blocking (K-042) and a duplicate canonical on inner
routes (K-043). The bundle figures below are from 2026-09-22 and have not been re-measured.

**Superseded UI (2026-10-14).** The public site was rebuilt under D-046 (branch
`feat/redesign-2026`, not deployed) and every font is now self-hosted, with the Google Fonts
import removed (K-042). No Lighthouse run, CLS or LCP measurement and no bundle count has been
made since, so nothing in this file describes the current build (`docs/KNOWN-ISSUES.md`
K-045).

**Re-measured 2026-10-16.** Section 9 is the current measurement: Lighthouse 12.8.2 mobile on
`/`, `/work` and `/contact`, bundle and font sizes. Home CLS is 0.114 (K-052).

---

## 1. What was measured, and the caveat that governs the rest

Everything below was taken against the production build (`npm run build`) served by
`npm run preview` on `127.0.0.1:5102`, in Chrome, with **no CPU throttling and no
network throttling**.

That makes the byte counts real and the timings optimistic. A local preview over
loopback has no latency, no bandwidth ceiling and no contention. The LCP and CLS
figures in section 4 are therefore a floor, not a prediction. **No field data exists**,
the site has no CrUX entry, and nothing has been measured against the deployed host.

Treat section 2 as fact and section 4 as a lab reading.

## 2. What ships, before and after

| Measure | Before | After | Change |
|---|---|---|---|
| Entry chunk | 556.94 kB | **181.76 kB** | −67% |
| `dist/` total | 43 MB | **2.6 MB** | −94% |
| `public/` | 36.1 MB | **96 KB** | −35.92 MiB |
| JS chunks emitted | 67 | 46 | −21 |
| Direct npm dependencies | 56 | **29** | −27 |
| npm audit findings | 33 | **7** | −26 |
| Render-blocking third-party CSS | 2 CDNs | **0** | both removed |

### Where the entry chunk went

The 556.94 kB entry was the public site, the router and the framework in one
undifferentiated blob, re-downloaded whenever any of it changed. It is now split:

| Chunk | Size | Why |
|---|---|---|
| `index` | 181.76 kB | Application code |
| `vendor` | 284.16 kB | react, react-dom, react-router, scheduler. Changes rarely, so it stays in cache across deploys |
| `icons` | 24.75 kB | lucide-react, which ships one module per glyph and was previously emitted as roughly 30 chunks of 150 to 500 bytes, each one its own HTTP request |

### The 35.92 MiB

`public/` held 76 unreferenced files: two byte-identical copies of the same 19 card
images, 15 carousel images, eight country flags, 14 product images and the Vite
scaffold logo. Every one was copied into `dist/` at build and uploaded by FTP on every
deploy. None was referenced by any source file. Verified by scanning each full basename
against `src/` and `index.html` before deletion.

### The 27 packages

Eleven had zero references anywhere in the repository: `@tabler/icons-react`,
`date-fns`, `apexcharts`, `react-apexcharts`, `react-phone-number-input`, `zod`,
`framer-motion`, `@tiptap/react`, `@tiptap/starter-kit`, `react-simple-wysiwyg`,
`@hookform/resolvers`. Removing the two tiptap packages alone cleared 25 of the 33 npm
audit findings. A further 16 became orphaned once 27 dead source files were removed.

Three retired duplicate stacks: two charting libraries where one was unused, two rich
text editors where neither was used, and two calendar implementations where both were
orphaned.

## 3. Requests removed from the critical path

`index.html` loaded two icon webfonts from two separate CDNs, both render-blocking:
`bootstrap-icons` from jsdelivr and `boxicons` from `cdn.boxicons.com`. Neither had a
single `bi-` or `bx-` usage anywhere in `src/`. Both are gone.

`index.html` now carries `preconnect` for both Google Fonts origins, a real per-page
title and description, Open Graph and Twitter Card tags, a `theme-color`, and a
`<noscript>` block that tells a visitor without JavaScript what the site is and how to
make contact.

**The font stylesheet itself is still `@import`-ed from `src/index.css`, and that is now
a measured decision rather than an oversight.** Moving it into `index.html` as a
`<link>`, which is the textbook advice and does start the request earlier, was tried and
reverted:

| Fonts loaded via | CLS on `/` | Lighthouse Agentic Browsing |
|---|---|---|
| `@import` in the bundled CSS | **0.00** | 100 |
| `<link>` in `index.html` | **0.151** | 92 |

The link version pushes CLS past the 0.1 threshold, because text paints in a fallback
face and reflows when Newsreader arrives. On a site whose whole argument is its
typography, trading a measurable layout shift for a small improvement in discovery time
is the wrong way round.

Doing it properly needs `size-adjust` and the other fallback metric overrides on an
`@font-face` for the fallback family, so the swap moves nothing. That is a real piece of
work with its own verification, and it is item 2 in section 6 rather than something half
done here. The `preconnect` stays either way and still shortens the handshake.

## 4. Core Web Vitals, lab only

Chrome DevTools performance trace, production build, local preview, no throttling.

| Page | LCP | CLS | TTFB | Render delay |
|---|---|---|---|---|
| `/` | 91 ms | **0.00** | 2 ms | 90 ms |
| `/services` | 67 ms | **0.00** | 1 ms | 65 ms |

CLS of exactly zero on both is the figure worth keeping. It is a property of the
design rather than of the network: the layout reserves its space, the work ledger's
image slots have a declared aspect ratio whether or not an image exists, and nothing
animates position on load.

LCP is dominated by render delay rather than resource loading, which is the expected
shape for a client-rendered application with no server-rendered markup. On a real
connection that delay is added to, not replaced by, network time.

**Lighthouse, mobile emulation, production build, local:**

| Category | Score |
|---|---|
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| Agentic Browsing | 100 |

54 audits passed, 0 failed. The Lighthouse **performance** category was not run, because
a performance score from an unthrottled loopback preview would be meaningless.

## 5. Still true, and still a limitation

**The site is client-rendered with no prerender step.** A crawler or client that does
not execute JavaScript receives `<div id="root"></div>` and nothing else, on every URL.
Googlebot renders; most social scrapers and most LLM crawlers do not.

Three things were done about it. None is a fix, and together they reduce the blast
radius rather than removing it:

- **The served `index.html` now describes the site correctly on its own.** It previously
  carried the old studio title, "GAkinz — Web Design & Development Studio", and the old
  studio description, which is what every non-rendering client saw. It now carries the
  correct title, description, canonical, Open Graph and Twitter Card tags, a
  `theme-color`, and a real `og.png` at 1200x630. A social scraper that never runs
  JavaScript now gets an accurate card instead of a stale one.
- **A `<noscript>` block** tells a visitor with JavaScript disabled who this is and gives
  them an email address, rather than showing them an empty page.
- **`public/llms.txt`** states the site's actual content in Markdown, for crawlers that
  read it.

What none of that fixes: the per-page content of the other fourteen routes. A scraper
still sees the home page's metadata on every URL, because the per-route tags are written
by React at runtime.

The real fix is prerendering the public routes at build time. It is recorded in
`docs/KNOWN-ISSUES.md` rather than attempted here, because it changes the build and the
deploy and deserves its own decision.

## 6. Remaining work, in order of likely benefit

| # | Item | Why it matters |
|---|---|---|
| 1 | Prerender or statically render the public routes | Removes the empty-shell problem and most of the render delay in section 4 |
| 2 | Move the fonts to a `<link>` **with `size-adjust` fallback metrics** | The naive move costs CLS 0.151, measured. It only pays off once the fallback face matches Newsreader's metrics so the swap moves nothing |
| 3 | Subset the fonts, or drop a family | Four families for two surfaces. The CMS pair is downloaded on the public site only if a shared component pulls it |
| 4 | Decide on `xlsx` | The only direct dependency with a HIGH advisory and no fix available. Used at `src/lib/csv.ts:5` |
| 5 | Measure against the deployed host | Everything here is local. Compression, caching headers and TLS on the real host are UNVERIFIED |
| 6 | Add `Cache-Control` and compression to `server/.htaccess` | It sets neither today |

## 7. What is NOT TESTED

- **No field data.** No real-user measurement, no CrUX entry.
- **No measurement against the deployed site.** No server was contacted.
- **No throttled run.** Every timing here is loopback with no CPU or network limit.
- **No Lighthouse performance score**, deliberately, for the reason in section 4.
- **No measurement of the CMS at `/app/*`.** Out of scope.
- Compression, caching and HTTP protocol version on the live host are **UNVERIFIED**.
  `server/.htaccess` configures none of them.

## 8. How to re-run this

```bash
npm run build      # prints the chunk table
npm run preview    # port 5102
du -sh dist public
npm audit
```

Then trace `http://127.0.0.1:5102/` in Chrome DevTools and record LCP, CLS and the
breakdown, noting the throttling settings used. If you throttle, say so in the table:
an unlabelled timing is worse than none.

---

## 9. D-046 re-measurement, 2026-10-16

This section replaces sections 2 and 4 as the description of the current build. Everything
above is kept as history.

**Result: PARTIAL.** Accessibility, Best Practices and SEO are 100, 100 and 92 to 100.
Performance is 73 to 92 under simulated mobile throttling. On the home page CLS is **0.114**,
over the 0.1 threshold, and LCP is 4.9 s (K-052).

### 9.1 Method and its limits

Branch `qa/redesign-audits` at `dae9f3e`: the redesign at `89c7829` plus the first four audit
fixes. The fifth, `ffaa083`, changes only the lazily loaded CMS sidebar. `npm run build`, then
`vite preview` on `127.0.0.1:5193`.

Lighthouse **12.8.2** from the command line, mobile preset, **simulated throttling** (150 ms
RTT, about 1.6 Mbps, 4x CPU slowdown), headless Chrome 155, run twice per page; both runs
agreed to within one point. This is the first Lighthouse **performance** score recorded for
the site: section 4 deliberately did not record one, and these figures are a simulation, not
a field measurement.

**The API was not intercepted during Lighthouse.** Lighthouse cannot route requests the way
the Playwright audit did. Because the production build calls the API on its own origin, the
page's `site.php`, `work.php`, `blog.php` and `testimonials.php` requests went to the local
preview. Its SPA fallback answered with HTML, which the client cannot read, so every public
page fell back to its built-in content, exactly as in the accessibility run. No request left
the machine. Real CMS answers would add payload and may move LCP.

### 9.2 Lighthouse scores

| Page | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 73, 74 | 100 | 100 | 100 | 2.7 s | 4.9 s | **0.114** | 120 ms, 90 ms | 2.7 s |
| `/work` | 87, 87 | 100 | 100 | 92 | 2.7 s | 3.5 s | 0 | 30 ms, 40 ms | 2.7 s |
| `/contact` | 92, 92 | 100 | 100 | 92 | 2.7 s | 2.7 s | 0.001, 0 | 0 ms | 2.7 s |

What drives the numbers:

- **`/` CLS 0.114.** One shift, on the hero's `.laptop` device frame, attributed by Lighthouse
  to "Web font loaded" three times. The hero columns are vertically centred, so when the
  display face swaps in and the copy column changes height the device stage moves. K-052.
- **`/` LCP 4.9 s.** The LCP element is the first hero screenshot,
  `/images/work/rotaflow-d.webp`. Of the simulated time, 37% is load delay (it is found only
  after the JavaScript renders) and 53% is render delay. A client-rendered page with no
  prerender pays both (section 5). K-052.
- **`/work` LCP 3.5 s.** The LCP element is the first card's screenshot, which carries
  `loading="lazy"`, so Lighthouse fails `lcp-lazy-loaded`. K-053.
- **FCP 2.7 s everywhere.** The one stylesheet, `index-*.css` (25 kB on the wire), is
  render-blocking; Lighthouse estimates about 450 ms of it.
- **SEO 92 on `/work` and `/contact`.** The `canonical` audit fails with "Multiple conflicting
  URLs": the static canonical in `index.html` plus the per-route one. That is K-043, still
  open. `/` passes because both point at the same URL.
- Lighthouse's experimental `label-content-name-mismatch` flags the brand link (visible
  "GAkinz", name "GAkinz, home"). The name starts with the visible text, which meets 2.5.3
  Label in Name, and the audit is not scored.

### 9.3 What ships on first load

From the `vite build` output at `dae9f3e` (the build Lighthouse measured):

| Asset | Size | Gzip |
|---|---|---|
| Entry `index-*.js` | 170.62 kB | 52.58 kB |
| `vendor-*.js` (React, router) | 285.02 kB | 91.53 kB |
| `index-*.css` (both surfaces) | 114.89 kB | 25.59 kB |

Fonts requested on first paint, the same on all three pages (each Latin subset only; the
other eight emitted subsets were not requested):

| File | Size |
|---|---|
| Bricolage Grotesque, Latin, `opsz` | 76.89 kB |
| JetBrains Mono, Latin, `wght` | 40.40 kB |
| Hanken Grotesk, Latin, `wght` | 34.70 kB |
| **Total** | **151.99 kB** |

The Google Fonts `@import` is gone (K-042). Transfer on first load: `/` 666 kB over 25
requests, `/work` 580 kB over 18, `/contact` 324 kB over 11. `dist/` is 3.8 MB.

### 9.4 Open

| # | Item | Entry |
|---|---|---|
| 1 | Stop the font swap moving the hero: fallback metric overrides (`size-adjust`) on the display face, or preload the Bricolage Latin file | K-052 |
| 2 | Load the first `/work` card image eagerly | K-053 |
| 3 | Remove the static canonical (SEO 92 on inner routes) | K-043 |
| 4 | Prerender the public routes, which removes most of the LCP load and render delay | section 6, item 1 |

### 9.5 NOT TESTED in this run

- Field data, a real device, and the deployed host (compression, caching, HTTP version).
- Pages fed by real CMS responses.
- Any CMS screen.
