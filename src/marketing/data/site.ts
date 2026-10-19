/**
 * Public copy for gakinz.com.
 *
 * THE RULE THAT GOVERNS THIS FILE: no claim here may be something the site
 * cannot stand behind. No statistic without a source. No client name without
 * written permission. No credential that has not been issued. Where a real
 * value does not exist yet, the field is `null` and the interface renders a
 * labelled gap, which is honest, rather than a plausible-looking invention,
 * which is not.
 *
 * Removed in the 2026-09-22 relaunch, and not to be reinstated without
 * evidence:
 *   - the animated "100% Accessible, WCAG 2.1 AA" figure on the home page.
 *     docs/DECISIONS.md D-020 records the earlier zero-violations claim as
 *     withdrawn. The site was asserting on its front page something its own
 *     documentation retracts.
 *   - "One team / WCAG 2.1 AA / Real devices / Fixed price" presented as a
 *     statistics row on /work. Those are four slogans in a grid built for
 *     numbers.
 *   - three invented portfolio entries. Work records now come from the `work`
 *     table through src/marketing/data/work.ts.
 *   - the placeholder telephone number +44 20 0000 0000 and the placeholder
 *     company registration 00000000, both of which shipped live.
 *   - four social links pointing at bare domains rather than at profiles.
 *
 * Voice: first person singular. GAkinz is named only where a team genuinely
 * does the work. Plain British English.
 */

// ── Identity ────────────────────────────────────────────────────────────────

/**
 * A value the owner has not supplied yet.
 *
 * `null` means: do not render anything, or render the designed placeholder.
 * It must never be coerced to an empty string and printed, and it must never
 * be filled with a realistic-looking default.
 */
export type Pending<T> = T | null

export const site = {
  /** The person. The site leads with him, not with the studio. */
  name: "Gideon Akinlotan",
  role: "Designer and developer",
  location: "London",
  /** One line, first person, specific. Used in the masthead and as og:description input. */
  line: "I design and build websites for British businesses, and I stay on afterwards so they keep working.",

  /** The studio. Named only where a team genuinely does the work. */
  studio: {
    name: "GAkinz",
    /** What the studio is for, in the owner's own framing. */
    note: "Where a job needs more than one person, it runs through my studio, GAkinz.",
    /**
     * UK company registration. NOT SUPPLIED.
     * The previous site shipped "00000000", which is not a valid number and is
     * the kind of detail a cautious buyer checks. Nothing is printed until a
     * real number exists.
     */
    registration: null as Pending<string>,
  },

  contact: {
    /** Real and in use. */
    email: "hello@gakinz.com",
    /** NOT SUPPLIED. The previous site shipped +44 20 0000 0000. */
    phone: null as Pending<string>,
    /** True at the level stated. No street address is claimed. */
    place: "London, United Kingdom",
    /**
     * What a sender can expect. This is a commitment the owner controls, not a
     * measured statistic, and it is worded as one.
     */
    replyIntent: "I read every message myself and aim to reply the next working day.",
  },

  /**
   * Social profiles. Each entry is included ONLY when it points at a real
   * profile. The previous site linked https://linkedin.com/, https://x.com/,
   * https://github.com/ and https://dribbble.com/ — four links to four home
   * pages, which tell a visitor nothing and read as unfinished.
   *
   * These also feed the Person schema's `sameAs`, which is a machine-readable
   * identity claim, so a wrong one is worse than an absent one.
   */
  social: [] as { label: string; url: string }[],

  /** Image slots the owner must fill. The interface renders a designed, labelled frame. */
  images: {
    portrait: null as Pending<{ src: string; alt: string }>,
  },
} as const

// ── What I do ───────────────────────────────────────────────────────────────

/** The two groups the six services sit in (D-038). */
export type ServiceGroup = "websites" | "it"

export const SERVICE_GROUPS: { key: ServiceGroup; label: string }[] = [
  { key: "websites", label: "Websites" },
  { key: "it", label: "IT support" },
]

