# Design system, as implemented

**Status:** current. Read from `src/index.css`, `tailwind.config.js`,
`src/marketing/components/primitives.tsx` and `src/marketing/PublicLayout.tsx` on 2026-09-22.
Those files are the authority. If this document and they disagree, they win.

> **This document describes the public surface at `/` only.**
>
> GAkinzOS at `/app/*` is **unchanged** by the 2026-09-22 relaunch. It keeps the mono and duo
> palette, Manrope, JetBrains Mono, Tailwind's default type sizes, the 12px radius and the
> `.gk-app-*` utility family. Nothing in sections 2 to 6 applies to it, and section 7 applies
> only in the parts it names as shared. Section 9 lists what the two surfaces still have in
> common.

> The `DESIGN-SYSTEM.md` at the repository root is a **superseded proposal**. It describes
> the "Forest Editorial" green and cream direction, built in June 2026 and replaced the same
> month. See `docs/DECISIONS.md` D-006 and D-019. Do not restyle anything from it.

The direction implemented here is recorded in
`docs/design/2026-09-22-directions/direction-approved.md` as "direction C with direction A's
colour", and as a decision in `docs/DECISIONS.md` D-023 and D-024.

---

## 1. Shape of the system

The governing idea is that a public page is a **document**, not a landing page. Typography,
spacing and rules carry the hierarchy. There are no cards, no shadows, no blur, no gradients
and no decorative backdrops.

| Selector | Where it applies |
|---|---|
| `:root` | Base and CMS light mode. Untouched by the relaunch |
| `.dark` | CMS dark mode, driven by `next-themes`. Untouched |
| `.gk-public` | The public wrapper. Declares the public palette and remaps the shadcn tokens, so a shared component rendered inside it inherits the public colours rather than the CMS ones |
| `html.gk-force-light` | Higher specificity than `.dark`. `PublicLayout` and `Login` add it, so the public surface never washes out when the CMS has left `html.dark` on |

Values are declared as `hsl()` triplets on `.gk-public`, because the project is on Tailwind
v3 and the shadcn primitives reference tokens as `hsl(var(--token))`. Raw hex would break
them. The same colours are also declared as flat hex under `theme.extend.colors.gk` in
`tailwind.config.js`, which is what the `bg-gk-*` and `text-gk-*` utilities compile from.
**Both lists have to be edited together.**

`.gk-public` sets `--radius: 0rem`. The public document has square corners; the 12px radius
belonged to the card idiom this direction replaces. The CMS keeps `0.75rem`.

The active Tailwind config is `tailwind.config.js`. The empty `tailwind.config.ts` stub has
been deleted and `components.json` now points at the `.js` file.

## 2. Palette

Nine public tokens. Two of them are chromatic and both carry meaning; see section 5.

| Token | Hex | Role | Contrast on paper |
|---|---|---|---|
| `gk-paper` | `#F6F3ED` | The page. Warm, not white | n/a |
| `gk-sunk` | `#EFEBE2` | A half-step down, for a quiet interlude band | n/a |
| `gk-ink` | `#1C1A16` | Body and heading ink. Warm, not black | **15.69:1** |
| `gk-ink-soft` | `#514C42` | Secondary prose, standfirsts, row values | **7.70:1** |
| `gk-ink-mute` | `#6B6459` | Labels, indices, metadata | **5.28:1** |
| `gk-set` | `#2A3160` | Navy. The primary action, and the "settled" spine | **11.11:1** |
| `gk-come` | `#933C2F` | Red oxide. The "awaiting material" marker | **6.48:1** |
| `gk-rule` | `#D8D2C6` | **Decorative hairline only.** Never a form border | 1.4:1, non-text decoration |
| `gk-edge` | `#8E8577` | Structural rules and every form border | **3.29:1**, clears 1.4.11 for non-text |

Four more tokens exist for the dark band, all measured against `gk-ink`:

| Token | Hex | Role | Contrast on ink |
|---|---|---|---|
| `gk-on-dark` | `#F6F3ED` | Text inside a dark band | 15.69:1 |
| `gk-on-dark-soft` | `#C3BCAE` | Secondary text inside a dark band | **9.20:1** |
| `gk-set-on-dark` | `#9FA8D8` | The navy, lightened to survive on ink | **7.50:1** |
| `gk-come-on-dark` | `#E8A598` | The red oxide, lightened to survive on ink | **8.49:1** |

**How these figures were arrived at.** They were computed from the hex values when the
palette was chosen, then measured again on 2026-09-22 against rendered pixels on the built
site: 28 distinct foreground, background and size combinations across the public routes, 0
failures, lowest measured 4.91:1. The method and the full table are in
`qa/ACCESSIBILITY-AUDIT.md`. These are measurements, not author estimates, and they are the
reason to use the tokens rather than reach for a near neighbour.

