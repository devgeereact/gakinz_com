# Content and growth

**Status:** approved policy (`docs/DECISIONS.md` D-041), researched on 2026-10-10. Nothing in
this file has been set up. No account was accessed or created, no profile published, and no
ad or affiliate code installed. Account ownership, eligibility, traffic and income are all
**NOT TESTED**.

This file holds the Resources editorial standard, the AdSense and Amazon Associates pilots,
how they are measured, and the draft company profiles for five social channels. The features
that support it are in `docs/PRODUCT-SPEC.md` section 7 (delivery phases 5 and 6); the
owner inputs it needs are in `docs/STATUS.md` section 5. Provider rules change, so re-read
every linked source before implementation.

---

## 1. Commercial priority

Service enquiries and client retention pay for the business first. Useful resources build
trust, attract search traffic and can carry secondary affiliate and ad revenue. Nothing is
designed around encouraging ad clicks: [Google's AdSense policies](https://support.google.com/adsense/answer/48182)
prohibit encouraging clicks and confusing ads with content.

The niche is practical technology for small businesses, tied to the six services GAkinz
actually sells (D-038): business websites, online shops, everyday IT, sensible technology
choices and the equipment that helps people run those businesses. Networking and hardware
repair are not services, so an article about routers or hardware is buying advice only and
never implies that GAkinz installs or repairs them.

## 2. Resources: pillars and publication standard

| Pillar | Initial article ideas | Commercial fit |
|---|---|---|
| Business websites | What to prepare before asking for a quote; a useful enquiry form; when to rebuild rather than improve | Service enquiries |
| Ecommerce | Preparing product photographs; making delivery information clear; a checkout testing checklist | Ecommerce scope discussions |
| Working equipment | Dock and monitor compatibility; equipment for clear video calls; practical backup devices | Carefully justified Amazon links |
| Everyday IT | Backups versus sync; safer account handover; setting up a new starter's laptop and accounts; organising shared files | General IT support enquiries; backup drives and accessories as disclosed Amazon links |
| Technology decisions | Microsoft 365 or Google Workspace for a small team; when to replace a laptop; which booking or invoicing tool fits a sole trader | IT consultancy enquiries; carefully justified equipment links |
| Evidence from projects | A real mobile navigation problem; why a page structure changed; lessons from a launch | Portfolio and permitted testimonials |

Pilot six to eight complete, useful articles over time, not mass publication. That is an
editorial workload suggestion, **not an AdSense minimum**. One substantial piece every two
weeks if it is manageable. Update a useful older piece rather than write a near-duplicate
buying guide. Use real screenshots and examples with permission, a named author, accurate
published and updated dates, and an honest distinction between first-hand tests and
researched comparisons.

A recommendation explains who it suits, compatibility, limitations and an alternative. "I
tested" requires actual testing. Nothing is recommended only because it pays a commission. No
copied reviews, retailer descriptions or AI-generated product claims. A commercial
relationship is marked clearly before the relevant content.

The article format needed for this exists since 2026-10-10 (K-037, not deployed): safe links,
lists, bold, and `[text](url){sponsored}` for an affiliate link, which adds `rel="sponsored"`.
Recommendation blocks are not built.

## 3. AdSense pilot

[Google's site readiness guidance](https://support.google.com/adsense/answer/7299563) asks for
original, relevant content and a good experience. Approval and earnings are not guaranteed,
and a portfolio plus a handful of thin articles is not a monetisation strategy.

1. Finish useful public content, navigation, About and contact pages, and accurate privacy
   and cookie notices.
2. Verify owner control of the intended domain and account before any application or
   connection.
3. The owner applies, or confirms existing site approval. Record the status without storing
   account credentials.
4. Before serving ads to the relevant regions, implement Google's
   [certified CMP requirements for the EEA, UK and Switzerland](https://support.google.com/adsense/answer/13554020),
   including the required TCF integration. A handmade cookie banner is not evidence of
   compliance.
5. Test consent accept, reject, settings change and withdrawal with network inspection. Read
   the [ICO guidance on storage and access technologies](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-storage-and-access-technologies/),
   especially on advertising tags. Do not assume all analytics are exempt, or that all
   analytics need the same consent treatment.
6. Pilot one labelled in-article slot and, if appropriate, one end-of-article slot. Reserve
   the space so the layout does not move. Exclude the home, services, pricing, work, contact,
   login, proposal and legal pages and every private or client route.
7. Check mobile reading, focus, performance and accidental-click risk. Never place an ad
   where it resembles a menu, a download or a booking action.
8. Review revenue and impact after a useful period of genuine traffic, such as eight to
   twelve weeks. Switch the pilot off if support load, performance or buyer distraction
   outweighs the income.

**What is built (2026-10-19, Task 25, switched off, not deployed).** The settings are in
`src/marketing/lib/monetisation.ts`, a tracked file rather than Site content, so switching on a
third-party script goes through review and CI like any code change (K-033). Turning the pilot
on needs `consent.mode` "cmp" with the CMP's https loader on an allow-listed host, and
`ads.provider` "adsense" with the `ca-pub-` publisher ID and the in-article unit's slot ID. Ads
never load without a CMP. A slot renders, and the AdSense script loads once, only after the CMP
reports a settled choice with Purpose 1 consent (IAB TCF `__tcfapi`), or that GDPR does not
apply. Slots sit only in article bodies, after the third and eighth paragraphs, at most two,
each labelled "Advertisement", with space reserved only while shown. Leaving a public page for
a private surface after a CMP or ad script has loaded reloads the page. Turn AdSense Auto ads
off in the account: the script stays on the page during in-site navigation, and Auto ads would
place ads outside articles. Withdrawal removes the slots but cannot unload a script already
loaded, until the next page load.

Two limits to settle before switching on. First, the loader takes a URL only: some CMPs need
more than that, for example OneTrust's `data-domain-script` attribute, Cookiebot's
`data-cbid` and `data-framework` attributes, or Google's Privacy & messaging tag and its
`signalGooglefcPresent` call. For any of those, a URL alone may not be enough and the loader
needs a small code change for that CMP. Second, as a business choice, a slot shows only with
Purpose 1 consent (storing and reading on the device). Google's limited ads, which can serve
without that consent, are therefore not shown to visitors who refuse it.

Rejecting consent never blocks the service content. Never ask clients, community members or
friends to click ads, click them yourself, buy traffic or use incentivised visits. Keep
third-party monetisation scripts out of authenticated layouts. Public and private surfaces
share an origin, so avoiding private routes alone does not isolate `localStorage` from a
public-page script (K-033): review the CSP, script boundaries and session exposure before
adding any script, and compare safer session storage in a focused authentication review,
including the CSRF and CORS implications if cookies are proposed.

## 4. Amazon Associates pilot

The UK [Operating Agreement](https://affiliate-program.amazon.co.uk/help/operating/agreement)
and [Programme Policies](https://affiliate-program.amazon.co.uk/help/operating/policies/)
govern qualifying revenue and allowed uses. The account, marketplace and every intended
website or social property must be approved. Do not presume a private channel or app is an
eligible placement.

Use Amazon's linking tools for a valid product URL and the approved tracking ID. Start with
hand-picked links in useful articles: no catalogue import, price scraper, product-sync job or
Amazon API integration. Do not hard-code prices, ratings or retailer images unless rights and
the current programme conditions allow that specific use; "Check current price on Amazon"
avoids a stale price promise.

[Amazon's disclosure guidance](https://affiliate-program.amazon.co.uk/help/node/topic/GPXFHVYZMTGPUMPE)
requires clear link disclosure and the statement **"As an Amazon Associate I earn from
qualifying purchases."** Show the statement visibly on the site and put a clear local
disclosure beside or before the relevant recommendation. The
[ASA's affiliate guidance](https://www.asa.org.uk/advice-online/affiliate-marketing.html) also
requires commercial content to be recognisable: use a prominent "Ad" label where it applies.
A distant footer or an obscure hashtag is not a substitute.

**Recommendation block** inside an existing article: product name, business use,
suitability, limitation, approved URL and the date of the last manual review. Prefer owner
photographs or properly licensed assets. Mark outbound commercial links `rel="sponsored"`,
validate allowed URL schemes and the intended destination, and use no hidden redirects or
browser-side tag alteration.

For social and community distribution, share the useful public guide first. Do not send
direct affiliate links through WhatsApp, email or other placements until the owner has
checked the programme rules and that channel's eligibility. No member incentives,
guaranteed commission claims or suggestion that an associate is employed by Amazon.

## 5. Measurement without another dashboard product

| Metric | Where to start | Why |
|---|---|---|
| Suitable service enquiries and won projects | Existing enquiry and project records | The core income |
| Published article visits and search engagement | Approved analytics or Search Console, when authorised | Whether resources help the intended audience |
| Qualified affiliate clicks and actual commission | Amazon's reporting; modest page or link tracking only if lawful | Traffic is not the same as qualifying purchases |
| Ad revenue and RPM | AdSense reports | Secondary income weighed against reader impact |
| Content effort and enquiries per topic | A short monthly owner review | Stop maintaining content that adds nothing |

Illustrative arithmetic, not a forecast: 10,000 page views at an assumed £5 page RPM would
yield £50; 300 affiliate clicks at an assumed 4% purchase rate, a £60 qualifying basket and an
assumed 3% commission would yield £21.60 before adjustments. These are invented scenarios, not
current rates or expected results. Real rates, eligible products, returns and traffic decide
income, and one useful company project may be worth far more than early ad revenue. Ad
revenue is never a launch dependency.

## 6. Company profile kit

All copy below is a draft for the owner to approve (`docs/STATUS.md` section 5). No account
has been created.

**Shared settings.** Display name **GAkinz**. Proposed handle **@gakinz**, fallback
**@gakinzstudio**; availability and ownership are not verified. Check for existing accounts
before creating anything, and never create duplicates. Company website `https://gakinz.com`.
Put exact owned profile URLs into website settings and structured data only after
confirmation.

**Imagery.** Profile image: the existing approved brand mark, legible at small size. Cover or
hero: a real project or a named-owner photograph with a short service line, never a collage of
stock devices. Use the target design's warm cream and ink, restrained orange accents,
geometric type and rounded framing with accessible contrast (`docs/DESIGN-SYSTEM.md` section
10), and keep the GAkinz logo, never Mastercard's mark. After approval, export a square logo
and adaptable landscape and portrait designs, and check each platform's current crop and safe
area rather than assume one image fits all.

**Shared description draft:** "GAkinz is run by Gideon Akinlotan. I design and build websites
and online shops for small businesses, look after them afterwards, and help with everyday IT
and technology decisions. You speak directly to the person doing the work, from the first
conversation to the handover." Confirm the audience, location and on-site coverage first.

### Instagram

Name: **GAkinz | Websites & IT support**.

Bio draft:

> Business websites, online shops & everyday IT support.
> Run by Gideon. Clear advice, real work.
> Discuss your project ↓

Link: the website contact page or an existing owned landing route; no link-in-bio service.
A business or professional account, subject to the owner's account check. Highlights:
Services, Work, Process, FAQs, About. Three pinned posts: meet Gideon, what GAkinz helps with,
and one authorised project.

Formats: real screen recordings, a useful checklist carousel and occasional owner or process
photographs. At most two repurposed posts a week at first. No invented client results.
Commercial recommendation posts carry clear disclosure.

### Facebook

Page name: **GAkinz**. Category: the closest accurate website or digital service category,
confirmed in the live interface. Short description: "Business websites, online shops, website
care and everyday IT support, run by Gideon Akinlotan." Call to action: contact or booking,
only when the destination is real.

About: the shared description plus service area, working hours and enquiry expectation once
supplied. Pin a welcome post with services and the contact URL. Adapt Instagram project and
advice posts rather than run a separate queue. Check Page ownership and admin access with
[Meta's Page access guidance](https://www.facebook.com/help/187316341316631) before changing
anything.

### LinkedIn

Company Page name: **GAkinz**. Tagline: **Websites, online shops and everyday IT support for
small businesses.**

About draft:

> GAkinz is my web design and development business. I'm Gideon Akinlotan, and I work directly
> with clients to plan, design and build websites that are clear to use and straightforward to
> maintain.
>
> Services include business websites, ecommerce, website care, general IT support and IT
> consultancy. Each project starts with a conversation about the business, its customers and
> what the site needs to do.
>
> For an initial discussion, visit gakinz.com/contact.

Use the actual legal and company details and the accurate size category. Gideon's personal
headline draft: **Owner at GAkinz | Websites, ecommerce & IT support for small businesses**.
Feature the business site and one permitted case study. One useful case-study or advice post
a week at first. [LinkedIn's Page guidance](https://www.linkedin.com/help/linkedin/answer/a543852/creating-a-linkedin-page)
supports a company presence; check the existing Page and admin state first.

### TikTok

Name: **GAkinz**. Bio draft: **Websites, online shops & IT help. Run by Gideon. Practical tips,
real work.**

A business account after owner review; whether a website link is available depends on the
account and is unverified. First pinned videos: "Who I help", "What happens after you
enquire", "One useful website fix". Practical screen and owner videos, with captions and one
clear point in 20 to 45 seconds, are editorial suggestions, not an algorithm promise. Reuse
suitable Instagram recordings once rights are checked.

Use original or licensed audio, or the appropriate
[TikTok Commercial Music Library](https://ads.tiktok.com/resources/help/article/how-to-use-the-commercial-music-library?lang=en-GB).
Never assume trending audio is licensed for business promotion.

### WhatsApp Community

Name: **GAkinz | Business Website & IT Tips**.

Description draft:

> Practical website and technology advice from Gideon at GAkinz. Occasional guides, useful
> updates and clearly labelled recommendations. Please keep client projects and personal
> information in private conversations. Joining is optional and you can leave at any time.

Start with announcements only, and at most one moderated discussion group if there is demand.
Sales and support conversations stay private. Rules: no unsolicited promotion, no account
credentials or client records, respectful questions, affiliate content labelled, no promise of
immediate support. State the posting frequency, the moderation and contact route and the
removal process. Never enrol a client without their choice.

Welcome message draft: "Welcome, I'm Gideon. I'll share practical advice about business
websites and useful IT equipment, usually once a week. For a project or a private support
issue, please use gakinz.com/contact rather than posting details here."

[WhatsApp's community guidance](https://faq.whatsapp.com/495856382464992) and
[privacy guidance](https://faq.whatsapp.com/236979282604093) distinguish community behaviour
and number visibility. Never promise anonymity: admins, saved contacts and group context can
all expose a number. Explain visibility before inviting anyone. No community-to-CRM import or
WhatsApp API integration.

## 7. Four-week starter calendar

| Week | Main material | Reuse |
|---|---|---|
| 1 | Owner introduction and the confirmed services | LinkedIn introduction, an Instagram and Facebook post, a short TikTok, an optional community welcome |
| 2 | What to prepare before asking for a website quote | Article, checklist carousel, one short video |
| 3 | An authorised case study, or a clearly labelled own-project example | LinkedIn story, before and after screenshots, a short explanation |
| 4 | One practical equipment or IT guide, with disclosed links if approved | Article, one social summary, a community link to the guide |

Suggested workload: two to three hours a week at first, reviewed against actual capacity.
That is a planning allowance, not a content-production estimate. Put LinkedIn and a
dependable website first, reuse material on Instagram and Facebook, then TikTok. Keep the
community quiet until there is interest. Five profiles do not need five publishing
programmes.

## 8. Safe setup and consistency

Confirm existing accounts, display names, owned handles and recovery access. Keep the owner
as administrator, turn on two-factor authentication, and store recovery information outside
the repository and its documents. Review public phone and address exposure. After approval,
update the exact website social links and provider profile links as one checked batch. Test
the contact and booking URLs, mobile crop, accessible captions and disclosure placement.

No API connectors, social publishing bot or paid campaign is needed. Keep a simple manual list
of approved content linked to existing article and work records. Measure suitable enquiries,
not follower counts alone.