/**
 * One service (docs/PRODUCT-SPEC.md 4.2 and 4.3). Every field is shown on the
 * service's own page, so none may be invented: the hook is the spec's draft
 * hook, needs reuse the sector needs below or the spec's typical jobs, and a
 * price appears only where the spec ties one of the existing package prices
 * to the service. The two IT services have no approved price, so they say
 * "Priced per job, ask for a quote". Coverage, area and response times are
 * left out until the owner confirms them.
 */
export type ServiceCategory = {
  slug: string
  group: ServiceGroup
  title: string
  /** The buyer hook, spec 4.3. Leads the service's own page. */
  hook: string
  /** One line. Appears in the index, the home page and as the page description. */
  summary: string
  /** Two or three sentences on the page itself. */
  detail: string
  /** Typical business needs the service answers. */
  needs: string[]
  deliverables: string[]
  /** What the service does not cover. */
  exclusions: string[]
  /** How the service is priced. */
  price_basis: string
}

/** Said by every service without an approved price (spec 4.3). */
export const QUOTE_ONLY = "Priced per job, ask for a quote."

/** Networking and hardware repair are never offered (D-038). This line is the only place they appear. */
export const IT_EXCLUSION = "Networking installation and hardware repair are not offered."

export const services: ServiceCategory[] = [
  {
    slug: "web-design",
    group: "websites",
    title: "Web design",
    hook: "Help customers understand what you do and how to enquire.",
    summary: "Layout, type and the order of the argument, decided against your content.",
    detail:
      "I design against your actual content, not a template that happens to be free. You see real screens in a browser rather than a mood board, and you sign off on the look before I write a line of code. The reasoning behind a layout matters as much as the layout, so I tell you why a page is ordered the way it is.",
    needs: ["Plain-language service pages", "An obvious way to enquire", "A first impression that holds up", "Right on a phone, first"],
    deliverables: [
      "A short discovery conversation and a written brief",
      "Wireframes for the pages that carry the work",
      "Visual design for every key page",
      "A design system you can extend later",
      "Layouts that hold from a phone to a wide screen",
    ],
    exclusions: ["Copywriting, unless you add it at £350 a page", "A brand mark and basic identity, unless you add it at £600"],
    price_basis: "Part of every website package, from £1,500 for Starter.",
  },
  {
    slug: "web-development",
    group: "websites",
    title: "Web development",
    hook: "A website you can keep using and updating after launch.",
    summary: "I build what I drew. Hand-written, standards-based, and yours to edit.",
    detail:
      "The same person carries the work from design into code, so nothing is lost in a handover. No page builder, no bought theme, nothing you cannot read six months later. I test on real devices and hand over a site you can actually run.",
    needs: ["Content the team updates itself", "Room to grow the site later", "Accessible to people using assistive technology"],
    deliverables: [
      "A hand-built, standards-based front end",
      "Content management you can operate without me",
      "An accessibility pass before launch, with the result written down",
      "Testing across browsers and on real devices",
      "Documentation and a handover session",
    ],
    exclusions: ["Pages beyond your package, at £180 per page", "A system rather than a website, which is quoted separately as Bespoke"],
    price_basis: "Part of every website package, from £1,500 for Starter. A system rather than a website is quoted.",
  },
  {
    slug: "ecommerce",
    group: "websites",
    title: "Ecommerce",
    hook: "Make products easier to find and the buying process easier to follow.",
    summary: "Catalogue, checkout and the unglamorous parts: stock, tax, delivery, refunds.",
    detail:
      "A shop is mostly the parts nobody demonstrates. Checkout is built to be finished rather than admired, and the platform is chosen to fit your catalogue instead of your catalogue being reshaped to fit a platform.",
    needs: ["Fast, legible product pages", "A short, secure checkout", "Stock managed without a developer"],
    deliverables: [
      "Product and catalogue design",
      "A checkout built for completion",
      "Payment and delivery configuration",
      "Order and stock management you control",
      "Launch, and support through the first weeks",
    ],
    exclusions: ["Copywriting, unless you add it at £350 a page", "Integrations with systems you already run, which are quoted separately as Bespoke"],
    price_basis: "From £6,000 for the Ecommerce package.",
  },
  {
    // The slug predates the "Website care" name (D-038). It is kept so the
    // published URL /services/care-and-support goes on working.
    slug: "care-and-support",
    group: "websites",
    title: "Website care",
    hook: "A named person to contact when your website needs attention.",
    summary: "Updates, small changes, and a person who answers when something breaks.",
    detail:
      "Launch is the start. A care plan covers updates, backups, monitoring and the small changes a live site always needs. There is no ticket queue and no account manager: you email me, and I answer. Month to month, and you can stop whenever you like.",
    needs: ["Someone to email when something breaks", "The small changes a live site always needs", "Updates, backups and monitoring handled"],
    deliverables: [
      "A monthly arrangement, cancellable at any time",
      "Security and software updates",
      "Backups and uptime monitoring",
      "Small changes and fixes included",
      "Direct email to the person who built it",
    ],
    exclusions: ["New pages, at £180 per page", "Larger work, which gets its own written scope and price"],
    price_basis: "Care plans from £90 per month, or £450 per month with monthly changes.",
  },
  {
    slug: "it-support",
    group: "it",
    title: "General IT support",
    hook: "Everyday IT problems sorted by someone who explains what went wrong.",
    summary: "Email and accounts, devices and software, backups, and Microsoft 365 or Google Workspace help, explained plainly.",
    detail:
      "I sort the everyday IT jobs a small business runs into: email and account set-up, device and software set-up, backups, and help with Microsoft 365 or Google Workspace. When something has gone wrong, I explain what it was.",
    needs: [
      "Email and accounts to set up",
      "A new device or new software to set up",
      "Backups to put in place",
      "Help with Microsoft 365 or Google Workspace",
    ],
    deliverables: [
      "Email and account set-up",
      "Device and software set-up",
      "Backups",
      "Microsoft 365 or Google Workspace help",
      "A plain explanation of what went wrong",
    ],
    exclusions: [IT_EXCLUSION],
    price_basis: QUOTE_ONLY,
  },
  {
    slug: "it-consultancy",
    group: "it",
    title: "IT consultancy",
    hook: "Straight answers before you spend money on technology.",
    summary: "A fixed-scope session or a short written review that ends in a written recommendation on your tools, accounts and files.",
    detail:
      "Before you buy or replace anything, I look at the question with you in a fixed-scope session or a short written review. You come away with a written recommendation.",
    needs: ["Which tools to use", "What to replace", "How to organise accounts and files"],
    deliverables: ["A fixed-scope session or a short written review", "A written recommendation"],
    exclusions: [IT_EXCLUSION],
    price_basis: QUOTE_ONLY,
  },
]

