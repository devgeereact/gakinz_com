# Design system, as implemented

**Status:** current. Read from `src/index.css` (968 lines) and `tailwind.config.js` on
2026-09-04. These two files are the authority. If this document and them disagree, they win.

> The `DESIGN-SYSTEM.md` at the repository root is a **superseded proposal**, not this system.
> It describes the "Forest Editorial" green and cream direction, which was built in June 2026
> and then replaced. See `docs/DECISIONS.md` entry D-006. Do not restyle anything from it.

---

## 1. Shape of the system

One token set, three value maps, applied through `hsl(var(--token))` because the project is on
Tailwind v3 and the shadcn primitives reference tokens that way. Raw hex would break them.

| Selector | Where it applies |
|---|---|
| `:root` | Base and CMS light mode |
| `.dark` | CMS dark mode, driven by `next-themes` |
| `.gk-public` | Public site wrapper. Redeclares the light values so the marketing pages ignore the visitor's dark-mode preference |
| `html.gk-force-light` | Higher specificity than `.dark`. `PublicLayout` and `Login` add it so the public surface never washes out when the CMS left `html.dark` on |

The active Tailwind config is `tailwind.config.js`. A near-empty `tailwind.config.ts` also
exists; Tailwind picks the `.js`. Do not edit the `.ts`.

## 2. Palette

Monochrome core with two accents. Named in the source as primary, accent1 and accent2.

| Role | Hex | Token, light | Token, dark |
|---|---|---|---|
| Page background | `#FFFFFF` | `--background: 0 0% 100%` | `240 8% 8%` |
| Ink | `#0A0A0A` | `--foreground: 0 0% 4%` | `0 0% 96%` |
| Primary, the action colour | `#0A0A0A` light, lavender dark | `--primary: 0 0% 4%` | `245 56% 67%` |
| Accent 2, lavender | `#7F77DD` | `--ring: 245 56% 60%` | `--ring: 245 56% 67%` |
| Accent 1, rose | `#D4537E` | `--chart-2: 340 58% 55%` | `--accent: 340 58% 58%` |
| Destructive | red | `0 72% 48%` | `0 72% 55%` |
| Hairline border | | `240 6% 88%` | `240 6% 24%` |

Primary inverts between skins deliberately: near-black is the action colour on white, and
lavender takes over on the dark workspace because black would be invisible there.

Contrast figures are annotated in `src/index.css` at each token (body text 19.8:1 light and
18:1 dark, muted foreground 6.9:1 light and 9.7:1 dark, primary buttons above 6:1). Those are
**author-stated values recorded in the source, not results of a fresh audit.** See
`qa/ACCESSIBILITY-AUDIT.md`, which records the whole area as NOT TESTED.

Legacy variable names survive from earlier palettes and are remapped rather than renamed, so
existing utilities keep working: `--gk-violet` now carries the lavender, `--gk-indigo` the
near-black ink, and `--gk-sky` the rose.

## 3. Typography

Loaded from Google Fonts at the top of `src/index.css`.

| Family | Tailwind slot | Use |
|---|---|---|
| Space Grotesk | `font-serif` | Display and headings, both surfaces |
| Manrope | `font-sans` | Body and all interface text |
| JetBrains Mono | `font-mono` | Data, code, numeric tables |

The `font-serif` slot holds a sans-serif face. That is intentional after the rebrand, and the
name is kept so existing markup does not have to change.

Public headings get tighter tracking and balanced wrapping: `h1` at `-0.025em` with
`line-height: 1.05` and `text-wrap: balance`, `h2` at `-0.02em`, paragraphs at
`text-wrap: pretty`.

## 4. Radius and elevation

`--radius: 0.75rem` (12px) for cards. Tailwind derives `md` at 10px and `sm` at 8px from it.
Marketing utilities that set their own use `1rem`.

