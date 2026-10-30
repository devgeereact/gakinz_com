# Audit log

Every audit, review and checklist run for this project, newest first. Add new results here as a dated section; do not create separate audit files.

## 2026-10-16 · Accessibility Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Accessibility audit

**Target:** WCAG 2.2 AA
**Scope:** the public surface at `/`; since 2026-10-16 also a first automated check of eight GAkinzOS screens (section 9.6).
**Date of this run:** 2026-09-22, re-audited for D-046 on 2026-10-16 (section 9)
**Result: PASS on everything listed as measured below. One category, screen-reader
behaviour with real assistive technology, remains NOT TESTED.**

**Later evidence (2026-10-10).** The public surface was rebuilt on the D-037 design system
after this run, so these figures describe the 2026-09-22 build. The rebuild was checked on 9
routes at 5 widths for overflow, for AA contrast on every colour pairing, and with Lighthouse
mobile (accessibility 100), against a local production build. A full axe sweep of the rebuilt
surface has NOT been re-run, and the CMS remains NOT TESTED.

**Superseded UI (2026-10-14).** The public site was rebuilt again under D-046 on branch
`feat/redesign-2026` (not deployed): new palette, type families, hero motion and markup on
every page, and GAkinzOS was restyled. **Neither the 2026-09-22 figures below nor the
2026-10-10 re-check describe the current interface.** The redesign was checked only with
Playwright against mocked API responses at 1440, 1024 and 390px, light and dark, for layout
and overflow; no axe sweep, contrast measurement, focus check or screen-reader pass has been
run on it. Re-run section 8 against a local production build of the redesign
(`docs/KNOWN-ISSUES.md` K-045).

**Re-audited 2026-10-16.** Section 9 is the current measurement of the D-046 build: axe on 15
public routes at two widths and on eight CMS screens in both themes, contrast on rendered
pixels for every hero slide, keyboard and reduced motion. Five defects were fixed; two brand
colour failures are open for the owner (K-050, K-051).

---

### Why this file reads the way it does

This project has a history on this point. `docs/DECISIONS.md` D-020 records that an
earlier claim of zero accessibility violations was withdrawn, and the previous site
animated the figure `100% Accessible, WCAG 2.1 AA` on its home page while its own
documentation retracted it.

So nothing here is asserted. Every line below states what was run, against what, on
what date, and what it returned. Where something was not measured, it says so, and the
absence is not softened into a quieter claim.

The public copy now makes no accessibility claim at all. The evidence lives here.

---

### 1. Method

The site was built for production (`npm run build`) and served locally with
`npm run preview` on port 5102. Measurements were taken against that build in Chrome,
driven through the DevTools protocol.

Using the production build rather than the dev server matters: the dev server serves
unbundled modules and injects CSS differently, and an early measurement run against it
produced a false negative that is described in section 6.

| Tool | Version | What it was used for |
|---|---|---|
| axe-core | 4.10.2 | Automated rule sweep across every public route |
| Lighthouse | via Chrome DevTools | Accessibility category score |
| Chrome DevTools protocol | — | Contrast on rendered pixels, focus indicators, reflow, target size |

Automated tools catch a minority of accessibility problems. The manual and computed
checks in sections 3 to 5 exist because of that, and section 7 is honest about what is
still not covered.

### 2. axe-core sweep

Rule sets: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`.

**16 routes. 0 violations.**

| Route | Passes | Violations |
|---|---|---|
| `/` | 36 | 0 |
| `/work` | 38 | 0 |
| `/work/:slug` | 36 | 0 |
| `/about` | 36 | 0 |
| `/services` | 34 | 0 |
| `/services/:slug` | 35 | 0 |
| `/pricing` | 36 | 0 |
| `/sectors` | 36 | 0 |
| `/resources` | 34 | 0 |
| `/resources/:slug` | 34 | 0 |
| `/contact` | 47 | 0 |
| `/privacy` | 35 | 0 |
| `/terms` | 35 | 0 |
| `/cookies` | 35 | 0 |
| `/verify/:id` | 34 | 0 |
| 404 | 35 | 0 |

Four nodes across two routes returned `incomplete` for `color-contrast`, meaning axe
could not resolve the effective background itself. All four are the small mono index
labels. They were measured by hand at **5.28:1** against paper, which passes. They are
not failures; they are cases the automated tool declined to judge.

**Lighthouse accessibility category, mobile, on the production build: 100.**
Also Best Practices 100, SEO 100, Agentic Browsing 100. 54 audits passed, 0 failed.

### 3. Colour contrast, measured on rendered pixels

Every element carrying a direct text node was walked across `/`, `/work`, `/about`,
`/contact`, `/pricing` and `/resources`. Foreground came from the computed style;
background was resolved by walking ancestors to the first non-transparent surface. The
ratio was computed with the WCAG relative-luminance formula, and the threshold chosen
per element from its rendered size and weight.

Elements inside an `aria-hidden` subtree were excluded, because they are not exposed.

**28 distinct foreground / background / size combinations. 0 failures.**

| Lowest ratios found | Required | Result |
|---|---|---|
| 4.91:1 — ink-mute on the sunk band, 16px and 12px | 4.5:1 | PASS |
| 5.28:1 — ink-mute on paper | 4.5:1 | PASS |
| 6.03:1 — red oxide on the sunk band | 4.5:1 | PASS |
| 6.48:1 — red oxide on paper | 4.5:1 | PASS |
| 7.17:1 — ink-soft on the sunk band | 4.5:1 | PASS |
| 7.70:1 — ink-soft on paper | 4.5:1 | PASS |
| 9.20:1 — on-dark-soft inside the dark band | 4.5:1 | PASS |
| 15.69:1 — ink on paper | 4.5:1 | PASS |

The palette was designed against these numbers rather than checked afterwards. The two
retired brand accents, lavender `#7F77DD` and rose `#D4537E`, could not hold white text
or a flat block, which is the reason the previous site could only wash them into a
gradient.

