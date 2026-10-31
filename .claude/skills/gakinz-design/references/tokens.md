# Tokens, with measured ratios

Every ratio below was measured with `~/.claude/skills/product-design/scripts/contrast.py` on 31 Oct 2026
(WCAG 2.x: 4.5:1 body text, 3:1 large text, UI parts and field edges). Values are read from the code: if
the code changes, re-measure and update this file in the same change.

## Public site (`src/marketing/site.css`, on `.gk-site`)

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
| `--line-2` | `#334252` | Control and **field** borders | **1.78:1 on bg: fails 1.4.11** |

**APPROVED field edge (owner, 31 Oct 2026):** `#647183`, 3.69:1 on bg, 3.53:1 on bg-2, 3.32:1 on panel. Use it for input,
select and textarea borders only; keep `--line-2` for decorative outlines.

Main call to action: graphite `#0F151D` on chalk `#ECE9E2`, 15.12:1 (PROTOTYPE rule; see SKILL.md rule 5).

### Project colours (`showcase.ts`)

Text on a project colour is whichever of white or ink `#121821` measures higher, at full opacity.

| Project | Colour | Text that passes |
|---|---|---|
| RotaFlow | `#2C5AC4` | white 6.24:1 |
| RitaGreen | `#33512D` | white, chalk 7.35:1 |
| Harni | `#FF385C` | **ink 5.07:1** (white is 3.52:1 and fails) |
| Volume | `#EBB241` | ink 9.32:1 (white 1.91:1) |
| Herit Clothing | `#F59E0B` | ink 8.30:1 (white 2.15:1) |

## GAkinzOS (`src/index.css`, HSL triplets for the shadcn names)

| Role | Light | Dark | Token | Measured |
|---|---|---|---|---|
| Canvas | `#F4F5F7` | `#0F151D` | `--background` | n/a |
| Surface | `#FFFFFF` | `#16202B` | `--card`, `--popover` | n/a |
| Surface 2 | `#F8F9FB` | `#1B2733` | `--secondary`, `--muted` | n/a |
| Ink | `#121821` | `#ECE9E2` | `--foreground`, `--primary` | 16.34:1 light; 13.58:1 dark on surface |
| Muted text | `#5B6472` | `#9AA3B0` | `--muted-foreground` | 5.48:1 on canvas, 5.98:1 on white; 6.46:1 dark on surface, 5.95:1 on surface 2 |
| Accent | `#2866CA` | `#8EC5FF` | `--ring`, `--os-acc` | 5.01:1 on canvas, 4.68:1 on accent soft; 9.08:1 dark on surface |
| Accent soft | `#E6EEFB` | `#1C2E44` | `--accent`, `--os-acc-soft` | dark accent text 7.60:1 on it |
| OK / soft | `#1A774D` / `#E3F3EA` | `#7FD6A5` / `#173326` | `--os-ok*` | 4.82:1; 7.84:1 |
| Warn / soft | `#8F5B00` / `#FBF0DA` | `#F2C46B` / `#3A2F17` | `--os-warn*` | 5.07:1; 8.06:1 |
| Bad / soft | `#B8322C` / `#FBE7E5` | `#FF9C95` / `#3B1E1D` | `--os-bad*`, `--destructive` | 5.00:1; 7.51:1 |
| Line | `#E2E5EA` | `#26313E` | `--border` | decoration only |
| Field edge | `#CDD2DA` | `#334252` | `--input`, `--os-line-2` | **1.52:1 on white; 1.78:1 dark: fail 1.4.11** |
| Sidebar | `#0F151D` | `#0B1017` | `--sidebar-background` | chalk 15.12:1 / 15.74:1 |
| Sidebar muted | `#8C96A4` | same | `--os-side-mute` | 6.12:1 / 6.37:1 (group headings) |
| Sidebar active bar | `#8EC5FF` | same | `--sidebar-primary` | n/a |

**APPROVED field edges (owner, 31 Oct 2026):** light `#7F8896` (3.58:1 on white, 3.40:1 on surface 2, 3.28:1 on canvas); dark
`#6B7787` (4.03:1 on canvas, 3.62:1 on surface, 3.33:1 on surface 2). Being built.

## Type

| Use | Face | Size and weight |
|---|---|---|
| Public display | Bricolage Grotesque | `clamp(2.6rem,6vw,5.4rem)`, 720, tracking −0.04em, line 0.97 |
| Public hero | Bricolage | `clamp(2.5rem,5.4vw,5rem)`, 720, −0.045em |
| Public section | Bricolage | `clamp(2.1rem,4.4vw,3.6rem)`, 650 |
| Public body | Hanken Grotesk | 17px, line 1.55; ledes `clamp(1.08rem,1.5vw,1.3rem)` in muted |
| CMS page title | Bricolage | `clamp(1.7rem,2.6vw,2.2rem)`, 650 (PageHeader) |
| CMS body | Hanken | 15px |
| CMS figures | Bricolage 700, tabular | 1.9rem tiles (`StatTile`) |
| Labels that are data | JetBrains Mono | 10.5 to 12px; references, dates, money, counts |

Mono capitals are for data, not for every label (design judgement J2, not yet applied).

## Spacing, shape, depth, motion

- Spacing: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Public sections `clamp(72px,10vw,136px)` tall.
- Radii: CMS controls 10px, popovers 14px, cards 16px; public buttons pill, cards 20px, bands 28px.
- Shadow: CMS `--os-shadow` for overlays only; cards are flat with a hairline. Public cards lift on hover.
- Targets: 44px public controls; CMS buttons 40px (`sm` 36px), sidebar rows 40px.
- Motion: ease `cubic-bezier(.2,.8,.2,1)`; CMS 150 to 300ms; public scene changes up to 550ms.
- Breakpoints: public 1100 / 860 / 560 (media queries); CMS sidebar to icon rail below 1024px, drawer below
  768px.
