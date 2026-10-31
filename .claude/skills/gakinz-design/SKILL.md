---
name: gakinz-design
description: >-
  The GAkinz design system: the graphite public site (gakinz.com), the Clerk sign-in, and GAkinzOS, the studio's
  CMS at /app, in light and dark. Holds the measured tokens, type, spacing, components, layout rules, motion
  rules, honest-content rules and the verification routine for this project. Use it for any visual, layout,
  copy-on-screen, screenshot, prototype or artifact work on gakinz.com or GAkinzOS: "fix the cards", "make
  this screen look right", "new CMS module", "restyle", "update the work screenshots", "build the prototype
  into the site", "check contrast", "design board". Method comes from the product-design skill; this skill
  supplies the GAkinz values and the traps already found in this codebase.
---

# GAkinz design

**Method:** follow `~/.claude/skills/product-design/SKILL.md` (references, tokens, equal rows, every state,
verification, presentation). This skill adds what is specific to GAkinz. When this file and the code
disagree, **the code wins** and this file is wrong: fix it in the same change.

## Sources of truth

| What | Where |
|---|---|
| Public site styles | `src/marketing/site.css` (scoped to `.gk-site`, D-046) |
| Public parts | `src/marketing/components/site-ui.tsx`, pages in `src/marketing/pages/` |
| Public data | `src/marketing/data/showcase.ts` (projects), `site.ts`, `content.ts` (CMS-editable copy) |
| CMS tokens | `src/index.css` (`:root` light, `.dark`), `tailwind.config.js` (the `.ts` one is inert) |
| CMS parts | `src/components/ui/*`, `src/app/components/page-kit.tsx` (PageHeader, StatGrid, StatTile, StatusBadge) |
| CMS shell | `src/layouts/AppLayout.tsx`, `src/components/app-sidebar.tsx`, `nav-main.tsx`, `nav-groups.ts` |
| Sign-in | `src/app/components/AuthFrame.tsx`, `src/app/ClerkLogin.tsx`, `src/app/ClerkSession.tsx` |
| Motion | `src/marketing/lib/motion.ts` (GSAP + Lenis, D-051) |
| Written record | `docs/DESIGN-SYSTEM.md` sections 10 and 11, `docs/DECISIONS.md` D-046, D-051, D-052 |
| Role access shown in the UI | `src/lib/access.ts` (mirrors the server; never a security boundary) |

Approved artifacts (owner, 31 Oct 2026), the reference for the next build:
- Live prototype, every screen working: https://claude.ai/artifact/UDLsqyrLE6smsEP96Pr7be
- Design board, system left and screens right: https://claude.ai/artifact/PzKiwCvhsVeNw6C3gGGNqD

Each rule below is marked **IN CODE**: true of `main` and the live site since release `a907824`
(31 Oct 2026). A new rule starts as PROPOSED until it is built and verified.

## Two surfaces, one family

- **Public site:** one graphite world, dark by design, ignores the OS theme. Project colours carry the
  hero and each case study. IN CODE.
- **GAkinzOS:** light and dark from the same roles; the sidebar is graphite in both. IN CODE.
- Shared: Bricolage Grotesque (display), Hanken Grotesk (text and UI), JetBrains Mono (figures,
  references, dates). Self-hosted with `@fontsource-variable`; never fetched from a third party. IN CODE.

Tokens with measured ratios are in [references/tokens.md](references/tokens.md). Never add a hex value in
a component: add or reuse a token, and record its measured ratio beside it.

## Rules that keep GAkinz looking right

Each one exists because the opposite was found on a rendered page. Detail and the evidence are in
[references/patterns.md](references/patterns.md) and [references/findings.md](references/findings.md).

1. **Full rows at every width.** A card grid never leaves a lone last card or a half-empty row. Give the
   short row to the top as wider feature cards (5 cards at three a row: 2 + 3; odd at two a row: one full
   then pairs). Five process steps become a numbered list below 1100px, never 3 + 2. IN CODE.
2. **No empty half.** An inner page header carries a fact rail of real figures (counts computed from the
   data, never typed); a section head with one child spans the width. IN CODE.
3. **Cards share rows.** Pricing cards use `grid-template-rows: subgrid` so names, prices, lists and buttons
   align; lists never stretch (`align-content: start`). IN CODE.
4. **Images keep their frame.** Any `<img>` with `width`/`height` attributes needs `height: auto`, or the
   attribute fixes the height and defeats `aspect-ratio`. Tailwind's base layer does this on the real site;
   anything outside it (prototypes, emails, the share page) must set it. IN CODE (by Tailwind).