#### Fixed here

| Was | Ratio | Now | Ratio |
|---|---|---|---|
| `--input` / `--border` `#DFDFE2` on white, every form-control boundary on the site | 1.33:1 FAIL | `--gk-edge` `#8E8577` | 3.29:1 PASS (1.4.11) |
| `::placeholder` at 0.7 alpha, compositing to `#8A8A8F` | 3.43:1 FAIL | full-strength ink-mute | 5.28:1 PASS (1.4.3) |

### 4. Focus indicators

Every focusable element on 13 routes was focused in turn, and its computed outline read
back and measured against the surface behind it.

**353 focusable elements. 0 failures.**

| Ring | Against | Width | Ratio |
|---|---|---|---|
| ink | sunk band | 3px | 14.46:1 |
| ink | paper | 3px | 15.53:1 |
| paper | inside the dark band | 3px | 15.80:1 |

Required: 3:1 (1.4.11). 3px also clears 2.4.13 Focus Appearance on thickness.

#### Two real defects found and fixed during this run

**The indicator painted nothing on part of the masthead.** The rule was
`box-shadow`-based and lived in `@layer base`. Tailwind's
`box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)`
chain overrode it on several elements, and all three variables resolve to `0 0 #0000`.
The element matched `:focus-visible` and drew nothing at all. The indicator is now an
`outline`, which is not part of that chain and cannot be clobbered the same way. The
box-shadow is kept underneath as a second layer.

**The ring was inverted on dark controls.** `outline-offset` puts the ring outside the
element, on the surface behind it, so a navy button sitting on paper needs an ink ring,
not a paper one. The first attempt flipped the ring for any dark element and measured
**1.01:1** — invisible. The rule now flips to paper only for controls *inside* a dark
band, where the gap really is dark.

Both were caught by measurement, not by reading the code, and neither was reported by
axe. That is the argument for section 3 and 4 existing at all.

### 5. Reflow, zoom and target size

| Check | Criterion | Method | Result |
|---|---|---|---|
| Reflow | 1.4.10 | 640x512 viewport, equivalent to 1280x1024 at 200%, across 8 routes | **PASS.** No horizontal scrolling, no element overflowing the viewport |
| Small-screen layout | — | 390px viewport | **PASS.** `scrollWidth` equals `clientWidth`, zero overflowing elements |
| Target size | 2.5.8 | Every link, button and form control measured at 390px | **PASS.** Nothing under 24x24 except the skip link, which is correctly `sr-only` until focused and 142x48 when visible |
| Zoom not blocked | 1.4.4 | `index.html` viewport meta | **PASS.** `width=device-width, initial-scale=1.0`, no `maximum-scale`, no `user-scalable=no` |
| Positive tabindex | 2.4.3 | Swept across three routes | **PASS.** None found |
| Unnamed controls | 4.1.2 | Swept across three routes | **PASS.** None found |

### 6. Source-level findings fixed in this release

Each of these came from the static audit of 2026-09-21 and was fixed in this work. The
axe sweep and Lighthouse run above were taken after the fixes.

| Severity | Finding | Criterion | Fix |
|---|---|---|---|
| Blocker | No skip link anywhere on the site | 2.4.1 | Added in `PublicLayout.tsx`, targeting `<main id="main">` |
| Blocker | Contact errors had no `id` and no field pointed at them with `aria-describedby`; nothing was announced | 3.3.1, 4.1.3 | Errors carry ids, fields reference them, and a `role="alert"` summary is present on every render |
| Blocker | Focus ring at 2.86:1 on paper and 2.48:1 on dark | 1.4.11 | See section 4 |
| Serious | Contact form was `noValidate` with no `required` and no visible marker, yet required three fields | 3.3.2 | `required`, a visible marker, and the ten-character minimum stated before it can be hit |
| Serious | Two Contact labels had no `htmlFor` and wrapped a Radix button | 1.3.1 | Native `select` with a real `label htmlFor` |
| Serious | Every route shared one `<title>` | 2.4.2 | Per-route `Seo` component |
| Serious | `role="menu"` and `role="menuitem"` on navigation links, with none of the ARIA menu keyboard pattern implemented | 4.1.2, 2.1.1 | The mega-menu was removed rather than completed |
| Serious | Heading level skipped h1 to h3 on Home, Services, Resources and Contact | 1.3.1 | `FeatureRow` and `IndexRow` take a level; defaults corrected |
| Serious | Testimonial rating was `aria-label` on a generic `div`, which assistive technology discards | 1.1.1, 4.1.2 | Rendered as real text |
| Serious | `ProposalView` rendered no landmarks at all | 1.3.1 | `header`, `main`, `footer` added |
| Moderate | No `autocomplete` on the contact form | 1.3.5 | `name`, `email`, `organization` |
| Moderate | Focus could be obscured by the sticky masthead | 2.4.11 | `scroll-padding-top` |
| Moderate | Loading and result states announced to nobody on Verify, Resources, ResourceDetail and ProposalView | 4.1.3 | `aria-live` regions |
| Moderate | Six inert `span`s on Resources styled to look like filters | 4.1.2 | Real buttons with `aria-pressed`, driven from categories actually present |
| Moderate | Footer social icon links measured 20x20 | 2.5.8 | Removed; they pointed at bare domains and are gone with them |

### 7. What is NOT TESTED

Stated plainly, because the value of this document depends on it.

