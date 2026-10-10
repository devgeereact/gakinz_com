# Design system, as implemented

**Status:** sections 1 to 9 current; section 10 decided, not implemented. Read from `src/index.css`, `tailwind.config.js`,
`src/marketing/components/primitives.tsx` and `src/marketing/PublicLayout.tsx` on 2026-09-22.
Those files are the authority. If this document and they disagree, they win.

> **This document describes the public surface at `/` only.**
>
> GAkinzOS at `/app/*` is **unchanged** by the 2026-09-22 relaunch. It keeps the mono and duo
> palette, Manrope, JetBrains Mono, Tailwind's default type sizes, the 12px radius and the
> `.gk-app-*` utility family. Nothing in sections 2 to 6 applies to it, and section 7 applies
> only in the parts it names as shared. Section 9 lists what the two surfaces still have in
> common.

> **Two systems are described here, and they must not be confused.** Sections 1 to 9 are the
> system **as implemented** today. Section 10 is the **target system** the owner chose on
> 2026-10-10 (`docs/DECISIONS.md` D-037), which is decided and **not yet implemented**. Until
> the rebuild lands, the code follows sections 1 to 9. When it lands, section 10 replaces
> them in the same change, so there is never a second active style guide.

The direction implemented here is "direction C with direction A's colour", recorded as
decisions in `docs/DECISIONS.md` D-023 and D-024. The earlier "Forest Editorial" proposal
and the September direction note are retired to git history (D-044); D-006 and D-023 carry
what they decided.

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

---

## 10. Target system (D-037), not yet implemented

**Status:** decided by the owner on 2026-10-10, not built. Nothing in this section describes
the code today. It governs the rebuild of both surfaces, which is delivery phases 3 and 4 in
`docs/STATUS.md`.

### 10.1 The reference and its provenance

The owner chose the full Mastercard-inspired GetDesign system for the website and the CMS, to
be followed as closely as possible rather than loosely adapted. The complete imported
reference is preserved, unedited, in
[DESIGN-REFERENCE-MASTERCARD.md](DESIGN-REFERENCE-MASTERCARD.md).

| Fact | Value |
|---|---|
| Source command | `GETDESIGN_DISABLE_TELEMETRY=1 npx --yes getdesign@latest add mastercard` |
| Package inspected | getdesign 0.6.25 |
| SHA-256 of the reference file | `e76ceaa187f43bd24b8338d2b2314e71e9225b36492e40f32a55782281a10437` |
| Upstream project | [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) |
| Imported | 2026-10-10. The file exactly matched the package's bundled template |
| Added to `package.json` or the lockfile | Nothing |

The reference is a third-party design analysis, not Mastercard's official component library.
Its observations and inferred breakpoints are reference material, not verified guarantees.
**Do not edit the reference file**; a changed hash means it is no longer the preserved
source. This section governs how GAkinz applies it.

The target replaces the September direction in sections 1 to 9 (warm paper `#F6F3ED`, navy
`#2A3160`, red oxide `#933C2F`, Newsreader over Instrument Sans) and the CMS's separate
Manrope and lavender palette. It withdraws the 2026-09-22 rule against borrowed design
language. The evidence rule stays: no claim on the public site without a source (D-027).

### 10.2 Required substitutions, and nothing else

Only these departures from the reference are allowed. Each exists because of law, licensing
or accessibility, not taste.

| Reference says | GAkinz uses | Reason |
|---|---|---|
| MarkForMC typeface | Sofia Sans variable, self-hosted under its open licence; Manrope as fallback | MarkForMC is Mastercard's proprietary font and cannot be licensed |
| Logo colours `#EB001B` and `#F79E1B` | Never used anywhere | They are the Mastercard mark colours |
| Interlocking or overlapping circle pairs | Never used; single circles and orbit lines only | Avoids confusion with the Mastercard logo |
| Mastercard name, logo, photography, card or payment imagery | GAkinz logo, owner photographs and real project screenshots | Trade mark and honesty |
| Any text colour or control edge below WCAG 2.2 AA contrast | Darkened to pass, same hue | Accessibility |
| Small vertical button padding | At least 44px touch height | Accessibility |

**Brand-confusion check**, run on the home page and every new template before release: no red
and yellow circle pair, no card imagery, no wording that suggests a payment brand, and the
GAkinz logo visible in the header. If a first-time viewer would think it is a Mastercard
page, it fails.

