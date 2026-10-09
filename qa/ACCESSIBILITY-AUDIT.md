# Accessibility audit

**Verdict: NOT TESTED.**

No accessibility audit has been performed against the current code. This document exists to
record that plainly, to explain why an earlier claim has been withdrawn, and to define what a
real audit must cover when it is run.

**Date of this assessment:** 2026-09-04 · **Target:** `chore/gee-os-adoption` at `065a234`

---

## 1. Why the earlier claim was withdrawn

A previous session recorded an axe-core pass over the public site against WCAG 2.0 A and AA
and WCAG 2.1 A and AA, reporting zero violations on the home, contact and pricing pages, plus
two fixes: darkening the `.gk-pill` eyebrow text and adding accessible names to the Contact
form select triggers (commit `b43abc1`, 2026-06-12).

That claim is withdrawn for four reasons:

1. **No report was kept.** There is no artefact in the repository, so the result cannot be
   reproduced or inspected.
2. **The run is not reproducible from this tree.** `package.json` contains no axe, no
   Playwright and no Lighthouse. There is no script that would produce it.
3. **The palette has been replaced twice since.** Every contrast result in that run was
   measured against a colour scheme that no longer exists.
4. **The specific fix no longer matches the code.** The old notes record `.gk-pill` being
   darkened to `#6d28d9`. The value in `src/index.css` today is `#312e81`, set by the mono and
   duo rebrand. The finding was real; the recorded remedy is stale.

The one fix that plainly survives is the accessible names on the Contact form select triggers,
which is a structural change rather than a colour one. Even that has not been re-verified.

See `docs/DECISIONS.md` D-020.

## 2. What the code does that helps

None of this is a substitute for testing. It is recorded so an auditor knows where to look
first, and it is all **source inspection only**.

| Feature | Where |
|---|---|
| Custom `:focus-visible` ring on every interactive element, replacing the browser default | `src/index.css` |
| Contrast ratios annotated at each colour token by the author | `src/index.css` |
| `.gk-pill` eyebrow deliberately darkened for AA on its tinted background | `src/index.css` |
| Reduced-motion respected: the interactive transition baseline, `.gk-fadein`, the aurora, the gradient pan, the marquee and the float are all inside `prefers-reduced-motion: no-preference`, or explicitly disabled | `src/index.css` |
| `.gk-fadein` is visible by default and animates in, rather than starting hidden | `src/index.css` |
| `text-wrap: balance` on headings and `text-wrap: pretty` on paragraphs | `src/index.css` |
| `lang="en"` on the document, viewport meta present, a meta description present | `index.html` |
| Radix primitives underneath the shadcn components, which bring keyboard and ARIA behaviour by default | `src/components/ui/` |
| Public surface pinned to the light theme, so contrast is designed against one background | `.gk-public`, `html.gk-force-light` |

## 3. Known risks to check first

Derived from reading the code, not from testing.

1. **Gradient text.** `.gk-grad-text` and `.gk-grad-text-soft` clip a gradient to the text and
   set `color: transparent`. Contrast varies along the gradient, so a ratio measured at one
   point is not the ratio of the whole heading. The soft variant already starts at a darker
   stop for this reason, which suggests the problem was met before.
2. **Glass and aurora surfaces.** `.gk-glass` puts text over a translucent blurred background
   whose contrast depends on what is behind it.
3. **The `.gk-pill` eyebrow.** Small uppercase text at `0.72rem` with letter-spacing on a
   tinted background. It was a finding once and the palette has changed since.
4. **The CMS dark skin.** The earlier audit covered three public pages. No CMS page has been
   audited in either skin.
5. **Data tables and charts.** ApexCharts and Recharts output, and the TanStack tables, have
   not been checked for keyboard access or for information conveyed by colour alone.
6. **The calendar.** FullCalendar's keyboard and screen-reader behaviour has not been checked.
7. **Icon fonts.** Two third-party icon fonts are loaded. Icon-only controls need accessible
   names regardless of the font.
8. **Forms.** Only the Contact form's selects are known to have been looked at. Every other
   form, including login, the two-factor step, invoicing and the module dialogs, is unchecked.

## 4. What a real audit must cover

Target: WCAG 2.2 AA.

**Automated, as a floor.** axe-core over every route, in both themes where the route supports
both. Automated tools find roughly a third of issues, so a clean run is a starting point and
not a result.

**Routes to cover.**

- Public: `/`, `/about`, `/services`, `/services/:slug`, `/pricing`, `/sectors`, `/work`,
  `/resources`, `/resources/:slug`, `/contact`, `/privacy`, `/terms`, `/cookies`,
  `/verify/:id`, `/p/:token`.
- Auth: `/login`, including the two-factor step, and `/set-password`.
- CMS: all 23 modules, in light and dark.

**Manual, because automation cannot do these.**

- Keyboard only: reach every control, in a sensible order, with a visible focus indicator, and
  no trap. Test the dialogs, the command palette, the sidebar, the tables and the calendar.
- Screen reader: at least one pass with VoiceOver on the public site and on one CMS module.
- Zoom to 200 per cent and reflow at 320 CSS pixels wide.
- Reduced-motion on, confirming nothing important is hidden and nothing still animates.
- Forms: label association, error announcement, error identification and instructions.
- Colour independence: confirm no status is conveyed by colour alone. Check the lead score
  badges, ticket priorities, project stages and every chart.

**Deliverable.** A report committed into this file, or beside it, carrying the tool version,
the date, the commit, the routes covered, and each finding with its WCAG criterion. Without an
artefact the next session is back to this page.

## 5. Statuses

| Area | Status |
|---|---|
| Public site, automated | NOT TESTED |
| Public site, manual | NOT TESTED |
| CMS light, any method | NOT TESTED |
| CMS dark, any method | NOT TESTED |
| Keyboard navigation | NOT TESTED |
| Screen reader | NOT TESTED |
| Reduced motion | PARTIAL. Implemented and verified by source inspection, not observed |
| Colour contrast | PARTIAL. Author-stated ratios in the source, not independently measured |
| Zoom and reflow | NOT TESTED |