### `rule` against `edge`, and why the distinction is enforced

`gk-rule` at 1.4:1 is a decorative hairline. It may separate things that are already
separated by space. It may **not** be the boundary of a form control, because a control whose
edge is invisible fails WCAG 1.4.11 Non-text Contrast.

`gk-edge` at 3.29:1 is the structural line: section rules, list dividers, table borders and
every input, select and textarea. `.gk-public` sets both `--border` and `--input` to it. The
value they replaced was `240 6% 88%`, which measured 1.33:1 against the page, and which meant
every form-control boundary on the previous public site failed.

### What was retired

Lavender `#7F77DD`, rose `#D4537E`, the animated gradient, the aurora hero, the ghost
numerals and the card idiom are gone from the public surface. Neither accent can hold a flat
block or carry white text, which is why the previous site could only ever wash them into a
gradient.

The `.gk-public` override of `--gk-violet`, `--gk-indigo` and `--gk-sky` is gone with them.
Those three names lied about their values: `--gk-indigo` held black and `--gk-sky` held rose.
**The definitions survive at `:root` for one reason only**: `src/app/Login.tsx` and
`src/app/SetPassword.tsx` still use `.gk-grad-text`, `.gk-aurora` and `.gk-grid`. When those
two pages stop using them, all of it goes.

## 3. Type

### The scale is closed

Nine values, a perfect fourth (1.333) apart, defined under semantic names in
`tailwind.config.js`. **No size outside this scale ships on a public page.** There is no
`text-[2.6rem]` to reach for, and a reviewer can see at a glance whether a page has invented
a size.

| Name | Size | Line height | Tracking | Use |
|---|---|---|---|---|
| `label` | 12px | 1.4 | +0.08em | Uppercase labels, indices, metadata. Always mono |
| `body` | 16px | 1.6 | n/a | Prose and interface text |
| `lede` | 21px | 1.5 | n/a | Standfirst under a page title |
| `t4` | 28px | 1.25 | -0.01em | Row and list-item titles |
| `t3` | 38px | 1.18 | -0.015em | Section headings, pull quotes |
| `t2` | 51px | 1.1 | -0.02em | Page titles, closing-band headings |
| `t1` | 67px | 1.04 | -0.025em | Page titles at `lg` and above |
| `display` | 90px | 1.0 | -0.03em | Reserved for a single statement |
| `hero` | 120px | 0.95 | -0.035em | The home masthead. Once per site |

Tracking lives in the scale, so it is not repeated in `index.css` and must not be overridden
per page.

### Three families

| Family | Tailwind slot | Use |
|---|---|---|
| Newsreader | `font-display` | Every heading, and the pull quotes |
| Instrument Sans | `font-ui` | Body and interface text. Inherited from `PublicLayout`, so it is rarely written out |
| IBM Plex Mono | `font-data` | Labels, indices, dates and record data only |

**Why Newsreader.** Its optical-size axis carries a 120px masthead and a 21px standfirst from
one family, so the page needs no second display voice. `.gk-public` sets
`font-optical-sizing: auto` on headings and blockquotes; browsers do this already, but
stating it keeps the intent legible.

**Why the mono is confined.** Record data aligns in columns, so `.gk-public .font-data` sets
`font-variant-numeric: tabular-nums`. Using the mono decoratively would break that
association.

Space Grotesk is gone from both surfaces. It had been mapped to `font-serif`, a slot with no
serif fallback, so `font-serif` silently rendered a sans-serif. `font-serif` now names
Newsreader, which is an actual serif. Manrope and JetBrains Mono remain, for the CMS.

`.gk-public` also sets `text-wrap: balance` on headings and `text-wrap: pretty` on
paragraphs. No utility covers either.

## 4. The primitives

All in `src/marketing/components/primitives.tsx`. A public page should be assembled from
these rather than from raw utilities, because that is what keeps the type scale and the rule
colours honest.

### Structure

| Primitive | When to use it |
|---|---|
| `Measure` | The page's horizontal measure: `max-w-[76rem]` with the gutter. Wrap any full-bleed content you lay out yourself |
| `Section` | A horizontal band. `tone="paper"` is the page, `tone="sunk"` is a quiet interlude, `tone="ink"` is the dark band, **once or twice per page at most**. The old `muted` boolean is deprecated and maps to `sunk` |
| `Rule` | A full-width structural rule. Uses `gk-edge`, not the hairline |
| `Split` | A two-column layout with a sticky label column on the left and content on the right |

### Type and micro-type

