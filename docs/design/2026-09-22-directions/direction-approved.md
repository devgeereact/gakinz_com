# Direction approved: public site relaunch

**Date:** 2026-09-22
**Decided by:** Gideon Akinlotan (repository owner)
**Applies to:** the public marketing surface at `/`, source in `src/marketing/`.
**Does not apply to:** GAkinzOS at `/app/*`, which keeps its current tokens unless a
separate decision changes them.

---

## What was shown

Three directions were produced independently from one shared spec
([SPEC.md](SPEC.md)), each by a different design logic, each as a standalone HTML page
rendered at 1440×900 and reviewed against its own screenshot before hand-back.

| Direction | Logic | File | Screenshot |
|---|---|---|---|
| A | Style roulette, landed on Neo-Brutalist information flow (The Verge 2022 lineage) | [A-neobrutalist-feed.html](A-neobrutalist-feed.html) | `A.png`, 1440×5909 |
| B | Real-world benchmark migration: Zak Group, London, verified live at zak.group | [B-benchmark.html](B-benchmark.html) | `B.png`, 1440×4532 |
| C | Best-fit practice: Pentagram's London typographic and information-design tradition, chosen over Collins and Kenya Hara | [C-designer.html](C-designer.html) | `C.png`, 1440×4847 |

## The decision

**C, with A's colour confidence carried into the work records.**

Selected from a four-option choice in which this hybrid was the recommended option.
It was recommended, and chosen, over taking C, A or B unchanged.

What that resolves to:

| Element | Source | Detail |
|---|---|---|
| Overall structure | C | The page is a document, not a landing page |
| Navigation | C | A contents list on the first screen, not a horizontal nav bar |
| Work section | C | A ruled ledger of records |
| Work row labels | C | Labels change with record kind: `PROBLEM / BUILT / OUTCOME` for a case study becomes `QUESTION / MADE / LEARNED` for an experiment |
| Kind spines | **A** | Navy and vermilion vertical spines on the left edge of each record, to give the ledger the edge C lacked |
| Typography | C | Newsreader display over Instrument Sans, IBM Plex Mono confined to record data. Nine-value perfect-fourth scale |
| Paper and ink | C | Warm paper `#F6F3ED`, warm ink `#1C1A16` |
| Chromatics | C, reconciled with A | Blue-black `#2A3160` for what is set; red oxide `#933C2F` for what is still to come |

The two chromatics keep a semantic job rather than being decoration: one marks settled
content, the other marks a gap awaiting real material. That convention is part of the
direction and should survive into implementation.

## What this decision also settles

**The lavender `#7F77DD` and rose `#D4537E` are retired from the public surface.** All
three directions independently derived new inks from them rather than using them, and
direction A stated the reason: both are too light to hold a flat block or white text,
which is why the previous site could only ever wash them into a gradient. Accepting
this direction is accepting a rebrand of the public surface.

The animated indigo-to-lavender-to-rose gradient (`src/index.css:677-693`) does not
survive. Nor does the aurora backdrop applied to every page hero
(`src/marketing/components/primitives.tsx:236-240`).

## Convergence, recorded honestly

B and C converged further than the exercise intended. Both derived a warm paper, an
ink, a blue and a red oxide from the same two retired brand colours, and both structured
the work as a document index. They were two dialects rather than two languages. A was
the genuine alternative, and the chosen hybrid draws from both families rather than
from one.

## Standing caveat

Every image slot in all three directions is an empty labelled frame. No portrait of the
subject and no screenshots of real work were available when these were made, and neither
a stock photograph of a stranger nor an invented client was substituted. What was judged
here is skeleton, structure and typography. Real photography will change the balance
between the sections and may warrant revisiting proportions: not the direction, but the
composition within it.
