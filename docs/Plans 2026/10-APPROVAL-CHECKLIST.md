# Approval checklist

Every decision and input the owner needs to give, in one place. Tick a box and add the date when it is decided. Each item says what it unlocks. Silence is not approval. Never write passwords, keys or account recovery codes in this file.

## Already decided, 10 October 2026

- [x] **Design system:** full Mastercard-inspired GetDesign system on website and CMS, with only the substitutions in document 03. Withdraws the 22 September "no borrowed design language" rule. Unlocks phases 3 and 4 design work.
- [x] **Services:** web design, web development, ecommerce, website care, general IT support, IT consultancy. No networking installation or hardware repair. Unlocks service pages and social copy.

## Safety, needed before any real order (phase 1)

- [ ] Admin credential from git history rotated and all sessions revoked (K-001). Date: ____
- [ ] Seed-password file deleted from the live server (K-015). Date: ____
- [ ] Which PHP files and SQL migrations are live has been checked and recorded (K-006). Date: ____
- [ ] A backup has been restored somewhere safe and checked (K-010). Date: ____
- [ ] Recovery targets agreed. Proposed: back within one working day, lose no more than 24 hours of changes. Agreed: ____
- [ ] Payment provider for launch. Recommended: Stripe only; PayPal hidden until it has a webhook. Choice: ____
- [ ] Who can help if the owner loses access, and where recovery information is kept (outside this repository). Date: ____

## Business facts (phases 2 and 4)

- [ ] Trading identity: sole trader or limited company, registered name and number if any (`site.ts` registration is `null` today).
- [ ] VAT: registered or not, and whether prices shown include VAT.
- [ ] Website prices in `site.ts`, confirm or replace: Starter £1,500, Business £3,500, Ecommerce £6,000, Bespoke quoted, £180 per extra page, £350 copywriting, £600 brand mark, care £90 and £450 per month.
- [ ] New prices: general IT support (hourly or block) and IT consultancy (session or fixed review).
- [ ] IT support coverage: remote only, or on-site, and which area.
- [ ] Payment schedule: keep 40/30/30 (ex-VAT, due at acceptance, +30 and +60 days) or change it.
- [ ] Cancellation, change and revision terms.
- [ ] Public contact details: email (`hello@gakinz.com` today), phone (`null` today), working hours, reply promise.
- [ ] Data retention periods for enquiries, client records and invoices.
- [ ] Legal pages reviewed by the owner, and by a professional if wanted (K-021).

## Brand and content (phase 4)

- [ ] Company-facing name "GAkinz", with Gideon named as owner. Changes the September personal-site decision.
- [ ] Main homepage message (draft in document 03).
- [ ] Sofia Sans licence file and weights confirmed.
- [ ] Owner portrait and short biography supplied.
- [ ] Up to three case studies, each with client permission, screenshots and an honest outcome.
- [ ] Sectors page: keep with genuine examples, or fold into Services.
- [ ] Motion preview reviewed on desktop and phone before it is applied everywhere.

## Product scope (phases 2 and 3)

- [ ] Seven-item CMS navigation (document 02).
- [ ] Feature list and "deliberately not doing" list (document 09).
- [ ] Phase 1 client access: existing client password login only; reference and email link later.
- [ ] "Measurement" in project briefs means agreed scope and delivery evidence (document 08), or something else: ____
- [ ] Keep XLSX export, or CSV only (K-017).

## Monetisation and social (phases 5 and 6)

- [ ] Existing social accounts and handles checked; preferred handle `@gakinz`, fallback `@gakinzstudio`.
- [ ] Profile copy for Instagram, Facebook, LinkedIn, TikTok and WhatsApp Community (document 04).
- [ ] Amazon Associates account status and the approved site or channels.
- [ ] AdSense account status; agreement to use a certified consent platform first.
- [ ] Weekly time available for content. Proposed: two to three hours.

## After approval: documentation step

- [ ] Approved sections moved into the canonical documents listed in document 05, stale facts fixed (document 01, A28), project memories and `docs/DECISIONS.md` updated.
- [ ] Global GEE OS or `~/.claude` rule and hook changes, if any, approved separately.
- [ ] This folder deleted once everything approved is preserved and checked. Date: ____

Approved by: ____________  Date: ____________