| Primitive | When to use it |
|---|---|
| `Label` | The small uppercase label naming a section or field. Mono, because these sit beside record data and should align with it |
| `RuleEyebrow` | **Deprecated.** A thin wrapper over `Label`, kept for pages not yet migrated |
| `GradientText` | **Deprecated no-op.** Renders plain ink. It exists only so call sites outside `src/marketing/` keep compiling. Delete it once nothing imports it |

### Navigation and lists

| Primitive | When to use it |
|---|---|
| `PageHero` | The masthead for an inner page: eyebrow, title, optional standfirst, optional breadcrumb. **No backdrop of any kind.** The old `PageHero` stacked an aurora, a grid and a grain overlay behind all eight pages, which is why they all read as the same page |
| `Contents` | The numbered contents list that replaces a horizontal nav bar on the first screen. A real `<ol>` of real links, so it is navigable by keyboard and by landmark with no ARIA |
| `IndexList` / `IndexRow` | A ruled index of records. Set `as="h2"` on a row that is the first heading under the page `h1` |
| `FeatureRow` | A numbered media-and-prose row. Defaults to `h2`; the old default of `h3` produced an `h1` to `h3` level skip on four pages |

### Bands and actions

| Primitive | When to use it |
|---|---|
| `Action` | The only button or link-as-action on a public page. `variant="strong"` is a filled navy block for the **one** primary action; `variant="plain"` is a ruled link. `onDark` flips both for use inside an ink band. Both are at least 44px tall, clearing WCAG 2.5.8 twice over |
| `QuoteBand` | A pull quote between two rules, as a `<figure>` with a `<figcaption>` |
| `CtaBand` | The closing action band. Dark, full width, one heading, one standfirst, one `Action` |

### Honest gaps

| Primitive | When to use it |
|---|---|
| `Placeholder` | A block-level labelled gap where real material is missing |
| `Gap` | An inline `[to supply]` marker for a missing value inside a line of text |

See section 6.

### What must never appear on a public page

`.gk-aurora`, `.gk-grid`, `.gk-dots`, `.gk-glass`, `.gk-ring`, `.gk-card`, `.gk-glow`,
`.gk-shine`, `.gk-marquee`, `.gk-float`, `.gk-pill`, `.gk-underline`, `.gk-grad-text`,
`.gk-grain` and the whole `.gk-app-*` family. They still exist in `src/index.css` because
GAkinzOS uses them. If one turns up in `src/marketing/` again, that is a regression.

The one shared exception is `.gk-fadein`, described in section 7.

## 5. The two-chromatic convention

**The public surface has exactly two chromatic colours, and each has a job.**

- **`gk-set`, navy `#2A3160`, marks what is settled.** A record whose material is real and
  complete. It is also the primary action colour, which is consistent rather than accidental:
  a filled navy block is the one thing on the page you are being asked to do.
- **`gk-come`, red oxide `#933C2F`, marks a gap awaiting real material.** A placeholder, an
  unsupplied value, an unfinished record.

Neither is decoration. Do not reach for the navy because a heading looks flat, and do not
reach for the red oxide because a page needs warmth. The moment either is used ornamentally,
the reader can no longer tell a finished record from an unfinished one, and the convention
has stopped paying for itself.

Where it appears in the code:

| Place | Mechanism |
|---|---|
| The work ledger spine | `LedgerRecord` in `src/marketing/components/Ledger.tsx` gives each record a 2px left border, navy or red oxide, from `spineFor(record)` in `src/marketing/data/work.ts` |
| Placeholders | `Placeholder` and `Gap` both carry `gk-come` |
| The primary action | `Action variant="strong"` is `bg-gk-set` |

Inside a dark band the two lighten to `gk-set-on-dark` and `gk-come-on-dark`, which is a
contrast adjustment, not a second meaning.

## 6. The honest-placeholder convention

Recorded as a decision in `docs/DECISIONS.md` D-027. It belongs here as well, because it is
implemented as design.

**Where the site has no real material for a slot, it ships a designed, visible, labelled
placeholder.** It does not ship a stock photograph, an invented client, a rounded figure or a
plausible-sounding outcome.

`Placeholder` is deliberately a composed element rather than a grey box with an image icon,
because it ships to real visitors and should read as a deliberate state rather than as
something broken. It carries `gk-come`, a dashed border, a label and an optional line of
detail, and it takes an aspect ratio so the layout does not move when the real image arrives.

`Gap` renders an inline `[to supply]` in mono and red oxide, so a ledger row with no value
still has a value-shaped thing in it.

**The rule this enforces.** Filling a gap means obtaining the real material. It never means
relaxing the rule. A portfolio that invents a client, or a personal site that uses a
photograph of a stranger, has made a false statement to exactly the audience it is trying to
persuade. A labelled gap has not.

