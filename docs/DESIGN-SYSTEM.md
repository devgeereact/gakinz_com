# Design system

**Status:** current as of release `fdc5d94` (2026-10-31): the D-046 design with the D-053 finalisation,
live on gakinz.com. The code is the authority: `src/marketing/site.css` for the public site,
`src/index.css` for GAkinzOS (and for the Tailwind token map), `src/components/ui/*` and
`src/app/components/page-kit.tsx` for components. If this document and the code disagree, the code wins
and this document is corrected in the same change.

How to work on the design (method, layout rules, findings, verification routine): the project skill
`.claude/skills/gakinz-design/`. This document holds the values; the skill holds the working rules.

**History.** The September system (D-023) and the Mastercard-based D-037 system, with its preserved
third-party reference, were retired on 2026-11-01 (D-044): read them with
`git show ee1281f:docs/DESIGN-SYSTEM.md` and `git show ee1281f:docs/DESIGN-REFERENCE-MASTERCARD.md`.
The one rule kept from that period: no Mastercard name, logo, colour pair or circles anywhere.

## 1. Two surfaces

| Surface | Where | Theme | Scope |
|---|---|---|---|
| Public site | `/`, `src/marketing/` | Graphite only; ignores the OS theme | `.gk-site` |
| GAkinzOS | `/app/*`, `/login`, `src/app/` | Light and dark through `next-themes`; sidebar graphite in both | `:root`, `.dark` |
| Proposal share page | `/p/:token`, `ProposalView.tsx` | The older cream palette | `.gk-public` in `src/index.css` |

Shared families, self-hosted with `@fontsource-variable` and never fetched from a third party: Bricolage
Grotesque (display), Hanken Grotesk (text and controls), JetBrains Mono (figures, references, dates).

## 2. Tokens, with measured contrast

Measured with `~/.claude/skills/product-design/scripts/contrast.py` (WCAG 2.x: 4.5:1 text, 3:1 large text,
UI parts and field edges). A new token needs its ratio recorded here and as a comment beside it.

### Public site (`.gk-site` in `site.css`)

| Token | Value | Role | Measured |
|---|---|---|---|
| `--bg` | `#0F151D` | Page canvas | n/a |
| `--bg-2` | `#121A24` | Field fill, sector tiles | n/a |
| `--panel` | `#16202B` | Cards, bands, facts | n/a |
| `--panel-2` | `#1B2733` | Raised panel | n/a |
| `--fg` | `#ECE9E2` | Chalk text | 15.12:1 on bg, 13.58:1 on panel |
| `--mute` | `#9AA3B0` | Secondary text | 7.19:1 on bg, 6.46:1 on panel |
| `--acc` | `#8EC5FF` | Sky: links, focus, eyebrow dot | 10.11:1 on bg, 9.08:1 on panel |
| `--acc-ink` | `#0B2340` | Text on sky fills | 8.72:1 on sky |
| `--ok` | `#7FD6A5` | Live pill, sent state | 9.46:1 on panel |
| `--warn` | `#F2C46B` | In build, `.gap` marker | 10.10:1 on panel |
| error text | `#FFA3A3` | Field errors | 8.64:1 on panel |
| `--line` | `#26313E` | Hairlines (decoration only) | n/a |
| `--line-2` | `#334252` | Decorative outlines, chips | n/a (not a field edge) |
| `--field` | `#647183` | Input, select and textarea borders (K-113) | 3.69:1 on bg, 3.53:1 on bg-2 |

The main call to action is graphite `#0F151D` on chalk `#ECE9E2` (15.12:1) in the header and the hero,
whatever the project colour.

### Project colours (`showcase.ts`)

Text on a project colour is whichever of white and `#16120A` measures higher (`onColour`), at full
opacity; the current page in the header is marked with an underline, never a tint (K-115).

| Project | Colour | Text chosen |
|---|---|---|
| RotaFlow | `#2C5AC4` | white 6.24:1 |
| RitaGreen | `#33512D` | white 8.91:1 |
| Vitalcare | `#1B2E6B` | white 12.73:1 |
| Harni | `#FF385C` | `#16120A` 5.31:1 (white 3.52:1) |
| Volume | `#EBB241` | `#16120A` 9.76:1 |
| Priya's Kitchen | `#4F2149` | white 12.76:1 |
| Dhemmyn Food | `#B0283F` | white 6.52:1 |
| Okafor Joinery | `#25282B` | white 14.82:1 |
| Herit Clothing | `#F59E0B` | `#16120A` 8.69:1 |
| MimmyCare | `#2E3A33` | white 11.87:1 |
| EGO LIMITED | `#2C2C2A` | white 13.99:1 |
| GAkinzOS | `#16202B` | white 16.46:1 |

