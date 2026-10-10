# Public website and consistent interface guide

Status: visual foundation selected by the owner on 10 October 2026; implementation remains planning-only. Use the full Mastercard-inspired GetDesign reference and the GAkinz adaptations below. Retain existing accessible component behaviour and the current application stack.

## Positioning and voice

Proposed public identity: **GAkinz, websites and everyday IT support for small businesses, run by Gideon Akinlotan**. Services confirmed by the owner on 10 October 2026: web design, web development, ecommerce, website care, general IT support and IT consultancy. Networking installation and hardware repair are not offered. Use “I” when Gideon delivers personally; use the company name in business terms and profile headings. Avoid claims of a team unless a specific job genuinely involves one.

Draft main message: “A clear, dependable website for your business, with one person to call afterwards.” Supporting copy: “I’m Gideon, the owner of GAkinz. I design and build business websites and online shops, then help keep them working. Tell me what your business needs and I’ll suggest a sensible next step.” Primary CTA: “Discuss your project”. Secondary: “See my work”. These are drafts, not approved replacement copy.

Use actual work, realistic scopes and plain explanations. Remove public prose arguing against templates, counting modules, naming private source files or explaining why a photo is missing. This does not justify fake proof. Leave absent material unpublished and write a complete page around what can be stated honestly.

## Public page plan

| Page | Role and proposed content | Acceptance |
|---|---|---|
| Home | Service-led introduction, owner photo if supplied, concise six-service overview grouped as "Websites" and "IT support", real work, delivery steps, permitted testimonial, enquiry CTA | A company buyer can identify offer, fit, proof and next step quickly on a phone; no missing-content panels |
| Services | Six offers in two groups (Websites: design, development, ecommerce, care. IT: general support, consultancy), typical business needs, deliverables and exclusions, links to scope/pricing/work | Networking and hardware repair never appear; IT pages state remote or on-site coverage and area as confirmed by the owner |
| Service detail | Buyer problem, who it suits, scope, client responsibilities, process, indicative price if approved, one relevant project/FAQ and CTA | Content unique to service; no invented turnaround or guaranteed commercial outcome |
| Pricing | Approved starting prices, inclusions, VAT treatment, extras, revisions, ongoing costs and payment schedule | Matches quotes/agreements; custom work clearly needs a scoped quote |
| Work | Published approved client case studies first; own products/experiments separately and honestly labelled | No empty client-work row presented as evidence; filters only where useful |
| Work detail | Client/context with consent, problem, work performed, real screenshots, measured or qualitative outcome, services, year and link | Consent/alt text required; confidential details absent; truthful outcome |
| About | Named owner, real portrait, approach, relevant supported experience, location/service area and working relationship | No invented certifications, team size or biography |
| Sectors | Keep only genuine expertise and distinct useful examples; otherwise shorten into Services and redirect old route after approval | No unsupported expertise or thin repeated SEO pages |
| Resources | Practical website/IT advice, categories based on actual articles, buyer guides where useful | Readable index, accessible links, latest published records, clear affiliate disclosure where applicable |
| Article | Summary, author/date, headings/lists, safe links, evidence, recommendations if relevant, discreet service CTA | Body edit survives; affiliate links clickable; no raw unsafe HTML; route metadata correct |
| Contact | Name/email/message required, optional company/service/budget, privacy notice, response intent and working hours; booking link if configured | Clear errors and save state, retains data after failure, double-submit guarded, no live sends in QA |
| Privacy/Terms/Cookies | Accurate trading identity, actual processing/providers, lawful basis, retention, rights, contact and genuine review dates | Owner-reviewed and appropriate legal review; notice matches actual trackers and terms |
| Shared proposal | Recipient-friendly scope, exact total, version, expiry and acceptance route | No public indexing, no unrelated client data, revoked/expired link handled |
| Certificate verification | Retain only if certificates are actually issued; disclose minimum verification data | No searchable private information or implied accreditation |
| Login/reset | Clear owner/client login, reset guidance, accessible errors and compatible brand styling | Valid/expired/used reset cases tested; no demo credentials or confusing staff-only wording for clients |
| Not found/errors | Useful explanation, return links, no technical paths or stack detail | Genuine HTTP status strategy for public missing records; private error pages stay private |