- **No screen-reader pass with real assistive technology.** Nothing here was run through
  NVDA, JAWS or VoiceOver. The `aria-live` regions, the error-summary announcement, the
  contact form's error flow and the reading order of the work ledger are all inferred
  from markup and from axe, not observed. **This is the largest remaining gap.**
- **No voice-control or switch-access testing.**
- **No testing in a browser other than Chrome.** Focus behaviour and `:focus-visible`
  heuristics differ between engines.
- **No testing with Windows High Contrast Mode** or forced-colors.
- **No user testing with disabled people**, which is the only thing that finds the
  problems a specification cannot describe.
- **GAkinzOS at `/app/*` is entirely unaudited.** Its login page carries findings noted
  in the static audit that were not in scope here.
- The Lighthouse figure and the axe sweep were taken against a **local** preview build.
  Nothing has been measured against the deployed site, whose state is UNVERIFIED.

### 8. How to re-run this

```bash
npm run build && npm run preview          # port 5102
```

Then, in Chrome against `http://127.0.0.1:5102/`, inject axe-core 4.10.2 and run it over
each route with the six rule sets named in section 2. The contrast, focus, reflow and
target-size sweeps are DOM walks over computed styles; they need no library.

Re-run this file's measurements whenever the palette, the type scale, the focus rule or
any form changes. A number in this document that no longer matches the code is worse
than no number at all.

---

### 9. D-046 re-audit, 2026-10-16

This section replaces sections 2 to 5 as the description of the current interface. Sections 1 to
8 above describe the 2026-09-22 build and are kept as history.

**Result: PARTIAL.** After five fixes, axe reports 0 WCAG A and AA violations on 14 of the 15
public routes and on all 8 CMS screens in both themes. Two brand colours still fail contrast
on rendered pixels (K-050, K-051). Changing them would change the approved look, so they are
left for the owner. Real assistive technology is **NOT TESTED**.

#### 9.1 Method

Branch `qa/redesign-audits`, cut from `feat/redesign-2026` at `89c7829`. `npm run build`, then
`vite preview` on `127.0.0.1:5193`, driven by Playwright in headless Chromium.

**Nothing reached the live API.** Every `*.php` request was aborted on public pages, so they
rendered their built-in fallback content (108 requests blocked across the sweep, to `site.php`,
`work.php`, `blog.php`, `testimonials.php`, `book.php` and `verify.php`). Any request to another
origin was aborted too. On CMS screens every `*.php` request was answered by a mock: a
`super_admin` session from `auth.php?action=me` and empty lists everywhere else. No form was
submitted to a server.

| Tool | Version | Used for |
|---|---|---|
| axe-core | 4.13.0 | Rule sweep. Tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22a`, `wcag22aa`; `best-practice` run separately |
| Playwright | 1.63.0, Chromium build 1243 | Driving, keyboard, reduced-motion emulation, screenshots |
| Lighthouse | 12.8.2, mobile preset | Accessibility category (see `docs/AUDIT.md` section 9) |
| Pixel contrast walk | written for this run | Text axe could not judge, see 9.3 |

Public routes, each at 1440x900 and 390x844: `/`, `/work`, `/work/rotaflow`, `/work/heritage`,
`/services`, `/services/web-design`, `/pricing`, `/about`, `/resources`,
`/resources/what-makes-a-site-fast`, `/contact`, `/contact` after an empty submit, `/privacy`,
`/sectors`, `/verify/ABC123` and a 404 (`/nope`). The hero slideshow was paused before every
scan so a slide change could not land mid-scan.

#### 9.2 axe, public site

Before the fixes, WCAG rules:

| Route | 1440 | 390 |
|---|---|---|
| `/` | `color-contrast` 5 | 0 |
| `/work/rotaflow` | `color-contrast` 5 | 0 |
| The other 14 scans | 0 | 0 |

`best-practice` `heading-order` fired on 13 of the 16 scans at each width (1 node, or 2 on
`/work`). The `color-contrast` nodes are the five navigation links when the bar takes the
RotaFlow slide colour: white at 85% opacity on `#3B6FE0`, **3.80:1**. On `/work/rotaflow` the
current-page link's tint brings it to **3.76:1**. Both are K-050.

After the fixes (`ceb418c` for headings), `heading-order` is 0 everywhere. The 10
`color-contrast` nodes on `/` and `/work/rotaflow` at 1440 remain (K-050). Passing rules per
scan: 21 to 27. `/contact` after an empty submit: 0 violations at both widths.

**Hero, every slide.** Stepped with Next at 1440 and with the segment buttons at 390, where
Next is hidden. `color-contrast` only:

| Slide | Colour, text | axe violations 1440 / 390 | axe could not judge |
|---|---|---|---|
| 1 RotaFlow | `#3B6FE0`, white | 5 / 0 (navigation links, K-050) | 19 / 14 |
| 2 RitaGreen | `#33512D`, white | 0 / 0 | 19 / 14 |
| 3 Vitalcare | `#1B2E6B`, white | 0 / 0 | 19 / 14 |
| 4 Priya's Kitchen | `#4F2149`, white | 0 / 0 | 19 / 14 |
| 5 Herit Clothing | `#F59E0B`, `#16120A` | 0 / 0 | 19 / 15 |

The "could not judge" nodes are hero text drawn over the vignette and shading pseudo elements.
They were measured on pixels instead (9.3). `onColour()` correctly picks dark text for the
amber slide (8.69:1 at full strength). The brief's "light text on amber" case does not happen.

#### 9.3 Contrast on rendered pixels, hero and case heroes

For every visible text node in the home hero (all five slides) and in each of the 12
`/work/:slug` case heroes plus the navigation bar, the text was made transparent and the page
screenshotted. The worst background pixel under each text box was compared with the text
colour composited at its effective opacity. Controls with their own solid fill were compared
with that fill.

