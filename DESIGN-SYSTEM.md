> ## SUPERSEDED — historical document, do not build from this
>
> This document specified the "Forest Editorial" green and cream direction. It was
> **implemented in June 2026 and then replaced the same month** by the mono and duo rebrand
> (commit `d9b27a2`, "Full palette + typography swap, replaces Forest Editorial").
>
> **The implemented design system is `docs/DESIGN-SYSTEM.md`.** Read that before touching any
> styling. The decision record, including what survived this document and what did not, is
> `docs/DECISIONS.md` entry D-006.
>
> This file is kept because it explains why several global interface details exist: the custom
> focus ring, branded selection, themed scrollbars, the radius ladder, the motion baseline and
> the themed empty states are all still live. Its colour and typography tables are not.
>
> Nothing below has been altered. The banner is the only addition.

---

# GAkinz Design System — "Forest Editorial"

> **The rebrand contract.** This is the single source of truth for the GAkinz UI rebrand
> (gakinz.com — marketing site + GAkinzOS CMS). Read this before touching any styling.
> Premium lives in the *system* — the ladder, spacing, motion, restraint — not the palette.
> Token names below are the contract; map them into `src/index.css` (`:root` / `.dark` /
> `.gk-public`) and reference via `hsl(var(--token))` (Tailwind v3, per CLAUDE.md).

---

## 0. North star

**Editorial-Tech hybrid, editorial-led.** One brand, two tempos:

- **Marketing site** → quiet editorial luxury (Aesop / Kinfolk energy: space, Caudex
  display, calm, slow fade motion). Sells.
- **CMS / GAkinzOS** → same skin, tightened to premium-tech density (Linear-grade polish,
  faster motion, dense tables). Works.

Decisions are locked. We do NOT: keep violet, ship two codebases, default marketing to dark,
or use more than one accent color.

---

## 1. Theme architecture — two skins, one token set

Forest green is **THE dark skin**. A light counterpart (cream bg, green ink) is derived from
the same token names.

| Surface | Skin | Default |
|---|---|---|
| Marketing site (`.gk-public`) | **Light** (cream/sage) | Dark green used only for accent sections: hero band, CTA band, footer |
| CMS (`/app`) | **Dark** (forest) | Light mode available via existing `.dark` toggle inverse |

One set of design tokens, two value maps. Not two codebases.

---

## 2. Color tokens

### Dark skin (forest — CMS default, marketing accent bands)

| Token | Hex | Role |
|---|---|---|
| `--bg-base` | `#21291F` | Page floor (deeper than source swatch) |
| `--bg-raised` | `#2D3A2F` | Raised sections (source swatch "Background") |
| `--surface` | `#38473A` | Cards |
| `--surface-hi` | `#43543F` | Card hover / active |
| `--border-sub` | `#4A4A44` @ 40% | Hairline borders |
| `--border-str` | `#605E58` | Strong borders (source "Border") |
| `--ink` | `#F2EEDF` | Body text (brighter than cream → passes contrast) |
| `--ink-cream` | `#E8E0C9` | Headings / Caudex only (source "Text") |
| `--primary` | `#5A6B4A` | Sage — quiet/secondary UI (source "Primary") |
| `--accent` | `#A8C090` | THE action color, one job per screen (source "Accent") |
| `--accent-hi` | `#BBD6A0` | Brighter pop for primary CTAs / focus glow |

### Light skin (cream — marketing default)

| Token | Hex | Role |
|---|---|---|
| `--bg-base` | `#F4F1E8` | Cream page floor |
| `--bg-raised` | `#FBF9F2` | Raised cards |
| `--surface` | `#FFFFFF` | Card top surface |
| `--ink` | `#2D3A2F` | Forest green body text |
| `--ink-strong` | `#21291F` | Headings |
| `--primary` | `#5A6B4A` | Sage — links, secondary |
| `--accent` | `#3E5232` | Deepened sage for AA contrast on cream |
| `--border` | `#DAD5C4` | Warm hairline |

> Cream is **demoted to headings/accents** in dark; body uses brighter `--ink`. Fixes the
> borderline cream-on-green contrast.

### Color rules