The homepage must establish service value before deep studio philosophy. On mobile, keep the headline and standfirst concise and let the hero animation support the service message. Show service summaries above a lengthy portfolio ledger. Pricing belongs in main navigation if it is meant to qualify buyers, rather than being discoverable only in the footer.

## Buyer hooks by current service

| Service | Draft hook | Proof to attach |
|---|---|---|
| Web design | “Help customers understand what you do and how to enquire.” | Real page hierarchy/screens and explanation of a solved usability problem |
| Web development | “A website you can keep using and updating after launch.” | Working handover, editing examples, agreed ownership and care options |
| Ecommerce | “Make products easier to find and the buying process easier to follow.” | Real catalogue/checkout work, with private order/customer data removed |
| Care and support | “A named person to contact when your website needs attention.” | Defined coverage, working hours and actual support process |
| General IT support | “Everyday IT problems sorted by someone who explains what went wrong.” | Typical jobs (email and account set-up, device and software set-up, backups, Microsoft 365 or Google Workspace help), remote or on-site coverage, response expectation, price basis (hourly or block). Excludes networking installation and hardware repair |
| IT consultancy | “Straight answers before you spend money on technology.” | Fixed-scope session or short written review, typical questions (which tools, what to replace, how to organise accounts and files), deliverable is a written recommendation, price basis |

Prices for the two IT services do not exist in `site.ts` yet. The pages render a price only once the owner supplies one (document 10); until then they say "Priced per job, ask for a quote".

Never promise “more sales”, a search ranking or security certification without evidence and appropriate scope. Case studies may explain why a change should help without claiming an unmeasured revenue increase.

## Selected design reference and provenance

The owner selected **the full Mastercard-inspired GetDesign system** for both surfaces and confirmed on 10 October 2026 that it should be followed as closely as possible, not loosely adapted. Preserve the complete imported reference in [07-MASTERCARD-DESIGN-REFERENCE.md](07-MASTERCARD-DESIGN-REFERENCE.md). Use its complete palette, type hierarchy, spacing, radii, pill navigation, circular imagery, orbit lines, elevation and responsive principles as the design foundation. This replaces the September direction (warm paper `#F6F3ED`, navy `#2A3160`, red oxide `#933C2F`, Newsreader over Instrument Sans, verified in `src/index.css:97-133`) and the CMS's separate Manrope and lavender palette. It also withdraws the 22 September rule against borrowed design language; the decision is recorded in document 05.

### Required substitutions, and nothing else

Only these departures from document 07 are allowed. Each exists because of law, licensing or accessibility, not taste.

| Reference says | GAkinz uses | Reason |
|---|---|---|
| MarkForMC typeface | Sofia Sans variable, self-hosted under its open licence; Manrope as fallback | MarkForMC is Mastercard's proprietary font and cannot be licensed |
| Logo colours `#EB001B` and `#F79E1B` | Never used anywhere | They are the Mastercard mark colours |
| Interlocking or overlapping circle pairs | Never used; single circles and orbit lines only | Avoids confusion with the Mastercard logo |
| Mastercard name, logo, photography, card or payment imagery | GAkinz logo, owner photos and real project screenshots | Trade mark and honesty |
| Any text colour or control edge below WCAG 2.2 AA contrast | Darkened to pass, same hue | Accessibility |
| Small vertical button padding | At least 44px touch height | Accessibility |

**Brand-confusion check**, run on the home page and every new template before release: no red and yellow circle pair, no card imagery, no wording that suggests a payment brand, GAkinz logo visible in the header. If a first-time viewer would think it is a Mastercard page, it fails.

