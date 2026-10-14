# Accessibility audit

**Target:** WCAG 2.2 AA
**Scope:** the public surface at `/`. GAkinzOS at `/app/*` is **NOT TESTED** and is out of scope here.
**Date of this run:** 2026-09-22
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