GAkinz uses its own name, logo, photographs, project work and service language. No
Mastercard mark, payment-brand claim, source-site imagery or proprietary font is used, and
no font is fetched from another brand's website.

### 10.3 Shared design contract

| Foundation | Website | CMS |
|---|---|---|
| Canvas | Cream `#F3F0EE`, lifted cream `#FCFBFA`, warm ink `#141413` | Same light foundation, white or lifted record surfaces, legible text |
| Primary actions | Warm-black call to action, cream text, 20px radius | Same primary and secondary styling; compact controls keep comfortable hit areas |
| Accent | Decorative orbital orange `#F37338`, sparse dots and section detail | Quiet decorative and brand cues; semantic success, warning and error colours stay unambiguous |
| Consent signal | Reference orange `#CF4500`, only where contrast and the consent platform's styling permit | Consent controls follow consent requirements; orange is not the generic Save colour |
| Typography | One geometric sans family, medium headings, tight display tracking | Same family; readable field labels, tables and figures; no decorative watermark behind data |
| Type scale | Hero around 64px desktop and 40px mobile, section 36px, smaller headings 24px; fluid sizing with actual wrapping tested | Page headings around 28 to 36px, body and controls around 16px; no 64px KPI numbers |
| Spacing | 8, 16, 24, 32, 48, 64, 96, 128 scale; generous desktop sections, 48 to 64px mobile sections | Same scale, tighter list and form spacing, sensible density |
| Shape | Floating pill navigation, 40px hero frames, circular service portraits, 20px buttons | Rounded panels and dialogs, same buttons and chips; inputs and tables fit their function |
| Elevation | A very soft floating-nav shadow, mostly flat surfaces | Soft elevation only for overlays and selected panels; borders clearly separate controls |
| Imagery | Real owner and client work, circular portraits, large rounded feature media | Client-approved thumbnails and actual file or project previews; no ornamental imagery in every record |
| Responsive | Full navigation to a compact accessible mobile menu; arcs simplified or removed on phones | Explicit drawer toggle, wrapping actions and tabs, contained responsive lists and tables |
| Footer | Warm-black surface, white text, a conversational contact call to action | A small useful footer; no marketing-sized footer in the workspace |

**Font.** Sofia Sans variable, self-hosted, replaces Newsreader, Instrument Sans and Manrope
on both surfaces, so the website and CMS share one family; Manrope stays as the fallback.
Confirm the licence file and the weights used (the reference uses 450 and 500) before
implementation. Remove the stray Space Grotesk reference in `src/index.css` in the same
change.

**Accessible adaptations take precedence over copied measurements.** Low-contrast Dust Taupe
and ghost headlines are decorative only, never labels, placeholder instructions or business
data. Orange arcs carry no meaning. Form edges, status text and focus indicators meet contrast
requirements. Button heights exceed the source's small vertical padding. Essential actions
have visible text or accessible names. Do not copy consent styling that makes rejection
harder than acceptance.

**Themes.** The reference is a light marketing reference and defines no dark palette. The CMS
ships several themes today (dark, dark-blue, gaussian-black, classic-light, semi-dark); reduce
them to one light and one dark theme. Derive the dark theme from the same tokens (ink
`#141413` as the surface, cream as text, orange accents unchanged), then contrast-test it. The
public site stays light only.

### 10.4 Hero and section composition

**Home hero:** a concise service headline and introduction beside a large rounded frame
holding a real project screenshot composition or owner and work imagery. One sparse orbital
line may connect that frame to a circular portrait or service detail. The enquiry call to
action is visible immediately and the image area is reserved before loading. Use GAkinz
project material so the composition has a recognisable relationship to the business.

**Service and detail heroes:** smaller rounded media or circular imagery related to the
service, with copy and a relevant call to action. Vary placement and crop on purpose rather
than repeating the home hero. About uses an actual owner portrait; Work uses genuine screen
captures. Portfolio screenshots may stay rectangular inside a 40px frame so interface
evidence is readable, even though the source favours circular photographs.

**Service overview:** staggered circular imagery on desktop with restrained connecting arcs;
clear stacked entries on phones. Long empty scroll stretches, a carousel, ghost text or a
search button are not required just because the source has them; add them only where they
help GAkinz visitors. The CMS uses the same vocabulary at working density, with no cinematic
hero on administrative screens.

### 10.5 Motion contract

Motion makes the composition recognisable through real project material, timing and the
service story. Build a small reusable set of variants, not a different animation engine per
page. The timings are starting values, tuned in browser review.

