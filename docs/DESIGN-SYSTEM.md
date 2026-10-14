# Design system, as implemented

**Status:** the public surface at `/` implements the D-037 system as of 2026-10-10, on the
branches stacked into PR #8 and **not yet deployed**. The favicon, the 32px and apple-touch
icons and the 1200x630 share image (`public/og.png`) use the same palette, and `theme-color`
is the cream canvas `#F3F0EE`. GAkinzOS at `/app/*` was restyled to its approved prototype
(D-046) on 2026-10-14; section 11 describes it. Sections 1 to 9 were
read from `src/index.css`, `tailwind.config.js`, `src/marketing/components/primitives.tsx`,
`action-class.ts`, `PublicNavbar.tsx`, `PublicFooter.tsx` and `FadeIn.tsx` on 2026-10-10, and
re-checked after six unused primitives were removed. Those files are the authority. If this
document and they disagree, they win.

> **Sections 1 to 8 describe the public surface at `/` only.**
>
> GAkinzOS at `/app/*` is described in section 11 (D-046): its own token set, Bricolage,
> Hanken and JetBrains Mono, and a flat `.gk-app-*` family. Section 9 lists what the two
> surfaces still have in common. Section 10 records the D-037 target; its CMS column is
> superseded by D-046.

The public direction is the Mastercard-inspired GetDesign system the owner chose on 2026-10-10
(`docs/DECISIONS.md` D-037), followed as closely as possible with only the substitutions in
section 10.2. The preserved reference is
[DESIGN-REFERENCE-MASTERCARD.md](DESIGN-REFERENCE-MASTERCARD.md). It replaces "direction C
with direction A's colour" (D-023), which is in git history.

---

## 1. Shape of the system

A public page is a warm, editorial surface: cream canvas, one geometric sans, warm-black
actions, very large radii and a sparse orange orbit line. Most surfaces sit flat on the canvas;
elevation is kept for the floating navigation, the mobile menu and nothing else.

| Selector | Where it applies |
|---|---|
| `:root` | Base and CMS light mode. Untouched by the public rebuild |
| `.dark` | CMS dark mode, driven by `next-themes`. Untouched |
| `.gk-public` | The public wrapper. Declares the public palette, the 20px `--radius`, the shared ease-out curve, the Sofia Sans family at weight 450, and remaps the shadcn tokens so a shared component rendered inside it inherits the public colours |
| `html.gk-force-light` | Higher specificity than `.dark`. `PublicLayout` and `Login` add it, so the public surface never washes out when the CMS has left `html.dark` on |

Values are declared as `hsl()` triplets on `.gk-public`, because the project is on Tailwind
v3 and the shadcn primitives reference tokens as `hsl(var(--token))`. The same colours are
declared as hex under `theme.extend.colors.gk` in `tailwind.config.js`, which is what the
`bg-gk-*` and `text-gk-*` utilities compile from. **Both lists have to be edited together.**

The token names are the September names, kept so the pages needed few edits. Two changed
meaning: `sunk` is now the lifted cream, lighter than the canvas, and `set` is now the
warm-black primary action rather than navy.

The active Tailwind config is `tailwind.config.js`.

## 2. Palette

Ratios below are against canvas cream `#F3F0EE` unless stated. "Measured" means read from
computed colours on the built site in the browser on 2026-10-10 (`/contact`, 1440px);
"computed" means calculated from the hex.

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `gk-paper` | `#F3F0EE` | Canvas cream, the page | n/a |
| `gk-sunk` | `#FCFBFA` | Lifted cream: alternate bands, closing frames, placeholders | n/a |
| `gk-white` | `#FFFFFF` | Navigation pill, mobile menu, secondary action, form fields | n/a |
| `gk-ink` | `#141413` | Headings, body text, the footer surface | **16.25:1** measured |
| `gk-ink-soft` | `#555555` | Standfirsts, secondary prose | **6.57:1** measured |
| `gk-ink-mute` | `#696969` | Labels, metadata, hints | **4.84:1** measured |
| `gk-set` | `#141413` | The primary action (same value as ink) | 16.25:1 |
| `gk-come` | `#9A3A0A` | Clay. "Awaiting material" and field errors | **6.20:1** computed, 6.81:1 on lifted cream |
| `gk-rule` | `#D1CDC7` | **Decorative hairline only.** Never a form border | 1.40:1, non-text decoration |
| `gk-edge` | `#8C857C` | Structural rules and every form border | **3.21:1** measured, 3.65:1 against a white field |
| `gk-orange` | `#F37338` | The orbit line. **Never text, never meaning** | 2.53:1, decorative |
| `gk-signal` | `#CF4500` | The eyebrow dot only | 4.11:1 computed, non-text |