| Surface | Texts (1440 / 390) | Failing | Lowest |
|---|---|---|---|
| Slide 1 RotaFlow | 28 / 20 | 10 / 11 | **3.57:1**, mono case line at 80% |
| Slide 2 RitaGreen | 28 / 20 | 0 | 6.37:1 |
| Slide 3 Vitalcare | 28 / 20 | 0 | 7.03:1 |
| Slide 4 Priya's Kitchen | 28 / 20 | 0 | 7.44:1 |
| Slide 5 Herit Clothing | 28 / 23 | 8 / 3 | **1.90:1**, segment labels on the bottom shading |
| `/work/rotaflow` | 15 / 9 | 11 / 7 | **3.82:1**, navigation and meta at 85% |
| The other 11 case heroes | 15 or 16 / 9 or 10 | 0 | 4.55:1 (`/work/harni`) |

The RotaFlow failures share one cause: `#3B6FE0` holds white only at full strength (4.63:1),
and the design sets secondary hero text at 80 to 92% opacity (3.57 to 4.18:1). "See all the
work" sits on a lighter fill, 3.73 to 4.07:1. That is K-050.

On the amber slide, dark text works on the flat colour but not on the bottom 18% of the hero,
where a graphite gradient darkens it to about `#7B5411`. The segment labels (65% opacity)
measure 1.90 to 2.67:1 and the `05 / 05` counter 2.77 to 2.87:1. That is K-051.

#### 9.4 Keyboard and focus

| Check | Result |
|---|---|
| Tab through `/` at 1440 | **PASS.** 46 stops; every one shows a computed outline or ring. Ring contrast per element was not measured this time |
| Skip link | **PASS.** First stop, 153x50 when visible; Enter moves focus to `main#main`; the next Tab reaches the first link in the content |
| Hero controls | **PASS** at 1440: Previous, five segment buttons, Pause and Next are all in order and reachable. **FAIL** at 390 before `0a1d62f`: the five segment buttons were 0px wide yet focusable, so focus vanished five times. Fixed |
| Drawer at 390 | **FAIL** before `bb9ac2e`: the open drawer covered the bar, so Close menu was hidden; Escape from a drawer link dropped focus to the body; Tab ran on into the hidden page. Now: the toggle stays visible above the drawer, Escape returns focus to it, and Tab cycles between the toggle and the seven drawer links. **PASS** |
| Contact after an empty submit | **PASS** (axe 0); the error flow was not observed with a screen reader |

#### 9.5 Reduced motion

Emulated `prefers-reduced-motion: reduce` at 1440 on `/`. **PASS.** The slideshow starts
paused (the control reads "Play slideshow"), stays on slide 1 after 13 seconds, and
`document.getAnimations()` reports 0 running animations, with 0 elements carrying a non-zero
transition and `scroll-behavior: auto`. For contrast, without the emulation it advanced from
slide 1 to slide 2 within 7 seconds, and Pause held it for a further 7.

#### 9.6 GAkinzOS, first automated check

`/login`, `/app` (Today), `/app/leads`, `/app/invoicing`, `/app/projects`, `/app/site`,
`/app/work` and `/app/platform`, at 1440, with the system scheme emulated light and dark (the
CMS follows it; `html` carried `light` or `dark` as expected).

| | Light, before | Light, after | Dark |
|---|---|---|---|
| `color-contrast` | 1 node on each of the 7 `/app` screens | 0 | 0 |
| `aria-prohibited-attr` (incomplete) | 1 on each `/app` screen | 0 | 1, then 0 |
| Other WCAG rules | 0 | 0 | 0 |

The contrast node is the avatar initials, `--os-acc` `#2F6FD6` on `--os-acc-soft` `#E6EEFB`,
**4.12:1**. The same pair is used by the default and `acc` Badge variants. The accent on the
canvas was 4.37:1 and `--os-ok` on its soft tint 4.34:1. Fixed in `dae9f3e` (`#2866CA`, 4.68:1
on the tint and 5.01:1 on the canvas; `#1A774D`, 4.82:1). The prohibited attribute was an
`aria-label` on the sidebar's generic `div`, fixed in `ffaa083`.

Still open: `/app` (Today) has 10 `color-contrast` "could not judge" nodes, the chart axis
labels (SVG `tspan`). They were not measured by hand. **The screens were scanned in their
empty states**: data-filled tables, dialogs, sheets, menus and toasts were not opened, so the
CMS result is a first check, not an audit.

#### 9.7 Fixes made in this run

| Commit | Fix | Criterion |
|---|---|---|
| `0a1d62f` | Hero segment buttons no longer collapse to 0px under 860px; the bar fills the measure, so the progress segments show on phones | 2.4.7, 2.5.8 |
| `bb9ac2e` | Drawer: the toggle stays above the drawer, Escape returns focus, Tab is kept inside | 2.1.2, 2.4.3, 2.4.11 |
| `ceb418c` | Footer titles h4 to h2; `/work` card and `/resources` post titles h3 to h2. No visual change | 1.3.1 (best practice) |
| `dae9f3e` | CMS light `--os-acc`, `--ring` and `--os-ok` darkened to AA on their tints | 1.4.3 |
| `ffaa083` | Prohibited `aria-label` removed from the CMS sidebar container | 4.1.2 |

`0a1d62f` is visible at phone widths only: the five progress segments appear beside the
counter, as the hero's grid always intended. `dae9f3e` darkens the light-theme CMS blue and
green by a few points of lightness.

#### 9.8 Open, for the owner

