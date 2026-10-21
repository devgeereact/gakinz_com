# Accessibility audit

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

## Why this file reads the way it does

This project has a history on this point. `docs/DECISIONS.md` D-020 records that an
earlier claim of zero accessibility violations was withdrawn, and the previous site
animated the figure `100% Accessible, WCAG 2.1 AA` on its home page while its own
documentation retracted it.

So nothing here is asserted. Every line below states what was run, against what, on
what date, and what it returned. Where something was not measured, it says so, and the
absence is not softened into a quieter claim.

The public copy now makes no accessibility claim at all. The evidence lives here.

---

## 1. Method

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

## 2. axe-core sweep

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

## 3. Colour contrast, measured on rendered pixels

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

### Fixed here

| Was | Ratio | Now | Ratio |
|---|---|---|---|
| `--input` / `--border` `#DFDFE2` on white, every form-control boundary on the site | 1.33:1 FAIL | `--gk-edge` `#8E8577` | 3.29:1 PASS (1.4.11) |
| `::placeholder` at 0.7 alpha, compositing to `#8A8A8F` | 3.43:1 FAIL | full-strength ink-mute | 5.28:1 PASS (1.4.3) |

## 4. Focus indicators

Every focusable element on 13 routes was focused in turn, and its computed outline read
back and measured against the surface behind it.

**353 focusable elements. 0 failures.**

| Ring | Against | Width | Ratio |
|---|---|---|---|
| ink | sunk band | 3px | 14.46:1 |
| ink | paper | 3px | 15.53:1 |
| paper | inside the dark band | 3px | 15.80:1 |

Required: 3:1 (1.4.11). 3px also clears 2.4.13 Focus Appearance on thickness.

### Two real defects found and fixed during this run

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

## 5. Reflow, zoom and target size

| Check | Criterion | Method | Result |
|---|---|---|---|
| Reflow | 1.4.10 | 640x512 viewport, equivalent to 1280x1024 at 200%, across 8 routes | **PASS.** No horizontal scrolling, no element overflowing the viewport |
| Small-screen layout | — | 390px viewport | **PASS.** `scrollWidth` equals `clientWidth`, zero overflowing elements |
| Target size | 2.5.8 | Every link, button and form control measured at 390px | **PASS.** Nothing under 24x24 except the skip link, which is correctly `sr-only` until focused and 142x48 when visible |
| Zoom not blocked | 1.4.4 | `index.html` viewport meta | **PASS.** `width=device-width, initial-scale=1.0`, no `maximum-scale`, no `user-scalable=no` |
| Positive tabindex | 2.4.3 | Swept across three routes | **PASS.** None found |
| Unnamed controls | 4.1.2 | Swept across three routes | **PASS.** None found |

## 6. Source-level findings fixed in this release

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

## 7. What is NOT TESTED

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

## 8. How to re-run this

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

## 9. D-046 re-audit, 2026-10-16

This section replaces sections 2 to 5 as the description of the current interface. Sections 1 to
8 above describe the 2026-09-22 build and are kept as history.

**Result: PARTIAL.** After five fixes, axe reports 0 WCAG A and AA violations on 14 of the 15
public routes and on all 8 CMS screens in both themes. Two brand colours still fail contrast
on rendered pixels (K-050, K-051). Changing them would change the approved look, so they are
left for the owner. Real assistive technology is **NOT TESTED**.

### 9.1 Method

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
| Lighthouse | 12.8.2, mobile preset | Accessibility category (see `qa/PERFORMANCE-AUDIT.md` section 9) |
| Pixel contrast walk | written for this run | Text axe could not judge, see 9.3 |

Public routes, each at 1440x900 and 390x844: `/`, `/work`, `/work/rotaflow`, `/work/heritage`,
`/services`, `/services/web-design`, `/pricing`, `/about`, `/resources`,
`/resources/what-makes-a-site-fast`, `/contact`, `/contact` after an empty submit, `/privacy`,
`/sectors`, `/verify/ABC123` and a 404 (`/nope`). The hero slideshow was paused before every
scan so a slide change could not land mid-scan.

### 9.2 axe, public site

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

### 9.3 Contrast on rendered pixels, hero and case heroes

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

### 9.4 Keyboard and focus

| Check | Result |
|---|---|
| Tab through `/` at 1440 | **PASS.** 46 stops; every one shows a computed outline or ring. Ring contrast per element was not measured this time |
| Skip link | **PASS.** First stop, 153x50 when visible; Enter moves focus to `main#main`; the next Tab reaches the first link in the content |
| Hero controls | **PASS** at 1440: Previous, five segment buttons, Pause and Next are all in order and reachable. **FAIL** at 390 before `0a1d62f`: the five segment buttons were 0px wide yet focusable, so focus vanished five times. Fixed |
| Drawer at 390 | **FAIL** before `bb9ac2e`: the open drawer covered the bar, so Close menu was hidden; Escape from a drawer link dropped focus to the body; Tab ran on into the hidden page. Now: the toggle stays visible above the drawer, Escape returns focus to it, and Tab cycles between the toggle and the seven drawer links. **PASS** |
| Contact after an empty submit | **PASS** (axe 0); the error flow was not observed with a screen reader |

### 9.5 Reduced motion

Emulated `prefers-reduced-motion: reduce` at 1440 on `/`. **PASS.** The slideshow starts
paused (the control reads "Play slideshow"), stays on slide 1 after 13 seconds, and
`document.getAnimations()` reports 0 running animations, with 0 elements carrying a non-zero
transition and `scroll-behavior: auto`. For contrast, without the emulation it advanced from
slide 1 to slide 2 within 7 seconds, and Pause held it for a further 7.

### 9.6 GAkinzOS, first automated check

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

### 9.7 Fixes made in this run

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

### 9.8 Open, for the owner

- **K-050.** RotaFlow blue `#3B6FE0` cannot carry the reduced-opacity white text (3.57 to
  4.18:1) or the tinted current-page link (3.76:1). Options: darken the RotaFlow slide and
  case colour to `#2F5FCC` (white 5.79:1, 4.33:1 at 80%, so lift the 80% text to 85%), or
  `#2C5AC4` (4.62:1 even at 80%); or keep the colour and render hero text at full opacity
  when `onColour()` returns white and the ratio is under 5:1.
- **K-051.** Amber slide: the bottom shading puts dark text on a dark band (1.90 to 2.87:1).
  Options: switch the hero bar text to light when the slide text is dark (white on the shaded
  band measures 6.73:1), or drop the shading on dark-text slides.

### 9.9 NOT TESTED in this run

- Screen readers (NVDA, JAWS, VoiceOver, TalkBack), voice control and switch access.
- Browsers other than Chromium; Windows High Contrast and `forced-colors`.
- Zoom and reflow at 200% and 400%, and target sizes, on the D-046 build.
- Focus-ring contrast per element (presence was checked, not the ratio).
- CMS screens with data, CMS dialogs and menus, the CMS at 390px, and every CMS module
  outside the eight named.
- `/work` pages fed by the real CMS; only the built-in fallback content was scanned (K-044).
- Anything on the deployed site.