Tokens for the warm-black surface, against `gk-ink`:

| Token | Hex | Role | Contrast on ink |
|---|---|---|---|
| `gk-on-dark` | `#F3F0EE` | Text and the primary action on ink | **16.25:1** measured |
| `gk-on-dark-soft` | `#B8B2AA` | Footer links, column heads, small print | **8.77:1** measured |
| `gk-set-on-dark` | `#F3F0EE` | Kept for compatibility; same as `on-dark` | 16.25:1 |
| `gk-come-on-dark` | `#F37338` | Kept for compatibility; unused by any page | 6.43:1 computed |

**No reference hex had to be darkened.** Every text pairing clears WCAG 2.2 AA at the
reference value. Signal orange is the one colour that would fail as small text, so it is
confined to a non-text dot. The Mastercard mark colours `#EB001B` and `#F79E1B` are not used
anywhere (section 10.2).

### `rule` against `edge`

`gk-rule` at 1.40:1 may separate things already separated by space. It may **not** be the
boundary of a form control, which would fail WCAG 1.4.11. `gk-edge` at 3.21:1 is the
structural line and every input, select and textarea border. `.gk-public` sets both
`--border` and `--input` to it.

### What was retired

Navy `#2A3160`, red oxide `#933C2F`, warm paper `#F6F3ED`, the square-cornered document idiom
and the "two-chromatic convention" are gone from the public surface. Lavender and rose were
retired earlier (D-023). `--gk-violet` and the gradient effect classes that used it went with
the GAkinzOS restyle (D-046), once the two sign-in pages stopped using them.

## 3. Type

### One family

Sofia Sans variable, self-hosted from `@fontsource-variable/sofia-sans` 5.3.0 (OFL-1.1) and
imported once in `src/main.tsx`. It stands in for the reference's proprietary MarkForMC.
Manrope is the fallback. The Tailwind slots `font-display`, `font-ui` and `font-data` all
resolve to it, so the pages kept their class names; `.gk-public .font-data` still turns on
tabular figures.

| Use | Weight | Where it is set |
|---|---|---|
| Body and interface text | 450, the reference's half step | `.gk-public` |
| Headings and blockquotes | 500 | `.gk-public :is(h1, h2, h3, h4, blockquote)`, which also overrides a stray `font-normal` |
| Actions and navigation | 500 (`font-medium`), -2% tracking | `action-class.ts`, `PublicNavbar.tsx` |
| Labels and eyebrows | 700, uppercase, +4% tracking | `Label` |

The build emits four woff2 subsets, 100,048 bytes in total; an English page downloads only
the latin subset (40,372 bytes).

### The scale is closed

Nine values under semantic names in `tailwind.config.js` (D-024). **No size outside this
scale ships on a public page.** The values were retuned to the reference on 2026-10-10; the
names keep their roles, so `text-t2` still means "section heading".

| Name | Size | Line height | Tracking | Use |
|---|---|---|---|---|
| `label` | 14px | 1.3 | +0.04em | Eyebrows, labels, metadata |
| `body` | 16px | 1.4 | n/a | Prose and interface text |
| `lede` | 20px | 1.4 | n/a | Standfirst under a page title |
| `t4` | 24px | 1.2 | -0.02em | Card and row titles |
| `t3` | 28px | 1.2 | -0.02em | Sub-section headings, pull quotes |
| `t2` | 36px | 1.22 | -0.02em | Section headings; page titles on phones |
| `t1` | 48px | 1.05 | -0.02em | Page titles from 640px; the footer line |
| `display` | 64px | 1.0 | -0.02em | The home headline from 1024px |
| `hero` | 80px | 1.0 | -0.02em | Defined, unused |

`.gk-public` sets `text-wrap: balance` on headings and `text-wrap: pretty` on paragraphs.

## 4. Spacing, shape and elevation