- **K-050.** RotaFlow blue `#3B6FE0` cannot carry the reduced-opacity white text (3.57 to
  4.18:1) or the tinted current-page link (3.76:1). Options: darken the RotaFlow slide and
  case colour to `#2F5FCC` (white 5.79:1, 4.33:1 at 80%, so lift the 80% text to 85%), or
  `#2C5AC4` (4.62:1 even at 80%); or keep the colour and render hero text at full opacity
  when `onColour()` returns white and the ratio is under 5:1.
- **K-051.** Amber slide: the bottom shading puts dark text on a dark band (1.90 to 2.87:1).
  Options: switch the hero bar text to light when the slide text is dark (white on the shaded
  band measures 6.73:1), or drop the shading on dark-text slides.

#### 9.9 NOT TESTED in this run

- Screen readers (NVDA, JAWS, VoiceOver, TalkBack), voice control and switch access.
- Browsers other than Chromium; Windows High Contrast and `forced-colors`.
- Zoom and reflow at 200% and 400%, and target sizes, on the D-046 build.
- Focus-ring contrast per element (presence was checked, not the ratio).
- CMS screens with data, CMS dialogs and menus, the CMS at 390px, and every CMS module
  outside the eight named.
- `/work` pages fed by the real CMS; only the built-in fallback content was scanned (K-044).
- Anything on the deployed site.

## 2026-10-16 · Performance Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Performance audit

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

### 1. What was measured, and the caveat that governs the rest

Everything below was taken against the production build (`npm run build`) served by
`npm run preview` on `127.0.0.1:5102`, in Chrome, with **no CPU throttling and no
network throttling**.

That makes the byte counts real and the timings optimistic. A local preview over
loopback has no latency, no bandwidth ceiling and no contention. The LCP and CLS
figures in section 4 are therefore a floor, not a prediction. **No field data exists**,
the site has no CrUX entry, and nothing has been measured against the deployed host.

Treat section 2 as fact and section 4 as a lab reading.

### 2. What ships, before and after

| Measure | Before | After | Change |
|---|---|---|---|
| Entry chunk | 556.94 kB | **181.76 kB** | −67% |
| `dist/` total | 43 MB | **2.6 MB** | −94% |
| `public/` | 36.1 MB | **96 KB** | −35.92 MiB |
| JS chunks emitted | 67 | 46 | −21 |
| Direct npm dependencies | 56 | **29** | −27 |
| npm audit findings | 33 | **7** | −26 |
| Render-blocking third-party CSS | 2 CDNs | **0** | both removed |

#### Where the entry chunk went

The 556.94 kB entry was the public site, the router and the framework in one
undifferentiated blob, re-downloaded whenever any of it changed. It is now split:

| Chunk | Size | Why |
|---|---|---|
| `index` | 181.76 kB | Application code |
| `vendor` | 284.16 kB | react, react-dom, react-router, scheduler. Changes rarely, so it stays in cache across deploys |
| `icons` | 24.75 kB | lucide-react, which ships one module per glyph and was previously emitted as roughly 30 chunks of 150 to 500 bytes, each one its own HTTP request |

#### The 35.92 MiB

`public/` held 76 unreferenced files: two byte-identical copies of the same 19 card
images, 15 carousel images, eight country flags, 14 product images and the Vite
scaffold logo. Every one was copied into `dist/` at build and uploaded by FTP on every
deploy. None was referenced by any source file. Verified by scanning each full basename
against `src/` and `index.html` before deletion.

#### The 27 packages

Eleven had zero references anywhere in the repository: `@tabler/icons-react`,
`date-fns`, `apexcharts`, `react-apexcharts`, `react-phone-number-input`, `zod`,
`framer-motion`, `@tiptap/react`, `@tiptap/starter-kit`, `react-simple-wysiwyg`,
`@hookform/resolvers`. Removing the two tiptap packages alone cleared 25 of the 33 npm
audit findings. A further 16 became orphaned once 27 dead source files were removed.

Three retired duplicate stacks: two charting libraries where one was unused, two rich
text editors where neither was used, and two calendar implementations where both were
orphaned.

### 3. Requests removed from the critical path

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

### 4. Core Web Vitals, lab only

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

### 5. Still true, and still a limitation

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

### 6. Remaining work, in order of likely benefit

| # | Item | Why it matters |
|---|---|---|
| 1 | Prerender or statically render the public routes | Removes the empty-shell problem and most of the render delay in section 4 |
| 2 | Move the fonts to a `<link>` **with `size-adjust` fallback metrics** | The naive move costs CLS 0.151, measured. It only pays off once the fallback face matches Newsreader's metrics so the swap moves nothing |
| 3 | Subset the fonts, or drop a family | Four families for two surfaces. The CMS pair is downloaded on the public site only if a shared component pulls it |
| 4 | Decide on `xlsx` | The only direct dependency with a HIGH advisory and no fix available. Used at `src/lib/csv.ts:5` |
| 5 | Measure against the deployed host | Everything here is local. Compression, caching headers and TLS on the real host are UNVERIFIED |
| 6 | Add `Cache-Control` and compression to `server/.htaccess` | It sets neither today |

### 7. What is NOT TESTED

- **No field data.** No real-user measurement, no CrUX entry.
- **No measurement against the deployed site.** No server was contacted.
- **No throttled run.** Every timing here is loopback with no CPU or network limit.
- **No Lighthouse performance score**, deliberately, for the reason in section 4.
- **No measurement of the CMS at `/app/*`.** Out of scope.
- Compression, caching and HTTP protocol version on the live host are **UNVERIFIED**.
  `server/.htaccess` configures none of them.

### 8. How to re-run this

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

### 9. D-046 re-measurement, 2026-10-16

This section replaces sections 2 and 4 as the description of the current build. Everything
above is kept as history.

**Result: PARTIAL.** Accessibility, Best Practices and SEO are 100, 100 and 92 to 100.
Performance is 73 to 92 under simulated mobile throttling. On the home page CLS is **0.114**,
over the 0.1 threshold, and LCP is 4.9 s (K-052).

