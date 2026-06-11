// Single source of truth for GAkinz corporate site content.
// Real copy, UK English, no marketing filler (per brief §10).

export const company = {
  name: "GAkinz",
  tagline: "One team that draws the vision and builds it properly.",
  descriptor: "Web design and development studio",
  email: "hello@gakinz.com",
  phone: "+44 20 0000 0000",
  address: "London, United Kingdom",
  hours: "Monday to Friday, 9am – 6pm",
  reg: "Company registration number 00000000 (England & Wales)",
  social: {
    linkedin: "https://www.linkedin.com/",
    x: "https://x.com/",
    github: "https://github.com/",
    dribbble: "https://dribbble.com/",
  },
}

export type ServiceCategory = {
  slug: string
  title: string
  summary: string
  detail: string
  deliverables: string[]
}

export const services: ServiceCategory[] = [
  {
    slug: "web-design",
    title: "Web design",
    summary: "Brand-led design that reads well and behaves well in a visitor's hands.",
    detail:
      "We design the whole experience, from the first impression to the small moments that make a site feel considered. You see real screens, not mood boards, and you sign off on the look before a line of code is written.",
    deliverables: [
      "Discovery and a clear brief",
      "Wireframes and prototypes",
      "Visual design for every key page",
      "A reusable design system",
      "Responsive layouts down to mobile",
    ],
  },
  {
    slug: "web-development",
    title: "Web development",
    summary: "Fast, accessible, maintainable builds, ready for the people who use them.",
    detail:
      "We build what we draw. The same team carries the work from design into code, so nothing falls between the two. We write to web standards, test on real devices, and hand over a site you can actually run.",
    deliverables: [
      "Hand-built, standards-based front end",
      "Content management you can use",
      "Performance and accessibility passes",
      "Cross-browser and device testing",
      "Documentation and handover",
    ],
  },
  {
    slug: "ecommerce",
    title: "Ecommerce",
    summary: "Shops that make buying simple and managing stock straightforward.",
    detail:
      "We build storefronts that load quickly, read clearly, and keep checkout short. Behind the scenes you get the tools to manage products, orders and payments without fighting the system.",
    deliverables: [
      "Product and catalogue design",
      "Checkout built for completion",
      "Payment and shipping setup",
      "Order and stock management",
      "Launch and post-launch support",
    ],
  },
  {
    slug: "care-and-support",
    title: "Care & support",
    summary: "Once a site is live, we keep it healthy, secure and moving forward.",
    detail:
      "Launch is the start, not the finish. Our care plans cover updates, fixes, security and small improvements, so your site keeps pace with the business instead of ageing in place.",
    deliverables: [
      "Monthly care plans",
      "Security and software updates",
      "Backups and uptime monitoring",
      "A support desk for issues",
      "Ongoing improvements",
    ],
  },
]

export type Sector = { title: string; blurb: string; needs: string[] }

export const sectors: Sector[] = [
  {
    title: "Professional services",
    blurb: "Firms that need a site as credible as the advice they give.",
    needs: ["A presence that signals seniority", "Clear service and team pages", "Easy ways to enquire"],
  },
  {
    title: "Healthcare & training",
    blurb: "Providers who must explain complex services plainly and accessibly.",
    needs: ["Plain-language service pages", "WCAG-level accessibility", "Content the team can update"],
  },
  {
    title: "Retail & ecommerce",
    blurb: "Brands selling online who care how the shop feels, not just that it works.",
    needs: ["Fast, clear product pages", "A short, secure checkout", "Stock managed without a developer"],
  },
  {
    title: "Startups & founders",
    blurb: "Early teams who need a sharp first site without a long, costly build.",
    needs: ["A credible first impression", "Room to grow the site later", "A quick, fixed-price build"],
  },
  {
    title: "Charities & non-profits",
    blurb: "Causes that need to move people and budgets that need respecting.",
    needs: ["Copy and design that move people", "Accessible to every visitor", "Sensible, honest pricing"],
  },
  {
    title: "Hospitality & local",
    blurb: "Places people visit, where the site is the first welcome.",
    needs: ["A warm first impression", "Clear opening hours and location", "Looks right on a phone"],
  },
]

// Why one team matters (from "Capabilities Overview") — reused across pages.
export type Reason = { title: string; detail: string }