**Spacing.** The reference's 8, 16, 24, 32, 48, 64, 96 and 128 are Tailwind's 2, 4, 6, 8, 12,
16, 24 and 32, so the config adds nothing. `Measure` is `max-w-[76rem]` with a 16px gutter on
phones, 32px from 640px and 48px from 1024px. `Section` pads 64px, then 96px from 768px, then
128px from 1024px.

**Radius.** The reference skips the 8 to 12px middle.

| Token | Value | Use |
|---|---|---|
| `rounded-action` | 20px | Primary and secondary actions, form fields, notices, mobile menu rows. Also `--radius` on `.gk-public`, which shared shadcn controls inherit |
| `rounded-media` | 40px | Media frames, placeholders, closing frames, the mobile menu panel |
| `rounded-full` | pill or circle | Navigation pill and its links, filter chips, portraits |

**Elevation.** `shadow-float` is `0 4px 24px rgba(0,0,0,0.04)`, used on the navigation pill.
`shadow-lifted` is `0 24px 48px rgba(0,0,0,0.08)`, used on the open mobile menu. Everything
else is flat.

### Navigation (`PublicNavbar.tsx`)

A white pill, sticky 12px (16px from 640px) below the top of the viewport. The GAkinz
`BrandMark` and the owner's name sit at the left on every width; the role and location line
shows from 1024px. From 768px the four links are 44px-tall pills, the current one filled with
canvas cream, followed by the warm-black "Start a project" action. Below 768px a 44px round
button opens a disclosure: a white 40px-radius panel laid over the page, with 48px rows and a
full-width action. It has no focus trap, by design. It closes on Escape and returns focus to
the button, on a route change, and when a link in it is clicked. The header's transparent
margin ignores the pointer, so it never blocks the page beneath it.

### Footer (`PublicFooter.tsx`)

The warm-black surface. A large conversational line (`site.line` at `t2`, `t1` from 640px)
sits beside a cream "Start a project" action and the email address, then four columns, then
the copyright and legal links, divided by `gk-on-dark` at 20 per cent. Links are 44px tall on
phones and 32px from 640px. Because the footer is ink, closing calls to action above it are
lifted-cream 40px frames rather than a second dark band.

## 5. The primitives

All in `src/marketing/components/primitives.tsx` unless named otherwise.

### Structure

| Primitive | When to use it |
|---|---|
| `Measure` | The page's horizontal measure. Wrap any full-width content you lay out yourself |
| `Section` | A horizontal band. `tone="paper"` is the canvas, `tone="sunk"` the lifted cream, `tone="ink"` the warm-black band, **once or twice per page at most**. The `muted` boolean is deprecated and maps to `sunk` |
| `Split` | Two columns: a sticky label column (eyebrow with dot, heading, intro) and content |

### Type

| Primitive | When to use it |
|---|---|
| `Label` | The 14px bold uppercase label. With `dot` it becomes the section eyebrow, led by a 6px `gk-signal` dot that is hidden from assistive technology. `PageHero`, `Split` and the home hero use the dot |

### Actions

`actionClass()` in `src/marketing/components/action-class.ts` holds the styling, so a native
button (the enquiry form) and the navigation action match `Action`. It lives outside
`primitives.tsx` so that file exports components only.

| Variant | Look |
|---|---|
| `strong` | The Ink Pill: warm-black fill and 1.5px edge, cream text, 20px radius. Hover lightens to `gk-ink-soft` |
| `plain` | The outlined pill: white fill, 1.5px ink edge, ink text. Hover fills with canvas cream |
| `onDark` | Flips both for the ink surface: a cream pill, or a cream outline |

Every action is at least 44px tall with 24px side padding, far above the reference's 6px
vertical padding. Only colour changes on hover, over 150ms. Nothing moves the target during
activation.

### Page header and lists

| Primitive | When to use it |
|---|---|
| `PageHero` | An inner page's masthead: optional breadcrumb, dotted eyebrow, one `h1` (`t2`, `t1` from 640px), optional standfirst and children. It runs the hero entrance (section 7). No media, so inner pages do not copy the home hero |
| `IndexList` / `IndexRow` | A ruled index of records. Set `as="h2"` on a row that is the first heading under the page `h1` |
| `CtaBand` | The closing call to action: a lifted-cream 40px frame with one heading, one standfirst and one `strong` action, revealed by `FadeIn` |

### Media