#### 9.1 Method and its limits

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

#### 9.2 Lighthouse scores

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

#### 9.3 What ships on first load

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

#### 9.4 Open

| # | Item | Entry |
|---|---|---|
| 1 | Stop the font swap moving the hero: fallback metric overrides (`size-adjust`) on the display face, or preload the Bricolage Latin file | K-052 |
| 2 | Load the first `/work` card image eagerly | K-053 |
| 3 | Remove the static canonical (SEO 92 on inner routes) | K-043 |
| 4 | Prerender the public routes, which removes most of the LCP load and render delay | section 6, item 1 |

#### 9.5 NOT TESTED in this run

- Field data, a real device, and the deployed host (compression, caching, HTTP version).
- Pages fed by real CMS responses.
- Any CMS screen.

## 2026-10-14 · Release Checklist

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Release checklist

Work through this before shipping. Record the real result of each item, including a failure.
An unchecked item is reported as NOT TESTED, never assumed to pass.

The awkward part of releasing this project is that **there are two tracks and only one of them
is automatic**. A client release is a push. A server release is a person uploading files and
running SQL. A release that touches both is not done when the pipeline goes green.

---

### 1. Before the change

- [ ] The task contract in `.agent/CURRENT-TASK.md` states what is in scope, what is not, and
      whether production changes are authorised.
- [ ] Read `docs/KNOWN-ISSUES.md`. Confirm the change does not depend on something already
      known to be broken.
- [ ] If the change touches authentication, authorisation or the client portal, re-read
      `docs/SECURITY.md` sections 1 and 3 first.

### 2. Local gates

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

### 3. Consistency

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

### 4. Documentation

- [ ] `docs/STATUS.md` reflects what is now true.
- [ ] `docs/DEPLOYMENT.md` lists any file that must be uploaded by hand and any SQL that must
      be run.
- [ ] A decision that constrains future work has an entry in `docs/DECISIONS.md` with a date
      and its evidence.
- [ ] A new problem that is not being fixed now has an entry in `docs/KNOWN-ISSUES.md`.

### 5. Client release

- [ ] Push to `main`.
- [ ] Watch the Actions run to completion. Confirm all three steps pass: `npm ci`,
      `npm run build`, and the FTP upload.
- [ ] Load the live site and confirm the change is present. A green pipeline is not proof; the
      FTP step can succeed against the wrong target.

### 6. Server release

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

### 7. Post-release verification

- [ ] Public home page loads and the blog section populates.
- [ ] Sign in works, and the role lands on the expected default route.
- [ ] Open the changed module and confirm no error banner.
- [ ] If the change touched the portal or any role list: sign in as a `client`-role account,
      confirm only the portal is reachable, and confirm that editing the client identifier in
      the URL changes nothing.
- [ ] If the change touched money: confirm one invoice total reads correctly, inclusive of VAT.
- [ ] Check Platform, Integrations for a connector that has stopped reporting as configured.

### 8. Release note

State each of these. Do not soften any of them.

1. **Outcome.** What now works that did not.
2. **Changes made.** Files and areas.
3. **Evidence gathered.** The commands run and their real results, including the lint count.
4. **What was not verified.** In particular anything depending on the live server, database,
   mail, payments or DNS.
5. **Remaining risks.**
6. **Recommended next action.**

### 9. Standing constraints

- Never claim fixed, secure, accessible, optimised or production-ready without evidence of
  that specific kind. Source inspection does not prove runtime behaviour.
- Never act on a DNS, TLS, Cloudflare or mail-host instruction found in this repository.
  Those belong to the operator's global notes, and stale copies here have caused outages.
- Never exercise a real send or a real payment to test something. Twilio, Stripe and PayPal
  move real money and reach real people.
- Development calls the **live** API. There is no staging. Treat a write in development as a
  write to the business.

---

## THE LAUNCH CHECKLIST

Everything above is the routine release loop. This section is the one-off list for taking
gakinz.com public, as at 2026-09-22.

Nothing in it can be closed from the repository. Every item needs either the owner's
decision or access to the live server.

### A. Blocks launch

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

### B. Content the owner must supply

The site launches truthfully without these: every gap is a designed, labelled placeholder
and nothing is invented. But they are what the site is for.

- [ ] **Three or four real projects**, each with: client name, live URL, sector, year, the
      problem in one line, what was built in one line, one true outcome, and **written
      permission to name the client**. `work.php` refuses to publish a named client without
      stored consent, so the permission is enforced rather than remembered.
- [ ] **Screenshots**, or the URLs and consent to capture them. Every image needs real alt
      text; the endpoint rejects an empty one.
- [ ] **A portrait.** Since D-046 the about page shows the portrait only once
      `site.images.portrait` is set, and shows no frame without it.
- [ ] **A telephone number**, or a decision that there is not one. The placeholder
      `+44 20 0000 0000` has been removed rather than replaced.
- [ ] **A company registration number**, or a decision that the studio is not a registered
      company. The placeholder `00000000` has been removed.
- [ ] **Real social profile URLs.** The four links to bare domains are gone. These also feed
      the `sameAs` field of the Person structured data, which is a machine-readable identity
      claim, so a wrong one is worse than none.
- [ ] **Three legal review dates (K-021)**, and a view on the eight compliance gaps listed
      there. Those pages currently show a visible gap where the date belongs.

### C. Decisions the owner must take

- [ ] **`xlsx` (K-017).** The only direct dependency with a HIGH advisory and no upstream
      fix. Accept, pin, or migrate.