Installed for planning with `GETDESIGN_DISABLE_TELEMETRY=1 npx --yes getdesign@latest add mastercard --out "docs/Plans 2026/07-MASTERCARD-DESIGN-REFERENCE.md"`. The inspected package was **getdesign 0.6.25**. The imported file exactly matches its bundled template, SHA-256 `e76ceaa187f43bd24b8338d2b2314e71e9225b36492e40f32a55782281a10437`. No dependency was added to package.json or the lockfile. Context7 returned no matching library; the published CLI and [upstream project](https://github.com/VoltAgent/awesome-design-md) were used instead.

The reference is a third-party design analysis, not Mastercard's official component library. Its observations and inferred breakpoints are reference material, not verified guarantees. GAkinz uses its own name, logo, photographs, project work and service language. No Mastercard mark, payment-brand claims, source-site imagery or proprietary font is incorporated by this plan.

Document 07 preserves the source. This document governs how GAkinz applies it. After implementation approval, consolidate the adaptation into the canonical docs/DESIGN-SYSTEM.md and record provenance there; do not leave two competing active style guides.

## Shared design contract

| Foundation | Website application | CMS application |
|---|---|---|
| Canvas | Cream `#F3F0EE`, lifted cream `#FCFBFA`, warm ink `#141413` | Same light-theme foundation, white/lifted record surfaces and legible text |
| Primary actions | Warm-black CTA, cream text, 20px radius | Same primary/secondary styling; compact controls still have comfortable hit areas |
| Accent | Decorative orbital orange `#F37338`, sparse dots and section detail | Quiet decorative/brand cues; semantic success/warning/error colours remain unambiguous |
| Consent signal | Reference orange `#CF4500`, only where contrast and CMP styling permit | Consent controls governed by consent requirements; orange is not the generic Save colour |
| Typography | One geometric sans family, medium headings, tight display tracking | Same family; readable field labels, tables and figures, no decorative watermark behind data |
| Type scale | Reference hero around 64px desktop/40px mobile, section 36px, smaller headings 24px; fluid fit and actual wrapping tested | Practical page headings around 28-36px and body/controls around 16px; no 64px KPI numbers |
| Spacing | 8/16/24/32/48/64/96/128 scale, generous desktop sections, 48-64px mobile sections | Same scale, shorter list/form spacing and sensible screen density |
| Shape | Floating pill navigation, 40px hero frames, circular service portraits, 20px buttons | Rounded page panels/dialogs, same buttons and chips; inputs/tables fit their functional role |
| Elevation | Very soft floating-nav shadow, mostly flat surfaces | Soft elevation only for overlays and selected panels; borders clearly separate controls |
| Imagery | Real owner/client work, circular portraits and large rounded feature media | Client-approved thumbnails, actual file/project previews, no ornamental imagery in every record |
| Responsive | Full navigation to compact accessible mobile menu; arcs simplified/removed on phones | Explicit drawer toggle, wrapping actions/tabs and contained responsive lists/tables |
| Footer | Warm-black surface, white text, conversational contact CTA | Small useful footer; no marketing-sized footer in the workspace |

Font: Sofia Sans variable, self-hosted, replaces Newsreader, Instrument Sans and Manrope on both surfaces, so the website and CMS share one family. Manrope stays as the fallback. Confirm the licence file and the weights used (the reference uses 450 and 500) before implementation. Do not fetch proprietary fonts from another brand's website. Remove the stray Space Grotesk reference at `src/index.css:934` during the same change.

Accessible adaptations take precedence over copied measurements: low-contrast Dust Taupe and ghost headlines are decorative only, never labels, placeholder instructions or business data. Orange arcs do not carry meaning. Ensure form edges, status text and focus indicators meet contrast requirements. Increase button heights beyond the source's small vertical padding. Essential actions have visible text or accessible names. Do not copy consent accept/reject styling that makes rejection harder.

Dark theme: document 07 is a light marketing reference and defines no dark palette. The CMS currently ships several themes (dark, dark-blue, gaussian-black, classic-light, semi-dark). Reduce these to one light and one dark theme. Derive the dark theme from the same tokens: ink `#141413` as the surface, cream as text, orange accents unchanged, then contrast-test it. The public site stays light only, as today.

## Hero and section composition

Home hero: a concise service headline and introduction paired with a large rounded frame containing a real project screenshot composition or owner/work imagery. One sparse orbital line can connect that frame to a circular portrait or service detail. Keep the enquiry CTA visible immediately and the image area reserved before loading. Use GAkinz project material so the composition has an identifiable relationship to the business.

Service/detail heroes: smaller rounded media or circular imagery related to the service, with copy and a relevant CTA. Vary placement and crop purposefully rather than repeating the entire home hero. About uses an actual owner portrait; Work uses genuine screen captures. Portfolio screenshots may remain rectangular within a 40px frame so interface evidence is readable, even though the source favours circular service photographs.

Service overview: staggered circular imagery on desktop with restrained connection arcs; clear stacked service entries on phones. Do not require long empty scroll stretches, a carousel, ghost text or a search button solely because they appear in the source. Add those only where they help GAkinz visitors. The CMS uses the same design vocabulary at useful working density, without cinematic hero sections on administrative screens.

## Animation and interaction contract

Motion should make the new composition recognisable through its real project material, timing and service story. Build a small reusable set of variants rather than a different animation engine per page. The timings below are proposed starting values, tuned in browser review rather than treated as package defaults.

| Area | Proposed animation | Limits |
|---|---|---|
| Home hero copy | Opacity plus 12-20px upward entrance, 450-650ms; short 70-100ms stagger between heading, supporting line and CTA | Run once; preserve one semantic heading, selectable text and immediate focus/click access |
| Hero media | Slight scale from about 0.98 to 1 with opacity, 600-800ms; optional restrained inner-image reveal | Outer frame reserves dimensions; no full-screen transition or content-dependent loading delay |
| Orbital accent | One SVG path draw over 800-1200ms after main content appears | Decorative and aria-hidden; no endless orbiting, flashing or required meaning |
| Service/portfolio sections | Single viewport entrance with opacity and 12-16px movement, 350-500ms | Trigger once; no scroll hijack, pinned narrative or long repeated stagger |
| Portrait/media hover | Small image scale or satellite-arrow shift, 150-250ms | Desktop hover only, clipping remains stable; phone action works without hover |
| Buttons/menu | Colour/opacity and optional 1-2px arrow shift, 120-200ms; menu panel around 180-240ms | Keyboard focus distinct; no movement that changes target position during activation |
| CMS panels/dialogs | Brief fade/small displacement, around 120-180ms | No staggered table rows, animated monetary counts or workflow delay |
| Success/loading | Short state feedback or restrained skeleton | Never fake completion/progress; errors remain visible until resolved |

No autoplay background video is required. Start with lightweight still imagery and CSS/SVG motion. Video can be added only if the actual footage tells a useful story, is compressed, has an appropriate poster and accessible controls, and the page meets performance targets. Avoid heavy 3D scenes, custom cursors, particle libraries and multiple overlapping animation dependencies.

Prefer existing CSS and browser capabilities for these simple effects. If sequencing later demonstrably needs a library, inspect current official documentation and bundle impact before choosing one. No animation dependency is installed during planning.

`prefers-reduced-motion: reduce` removes translation, scale, path drawing and scroll effects; show content in its final readable state. Content is visible if JavaScript fails, observers do not run or motion is disabled. Animation must not hide the main message until media loads or delay the LCP element. Decorative motion pauses off-screen/background. Use opacity/transforms instead of layout animation; no looping movement lasting indefinitely without a user control.

Acceptance: inspect desktop and touch mobile at 320/390/768/1440px, reduced motion, keyboard navigation, slow connection and both CMS themes. Validate no layout shift, focus obstruction, hidden content or overflow. Capture a short desktop/mobile preview for owner review before applying the same motion to every route. Compare field/lab performance before and after; originality does not substitute for usability evidence.

## Screen patterns

Page header: name, one-sentence purpose if needed, primary action. Filter/search beneath. Main list uses readable name, relevant status/date and a labelled action. Record view provides summary, next action and a few meaningful tabs. Forms show errors beside fields and a summary when useful. Confirm dialog names the actual record and consequences. Destructive actions are not adjacent to primary action without separation.

Loading, empty, unavailable, permission-denied and success are distinct. An empty enquiry list says how enquiries arrive. An API failure says “Enquiries could not be loaded. Retry”, without asserting the database is missing. Keep user-entered content on retry, warn on unsaved departure, and guard duplicate submissions. Do not show fake populated charts.

Use existing shadcn/Radix primitives and shared small EmptyState/TableSkeleton components where suitable. Extract repeated form/state patterns only after the same problem occurs in multiple screens. Do not create a new universal form engine or rebuild the component library.

## Responsive and accessible acceptance

Test 320, 390, 768, 1024 and 1440 CSS-pixel widths, portrait/landscape, long content and both CMS themes. At 200% zoom, primary tasks remain available. At 400%/320px reflow, content does not demand two-direction scrolling except legitimate data tables. Tables may scroll inside a labelled container; the entire document should not expand. On phones prefer record cards or fewer columns.

Aim for 44px comfortable touch controls; [WCAG 2.2](https://www.w3.org/TR/WCAG22/) AA has a 24px minimum target criterion with specified exceptions, so do not confuse the design target with the standard. Verify keyboard access, visible focus, focus return after dialogs, accessible names, field errors, status announcements, contrast and focus not hidden beneath sticky UI. Conduct real VoiceOver and, where available, NVDA checks. Automated zero findings alone are not a compliance certificate.

Sample users: owner completes an enquiry/quote task without coaching; a business buyer finds relevant scope and submits a synthetic enquiry; a synthetic client locates its invoice and support route without staff controls. Record task completion, mistakes and points of hesitation. Start with a small feedback round, not a lengthy research programme.

## CMS to website consistency

| Information | Canonical home | Consumers and proposed rule |
|---|---|---|
| Identity, contact, social links | Currently `site.ts`; proposed small public settings record later | Header/footer/About/legal/schema read a public allowlisted projection; private config never exposed |
| Service/pricing copy | `site.ts` initially | Keep controlled source until frequent changes justify a small editor; no page builder |
| Portfolio | Existing work records | Published/approved only; private project produces a reviewed draft, never automatic publication |
| Blog | Existing posts | Published list/detail and sitemap; drafts stay private; Content Hub is not a second authority |
| Testimonials | Existing records | Approved attributed content only, with consent evidence |
| Booking URL | Existing configured `book.php` response | Contact and owner view share value; hide if missing; do not fake live availability |
| Forms | Shared service labels and contact endpoint | Enquiry service/source fields align; no second unlinked lead form |
| Social publication | Approved article/case-study URL plus manual platform post | Store destination URL/date if useful; do not claim automatic cross-posting |

Fix current successful-empty fallback semantics before promising unpublish. Static content should be an intentional fallback policy, not invisible resurrection of unpublished records. Give owner an API/content-health warning privately.

## Search, sharing and performance

Use route-specific public HTML/metadata for service, work and article URLs, plus accurate canonical URLs and Open Graph previews. Context7's [Vite deployment documentation](https://vite.dev/guide/static-deploy.html) supports retaining a static build and `dist`; local preview is not production hosting. Rendering choice is a later focused design decision, not grounds for a Next.js rewrite.

Static service pages can be prerendered. CMS work/articles need a publication-aware path, such as a narrow PHP metadata/rendered response or an approved regeneration mechanism. A build-only solution must state that new content will not receive fresh HTML until regeneration; it cannot silently contradict “publish without deploy”. Test hydration, links, real 404s and private-route exclusion.

Generate sitemap entries from published public records and reliable change dates. Private proposals/portal never enter sitemap. Robots directives do not enforce privacy. Limit article and case-study images, use responsive sizes, reserve image/ad space and lazy-load below fold. Measure representative public pages before and after ads on a mobile connection. Use [Google's Core Web Vitals targets](https://developers.google.com/search/docs/appearance/core-web-vitals) as goals: LCP at most 2.5 seconds, INP at most 200ms and CLS at most 0.1 at the 75th percentile, with field evidence when traffic supports it. No local unthrottled result proves that outcome.

## Customer access and project publication boundary

Use the customer journey and rich-content outline in [document 08](08-CLIENT-JOURNEYS-AND-ACCEPTANCE.md). Customer references require verified identity before any records are shown. Public work and testimonials are explicitly approved publication records, not live views of private project briefs, messages, measurements or feedback. Keep customer access visible in navigation/footer and keep enquiry as the main service-page action.