| Primitive | When to use it |
|---|---|
| `MediaFrame` | The 40px rounded frame. It clips its child, can reserve an aspect ratio, and fills with lifted cream while the image loads. Portfolio screenshots stay rectangular inside it so interface detail stays readable. Used on `WorkDetail` |
| `Portrait` | A circular frame for a square photograph, 800 by 800 intrinsic. Used for the owner portrait on Home and About when one exists |
| `Orbit` | One thin open arc in `gk-orange`, sweeping over the top of a circular portrait. `aria-hidden`, ignores the pointer, hidden below 768px. Place it inside the `relative` square that holds the portrait; it overhangs that square by a fifth on each side. Used once, in the home hero |

## 6. Colour use, and the honest-placeholder convention

The two-chromatic navy and red-oxide convention is retired. Colour now has these jobs:

| Colour | Job | Where |
|---|---|---|
| Ink `#141413` | The action, and settled work | `Action`, the navigation action, the enquiry button, active filter chips, the left spine of a settled `LedgerRecord` |
| Clay `#9A3A0A` (`gk-come`) | Material not yet supplied, and field errors | `Placeholder`, `Gap`, the spine of an unfinished `LedgerRecord`, error text and borders on `/contact` |
| Signal `#CF4500` | The eyebrow dot, nothing else | `Label dot` |
| Orange `#F37338` | Decoration only | `Orbit` |

Clay keeps a meaning, so do not use it to warm a page up. Orange and signal carry none, so
never put information in them.

Recorded as a decision in `docs/DECISIONS.md` D-027, narrowed by D-039. **Where the site has
no real material for a slot, it shows a designed, labelled placeholder.** It does not show a
stock photograph, an invented client, a rounded figure or a plausible-sounding outcome.

`Placeholder` takes the shape the real material will have: `shape="frame"` (default) is a
40px-radius frame at a given `ratio` (default 4 / 5); `shape="circle"` is a perfect circle for
a portrait. Both have a 1.5px dashed clay border at 60 per cent, a lifted-cream fill, a bold
clay label and an optional line of detail in `gk-ink-mute`, and both reserve their final size
so nothing moves when the real image arrives. `Gap` renders an inline bold clay `[to supply]`.

**The rule this enforces.** Filling a gap means obtaining the real material, never relaxing
the rule. **Related guards elsewhere:** `server/work.php` refuses to publish a record that
names a client without stored consent and refuses an image with no alt text;
`src/marketing/data/work.ts` holds a static fallback in which every field without a true value
is `null`; `personSchema()` in `src/marketing/components/Seo.tsx` omits `sameAs` rather than
pointing it at a bare domain.

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

The outline cannot be overwritten by Tailwind's ring-shadow chain, which is why it is not a
box-shadow. `outline-offset` leaves a gap of the surface colour, so one solid colour is enough.
Controls **inside** an ink or `set` surface flip the ring to cream:

```css
.gk-public .bg-gk-ink :focus-visible,
.gk-public .bg-gk-set :focus-visible { outline-color: hsl(var(--gk-paper)); }
```

These are descendant selectors only, because the ring sits outside the element and has to
contrast with the surface behind it. **Measured 2026-10-10:** 16.11:1 on canvas cream (the
enquiry button and a form field), 18.27:1 on the white navigation pill, 16.10:1 inside the ink
footer.

### Motion

CSS and SVG only; there is no animation library. Every rule that moves anything sits inside
`@media (prefers-reduced-motion: no-preference)`, so with reduced motion each element rests in
its final state. Entrances use `--gk-ease-out`, `cubic-bezier(0.23, 1, 0.32, 1)`. Nothing
loops, nothing animates layout, and no base class is ever `opacity: 0`.

| Class | What moves | Timing | Used by |
|---|---|---|---|
| `.gk-rise` | Opacity and a 14px rise | 550ms; `--gk-delay` sets the stagger, 80ms apart | Home hero and `PageHero`: eyebrow, heading, standfirst, actions |
| `.gk-media-in` | Opacity and scale 0.98 to 1 | 700ms after 120ms | The home portrait frame, which reserves its box throughout |
| `.gk-orbit-path` | A stroke-dash draw (`pathLength="1"`) | 1000ms after 650ms, ease-in-out | `Orbit` |
| `.gk-fadein` | Opacity and a 14px rise | 450ms | `FadeIn` |
| `.gk-menu-panel` | Opacity and an 8px drop, entering only, via `@starting-style` | 200ms | The mobile menu. Closing is instant |
| `.gk-hover-zoom` | The child scales to 1.03 | 220ms | `MediaFrame`, `Portrait`. Only under `(hover: hover) and (pointer: fine)` |