// ── How I work ──────────────────────────────────────────────────────────────

/**
 * One idea, not a five-step process diagram. This replaces the previous
 * "whyOneTeam" block, which argued the studio's case in the third person.
 */
export const howIWork = {
  claim: "You talk to the person doing the work, from the first call to the last fix.",
  detail:
    "There is no account layer between you and the build. The same person answers the design question and the invoice question, which is why I take a small number of projects at once rather than a large number badly.",
  /** Each row is a question a prospective client actually asks. */
  rows: [
    { q: "Who you meet", a: "Me, at the first call" },
    { q: "Who designs it", a: "Me" },
    { q: "Who builds it", a: "Me, or my studio where a job needs a team" },
    { q: "Who you email after launch", a: "Still me" },
  ],
}

/** What happens after someone gets in touch. Three steps, all within the owner's control. */
export const whatHappensNext: { title: string; detail: string }[] = [
  { title: "I read it myself", detail: "Every message. I aim to reply the next working day." },
  { title: "A short call", detail: "Twenty minutes on the business, what you need, and who it is for." },
  { title: "A fixed price", detail: "A written scope and one number, before any work starts." },
]

// ── Sectors ─────────────────────────────────────────────────────────────────

export type Sector = { title: string; blurb: string; needs: string[] }

export const sectors: Sector[] = [
  {
    title: "Professional services",
    blurb: "Firms whose site has to look as serious as the advice they sell.",
    needs: ["A presence that reads as senior", "Clear service and people pages", "An obvious way to enquire"],
  },
  {
    title: "Healthcare and training",
    blurb: "Providers who must explain a complicated service in plain language.",
    needs: ["Plain-language service pages", "Accessible to people using assistive technology", "Content the team updates itself"],
  },
  {
    title: "Retail and ecommerce",
    blurb: "Brands selling online who care how the shop feels, not only that it works.",
    needs: ["Fast, legible product pages", "A short, secure checkout", "Stock managed without a developer"],
  },
  {
    title: "Startups and founders",
    blurb: "Early teams who need a credible first site without a long build.",
    needs: ["A first impression that holds up", "Room to grow the site later", "A quick build at a fixed price"],
  },
  {
    title: "Charities and non-profits",
    blurb: "Causes that need to move people, on budgets that need respecting.",
    needs: ["Writing and design that move people", "Reachable by every visitor", "Honest pricing"],
  },
  {
    title: "Hospitality and local business",
    blurb: "Places people visit, where the site is the first welcome.",
    needs: ["A warm first impression", "Opening hours and directions you cannot miss", "Right on a phone, first"],
  },
]

