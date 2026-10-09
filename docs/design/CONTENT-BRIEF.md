# Design spec: gakinz.com home page, three directions

Shared, single input for three independent design logics. Each logic produces one
standalone HTML page. Same content, same viewport, three genuinely different
design philosophies.

## 1. What this is

gakinz.com is the personal site of **Gideon Akinlotan**, a designer and developer
based in London. It is studio-backed: the studio entity is **GAkinz**, and a private
CMS called GAkinzOS lives behind `/app` on the same domain. The public site is the
subject here. The CMS is out of scope and must not appear in the design.

The owner has decided the site leads with the person, not the company. First person
singular. The studio is named where a team genuinely does the work, and nowhere else.
This is a relaunch of an existing site that currently reads as templated, so the
brief is explicitly to produce something that does not look machine-generated.

## 2. Audience and situation

Two readers, in this order of priority.

**A prospective client**, typically a founder, marketing lead or practice manager at
a small to mid-sized UK business. They arrived from a referral or a search. They are
deciding in about forty seconds whether this person is credible enough to email. They
want evidence, not adjectives. They are not technical and do not care about the stack.

**A peer or collaborator**, another designer, developer or potential partner. They
scan the work and the writing and form a judgment about taste. They are the harshest
audience for anything that looks templated.

Both read on a laptop first, phone second. Neither will scroll a long page unless the
first screen earns it.

## 3. Content, in order

The page is a home page. Sections, in the order they should appear unless the design
logic has a better argument:

1. **Hero.** Who he is, what he does, and one reason to keep reading. Must carry a
   real point of view, not a slogan. No "elevate your business" register.
2. **Selected work.** The most important section. Three to four entries. Each entry
   has a title, a sector, a year, one line on the problem, one line on what was built,
   and one true outcome. A record may be one of four kinds, and the design must be
   able to express the difference: `case_study` (client work), `product` (things he
   built and owns, chiefly GAkinzOS), `experiment`, `writing`.
3. **What I do.** Four capabilities: web design, web development, ecommerce, care and
   support. These are real and already defined. Do not expand to a grid of six with
   invented extras.
4. **A credibility beat.** How he works, or what a client can expect. One idea, not a
   five-step process diagram.
5. **Writing.** Two or three recent pieces, title and one line each.
6. **Contact.** Direct, low friction, one clear action.

## 4. Tone

Plain British English. Specific over grand. The existing site's copy is already
reasonable in places and already bad in others: "One team that draws the vision and
builds it properly" is the current tagline and is acceptable as a studio line but is
not a personal line. Write real copy. Do not use Lorem ipsum. Do not use the words
leverage, empower, showcase, transformative, impactful, cutting-edge, revolutionise,
synergy, groundbreaking or utilise.

## 5. Images and honesty (read this carefully)

**No portrait of the subject is available, and no screenshots of his work are
available.** Do not substitute a stock photograph of a stranger for either. A personal
site that shows someone else's face is a lie, and a portfolio that shows someone
else's work is worse.

Every image slot must be an **honest, designed placeholder**: a correctly proportioned
block, in the palette, carrying a short label that says exactly what belongs there,
for example `PORTRAIT: Gideon, to supply` or `SCREENSHOT: client homepage,
to supply`. Make the placeholder look deliberate rather than broken; it is
part of the design, and the client will see it. Do not use generic grey boxes with an
image icon.

**Do not invent client names, metrics, testimonials or dates.** Where a real value is
needed, write a clearly marked placeholder such as `[CLIENT NAME]` or
`[OUTCOME: to supply]`. An honest gap is acceptable and expected. A fabricated
credential is a failure of the brief.

## 6. Colour

Derive the palette; do not copy one. Sample from the content and the context, converge
to two or three chromatic values plus one neutral lightness ramp, and write one
sentence in an HTML comment saying where the colour came from and why. Keep chroma
low enough to read as ink rather than screen phosphor, unless the direction's
philosophy specifically argues otherwise.

Context worth sampling: the existing brand is monochrome ink with two accents, a
lavender `#7F77DD` and a rose `#D4537E`. You are not obliged to keep them. If you
discard them, say what you replaced them with and why. The current site leans on an
animated indigo-to-lavender-to-rose gradient as its only colour move, which is one of
the things being fixed, so do not reproduce that gradient.

## 7. Typography

Pick a display and body pairing and justify it in one line. The existing site uses
Space Grotesk for display and Manrope for body, with JetBrains Mono for data. You may
keep, adjust or replace this. Avoid Inter, Roboto and system stacks as a display face.

Define a **real type scale** and use only values from it. The current site's worst
failing is eight arbitrary heading sizes, so any direction that reintroduces ad-hoc
sizes has missed the point of the exercise.

## 8. Hard constraints, all directions

- Output: one self-contained `.html` file. Inline CSS. No build step. Opens from
  `file://`. Google Fonts by link is allowed; nothing else external.
- Viewport for screenshots: **1440 × 900**.
- Body text at least 16px. Labels and captions at least 12px. Body contrast at least
  4.5:1. Whitespace must be composition, not absent content. The first screen needs a
  clear focal point.
- Must work down to 390px wide without horizontal scroll.
- Respect `prefers-reduced-motion`. Any motion is decoration and must be removable.
- Real semantic landmarks, one `h1`, correct heading order, visible focus styles.
  Accessibility is an explicit requirement of this project, not a later pass.
- **The three directions must differ structurally.** Navigation, composition and the
  shape of the work section must each differ in at least one structural way. A palette
  and typeface swap over a shared skeleton fails.

## 9. Anti-brief: what the current site does wrong

Every direction is judged partly on avoiding these, all of which are present today:

- The same aurora-blob-plus-grid hero on all eight pages.
- Animated gradient text as the only brand gesture.
- Three identical icon-title-blurb cards, repeatedly.
- Ornamental ghost numerals standing in for hierarchy.
- An animated "100% Accessible" statistic that was never measured.
- Generated SVG wireframes standing in for real screenshots.
- One vertical rhythm for the entire site; nothing ever full-bleed, tight or oversized.

## 10. Deliverable

One HTML file at the path given in your instructions, plus a 1440×900 screenshot, plus
three short notes: which logic you used, where the colour came from, and one sentence
on what in the content the composition grew out of. If you cannot answer that last
one, the design is a template and needs rethinking.