**The `FadeIn` reveal rule.** `.gk-fadein` is visible by default and, where motion is
allowed, plays one entrance on mount. `FadeIn` upgrades it to a viewport reveal only for an
element that starts below the fold: in the same step that starts an `IntersectionObserver`, it
marks the element `data-reveal="pending"` (hidden by CSS), and flips it to `"in"` when it is
seen. The observer's root reaches 100,000px above the viewport, so an element the reader
jumped past (an anchor link or the End key) is still revealed. Teardown never leaves an
element pending. Without JavaScript, without an observer, or with reduced motion, nothing is
marked and nothing is hidden. **Do not give the base class `opacity: 0`, and do not gate a
marketing entrance on JavaScript.**

Checked on 2026-10-10 in the built site: with reduced motion emulated, the hero heading,
media, orbit and fade-in elements reported no animation, opacity 1 and no transform; with
motion allowed, after jumping straight to the bottom of `/`, `/pricing`, `/services`, `/about`
and `/services/web-design`, no `.gk-fadein` element was left hidden.

### The rest of the global layer

- **Skip link.** `PublicLayout` renders a "Skip to content" link, visually hidden until
  focused, then fixed above the navigation pill with a 20px radius. WCAG 2.4.1 and 2.4.11.
- **Scroll padding.** `html { scroll-padding-top: 6rem; }` keeps a keyboard target clear of
  the sticky pill, whose bottom edge sits at 72px on a 390px phone.
- **Placeholders.** `::placeholder` uses full-strength `--muted-foreground`, 4.84:1 on the
  public surface.
- **Selection** uses `--primary` at 22 per cent; **scrollbars** are thin and muted. Both are
  shared with the CMS.
- **Baseline transition.** Interactive elements share a 200ms colour, border, shadow,
  transform and opacity transition inside `prefers-reduced-motion: no-preference`.

## 8. Residue worth knowing

- `gk-set-on-dark`, `gk-come-on-dark` and the `hero` type step exist but no page uses them.
- `Rule`, `RuleEyebrow`, `GradientText`, `Contents`, `FeatureRow` and `QuoteBand` were removed
  on 2026-10-10 because nothing used them (`knip`). Add a primitive back only with a caller.
- The Google Fonts `@import` is gone (D-046). Every face is self-hosted from
  `@fontsource-variable` and imported in `src/main.tsx`.

### What must never appear on a public page

`.gk-shine`, the `.gk-os-*` shell classes and the whole `.gk-app-*` family. They exist for
GAkinzOS. The other effect classes this list used to name (`.gk-aurora`, `.gk-grid`,
`.gk-grad-text` and the rest) were deleted with D-046. Nor may the Mastercard
mark colours, an interlocking or overlapping pair of circles, card or payment imagery, or any
stock image standing in for real work (section 10.2).

## 9. What the two surfaces still share

- Everything in section 7 except the two `.gk-public` focus rules, the public motion classes
  and the public tokens; plus the wrapper mechanics in section 1.
- One stylesheet, `src/index.css`, and one set of self-hosted faces imported in
  `src/main.tsx`: Bricolage Grotesque, Hanken Grotesk and JetBrains Mono.
- `BrandMark`, which takes `currentColor` and renders in both surfaces.
- `.gk-app-grad` is now plain ink in Bricolage Grotesque (section 11).

---

## 10. Target system (D-037): implementation status

**Status:** decided by the owner on 2026-10-10. The public-surface foundation and motion were
built on 2026-10-10 and are described in sections 1 to 9. The CMS column, real imagery and the
service-overview constellation are still target. Each row below says which. This section
governs the rest of the rebuild, which is delivery phases 3 and 4 in `docs/STATUS.md`.

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

The target replaced the September public direction (warm paper `#F6F3ED`, navy `#2A3160`,
red oxide `#933C2F`, Newsreader over Instrument Sans) on 2026-10-10, and is still to replace
the CMS's separate Manrope and lavender palette. It withdraws the 2026-09-22 rule against borrowed design
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