5. **Text on a project colour is chosen by measurement**, never by a brightness threshold: compare the
   ratio of white and of ink `#121821` and take the higher. Never reduce its opacity (85% dropped Harni's
   pink below 4.5:1). The main call to action is graphite on chalk everywhere (17:1), never the project
   colour as text. IN CODE.
6. **No placeholder where content exists.** A project without screenshots shows a specification sheet
   (what was built, stack, status), not a slab repeating its name. About shows the work until a real
   portrait exists. IN CODE.
7. **Records list as rows.** CMS projects, clients and invoices are tables (scrolling inside a labelled,
   focusable region on phones), not card grids that orphan. Stages are one five-part bar at every width,
   never 3 + 2 tiles. IN CODE.
8. **One primary action per screen.** An empty state does not repeat the header's button. IN CODE.
9. **Headers stack on narrow screens.** Below 820px the page title takes the full width and actions wrap
   under it; titles never wrap one word per line. Three-column screens (list, document, aside) stack below
   1100px. Above 2200px content sits in a centred column capped at 1760px. IN CODE.
10. **Sign-in is one frame.** Clerk's form is drawn with GAkinzOS tokens through Clerk's `appearance`
    (`variables` and `elements` by name, never `.cl-*` selectors), in light and dark, and the frame renders
    at once while only the form waits. IN CODE (live check 31 Oct: card frame and footer panel gone, tokens applied; release `fdc5d94`).
11. **Field edges reach 3:1** (WCAG 1.4.11) against every surface they sit on: public `--field` `#647183`,
    CMS `--input` light `#7F8896`, dark `#6B7787` (owner-approved, K-113). IN CODE.
12. **The visible words name the control.** No `aria-label` that differs from visible text (WCAG 2.5.3);
    text hidden at small widths or in the icon rail is `sr-only`, never `display: none`, or the control loses
    its name (K-114, K-118). IN CODE.

## Honest content

- Public pages use real projects only. A named client needs stored written consent (`server/work.php`).
- Missing owner facts render as the labelled `.gap` marker, for example
  `[VAT basis to supply: ...]`; never invent a number, price, claim or portrait.
- Status labels are the owner's: Live, In build, Demo. Vitalcare stays **Live with its existing
  screenshot** while vitalcare.uk shows a rebuild page (owner, 31 Oct 2026).
- Prototypes and boards use example clients, labelled "Example data".

## AI on screen

GAkinzOS has three AI uses and no others: the AI draft (Enquiries, Support, Comms, Quotes), the Today brief,
and Content Hub. Every AI block is labelled, says what it was written from, and is edited by a person before
it goes anywhere. The model is set on the server; there is no model picker, memory, prompt library or
confidence score. With no OpenRouter key the feature is hidden, not broken. Do not draw AI features the
product does not have.

## Motion

Public only, GSAP loaded at idle for visitors who allow motion (D-051). Content is complete without
JavaScript (`.rise` is visible at rest). Allowed moments: the hero swap as one timeline (outgoing text leaves
through a mask before the incoming enters), Flip on the /work filters, entrances below the fold only. In
GAkinzOS only 150 to 300ms state changes. When animating with GSAP, clear only what you animated
(`clearProps: "opacity,transform"`); `clearProps: "all"` deletes inline layout styles.

## Verify before claiming anything

Run in this order and report with DONE / PARTIAL / NOT TESTED / BLOCKED. Full commands in
[references/verification.md](references/verification.md).

1. `npm run build`, `npm test`, `npm run lint:ratchet`, `npm run docs:check`.
2. Serve the build on loopback with **no proxy to the live API** (`vite preview` inherits the dev proxy to
   gakinz.com; use a static server or set `preview.proxy` to `{}`). Development calls the live API.
3. `shots.mjs --axe` on every route at 390, 834, 1440, 1920 and 2560; zero overflow, errors and violations.
4. Look at contact sheets of every width (`scripts/sheet.py`); rows even, nothing clipped, no word-per-line
   titles, no empty bands. axe cannot see these.
5. Audit states axe does not reach by default: dark theme on every CMS screen, open dialogs, drawers and
   popovers, and every hero slide.
6. Measure every new colour pair with `contrast.py` (4.5:1 text, 3:1 large text, UI and field edges).
7. Signed-in screens: build without the Clerk key and stub `fetch` with labelled sample data; never sign in
   to the live system to test.

## Screenshots of the work

`scripts/capture.mjs` takes the first screen of each live site at 1440×900 (saved 1200×750) and 390×844 as
WebP, picks the most private option on cookie notices in a throwaway session, scrolls once to trigger
reveal content, and hides only banners caused by the headless browser itself. Look at every capture before
using it. Files live in `public/images/work/<slug>-d.webp` and `-m.webp`.
