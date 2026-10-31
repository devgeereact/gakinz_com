# Patterns, as built in the approved prototype and the site

Copy these when building into the site. Each was verified in the prototype on 31 Oct 2026 (185 captures at
five widths with axe, 47 state audits, 38 workflow checks). Status: PROTOTYPE unless marked.

## Balanced card grid (public `/` and `/work`)

`.grid-work` has six tracks; a card spans two (three a row). A helper runs after render, after a filter, and
on resize (debounced), counting only visible `.card` children:

```js
function balance(grid) {
  const items = [...grid.children].filter((el) => el.classList.contains("card") && el.style.display !== "none")
  items.forEach((el) => el.classList.remove("half", "full"))
  const tracks = getComputedStyle(grid).gridTemplateColumns.split(" ").length
  if (tracks >= 6) {
    const r = items.length % 3
    if (r === 1) items[0]?.classList.add("full")                                   // 1 full, then threes
    if (r === 2) { items[0]?.classList.add("half"); items[1]?.classList.add("half") } // 2 + threes
  } else if (tracks === 2 && items.length % 2 === 1) items[0]?.classList.add("full") // 1 full, then pairs
}
```

`.card.half` spans three tracks; `.card.full` spans the row and lays media and body side by side above
860px. In React, run it in a layout effect keyed on the visible list. Count only cards: a marker or label
inside the grid must not be counted.

Home "Selected work" shows live work with a strong first screen, two features then three:
RitaGreen, EGO LIMITED, RotaFlow, Harni, Herit Clothing (owner-approved selection, 31 Oct 2026).
Volume stays on /work; its first screen is an empty editor.

## Process steps

Five columns on one rail at desktop; below 1100px a numbered list (`3rem | title | detail`), below 560px
two columns. Never a 3 + 2 grid.

## Page header with a fact rail (`PageHead`)

Two columns: heading and lede, then a `<dl class="rail">` of three or four real figures (`Live today 9`,
`Paid in stages 40 · 30 · 30 %`). Counts are computed from the data. One column below 860px.
A section head with one child uses a single row (`title | count`), not an empty second column.

## Pricing

```css
.plans { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px }
.plan  { display: grid; grid-row: span 4; grid-template-rows: subgrid; gap: 18px }
.ticks { align-content: start }   /* lists never stretch */
.plan .btn { align-self: end }
```

Below 560px, `.plan { grid-row: auto; grid-template-rows: auto }`.

## Case study without screenshots

Instead of a slab repeating the name: a panel in the project colour (ink 22% over it) with "What was built"
as numbered large lines on the left, and status, kind, sector and stack chips on the right. The same
built-list appears inside a card's media area on /work. With screenshots, use the laptop and phone frames.

## Header and calls to action over project colour

- Text colour by measured ratio (white vs ink, take the higher), full opacity, links included.
- Main call to action (nav and hero): `background:#ECE9E2; color:#0F151D` everywhere. Do not set the
  button text to the project colour; it was fragile (computed colours differed from the intended ones) and
  failed on light project colours.
- The solid (scrolled) header uses graphite text in its main button.

## Hero swap as built in the site (CSS, `site.css` `.swap`)

The site keeps the hero in CSS so it works before GSAP loads: `.swap` is an `overflow:hidden` mask; the
outgoing word moves to `translateY(-110%)` in 0.32s (ease-in), and the incoming word waits 0.3s before it
rises from `translateY(110%)` in 0.55s, so the two never show together. Verified: axe on every slide at
1440 and 390px.

## Hero swap (GSAP, prototype)

One timeline per change: outgoing word `yPercent: -110` inside an `overflow:hidden` mask (0.32s, power2.in),
caption fades out, background tweens, the word text swaps while hidden, incoming word from `yPercent: 110`
(0.55s, power3.out), caption fades in. The progress bar is a tween paused by hover, focus and the pause
button. Screens crossfade by tweening every image's opacity explicitly (only the active one to 1);
toggling a class alone leaves earlier tweened images at opacity 1 and the last one wins.
Reduced motion: no timeline; swap text instantly, keep every control.

## GAkinzOS layouts

- **Stage bar** (Projects): `grid-template-columns: repeat(5, minmax(0, 1fr))` buttons with count and
  label, `aria-pressed`, the same at every width.
- **Records as rows:** Projects, Clients, Invoices, Quotes are tables. Wrap each in a scroll region:
  `position: relative; overflow-x: auto; tabindex="0"; role="region"; aria-label="<heading>"`; give the
  table `min-width: 680px` below 820px. `position: relative` keeps absolutely positioned screen-reader
  labels inside the region (without it they widened the page by 93 to 130px).
- **Page header:** below 820px `flex-direction: column; align-items: stretch`, actions wrap.
- **Three-column screens** (Contracts, Support): stack below 1100px; the record list becomes a horizontal
  strip.
- **Enquiries board:** five columns of 240px that scroll inside the region below 1100px.
- **Wide screens:** `.pg { width: 100%; max-width: 1760px; margin-inline: auto }`.
- **Calls:** week grid above 620px, an agenda list by day below.
- **Grid overrides:** when forcing one column use `minmax(0, 1fr)`, not `1fr` (which will not shrink below
  its content and pushed Dev Pipeline 316px off screen).

## Overlays

- Dialogs and drawers trap focus, close on Escape and the scrim, and return focus to the opener.
- When a dialog closes, hide it first and remove it on the next tick, so a submit handler can still read
  its fields after calling close (eight dialogs lost their values before this).
- Popovers (notifications, account menu) sit over an invisible fixed catcher: an outside click only closes
  the popover, and covered targets are not half-reachable.
- The account popover is `role="dialog"` with a label, not `role="menu"` (it holds a heading, links and a
  divider).
- Toasts are `role="status"`, last six seconds, and offer Undo for reversible changes.

## Sign-in (Clerk)

`AuthFrame` renders immediately; only the form slot waits for Clerk. Map Clerk's `appearance` to tokens:
`variables` (`colorPrimary` ink, `colorBackground` surface, `colorText` ink, `colorTextSecondary` muted,
`colorInputBackground` surface, `colorInputText` ink, `borderRadius` 10px, `fontFamily` Hanken) and
`elements` by Clerk's element keys (card without shadow or border, primary button ink with accent hover),
for light and dark. Keep "Secured by Clerk". Never style `.cl-*` selectors.

## AI blocks

A tinted panel (accent soft to surface) with a spark icon, the label ("AI draft", "Brief for today"), a
status badge (Writing… then Ready with seconds), the source line ("Drafted from the enquiry text only"),
and actions Use / Edit / Regenerate / Discard. Nothing is sent from an AI block.