**Related guards elsewhere.** `server/work.php` refuses to publish a record that names a
client without stored consent and refuses an image with no alt text.
`src/marketing/data/work.ts` holds a static fallback in which every record is true and any
field without a true value is `null`. `personSchema()` in `src/marketing/components/Seo.tsx`
omits `sameAs` entirely rather than pointing it at a bare domain.

## 7. Focus, motion and the global details

### The focus indicator is an outline, not a box-shadow

```css
:focus-visible {
  outline: 3px solid hsl(var(--foreground));
  outline-offset: 2px;
  box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--foreground));
  border-radius: calc(var(--radius) - 4px);
}
```

**Why an outline.** The previous indicator was a two-layer `box-shadow` and it painted
nothing at all. Tailwind's Preflight sets `--tw-ring-shadow`, `--tw-ring-offset-shadow` and
`--tw-shadow` on every element, all three resolving to `0 0 #0000`, and any utility touching
that chain overwrote the custom shadow. The element matched `:focus-visible` and no ring
appeared. `outline` is not part of that chain, so it cannot be clobbered the same way. The
box-shadow is kept underneath as a second layer for the cases where an ancestor clips the
outline.

**Why one solid colour is enough.** `outline-offset: 2px` leaves a gap of the surface colour
between the element and the ring, which supplies the second contrast on its own. 3px clears
WCAG 2.4.13 Focus Appearance.

**Why the ring flips only for controls INSIDE a dark band:**

```css
.gk-public .bg-gk-ink :focus-visible,
.gk-public .bg-gk-set :focus-visible { outline-color: hsl(var(--gk-paper)); }
```

Because `outline-offset` puts the ring **outside** the element, what the ring has to contrast
against is the surface behind the element, not the element's own background. A dark button
sitting on paper therefore keeps the ink ring: giving it a paper ring measured 1.01:1 and was
invisible. These are descendant selectors only. Never write `.bg-gk-ink:focus-visible`, which
would catch the dark button itself and reintroduce exactly that bug.

**Measured after the change, on 2026-09-22:** 353 focusable elements across 13 routes, 0
failures. 15.53:1 on paper, 14.46:1 on the sunk band, 15.80:1 inside a dark band.

### The rest of the global layer

- **Skip link.** `PublicLayout` renders a "Skip to content" link, visually hidden until
  focused, then fixed above the sticky masthead so it is not obscured. WCAG 2.4.1 and 2.4.11.
- **Scroll padding.** `html { scroll-padding-top: 6rem; }`, because the masthead is sticky at
  64px and a keyboard target scrolled to the top would otherwise sit under it.
- **Placeholders.** `::placeholder` uses full-strength `--muted-foreground`. The previous 0.7
  alpha composited to `#8A8A8F`, which is 3.43:1 and fails the 4.5:1 body-text floor. At full
  strength the public value is 5.28:1.
- **Selection** uses `--primary` at 22 per cent; **scrollbars** are thin and muted with
  `--primary` at 55 per cent on hover. Both are shared with the CMS.
- **Motion.** Interactive elements share a 200ms baseline transition, wrapped in
  `@media (prefers-reduced-motion: no-preference)`.
- **`.gk-fadein` is visible by default** and animates in only when motion is allowed. The
  animation lives inside the reduced-motion media query, so the element is never hidden
  waiting for JavaScript. `FadeIn` in `src/marketing/components/FadeIn.tsx` wraps it. **Do
  not give the base class `opacity: 0`, and do not gate a marketing entrance on JavaScript.**

## 8. Residue worth knowing

- `src/index.css` still carries a Pulse-kit block of `gradient-red` through `gradient-cyan`
  helpers and a `.dark-blue`, `.gaussian-black`, `.classic-light` scrollbar rule. These belong
  to the original kit and to neither brand.
- The `:root` comments still describe the mono and duo palette in terms of "accent1" and
  "accent2", and one still refers to Forest Editorial. The rules under them are current for
  the CMS; only the labels are stale.
- `--gk-violet`, `--gk-indigo` and `--gk-sky` survive at `:root` for the two auth pages named
  in section 2, and nothing else.
- `RuleEyebrow` and `GradientText` are deprecated shims, not part of the system.
- Recorded in `docs/KNOWN-ISSUES.md`. None has been removed, because all of it is either
  cosmetic or load-bearing for a surface this relaunch does not touch.

## 9. What the two surfaces still share

Everything in section 7 except the two `.gk-public` focus rules, plus the wrapper mechanics
in section 1. Both surfaces load their fonts from one Google Fonts stylesheet at the top of
`src/index.css`; that is the public site's remaining third-party render dependency, and it is
recorded in `docs/ARCHITECTURE.md`. The two render-blocking icon webfonts that `index.html`
used to pull from jsDelivr and `cdn.boxicons.com` are gone, and they had zero usages.