| Area | Animation | Limits |
|---|---|---|
| Home hero copy | Opacity plus a 12 to 20px upward entrance, 450 to 650ms; a 70 to 100ms stagger between heading, supporting line and call to action | Runs once; one semantic heading, selectable text and immediate focus and click access |
| Hero media | Scale from about 0.98 to 1 with opacity, 600 to 800ms; an optional restrained inner-image reveal | The outer frame reserves its dimensions; no full-screen transition or content-dependent loading delay |
| Orbital accent | One SVG path draw over 800 to 1200ms after the main content appears | Decorative and `aria-hidden`; no endless orbiting, flashing or required meaning |
| Service and portfolio sections | A single viewport entrance, opacity and 12 to 16px movement, 350 to 500ms | Triggers once; no scroll hijack, pinned narrative or long repeated stagger |
| Portrait and media hover | A small image scale or satellite-arrow shift, 150 to 250ms | Desktop hover only; clipping stays stable; the phone action works without hover |
| Buttons and menu | Colour or opacity and an optional 1 to 2px arrow shift, 120 to 200ms; menu panel around 180 to 240ms | Keyboard focus distinct; nothing moves the target during activation |
| CMS panels and dialogs | A brief fade or small displacement, around 120 to 180ms | No staggered table rows, animated money counts or workflow delay |
| Success and loading | Short state feedback or a restrained skeleton | Never fake completion or progress; errors stay visible until resolved |

No autoplay background video is required. Start with lightweight still imagery and CSS or SVG
motion. Video is added only if real footage tells a useful story, is compressed, has a poster
and accessible controls, and the page still meets its performance targets. No heavy 3D
scenes, custom cursors, particle libraries or overlapping animation dependencies. Prefer CSS
and browser capabilities; if sequencing later needs a library, check current official
documentation and bundle impact first.

`prefers-reduced-motion: reduce` removes translation, scale, path drawing and scroll effects
and shows content in its final readable state. Content is visible if JavaScript fails,
observers do not run or motion is off (the `.gk-fadein` rule in section 7 still holds).
Animation never hides the main message until media loads and never delays the LCP element.
Decorative motion pauses off-screen. Animate opacity and transforms, not layout, and nothing
loops indefinitely without a user control.

Acceptance: inspect desktop and touch mobile at 320, 390, 768 and 1440px, with reduced
motion, keyboard navigation, a slow connection and both CMS themes. Confirm no layout shift,
focus obstruction, hidden content or overflow. Capture a short desktop and mobile preview for
the owner before applying the motion to every route, and compare field and lab performance
before and after.

### 10.6 Screen patterns

A page header holds the name, a one-sentence purpose if needed, and the primary action, with
filter and search beneath. A list shows a readable name, the relevant status or date and a
labelled action. A record view gives a summary, the next action and a few meaningful tabs.
Forms show errors beside fields and a summary when useful. A confirm dialog names the actual
record and the consequences. Destructive actions are separated from the primary action.

Loading, empty, unavailable, permission-denied and success are distinct states. An empty
enquiry list says how enquiries arrive. An API failure says "Enquiries could not be loaded.
Retry", without claiming the database is missing. Keep entered content on retry, warn on an
unsaved departure and guard duplicate submissions. Never show a fake populated chart.

Use the existing shadcn and Radix primitives and the shared `EmptyState` and `TableSkeleton`
components where they fit. Extract a repeated form or state pattern only after the same
problem appears on several screens. No universal form engine and no component-library rebuild.

### 10.7 Responsive and accessibility acceptance

Test 320, 390, 768, 1024 and 1440 CSS-pixel widths, portrait and landscape, long content and
both CMS themes. At 200% zoom the primary tasks stay available. At 400% (320px reflow) content
does not need scrolling in two directions, except for genuine data tables. A table may scroll
inside a labelled container; the document itself never widens. On phones prefer record cards
or fewer columns.

Aim for 44px touch controls. WCAG 2.2 AA sets a 24px minimum target with stated exceptions, so
the design target is not the standard. Verify keyboard access, visible focus, focus return
after dialogs, accessible names, field errors, status announcements, contrast, and focus not
hidden beneath sticky interface. Run real VoiceOver checks, and NVDA where available.
Automated zero findings are not a compliance certificate.

Sample users: the owner completes an enquiry and quote task without coaching; a business
buyer finds the relevant scope and submits a synthetic enquiry; a synthetic client finds its
invoice and support route without staff controls. Record completion, mistakes and points of
hesitation. Start with one small feedback round.
