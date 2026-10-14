import { useWork, type WorkRecord } from "./work"

/**
 * The projects the public site shows (D-044).
 *
 * Source of truth is the Work table, edited in the CMS. Until that table holds
 * at least one published record, the site shows the built-in list below, which
 * is the owner's real work: each entry was read from the project's own
 * repository and each screenshot was captured from its local build on
 * 13 October 2026. Nothing here is invented, and no figure or outcome is
 * claimed. Client sites are named with the owner's confirmation (2026-10-13).
 *
 * Nothing on the site may print a count of projects as fixed copy. Counts, where
 * shown, are computed from this list or from the CMS.
 */

export type ProjectKind = "client" | "product" | "experiment" | "writing"
export type ProjectStatus = "Live" | "In build"
export type Shot = { src: string; alt: string }

export type Project = {
  slug: string
  name: string
  kind: ProjectKind
  /** Finishes the hero headline: "I design and build websites for {who}." */
  who: string
  sector: string
  line: string
  built: string[]
  stack: string[]
  status: ProjectStatus
  url: string | null
  /** The client's own brand colour. The hero and card take it. */
  colour: string
  desktop: Shot | null
  mobile: Shot | null
  /** 1 to 5 when the project leads the homepage hero, else null. */
  heroOrder: number | null
  /** CMS write-up rows, when the record has them (Problem and Outcome, or Question and Learned). */
  problem?: string | null
  outcome?: string | null
}

/** Readable text on a brand colour: near-black on light colours, white on dark. */
export function onColour(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return "#FFFFFF"
  const n = parseInt(m[1], 16)
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  // Whichever of white or near-black gives the higher contrast ratio.
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.0525 ? "#FFFFFF" : "#16120A"
}

const shots = (id: string, name: string) => ({
  desktop: { src: `/images/work/${id}-d.webp`, alt: `${name} home page on a laptop` },
  mobile: { src: `/images/work/${id}-m.webp`, alt: `${name} home page on a phone` },
})

export const SHOWCASE: Project[] = [
  { slug: "rotaflow", name: "RotaFlow", kind: "product", who: "shift teams", sector: "Staff scheduling", line: "Organisations build and publish staff rotas. Staff check shifts, clock in, ask for leave and swap shifts from any device.", built: ["Drag-and-drop rota builder with approvals", "Staff app that keeps working offline", "GPS clock-in, timesheets and a rota assistant"], stack: ["React", "TypeScript", "Vite", "Tailwind", "Supabase"], status: "Live", url: "rotaflow.space", colour: "#3B6FE0", ...shots("rotaflow", "RotaFlow"), heroOrder: 1 },
  { slug: "ritagreen", name: "RitaGreen Services", kind: "client", who: "care agencies", sector: "Care staffing, London", line: "Public site and operations platform for a company supplying care staff, cleaning, security and training.", built: ["Public site with staff requests and careers", "Office app for recruitment, compliance and rota", "Staff portal"], stack: ["React", "TypeScript", "Tailwind", "PHP", "MariaDB"], status: "In build", url: "ritagreenservices.com", colour: "#33512D", ...shots("ritagreen", "RitaGreen Services"), heroOrder: 2 },
  { slug: "vitalcare", name: "Vitalcare Training Hub", kind: "client", who: "trainers", sector: "Healthcare training", line: "Website and training platform with CSTF-aligned courses, assessments and certificates anyone can verify.", built: ["Courses, lessons and assessments", "Certificates with public verification", "Store with invoices, cohorts and a forum"], stack: ["React", "TypeScript", "Tailwind", "Supabase"], status: "Live", url: "vitalcare.uk", colour: "#1B2E6B", ...shots("vitalcare", "Vitalcare Training Hub"), heroOrder: 3 },
  { slug: "harni", name: "Harni Muharami", kind: "client", who: "authors", sector: "Author and nurse educator", line: "Author website and bookstore for thirteen books written for nurses and healthcare staff.", built: ["Bookstore for thirteen titles", "Pier Run, a small browser game", "Contact forms through a PHP mail endpoint"], stack: ["React", "TypeScript", "Tailwind", "PHP"], status: "In build", url: "harni.uk", colour: "#FF385C", ...shots("harni", "Harni Muharami"), heroOrder: null },
  { slug: "volume", name: "Volume", kind: "product", who: "writers", sector: "Self-publishing", line: "A local-first app that takes a book from research and outline to finished manuscript, cover and upload pack.", built: ["Research and blueprint stages", "Writing pipeline through OpenRouter", "Print PDF, Word and EPUB export"], stack: ["TypeScript", "Node.js", "OpenRouter"], status: "In build", url: null, colour: "#EBB241", ...shots("volume", "Volume"), heroOrder: null },
  { slug: "priya", name: "Priya's Kitchen", kind: "client", who: "home bakers", sector: "Home bakery, Leeds", line: "Celebration cakes shown with starting prices, and an order form that takes the details up front.", built: ["Cake menu with starting prices", "Order enquiry form"], stack: ["React", "TypeScript", "Tailwind", "Netlify"], status: "In build", url: null, colour: "#4F2149", ...shots("priya", "Priya's Kitchen"), heroOrder: 4 },
  { slug: "dhemmyn", name: "Dhemmyn Food", kind: "client", who: "caterers", sector: "Cakes and small chops, London", line: "Recipes with video, plus enquiry routes for custom cakes and party catering.", built: ["Recipe and video pages", "Cake and catering enquiry forms"], stack: ["React", "TypeScript", "Tailwind", "Netlify"], status: "In build", url: null, colour: "#B0283F", ...shots("dhemmyn", "Dhemmyn Food"), heroOrder: null },
  { slug: "joinery", name: "Okafor Joinery", kind: "client", who: "joiners", sector: "Fitted furniture, Bristol", line: "A site for a one-person workshop that designs, makes and fits furniture, built around a clear enquiry form.", built: ["Site with starting prices", "Enquiry form"], stack: ["React", "TypeScript", "Tailwind", "Netlify"], status: "In build", url: null, colour: "#25282B", ...shots("joinery", "Okafor Joinery"), heroOrder: null },
  { slug: "heritage", name: "Herit Clothing", kind: "client", who: "tailors", sector: "Tailoring, Lagos", line: "Website and back office for a tailoring business: enquiries, measurements, jobs and payments.", built: ["Public shop and website", "Admin for clients, measurements and tailoring jobs", "Payment ledger"], stack: ["React", "Vite", "Bootstrap", "PHP", "MySQL"], status: "Live", url: "heritclothing.com", colour: "#F59E0B", ...shots("heritage", "Herit Clothing"), heroOrder: 5 },
  { slug: "mimmycare", name: "MimmyCare", kind: "client", who: "online shops", sector: "Online retail", line: "Launch page for an online shop, with the app and API set up behind it.", built: ["Launch page", "App shell", "PHP and MySQL API"], stack: ["React", "TypeScript", "Tailwind", "PHP", "MySQL"], status: "In build", url: "mimmycare.com", colour: "#2E3A33", ...shots("mimmycare", "MimmyCare"), heroOrder: null },
  { slug: "ego", name: "EGO LIMITED", kind: "client", who: "maintenance firms", sector: "Maintenance, London", line: "Marketing site and a three-role field service app for a London maintenance company.", built: ["Marketing landing page", "Field service app for office, engineers and clients", "PHP and MySQL API"], stack: ["React", "TypeScript", "Tailwind", "PHP", "MySQL"], status: "Live", url: "egolimited.com", colour: "#2C2C2A", desktop: null, mobile: null, heroOrder: null },
  { slug: "gakinzos", name: "GAkinzOS", kind: "product", who: "studios", sector: "Studio operations", line: "The private system behind this site: enquiries, clients, projects, quotes, invoices, support and a client portal.", built: ["Seven areas covering the whole studio", "Client portal with its own login", "PHP and MySQL API with role checks on every call"], stack: ["React", "TypeScript", "Tailwind", "PHP", "MySQL"], status: "Live", url: "gakinz.com", colour: "#16202B", desktop: null, mobile: null, heroOrder: null },
]