| Foundation | Website | CMS | Status |
|---|---|---|---|
| Canvas | Cream `#F3F0EE`, lifted cream `#FCFBFA`, warm ink `#141413` | Same light foundation, white or lifted record surfaces, legible text | Implemented (public). CMS target |
| Primary actions | Warm-black call to action, cream text, 20px radius | Same primary and secondary styling; compact controls keep comfortable hit areas | Implemented (public). CMS target |
| Accent | Decorative orbital orange `#F37338`, sparse dots and section detail | Quiet decorative and brand cues; semantic success, warning and error colours stay unambiguous | Implemented (public): orbit and eyebrow dots. CMS target |
| Consent signal | Reference orange `#CF4500`, only where contrast and the consent platform's styling permit | Consent controls follow consent requirements; orange is not the generic Save colour | Target. There is no consent interface yet; `#CF4500` is used only for the eyebrow dot |
| Typography | One geometric sans family, medium headings, tight display tracking | Same family; readable field labels, tables and figures; no decorative watermark behind data | Implemented (public). CMS target |
| Type scale | Hero around 64px desktop and 40px mobile, section 36px, smaller headings 24px; fluid sizing with actual wrapping tested | Page headings around 28 to 36px, body and controls around 16px; no 64px KPI numbers | Implemented (public; the home headline is 36px on phones). CMS target |
| Spacing | 8, 16, 24, 32, 48, 64, 96, 128 scale; generous desktop sections, 48 to 64px mobile sections | Same scale, tighter list and form spacing, sensible density | Implemented (public). CMS target |
| Shape | Floating pill navigation, 40px hero frames, circular service portraits, 20px buttons | Rounded panels and dialogs, same buttons and chips; inputs and tables fit their function | Implemented (public). CMS target |
| Elevation | A very soft floating-nav shadow, mostly flat surfaces | Soft elevation only for overlays and selected panels; borders clearly separate controls | Implemented (public). CMS target |
| Imagery | Real owner and client work, circular portraits, large rounded feature media | Client-approved thumbnails and actual file or project previews; no ornamental imagery in every record | **Target.** Frames and placeholders are built; the real photographs and screenshots do not exist yet |
| Responsive | Full navigation to a compact accessible mobile menu; arcs simplified or removed on phones | Explicit drawer toggle, wrapping actions and tabs, contained responsive lists and tables | Implemented (public). CMS target |
| Footer | Warm-black surface, white text, a conversational contact call to action | A small useful footer; no marketing-sized footer in the workspace | Implemented (public). CMS target |

**Font.** Sofia Sans variable, self-hosted, replaces Newsreader, Instrument Sans and Manrope
on both surfaces, so the website and CMS share one family; Manrope stays as the fallback.
**Public: implemented** with `@fontsource-variable/sofia-sans` 5.3.0, licence OFL-1.1, at
weights 450 and 500 (700 for labels). The stray Space Grotesk reference is removed. **CMS:
target** at the time; superseded by D-046, which sets Bricolage, Hanken and JetBrains Mono
(section 11).

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
public site stays light only. **Status:** public light-only, implemented. CMS: reduced to one
light and one dark theme by D-046 (section 11), on the prototype's palette rather than this
derivation.

### 10.4 Hero and section composition

**Home hero:** a concise service headline and introduction beside a large rounded frame
holding a real project screenshot composition or owner and work imagery. One sparse orbital
line may connect that frame to a circular portrait or service detail. The enquiry call to
action is visible immediately and the image area is reserved before loading. Use GAkinz
project material so the composition has a recognisable relationship to the business.
**Status: implemented (public) with a placeholder.** The headline, introduction and enquiry
action sit beside a circular portrait frame, with one orbit arc over it. The portrait is a
labelled circular `Placeholder` until a real photograph exists, and no project screenshot
composition exists yet, so the imagery itself is still target.

**Service and detail heroes:** smaller rounded media or circular imagery related to the
service, with copy and a relevant call to action. Vary placement and crop on purpose rather
than repeating the home hero. About uses an actual owner portrait; Work uses genuine screen
captures. Portfolio screenshots may stay rectangular inside a 40px frame so interface
evidence is readable, even though the source favours circular photographs.
**Status: partly implemented.** About uses the circular frame (a placeholder for now) and
WorkDetail puts screenshots in `MediaFrame`. Inner pages use the text-only `PageHero`; service
and detail heroes with media are target.

