# Findings register

Every item was seen in a browser or measured on a rendered page. "Code" is the state of `main`.
Update this file when an item is built, so the next session does not redo the audit.

## Found on gakinz.com (live, read-only, 31 Oct 2026)

| ID | Finding | Evidence | Prototype | Code |
|---|---|---|---|---|
| P1 | Hero text overlaps while it changes | Outgoing word visible under the incoming one at 1440px | Fixed | Open |
| P2 | Lone card in Selected work | 1050 and 700px: rows 2+2+1, last row 49% | Fixed | Open |
| P3 | Process steps break 3+2 | `/`, `/services` at 1050 and 700px | Fixed | Open |
| P4 | Lone cards on /work filters | Own products, Live, Demos at two columns | Fixed | Open |
| P5 | Empty right half of page headers | `/work`, `/services`, `/pricing`, `/contact`: 42% of width used | Fixed | Open |
| P6 | Section head with an empty column | `/services`, service pages: 65% used, 1 of 2 children | Fixed | Open |
| P7 | Pricing lists stretch; Bespoke price 27px higher | Row heights 44px for 22px text up to 77px for 48px | Fixed | Open |
| P8 | "Portrait to come" circle; email link cramped | `/about` at 1440px | Fixed | Open |
| P9 | 1248×535 slab repeating the name | `/work/ego`, `/work/gakinzos` | Fixed (EGO now has screenshots) | Open |
| C1 | Stock Clerk card on graphite; ~3s blank first | `/login`; no `appearance` anywhere in `src/` | Fixed | Open |
| C2 | Project stage tiles break 3+2 on phones | Local build with synthetic data, 600px | Fixed | Open |
| C3 | Two identical "New project" buttons on the empty screen | Local build, empty state | Planned | Open |
| N3 | `vite preview` proxies `.php` to the live API | One read with a fake token reached gakinz.com (401). Set `preview.proxy` to `{}` | n/a | Open |
| F2 | Logo links' accessible names do not match their visible text (WCAG 2.5.3, axe `label-content-name-mismatch`) | Public `.brand` ("GAkinz, home") on every page; sign-in frame link ("GAkinz home", visible "GAkinzOS"). axe-core 4.14.0 on the built `main`, 31 Oct 2026. Older axe 4.10.2 did not flag it | Same markup | Open |
| F3 | White text on Harni's pink in the case-study header | `/work/harni` at 1440, 1920, 2560: nav `Work` link (`.active`) fails contrast. `onColour` in `showcase.ts` uses a brightness threshold (white 3.52:1; ink would be 5.07:1) | Fixed (measured rule) | Open |
| F1 | Field borders below 3:1 (WCAG 1.4.11) | `#334252` on `#0F151D` 1.78:1; `#CDD2DA` on white 1.52:1 | Not applied | Open, values approved 31 Oct 2026 |

## Found while verifying the prototype (traps to avoid when building)

| Trap | What happened | Rule |
|---|---|---|
| Image height attribute | Cards ~1000px tall, screenshots cropped at the sides | `height: auto` on any `<img>` with width/height attributes outside Tailwind's base |
| Brightness threshold for on-colour text | White chosen on Harni pink: 3.52:1 | Compare measured ratios |
| Opacity on coloured surfaces | Nav links at 85% on pink failed; "Next project" label failed | Full opacity over project colour |
| Project colour as button text | Computed background drifted; failed on light colours | Graphite on chalk |
| `clearProps: "all"` | Deleted inline grid columns; Today tiles stacked to one column | Clear only animated properties |
| Two elements with `id="main"` | App lookups hit the hidden site's main | One id per document |
| Class name clashes | `.sr` (sr-only vs search box), `.rail` (fact rail vs sidebar mode), `.mono` caps | Namespace classes per surface |
| `1fr` in a forced single column | Dev Pipeline 316px off screen at 390px | `minmax(0, 1fr)` |
| sr-only labels inside a scroll region | Page widened 93 to 130px | `position: relative` on the region |
| Dialog closes before reading its fields | Eight dialogs saved empty values | Hide now, remove next tick |
| Client role landing not in the access map | Redirect to the same hash never re-rendered | Client may open only portal and My account; render when redirecting to the current route |
| Wrapper class that implies a grid | Sign-in squashed into a 232px column | Scope layout classes; check every route at every width |

## Judgement items (owner to decide)

- J1: Every section uses the same small label, big heading, grey lede formula. Vary compositions; keep
  labels that carry a fact (a count), drop ones that repeat the heading.
- J2: Mono capitals on almost every label. Keep mono for data (figures, references, dates).

## Owner decisions recorded

- 31 Oct 2026: Selected work = RitaGreen, EGO LIMITED, RotaFlow, Harni, Herit Clothing.
- 31 Oct 2026: field-edge colours approved (K-113); Google sign-in stays on (K-117).
- 31 Oct 2026: Vitalcare stays Live with its existing screenshot while vitalcare.uk shows a rebuild page.