export const HERO_MAX = 5

/** The fields the server batch adds to a work record (D-044). Optional until every caller has them. */
type HeroFields = {
  heroOrder?: number | null
  brandColour?: string | null
  heroWord?: string | null
  heroDesktop?: Shot | null
  heroMobile?: Shot | null
}

const KIND: Record<WorkRecord["kind"], ProjectKind> = { case_study: "client", product: "product", experiment: "experiment", writing: "writing" }

/** Map a CMS work record onto the shape the site renders. */
export function fromRecord(r: WorkRecord & HeroFields): Project {
  const built = (r.rows[1] ?? "")
    .split(/\n+/)
    .map((s) => s.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
  return {
    slug: r.slug,
    name: r.title,
    kind: KIND[r.kind],
    who: (r.heroWord || r.sector || "small businesses").trim(),
    sector: r.sector ?? "",
    line: r.summary ?? "",
    built,
    stack: [],
    status: r.liveUrl ? "Live" : "In build",
    url: r.liveUrl ? r.liveUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") : null,
    colour: r.brandColour || "#16202B",
    desktop: r.heroDesktop ?? (r.cover ? { src: r.cover.src, alt: r.cover.alt } : null),
    mobile: r.heroMobile ?? null,
    heroOrder: r.heroOrder ?? null,
    problem: r.rows[0],
    outcome: r.rows[2],
  }
}

/** The hero: flagged projects with a screenshot, in order, five at most. */
export function heroFrom(list: Project[]): Project[] {
  return list
    .filter((p) => p.heroOrder != null && p.desktop)
    .sort((a, b) => (a.heroOrder ?? 0) - (b.heroOrder ?? 0))
    .slice(0, HERO_MAX)
}

/**
 * Every project the site shows, plus the hero subset. CMS records take over as
 * soon as at least one is published; until then the built-in list stands in.
 */
export function useProjects() {
  const { records, loading, fromCms } = useWork()
  const projects = fromCms && records.length > 0 ? records.map((r) => fromRecord(r as WorkRecord & HeroFields)) : SHOWCASE
  const hero = heroFrom(projects)
  return { projects, hero: hero.length ? hero : heroFrom(SHOWCASE), loading }
}

export const kindName = (k: ProjectKind) =>
  k === "product" ? "Own product" : k === "experiment" ? "Experiment" : k === "writing" ? "Writing" : "Client"