// ── Process ─────────────────────────────────────────────────────────────────

export type Stage = { title: string; detail: string }

export const processStages: Stage[] = [
  { title: "Discover", detail: "What the business does, what the site has to do, and who is reading it." },
  { title: "Design", detail: "Real screens in a browser, reviewed against your own content." },
  { title: "Build", detail: "Written by hand, tested as it goes, on a staging link you can watch." },
  { title: "Launch", detail: "Checks, then the switch, then a week of watching it closely." },
  { title: "Care", detail: "Updates, small changes, and a person to email." },
]

// ── Pricing ─────────────────────────────────────────────────────────────────
// Indicative, in GBP, excluding VAT. Starting points rather than quotes: a
// fixed price follows a discovery call. These are the owner's own figures.

export type Package = {
  name: string
  best: string
  price: string
  cadence?: string
  features: string[]
  featured?: boolean
}

export const packages: Package[] = [
  {
    name: "Starter",
    best: "A first site, or a small one that needs replacing",
    price: "£1,500",
    features: [
      "Up to five pages",
      "Design and build",
      "Content management",
      "Accessibility pass before launch",
      "Thirty days of support after launch",
    ],
  },
  {
    name: "Business",
    best: "A site that has to bring in enquiries",
    price: "£3,500",
    featured: true,
    features: [
      "Up to twelve pages",
      "Design and build",
      "Content management and training",
      "Accessibility pass before launch",
      "Search and analytics set up properly",
      "Sixty days of support after launch",
    ],
  },
  {
    name: "Ecommerce",
    best: "Selling online, with stock to manage",
    price: "£6,000",
    features: [
      "Catalogue, product and checkout design",
      "Payment and delivery configuration",
      "Order and stock management",
      "Accessibility pass before launch",
      "Ninety days of support after launch",
    ],
  },
  {
    name: "Bespoke",
    best: "A system rather than a website",
    price: "Quoted",
    features: [
      "Scoped against what you actually need",
      "Integrations with what you already run",
      "A written specification before anything is built",
      "Staged delivery you can stop between stages",
    ],
  },
]

export const addOns: { name: string; price: string }[] = [
  { name: "Additional page, designed and built", price: "£180 per page" },
  { name: "Copywriting for a page", price: "£350" },
  { name: "Brand mark and basic identity", price: "£600" },
  { name: "Care plan, essentials", price: "£90 per month" },
  { name: "Care plan, with monthly changes", price: "£450 per month" },
]

export const alwaysIncluded: string[] = [
  "Layouts that work on a phone",
  "An accessibility pass before launch, with the result written down",
  "Search engine basics: titles, descriptions, sitemap, structured data",
  "Analytics, if you want it, and none if you do not",
  "A handover session, recorded",
  "The code, and the accounts, in your name",
]

export const paymentTerms: { stage: string; share: string }[] = [
  { stage: "On signing", share: "40%" },
  { stage: "On design sign-off", share: "30%" },
  { stage: "On launch", share: "30%" },
]