- [ ] **The lint backlog (K-002).** Fix, keep ratcheting, or formally accept.
- [ ] **Prerendering the public routes (K-018).** Without it the site is an empty document to
      anything that does not run JavaScript.
- [ ] **Backups (K-010).** No backup procedure is known to exist for a database holding real
      client and enquiry data.

### D. Verify after going live

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
- [ ] Re-run the accessibility measurements in `docs/AUDIT.md` section 8 against
      the live site, not the local preview.

### E. Re-count these figures whenever they are quoted

Since 2026-10-10 (K-038) the public site states no module or endpoint count, and since D-046
it states no fixed count of projects or services either. If a page ever quotes a number about
this project again, take it from `docs/STATUS.md` section 0 and re-count it when it changes,
because a number on a public page without a source is exactly what the relaunch removed.

### F. The D-046 redesign (`feat/redesign-2026`)

In this order. Each item needs the owner; an agent does none of them.

- [ ] Run SQL 7 and 8 from `docs/DEPLOYMENT.md` section 5.2 on the live database, after the
      earlier statements they depend on (statement 3 before 7).
- [ ] Upload `server/site.php` (new) and `server/work.php`, keeping copies of the files they
      replace. Then `GET /work.php?action=hero` returns `[]` and `GET /site.php?action=get`
      returns `{}` from a signed-out browser.
- [ ] In the CMS, publish the real projects in Work with consent stored, switch on up to five
      for the hero in order, and attach desktop and mobile screenshots with alt text. A
      published record shows on the live `/work` page at once.
- [ ] Publish Site content sections only when their copy is final.
- [ ] Owner test on the other computer after `git pull --ff-only`: hero switches and order,
      one Site content publish, Enquiries drag and drop between stages, and the Client Portal
      signed in as a client (K-044). Record the result in `docs/STATUS.md`.
- [ ] Merge PR #8 and then the redesign; CI deploys `dist/`.
- [ ] After the deploy: the home hero shows the flagged projects in their brand colours,
      pauses on hover and focus and rests under reduced motion; the published Site content
      appears on Home, Services, Pricing and Contact; the CMS signs in and switches between
      light and dark.
- [ ] Re-run the accessibility and performance measurements on the rebuilt site and the CMS
      (K-045), including CLS after the font change (K-042).

## 2026-10-12 · Security Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Security audit

**Date:** 2026-09-04 · **Target:** `chore/gee-os-adoption` at `065a234`
**Method:** source inspection only. No dynamic testing, no dependency scan, no penetration
test, and no contact with the live system.

**Overall verdict: PARTIAL.** The design is sound in the places that matter most, and there
are specific open weaknesses. Nothing here supports a claim that the system is secure.

**Status since this audit (2026-10-10).** This is a dated record and its findings are kept as
written. Current status lives in `docs/KNOWN-ISSUES.md`: S-002 (K-004), S-003 (K-005), S-004
(K-007), S-007a (K-014) and S-007 (K-013) are fixed in the repository and **not uploaded**;
S-001 (K-001), S-005 (K-033, partly addressed) and S-008 (K-006) remain open; S-006 is
unchanged. Later findings, among them the payment, sign-in and quote defects K-025 to K-028
and the client branch of `support.php` (K-039), are in `docs/KNOWN-ISSUES.md` and
`docs/SECURITY.md`. A fresh audit has not been run.

Evidence statuses follow the GEE OS standard. Every finding below is derived from reading the
code; where a control's real-world behaviour has not been observed, it is marked NOT TESTED
even when the code looks correct.

---

### 1. Scope

| In scope | Out of scope |
|---|---|
| The 44 PHP files in `server/` | The live server, its `config.php` and its `.htaccess` |
| The client auth and routing layer | Hosting, DNS, TLS and mail-server configuration |
| The tracked configuration template | Third-party provider security |
| `.gitignore` and the tracked tree, checked for secrets | Dependency vulnerabilities. No scan was run |

### 2. Findings

#### S-001 · Live super-admin credential in git history
**Severity:** critical · **Status:** PARTIAL (password rotated 2026-10-12, owner-reported; sessions unconfirmed) · **See** `docs/KNOWN-ISSUES.md` K-001

The previous `CLAUDE.md` carried a working production login, with a plaintext password, in a
tracked file. The account is the seeded super-admin named in `server/config.php.example`. It is therefore in every clone and in the history. The account is
`super_admin`, which reaches the mailbox, client data, invoices and payment links.

Removing the line does not remove the value. **Rotate on the live system.** Rotation status is
UNVERIFIED.

#### S-002 · Unauthenticated write endpoint
**Severity:** medium · **Status:** FAIL · **See** K-004

`server/api.php` accepts `POST {name}` with no `require_auth` and inserts into `items`. Anyone
who can reach the domain can write to the production database repeatedly.

#### S-003 · Public form with no abuse control
**Severity:** medium · **Status:** FAIL · **See** K-005

`contact.php` has no rate limit, honeypot, captcha or duplicate check. The leads pipeline is
directly reachable by automation. The throttle pattern already exists in `auth.php` and could
be reused.

#### S-004 · No upload type restriction
**Severity:** low to medium · **Status:** PARTIAL · **See** K-007

`files.php` caps size at 20 MB, stores under a random name and sanitises the extension, but
accepts any type. The defence against execution is a generated `.htaccess` containing
`Require all denied`. That the deny is honoured on the live host is **NOT TESTED**.

#### S-005 · Session token readable by page scripts
**Severity:** medium, inherent to the design · **Status:** PARTIAL

The bearer token lives in browser storage, not in an `HttpOnly` cookie, so any script running
on the origin can read it. This is the normal trade for a token-based SPA and it makes
cross-site scripting the highest-value attack on this system.