1. **Stepped ladder, never flat.** Cards must lift off the page via the elevation steps above.
2. **One accent, one job.** `--accent` (light sage) = the single most important action per
   screen (primary button, active nav, key link, focus ring). `--primary` (sage) =
   secondary/quiet. Everything else is greyscale-green.
3. **Contrast is non-negotiable.** Body text passes WCAG AA. Re-run axe after the rebrand
   (per CLAUDE.md a11y pass).

---

## 3. Typography

| Family | Use | Weights |
|---|---|---|
| **Caudex** (serif) | Display + headlines ONLY. Large, tracking `-0.02em`, generous line-height. | 400 / 700 |
| **Manrope** (sans) | Body + all UI | 400 / 500 / 700 |
| **JetBrains Mono / Fira Code** | Data, code, numeric tables (CMS) | 400 / 500 |

**Modular scale — ratio 1.25.** No off-scale sizes anywhere:

`13 · 14 · 16 · 20 · 25 · 31 · 39 · 49 · 61` (px)

- 13/14 → captions, labels, dense table cells
- 16 → body default
- 20/25 → subheads
- 31/39/49/61 → Caudex display

---

## 4. Spacing & layout

**One spacing scale (px), no magic numbers:** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`

| Context | Container | Gutters | Vertical rhythm |
|---|---|---|---|
| Marketing | max **1200px** | fat side gutters | 96px between sections (breathe) |
| CMS | fluid | 24px | 16px card padding (dense, tighter steps) |

**Radius:** `8` inputs · `12` cards · `16` modals / hero. Consistent everywhere.

Whitespace = the luxury signal. Calm density on marketing; controlled density in CMS.

---

## 5. Motion

| Context | Spec |
|---|---|
| Standard | 200ms ease-out on every hover / focus / state change |
| Marketing | Slow fade-up section entrances, 400–600ms (keep `.gk-fadein`, CSS-driven, never JS-gated per CLAUDE.md) |
| CMS | Fast micro-feedback 150ms; card lift on hover; no slow stuff (workspace = snappy) |
| Focus | Custom **accent glow** ring (`--accent-hi`), never browser default |

Nothing snaps. Everything glides. Motion = perceived quality.

---

## 6. Material & depth

- 6-step green **elevation ladder** (see color tokens) — every card lifts.
- Soft, layered shadows: low-opacity, large-blur. Never harsh.
- One subtle **film grain / noise** texture over forest dark sections so green isn't dead-flat.
- **Hairline** borders (`--border-sub` at low opacity), not solid slabs.

---

## 7. Signature move (originality)

So it reads as *ours*, not "another dark-green template":

1. **Caudex display headlines** — big, with one **accent word** + a thin `--accent` underline flourish.
2. **Organic grain** over forest dark sections (hero band, CTA band, footer).
3. **Asymmetric editorial hero** on marketing (not center-everything).
4. Recurring **leaf / organic line motif** pulled from the icon set as section dividers.

Forest + serif + grain + editorial-asymmetry = a combination nobody else ships.

---

## 8. Detail checklist (the 1%)

- [ ] Custom accent focus rings (no browser default)
- [ ] Consistent radius system (8 / 12 / 16)
- [ ] One icon set, one weight (current line icons — keep)
- [ ] Themed empty states, loading skeletons, toasts
- [ ] Aligned numeric tables, consistent number formatting (CMS)
- [ ] Themed scrollbars, selection color, placeholder color

---

## 9. Rollout order

1. **Tokens first** — rewrite `src/index.css` `:root` / `.dark` / `.gk-public` to the
   two-skin values above. Everything inherits.
2. **Primitives** — buttons, cards, inputs, nav, focus rings, shadows, radius.
3. **Marketing** — light skin, hero signature, CtaBand, footer.
4. **CMS** — dark skin, dashboard / tables / modals, density pass.
5. **Polish** — motion, grain, empty / loading / toast states, a11y contrast re-check.

> Fonts wire in `tailwind.config.js` (the active config is `.js`, not `.ts` — per CLAUDE.md).
> Build/deploy unchanged: `tsc -b && vite build` → `dist/` → FTP on push.

---

## 10. Risk

The riskiest assumption: that we do the **system** work, not just swap colors. If the team
shortcuts to "recolor only," it ships looking like a template and the rebrand is wasted.
Premium is the boring system work — the ladder, spacing, motion, states — not the palette.