// ── Questions ───────────────────────────────────────────────────────────────

export const faqs: { q: string; a: string }[] = [
  {
    q: "How long does a site take?",
    a: "A small site is usually a few weeks; a larger one, a couple of months. The honest answer depends far more on how quickly content and feedback come back than on how quickly I build.",
  },
  {
    q: "Do I have to write the content?",
    a: "You know the business better than I do, so your words are usually better than mine. If writing it is the thing that stalls the project, I will write it and you edit.",
  },
  {
    q: "Can I edit the site afterwards?",
    a: "Yes. That is the point of the handover. If you cannot change a price or a phone number without emailing me, I have built it wrong.",
  },
  {
    q: "What happens if something breaks?",
    a: "You email me. On a care plan that is included; without one, I charge for the time. Either way you are emailing the person who built it.",
  },
  {
    q: "Do you work with agencies?",
    a: "Sometimes, as the build half of a design and build pair. Say so in your first message so I can tell you quickly whether it is a fit.",
  },
  {
    q: "Who owns the work?",
    a: "You do, once the final invoice is paid. The code, the domain and the hosting accounts go in your name, not mine.",
  },
]

// ── Writing ─────────────────────────────────────────────────────────────────

/**
 * Static fallback for /resources.
 *
 * The live source is the `posts` table through server/blog.php; see
 * src/marketing/data/blog.ts. This array is what renders when the endpoint is
 * unreachable, so it must stay true on its own.
 *
 * `readMins` was previously asserted per post with no basis. It is gone. The
 * claim "I build to WCAG 2.1 AA as a matter of course" was also removed from
 * the accessibility piece: the project's own accessibility position is
 * measured and recorded in qa/ACCESSIBILITY-AUDIT.md, and the article now says
 * what is actually true.
 */
export type Insight = {
  slug: string
  title: string
  excerpt: string
  date: string
  body: string[]
}

export const insights: Insight[] = [
  {
    slug: "why-one-team-design-and-build",
    title: "Why one person designing and building beats a handover",
    excerpt:
      "Most web projects lose time and quality in the gap between the designer and the developer. Here is what closing it actually changes.",
    date: "2026-05-12",
    body: [
      "The usual web project splits in two. A designer draws the screens, signs them off, and hands a file to a developer who was not in any of the client meetings. What gets built is a translation, and translations lose things.",
      "When the same person designs and builds, there is no handover document to misread. The decisions made while drawing carry straight into the code, and the parts that are expensive to build get caught while they are still cheap to change.",
      "It also means one place for the blame to land. You are not refereeing between two suppliers when something looks wrong. Whoever drew it built it, and owns the result.",
    ],
  },
  {
    slug: "what-makes-a-site-fast",
    title: "What actually makes a website fast",
    excerpt: "Speed is not a setting. It is several dozen small decisions, most of them made before anything is built.",
    date: "2026-04-03",
    body: [
      "Clients often ask for a fast site as though speed were a switch somewhere. It is not. A fast site is the sum of decisions: how images are sized, how much code ships, how fonts load, how the server answers.",
      "I treat performance as a budget set at the start and checked as I go. Every feature costs something, and the cost gets weighed against what the visitor gets for it.",
      "The payoff is not theoretical. A site that appears quickly keeps more of the people who asked for it, and it feels trustworthy before a single word has been read.",
    ],
  },
  {
    slug: "accessibility-is-not-optional",
    title: "Accessibility is not a final check",
    excerpt: "What it costs to retrofit, and why I now price it as part of the build rather than as an extra.",
    date: "2026-02-18",
    body: [
      "Accessibility is usually the line item that goes when a budget tightens. That gets it backwards. A site that locks people out is a site that does not work for part of the audience it was paid to reach.",
      "The practical parts are unglamorous: keyboard support that actually works, contrast you can measure, headings in a sensible order, focus you can see. None of it shows off, which is exactly why it gets cut.",
      "It is also far cheaper before the build than after it. Retrofitting means reopening layout decisions that have already been signed off, so I price the pass into the build and write down what was checked and what was found.",
    ],
  },
]