export const whyOneTeam: Reason[] = [
  { title: "No handoff gap", detail: "Nothing is lost when the same people design and build." },
  { title: "One point of contact", detail: "You talk to the studio doing the work, not a middle layer." },
  { title: "Faster decisions", detail: "Design and build questions get answered in the same room." },
  { title: "Quality all the way through", detail: "Looks right and works right are held to one standard." },
]

// What happens after you get in touch (Contact / Website Copy).
export const contactSteps: Reason[] = [
  { title: "We read your message", detail: "Every one, and we reply within one working day." },
  { title: "A short discovery call", detail: "We learn the business, the goals, and the audience." },
  { title: "A fixed price", detail: "A clear scope and number before any work begins." },
]

export type Insight = {
  slug: string
  title: string
  excerpt: string
  date: string
  readMins: number
  body: string[]
}

export const insights: Insight[] = [
  {
    slug: "why-one-team-design-and-build",
    title: "Why one team for design and build beats a handoff",
    excerpt:
      "Most web projects lose time and quality in the gap between the designer and the developer. Here is how we close it.",
    date: "2026-05-12",
    readMins: 5,
    body: [
      "The classic web project splits in two. A designer draws the screens, signs them off, and hands a file to a developer who has never sat in the client meetings. What the developer builds is a translation, and translations lose things.",
      "When the same team designs and builds, there is no handover document to misread. Decisions made in the design carry straight into the code, and the parts that are hard to build get caught while they are still cheap to change.",
      "It also means one point of accountability. You are not refereeing between two suppliers when something looks off. The team that drew it is the team that built it, and they own the result end to end.",
    ],
  },
  {
    slug: "what-makes-a-site-fast",
    title: "What actually makes a website fast",
    excerpt: "Speed is not one setting. It is a series of small, deliberate choices made throughout a build.",
    date: "2026-04-03",
    readMins: 6,
    body: [
      "Clients often ask for a fast site as if speed were a switch. It is not. A fast site is the sum of dozens of decisions: how images are sized, how much code ships, how fonts load, how the server responds.",
      "We treat performance as a budget, set at the start and checked throughout. Every feature has a cost, and we weigh that cost against what it gives the visitor.",
      "The payoff is real. A site that loads quickly keeps more people, ranks better, and feels more trustworthy before a single word is read.",
    ],
  },
  {
    slug: "accessibility-is-not-optional",
    title: "Accessibility is not an extra",
    excerpt: "Building for everyone is a baseline, not a premium feature. Here is how we approach it.",
    date: "2026-02-18",
    readMins: 4,
    body: [
      "Accessibility gets treated as a line item to cut when budgets tighten. That is the wrong way to see it. A site that locks people out is simply a site that does not work for part of its audience.",
      "We build to WCAG 2.1 AA as a matter of course: real keyboard support, sensible contrast, proper structure, focus that you can see. None of it shows off, and that is the point.",
      "Good accessibility also makes a site better for everyone else. Clear structure and readable text help every visitor, not only those using assistive technology.",
    ],
  },
]

export type WorkItem = {
  title: string
  sector: string
  summary: string
  challenge: string
  approach: string
  result: string
  services: string[]
}

export const work: WorkItem[] = [
  {
    title: "Clinic group website",
    sector: "Healthcare",
    summary: "A multi-site healthcare provider needed one clear home for services across several locations.",
    challenge: "Services were spread across separate, inconsistent pages, and the team couldn't update them without help.",
    approach: "We designed one clear structure for every location and built it on a content system the team runs themselves.",
    result: "Enquiries up, support calls down, content the team can update themselves.",
    services: ["Web design", "Web development", "Care & support"],
  },
  {
    title: "Independent ecommerce brand",
    sector: "Retail",
    summary: "A growing retailer outgrew an off-the-shelf shop that was slow and hard to manage.",
    challenge: "A template store had become slow, and managing stock and orders was a daily fight.",
    approach: "We rebuilt the storefront for speed, shortened the checkout, and gave them tools to run stock without a developer.",
    result: "Faster store, shorter checkout, stock managed without a developer.",
    services: ["Web design", "Ecommerce"],
  },
  {
    title: "Professional services firm",
    sector: "Professional services",
    summary: "A consultancy needed a site that matched the seniority of its work.",
    challenge: "An ageing site undersold the firm and brought in few qualified enquiries.",
    approach: "We shaped a credible, considered design and built clear paths to enquire, then tuned the SEO basics.",
    result: "A credible new presence and a steady stream of qualified leads.",
    services: ["Web design", "Web development"],
  },
]