**Service overview:** staggered circular imagery on desktop with restrained connecting arcs;
clear stacked entries on phones. Long empty scroll stretches, a carousel, ghost text or a
search button are not required just because the source has them; add them only where they
help GAkinz visitors. The CMS uses the same vocabulary at working density, with no cinematic
hero on administrative screens. **Status: target**, both the service-overview constellation
and the CMS.

### 10.5 Motion contract

Motion makes the composition recognisable through real project material, timing and the
service story. Build a small reusable set of variants, not a different animation engine per
page. The timings are starting values, tuned in browser review.

| Area | Animation | Limits | Status |
|---|---|---|---|
| Home hero copy | Opacity plus a 12 to 20px upward entrance, 450 to 650ms; a 70 to 100ms stagger between heading, supporting line and call to action | Runs once; one semantic heading, selectable text and immediate focus and click access | Implemented (public): `.gk-rise`, 14px, 550ms, 80ms apart. Also on `PageHero` |
| Hero media | Scale from about 0.98 to 1 with opacity, 600 to 800ms; an optional restrained inner-image reveal | The outer frame reserves its dimensions; no full-screen transition or content-dependent loading delay | Implemented (public): `.gk-media-in`, 700ms after 120ms. No inner-image reveal |
| Orbital accent | One SVG path draw over 800 to 1200ms after the main content appears | Decorative and `aria-hidden`; no endless orbiting, flashing or required meaning | Implemented (public): `.gk-orbit-path`, 1000ms after 650ms, runs once |
| Service and portfolio sections | A single viewport entrance, opacity and 12 to 16px movement, 350 to 500ms | Triggers once; no scroll hijack, pinned narrative or long repeated stagger | Implemented (public): `FadeIn`, 14px, 450ms, on the sections that already used it |
| Portrait and media hover | A small image scale or satellite-arrow shift, 150 to 250ms | Desktop hover only; clipping stays stable; the phone action works without hover | Implemented (public): `.gk-hover-zoom`, scale 1.03, 220ms. No satellite control |
| Buttons and menu | Colour or opacity and an optional 1 to 2px arrow shift, 120 to 200ms; menu panel around 180 to 240ms | Keyboard focus distinct; nothing moves the target during activation | Implemented (public): colour only, 150ms, no arrow shift; menu panel 200ms on entry |
| CMS panels and dialogs | A brief fade or small displacement, around 120 to 180ms | No staggered table rows, animated money counts or workflow delay | Target |
| Success and loading | Short state feedback or a restrained skeleton | Never fake completion or progress; errors stay visible until resolved | Target |

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

**Acceptance status, public, 2026-10-10:** no document overflow on 9 routes at 320, 390, 768,
1024 and 1440px; reduced motion leaves every animated element at rest in its final state; the
mobile menu closes on Escape and returns focus; Lighthouse mobile CLS 0 on `/` and 0.001 on
`/contact`. NOT TESTED: a slow connection beyond Lighthouse's simulation, real touch devices,
the CMS themes and the owner preview recording.

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

---

## 11. GAkinzOS, as implemented (D-046)

**Status:** built on branch `feat/redesign-cms-shell` on 2026-10-14, from the approved
prototype (`cms.html` and `cms-modules.js` on the redesign board). **Not merged, not
deployed.** The authority is `src/index.css`, `tailwind.config.js`, `src/components/ui/*`,
`src/layouts/AppLayout.tsx`, `src/components/app-sidebar.tsx`, `nav-main.tsx`,
`nav-groups.ts` and `src/app/components/AuthFrame.tsx`.

### 11.1 Tokens

Light on `:root`, dark on `.dark`, written as HSL triplets for the shadcn names. The extra
tokens carry an `--os-` prefix so they never collide with the public site's hex variables on
`.gk-site`.