Cards lift rather than sit flat. `.gk-card` rests on a soft two-layer shadow and on hover
translates up 4px, warms its border to lavender and deepens the shadow.

## 5. Utility layer

Two families, deliberately separate. Marketing utilities are scoped to `.gk-public` and are
light-only. CMS utilities are theme aware and read `--primary` and `--foreground`, so they work
in both skins.

### Marketing, inside `.gk-public`

| Class | Effect |
|---|---|
| `.gk-grad-text`, `.gk-grad-text-soft` | Ink to lavender to rose gradient text. The soft variant starts darker so large headings clear AA on white |
| `.gk-aurora` | Layered radial blob backdrop, animated only when motion is allowed |
| `.gk-grid`, `.gk-dots` | Masked grid and dot backdrops |
| `.gk-glass` | Translucent card with a 12px backdrop blur |
| `.gk-ring` | Gradient hairline border through a padding-box trick |
| `.gk-card` | Elevated card with hover lift |
| `.gk-glow` | Blurred gradient halo behind a featured element |
| `.gk-shine` | Sweep across a call to action on hover |
| `.gk-marquee`, `.gk-marquee-mask` | Trust strip |
| `.gk-float` | Slow idle float |
| `.gk-pill` | Uppercase eyebrow. Text is `#312e81` so the small type clears AA on the tinted lavender background |
| `.gk-underline` | Accent underline flourish under an emphasis word |
| `.gk-fadein` | Section entrance. See section 6 |

### CMS, theme aware

| Class | Effect |
|---|---|
| `.gk-app-grad` | Page title in Space Grotesk with a foreground to lavender gradient |
| `.gk-app-card` | Workspace card with hover lift |
| `.gk-app-chip` | Gradient icon chip |
| `.gk-app-ring` | Accent ring |
| `.gk-app-accent` | Accent wash |
| `.gk-app-aurora` | Subtle header backdrop tuned to `--primary` |

## 6. Motion

- Interactive elements share a 200ms baseline transition on colour, background, border,
  shadow, transform and opacity. It is wrapped in
  `@media (prefers-reduced-motion: no-preference)`.
- **`.gk-fadein` is visible by default and animates in only when motion is allowed.** The
  animation lives inside the reduced-motion media query, so the element is never hidden
  waiting for JavaScript. This is a deliberate constraint: do not gate the marketing entrance
  on JavaScript, and do not give the base class `opacity: 0`.
- The aurora, gradient pan, marquee and float animations are all inside the same media query
  or explicitly disabled under reduced motion.

## 7. Global details

Carried over from the earlier design work and still in force:

- **Focus.** `:focus-visible` replaces the browser outline with a two-layer ring built from
  `--background` and `--ring` at 70 per cent.
- **Selection.** `::selection` uses `--primary` at 22 per cent.
- **Scrollbars.** Thin, muted, with `--primary` at 55 per cent on hover, on both the
  standards property and the WebKit pseudo-elements.
- **Placeholders.** `--muted-foreground` at 70 per cent.

## 8. Residue worth knowing

- `src/index.css` still carries a Pulse-kit block of `gradient-red` through `gradient-cyan`
  helpers and a `.dark-blue`, `.gaussian-black`, `.classic-light` scrollbar rule. These belong
  to the original kit, not to this brand.
- Two section comments still say "Forest Editorial" and one still points at `DESIGN-SYSTEM.md
  §5`. The rules under them are current; only the labels are stale.
- Neither has been removed, because both are cosmetic and this migration does not touch
  application code. Recorded in `docs/KNOWN-ISSUES.md`.

## 9. Icon fonts

`index.html` pulls Bootstrap Icons from jsDelivr and Boxicons from `cdn.boxicons.com` as
render-blocking stylesheets, with no integrity attribute and no local fallback. This is the
public site's only hard third-party runtime dependency. See `qa/PERFORMANCE-AUDIT.md` and
`qa/SECURITY-AUDIT.md`.