### GAkinzOS (`src/index.css`, HSL triplets for the shadcn names)

| Role | Light | Dark | Token | Measured |
|---|---|---|---|---|
| Canvas | `#F4F5F7` | `#0F151D` | `--background` | n/a |
| Surface | `#FFFFFF` | `#16202B` | `--card`, `--popover` | n/a |
| Surface 2 | `#F8F9FB` | `#1B2733` | `--secondary`, `--muted` | n/a |
| Ink | `#121821` | `#ECE9E2` | `--foreground`, `--primary` | 16.34:1 light; 13.58:1 dark on surface |
| Muted text | `#5B6472` | `#9AA3B0` | `--muted-foreground` | 5.48:1 on canvas, 5.98:1 on white; 6.46:1 dark on surface |
| Accent | `#2866CA` | `#8EC5FF` | `--ring`, `--os-acc` | 5.01:1 on canvas, 4.68:1 on accent soft; 9.08:1 dark |
| Accent soft | `#E6EEFB` | `#1C2E44` | `--accent`, `--os-acc-soft` | dark accent 7.60:1 on it |
| OK / soft | `#1A774D` / `#E3F3EA` | `#7FD6A5` / `#173326` | `--os-ok*` | 4.82:1; 7.84:1 |
| Warn / soft | `#8F5B00` / `#FBF0DA` | `#F2C46B` / `#3A2F17` | `--os-warn*` | 5.07:1; 8.06:1 |
| Bad / soft | `#B8322C` / `#FBE7E5` | `#FF9C95` / `#3B1E1D` | `--os-bad*`, `--destructive` | 5.00:1; 7.51:1 |
| Line | `#E2E5EA` | `#26313E` | `--border` | decoration only |
| Field edge | `#7F8896` | `#6B7787` | `--input` (K-113) | 3.28 to 3.58:1 light; 3.33 to 4.03:1 dark |
| Strong outline | `#CDD2DA` | `#334252` | `--os-line-2` (`line-strong`) | decoration and hover |
| Sidebar | `#0F151D` | `#0B1017` | `--sidebar-background` | chalk 15.12:1 / 15.74:1 |
| Sidebar muted | `#8C96A4` | same | `--os-side-mute` | 6.12:1 / 6.37:1 |
| Sidebar active bar | `#8EC5FF` | same | `--sidebar-primary` | n/a |

### Tailwind v4 token map (D-062)

Tailwind v4 reads its tokens from CSS, so `src/index.css` is the only place a token is declared; `tailwind.config.js` is gone.

| Block | What it holds | Why |
|---|---|---|
| `:root`, `.dark` (and `.gk-public`) | The shadcn HSL variables, `--radius`, `--os-*`, `--sidebar-*` | The single source of every CMS colour, radius and shadow |
| `@theme inline` | `--color-*` for each shadcn name (`background`, `card`, `primary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-1..5`, `sidebar*`, `acc`, `ok`, `warn`, `bad`, `line`), `--radius-lg/md/sm` and `--shadow-os`, each one `hsl(var(--name))` or `var(--name)` | `inline` keeps the `var()` in the generated CSS, so a utility reads the variable where the element sits (the `.dark` class and the nested `.gk-public` palette keep working). A plain `@theme` would freeze the value at `:root` |
| `@theme` | The type scale (`label`, `body`, `lede`, `t4` to `t1`, `display`, `hero`), v3 fixed line heights for `xs` to `4xl`, the font stacks, `--radius-action/media`, `--shadow-float/lifted`, the public palette `gk-*` (hex) | Values with no variable behind them |
| `@custom-variant dark` | `&:is(.dark *)` | next-themes sets the `.dark` class |

Rules: add a CMS token to its variable and to `@theme inline` together; a new literal goes in `@theme`. Preflight is on, with three v3 defaults restored in `@layer base` (border colour `gray-200` on pseudo-elements, pointer cursor on buttons, textfield appearance on search inputs). Animation utilities (`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-*`) come from `tw-animate-css`. Browser floor: Chrome 111, Safari 16.4, Firefox 128 (Tailwind v4).

## 3. Type, spacing, shape, motion