// ── Pricing (from "Services & Pricing") ──────────────────────────────────────
// Indicative GBP, ex VAT. Starting points, not final quotes — a fixed price
// follows a short discovery call.

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
    best: "A new business getting online",
    price: "£1,500",
    features: [
      "Up to 5 pages",
      "Design + build by one team",
      "Mobile-ready, responsive",
      "Basic on-page SEO",
      "Contact form",
    ],
  },
  {
    name: "Growth",
    best: "An established business that wants more",
    price: "£3,500",
    featured: true,
    features: [
      "Up to 12 pages",
      "Custom design",
      "Content management system",
      "Blog",
      "On-page SEO + analytics",
    ],
  },
  {
    name: "Commerce",
    best: "Selling products or services online",
    price: "£6,000",
    features: [
      "Online store + checkout",
      "Secure payments",
      "Product pages + catalogue",
      "Content management system",
      "Performance tuning",
    ],
  },
  {
    name: "Custom",
    best: "Something more involved",
    price: "Quoted",
    features: [
      "Scoped to your needs after discovery",
      "Integrations and bespoke features",
      "Phased delivery if needed",
      "A fixed price before any work begins",
    ],
  },
]

export type AddOn = { name: string; what: string; price: string }

export const addOns: AddOn[] = [
  { name: "Copywriting", what: "We write or polish your page copy", price: "From £350" },
  { name: "Logo & brand basics", what: "Wordmark, colours, and simple guidelines", price: "From £600" },
  { name: "Extra pages", what: "Beyond the package count", price: "£180 / page" },
  { name: "Ongoing care plan", what: "Hosting checks, updates, small changes", price: "£90 / month" },
  { name: "SEO growth retainer", what: "Monthly SEO and content work", price: "£450 / month" },
]

export const alwaysIncluded: string[] = [
  "One team handling both design and development",
  "Responsive design for phones, tablets, and desktops",
  "Accessibility and SEO fundamentals built in",
  "A preview link so you see the real site before it goes live",
  "Clear timelines and a single point of contact",
]

export const paymentTerms: string[] = [
  "A 40% deposit confirms your project and reserves your start date.",
  "A 30% payment is due when designs are approved and build begins.",
  "The final 30% is due before the site goes live.",
  "Care plans and retainers are billed monthly in advance.",
]

// ── Process (from "Capabilities Overview") ───────────────────────────────────
export type Stage = { n: string; title: string; what: string; get: string }

export const processStages: Stage[] = [
  { n: "01", title: "Discover", what: "We learn your business, goals, and audience.", get: "A short brief we both agree on" },
  { n: "02", title: "Design", what: "We shape the look and the journey.", get: "Designs to review and sign off" },
  { n: "03", title: "Build", what: "We develop the approved design.", get: "A working site on a preview link" },
  { n: "04", title: "Launch", what: "We test, fix, and go live.", get: "Your site, live and checked" },
  { n: "05", title: "Support", what: "We help as you grow.", get: "A team you can call" },
]

// ── FAQs ─────────────────────────────────────────────────────────────────────
export type Faq = { q: string; a: string }

export const faqs: Faq[] = [
  {
    q: "Do the same people design and build my site?",
    a: "Yes. That is the whole point of GAkinz. The people who decide how your site looks are the people who make it work, so the version you approve is the version you get.",
  },
  {
    q: "Are these prices final?",
    a: "They are starting points, not final quotes. After a short discovery call we send a fixed price for your project, so you know the number before any work begins.",
  },
  {
    q: "Can I update the site myself afterwards?",
    a: "Growth and Commerce projects include a content management system, so you can change text and images without calling us every time. We hand over a site you can actually run.",
  },
  {
    q: "What happens after launch?",
    a: "Launch is the start, not the end. We test, fix, and stay on hand. An optional care plan covers hosting checks, updates, and small changes as your business grows.",
  },
  {
    q: "How long does a project take?",
    a: "It depends on size and how quickly we get content and feedback. A Starter site is usually a few weeks; larger and ecommerce builds run longer. You always know what stage you are at.",
  },
]
