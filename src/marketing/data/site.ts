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

export type Sector = { title: string; blurb: string }

export const sectors: Sector[] = [
  { title: "Professional services", blurb: "Firms that need a site as credible as the advice they give." },
  { title: "Healthcare & training", blurb: "Providers who must explain complex services plainly and accessibly." },
  { title: "Retail & ecommerce", blurb: "Brands selling online who care how the shop feels, not just that it works." },
  { title: "Startups & founders", blurb: "Early teams who need a sharp first site without a long, costly build." },
  { title: "Charities & non-profits", blurb: "Causes that need to move people and budgets that need respecting." },
  { title: "Hospitality & local", blurb: "Places people visit, where the site is the first welcome." },
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
  result: string
}

export const work: WorkItem[] = [
  {
    title: "Clinic group website",
    sector: "Healthcare",
    summary: "A multi-site healthcare provider needed one clear home for services across several locations.",
    result: "Enquiries up, support calls down, content the team can update themselves.",
  },
  {
    title: "Independent ecommerce brand",
    sector: "Retail",
    summary: "A growing retailer outgrew an off-the-shelf shop that was slow and hard to manage.",
    result: "Faster store, shorter checkout, stock managed without a developer.",
  },
  {
    title: "Professional services firm",
    sector: "Professional services",
    summary: "A consultancy needed a site that matched the seniority of its work.",
    result: "A credible new presence and a steady stream of qualified leads.",
  },
]