| Role | Light | Dark | Token |
|---|---|---|---|
| Canvas | `#F4F5F7` | `#0F151D` | `--background` |
| Surface | `#FFFFFF` | `#16202B` | `--card`, `--popover` |
| Surface 2 | `#F8F9FB` | `#1B2733` | `--secondary`, `--muted` |
| Ink | `#121821` | `#ECE9E2` | `--foreground`, `--primary` |
| Muted text | `#5B6472` | `#9AA3B0` | `--muted-foreground` |
| Line | `#E2E5EA` | `#26313E` | `--border` |
| Line 2 (form borders) | `#CDD2DA` | `#334252` | `--input`, `--os-line-2` |
| Accent | `#2F6FD6` | `#8EC5FF` | `--ring`, `--os-acc` |
| Accent soft | `#E6EEFB` | `#1C2E44` | `--accent`, `--os-acc-soft` |
| OK / soft | `#1C7F52` / `#E3F3EA` | `#7FD6A5` / `#173326` | `--os-ok`, `--os-ok-soft` |
| Warn / soft | `#8F5B00` / `#FBF0DA` | `#F2C46B` / `#3A2F17` | `--os-warn`, `--os-warn-soft` |
| Bad / soft | `#B8322C` / `#FBE7E5` | `#FF9C95` / `#3B1E1D` | `--os-bad`, `--os-bad-soft`, `--destructive` |
| Sidebar | `#0F151D` | `#0B1017` | `--sidebar-background` |
| Sidebar 2 | `#16202B` | `#141C26` | `--sidebar-accent` |
| Sidebar ink / muted | `#ECE9E2` / `#8C96A4` | same | `--sidebar-foreground`, `--os-side-mute` |
| Sidebar active bar | `#8EC5FF` | same | `--sidebar-primary` |

Tailwind exposes them as `acc`, `acc-soft`, `acc-foreground`, `ok`, `ok-soft`, `warn`,
`warn-soft`, `bad`, `bad-soft`, `line`, `line-strong`, `sidebar-muted` and the shadow `os`.
The primary action is ink on canvas and turns blue on hover. There are no gradients anywhere
in the CMS.

### 11.2 Type and shape

- `font-display` Bricolage Grotesque Variable (headings, `font-serif` maps here too),
  `font-sans` and `font-ui` Hanken Grotesk Variable (body, 15px), `font-mono` and `font-data`
  JetBrains Mono Variable (labels and figures, tabular). Self-hosted; no third-party fetch.
- Every module's `h1` takes `clamp(1.7rem, 2.6vw, 2.2rem)` in Bricolage, weight 650.
- Cards 16px radius, controls 10px, popovers 14px. One shadow token, for overlays only.

### 11.3 Components (`src/components/ui`)

APIs are unchanged. Buttons are 40px high (`sm` 36px, `lg` 48px, `icon` 40px square), never
wrap and never shrink; a row of buttons wraps instead. Badges are 24px pills with a status
dot and gain `ok`, `warn`, `bad` and `acc` tones. Inputs are 42px with a 3px soft-accent focus
ring. Table heads are mono uppercase 10.5px on surface 2. Tabs are underline tabs. Dialog and
sheet footers wrap on phones. The `.gk-app-*` family is flat: `grad` is plain ink, `card` is a
hairline card whose hover changes the border only, `chip` is a soft accent tile, `ring` is a
plain border, `accent` and `.gk-shine` draw nothing.

### 11.4 Shell

A graphite sidebar in both themes: brand tile and "GAkinzOS / Studio platform", groups with
mono uppercase headers that fold (remembered in `localStorage` under `gkos-groups`), 40px rows
with the sky active bar, count pills for new enquiries and open tickets, and a footer with My
account and Sign out. It collapses to a 72px icon rail and becomes a drawer below 768px.
A sticky 64px header carries the sidebar toggle, a search button that opens GlobalSearch
(Ctrl K), the London clock, notifications, the sun and moon theme toggle and the user pill.
Each page shows a mono "Group / Title" crumb. The weather pill and the footer are no longer
shown.

### 11.5 Sign-in pages

Login and SetPassword share `AuthFrame`: a graphite panel with the mark, "The studio, in one
place.", the project colour strip and the London clock, and the form on the canvas.

### 11.6 Behaviour changes

- **Custom background themes retired.** `dark-blue`, `classic-light`, `gaussian-black` and
  `semi-dark`, and their background images, are gone. The CMS is light or dark through
  next-themes; a browser that saved an old theme has the choice cleared once.
- The sign-in pages follow the light or dark theme instead of forcing light.
- My account moved from the Settings group to the sidebar footer.

### 11.7 Not yet matched

KPI tiles, status pills and page-header action order live inside each module
(`src/app/modules/*`) and were not edited in this change, so they keep their own markup on the
new tokens. The prototype's per-screen compositions in `cms-modules.js` are the reference for
that follow-up.