| Use | Face | Size and weight |
|---|---|---|
| Public display | Bricolage | `clamp(2.6rem,6vw,5.4rem)`, 720, −0.04em, line 0.97 |
| Public hero | Bricolage | `clamp(2.5rem,5.4vw,5rem)`, 720, −0.045em |
| Public section | Bricolage | `clamp(2.1rem,4.4vw,3.6rem)`, 650 |
| Public body | Hanken | 17px, line 1.55; ledes `clamp(1.08rem,1.5vw,1.3rem)` muted |
| CMS page title | Bricolage | `clamp(1.7rem,2.6vw,2.2rem)`, 650 (`PageHeader`) |
| CMS body | Hanken | 15px |
| CMS figures | Bricolage 700, tabular | 1.9rem (`StatTile`) |
| Data labels | JetBrains Mono | 10.5 to 12px |

- Spacing 4, 8, 12, 16, 24, 32, 48, 64, 96, 128; public sections `clamp(72px,10vw,136px)` tall.
- Radii: CMS controls 10px, popovers 14px, cards 16px; public buttons pill, cards 20px, bands 28px.
- Shadow: CMS `--os-shadow` for overlays only; public cards lift on hover.
- Targets: public controls 44px; CMS buttons 40px (`sm` 36px), sidebar rows 40px.
- Breakpoints: public 1100 / 860 / 560; CMS icon rail below 1024px, drawer below 768px, content column
  centred and capped at 1760px.
- Motion: ease `cubic-bezier(.2,.8,.2,1)`. Public: GSAP and Lenis loaded at idle for visitors who allow motion
  (D-051), entrances below the fold only (`.rise` visible at rest), the hero word swapped through an
  `overflow:hidden` mask with the outgoing word leaving first. GAkinzOS: 150 to 300ms state changes only.

## 4. Public site patterns (`site-ui.tsx`, `site.css`)

| Pattern | Code | Rule |
|---|---|---|
| Card grid | `WorkGrid`, `useBalancedGrid` (`site-helpers.ts`) | Six tracks; a short last row is given to the top as `card--half` or `card--full`; never a lone card |
| Card without screenshots | `ProjectCard` | Media lists what was built |
| Page header | `PageHead` with `rail` | A fact rail of computed figures, never typed |
| Section head with one child | `.sec__head--solo` | Title and a count on one row |
| Process steps | `.steps` | Five across; a numbered list below 1100px |
| Pricing | `.plans`, `.plan` | `grid-template-rows: subgrid`; lists `align-content: start` |
| Case study without screenshots | `.spec` in `WorkDetail.tsx` | What was built, status, kind, sector, stack |
| About without a portrait | `.desk` in `About.tsx` | The work as a mosaic, up to twelve, in full rows |
| Home hero | `Home.tsx` | Up to five published Work records in their colours; pause, previous, next, arrow keys |
| Selected work | `selectedWork` in `showcase.ts` | RitaGreen, EGO LIMITED, RotaFlow, Harni, Herit Clothing, topped up from the rest |
| Missing owner fact | `.gap` | A labelled marker, never an invented value |

Work screenshots: `public/images/work/<slug>-d.webp` (1200×750) and `-m.webp` (390×844), taken from the live
sites with the skill's `capture.mjs`.

## 5. GAkinzOS

- **Shell** (`AppLayout.tsx`, `app-sidebar.tsx`, `nav-main.tsx`): graphite sidebar with folding groups
  (remembered under `gkos-groups`), 40px rows, the sky active bar, count pills; icon rail below 1024px with
  labels kept for screen readers (`sr-only`, K-118); drawer below 768px. Sticky 64px header: menu toggle,
  search (Ctrl K), London clock, notifications, theme toggle, account menu.
- **Components** (`src/components/ui`): buttons 40px (never wrap; rows of buttons wrap), 24px badge pills with
  a dot and `ok`, `warn`, `bad`, `acc` tones, 42px inputs with a 3px focus ring, mono uppercase table heads,
  underline tabs.
- **Page kit** (`page-kit.tsx`): `PageHeader` (title, purpose, actions, primary first), `StatGrid`,
  `StatTile`, `StatusBadge`. A new screen uses the kit.
- **Records:** lists of records are rows, not card grids (Projects: a five-part stage bar and record rows).
  An empty screen has one primary action.
- **Sign-in** (`AuthFrame.tsx`, `ClerkSession.tsx`): a graphite panel with the mark, the strip and the London
  clock beside the form; Clerk's form drawn with these tokens through `appearance` (variables and element
  keys, never `.cl-*` selectors), its own card and footer panel removed.
- **AI blocks:** labelled, saying what they were written from, edited by a person before use.

## 6. Open design questions

- J1: many sections use the same small label, big heading and grey lede formula.
- J2: mono capitals on most labels; mono could be kept for data only.