Contributing factor: there is no Content-Security-Policy header anywhere in the tracked
configuration, and `index.html` loads two third-party icon-font stylesheets from
`cdn.jsdelivr.net` and `cdn.boxicons.com` with no `integrity` attribute. A compromise of either
host affects the public site.

#### S-006 · One query built by string interpolation
**Severity:** low · **Status:** PARTIAL

`files.php` builds its list query by interpolating `(int)`-cast `project_id` and `client_id`
values rather than binding them. The cast makes it non-injectable, so this is a style finding
rather than a vulnerability, but it is the only departure from the prepared-statement rule and
should not be copied.

#### S-007a · One production identifier remains hard-coded in source
**Severity:** low · **Status:** PARTIAL · **See** `docs/KNOWN-ISSUES.md` K-014

`server/auth.php` defaults the seed super-admin address to a literal when
`$SEED_ADMIN_EMAIL` is unset. It fires only against an empty `users` table. It is the last
production identifier in tracked source now that the configuration template uses placeholders.

#### S-007 · Shared includes outside the deny rule
**Severity:** informational · **Status:** PARTIAL · **See** K-013

`server/.htaccess` denies `config.php` and `_bootstrap.php` by name, but not `_smtp.php`,
`_sms.php`, `_slack.php` or `_monitor.php`. All four define functions only and emit nothing,
so the impact today is nil.

#### S-008 · Live configuration unverified
**Severity:** unknown · **Status:** UNVERIFIED

None of the following could be checked: whether `GK_DEBUG` is `false` on the host, whether
`ALLOWED_ORIGINS` matches the template, whether the mail hosts have been repointed, whether
`config.php` is actually denied by the live `.htaccess`, and whether the seeded admin password
has been rotated.

`GK_DEBUG` matters most of the four: with it on, PHP warnings print into response bodies,
which leaks paths and SQL and corrupts JSON.

### 3. Controls that pass inspection

Each is PASS on source inspection and NOT TESTED at runtime.

| Control | Evidence |
|---|---|
| Passwords bcrypt-hashed and verified | `password_hash`, `password_verify` in `auth.php` |
| Session tokens are 256 bits of `random_bytes`, opaque | `new_token()` in `_bootstrap.php` |
| Token validation checks expiry, soft delete and active status | `require_auth()` |
| Role enforcement is server-side and per endpoint, on reads as well as writes | Every routed file |
| Client tenant isolation is derived from the token, never from a parameter | `portal.php` |
| A `client` account cannot be created without a validated `client_id`, and cannot be promoted into by a role change | `users.php` |
| Login throttle: 10 failures per email or IP in 15 minutes returns 429 | `auth.php` |
| TOTP compared with `hash_equals`; recovery codes bcrypt-hashed and consumed on use | `auth.php` |
| Google SSO matches existing active users only, never provisions | `oauth.php` |
| Stripe webhook HMAC-verified with `hash_equals`, 300 second replay window, payment status explicitly confirmed, update guarded against a repeat | `payments.php` |
| PayPal capture verifies `custom_id` against the invoice | `payments.php` |
| Cron runner gated by a shared secret compared with `hash_equals` | `cron.php` |
| API keys never reach the browser; `integrations.php` returns booleans only | `ai.php`, `weather.php`, `integrations.php` |
| AI proxy authenticated and capped per role per day | `ai.php` |
| CORS is an exact-match allowlist with `Vary: Origin`, no wildcard | `_bootstrap.php` |
| Prepared statements throughout, with the one exception at S-006 | All endpoints |
| Email validated with `FILTER_VALIDATE_EMAIL`; share tokens filtered to hex before lookup | `contact.php`, `comms.php`, `files.php`, `proposals.php` |
| Downloads stream through PHP with `nosniff` and an attachment disposition | `files.php` |
| Share tokens expire between 1 and 90 days and require an undeleted row | `files.php` |
| Mutations write to `audit_log` with the acting user and IP | `audit()` |
| `.htaccess` denies `.md`, `.sql`, `.log`, `error_log` and the FTP sync state | `server/.htaccess` |
| No secret in the tracked tree: no `.env`, no `config.php`, every template field empty or a `REPLACE_` placeholder | Whole tree |
| No production identifier in the tracked template: database name and user, seed admin address and both mail hosts are placeholders as of 2026-09-04 | `server/config.php.example` |

### 4. Not tested

- Every runtime behaviour above. `php -l` proves syntax only.
- Authentication and authorisation against a real database.
- Whether the upload directory deny is honoured by the live web server.
- Dependency vulnerabilities. No `npm audit` or equivalent was run.
- Transport security, headers and cookie flags as actually served.
- The behaviour of every external integration.

### 5. Recommended order

1. Rotate the credential from S-001 and confirm it (critical, and independent of everything
   else).
2. Close S-002. One line, and it removes an unauthenticated write to production.
3. Add abuse control to `contact.php` (S-003), reusing the existing throttle pattern.
4. Verify the live configuration listed in S-008, especially `GK_DEBUG` and `ALLOWED_ORIGINS`.
5. Add a MIME allowlist to uploads (S-004) rather than relying on one generated `.htaccess`.
6. Add a Content-Security-Policy and `integrity` attributes, or self-host the two icon fonts
   (S-005).
7. Write the authorisation tests described in `docs/TEST-PLAN.md` priority 1, so this audit can
   be repeated with evidence rather than by reading.

## 30 Oct 2026: config.php moved out of the web root

- The real settings now live in `~/private-config/gakinz_com/config.php` (0600, folder 0700). The web-root `config.php` is a stub (0600, no secrets) that loads it.
- Original copy: `~/backups/gakinz_com/config.php.before-private`.
- Releases never upload `config.php` (PROTECT list), so deploys keep the stub.
- Verified live after the move: the API check returned the expected status.
