import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { Link, NavLink } from "react-router-dom"
import { delay, host, ToneCtx, type Tone } from "./site-helpers"
import { kindName, onColour, type Project } from "@/marketing/data/showcase"
import { useSiteCopy } from "@/marketing/data/content"

/**
 * Shared pieces of the public site (D-046). Markup and class names follow the
 * approved prototype one for one; the styles live in src/marketing/site.css.
 */

// ── Icons (24px grid, 2px stroke, decorative) ──────────────────────────────
const svg = (d: ReactNode, fill = false) => (
  <svg viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="2" aria-hidden="true">
    {d}
  </svg>
)
export const IArrow = () => svg(<path d="M5 12h14M13 6l6 6-6 6" />)
export const INe = () => svg(<path d="M7 17L17 7M9 7h8v8" />)
export const IPrev = () => svg(<path d="M15 6l-6 6 6 6" />)
export const INext = () => svg(<path d="M9 6l6 6-6 6" />)
export const IPause = () => svg(<><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></>, true)
export const IPlay = () => svg(<path d="M7 5v14l12-7z" />, true)
export const IMenu = () => svg(<path d="M4 7h16M4 12h16M4 17h16" />)

// ── Small parts ────────────────────────────────────────────────────────────

export function Pill({ status }: { status: string }) {
  return <span className={`pill ${status === "Live" ? "pill--live" : "pill--build"}`}>{status}</span>
}

export function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="ticks">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  )
}

export function Crumbs({ items }: { items: [string | null, string][] }) {
  return (
    <nav className="crumbs mono" aria-label="Breadcrumb">
      <Link to="/">Home</Link>
      {items.map(([to, label]) => (
        <span key={label} style={{ display: "contents" }}>
          <span aria-hidden="true">/</span>
          {to ? <Link to={to}>{label}</Link> : <span aria-current="page">{label}</span>}
        </span>
      ))}
    </nav>
  )
}

export function PageHead({ crumbs, title, lede, children }: { crumbs: [string | null, string][]; title: ReactNode; lede?: string; children?: ReactNode }) {
  return (
    <header className="phead wrap">
      <Crumbs items={crumbs} />
      <h1 className="h-xl rise">{title}</h1>
      {lede && (
        <p className="lede rise" style={delay(80)}>
          {lede}
        </p>
      )}
      {children}
    </header>
  )
}

const london = () =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date())

export function LondonClock() {
  const [t, setT] = useState(london)
  useEffect(() => {
    const id = window.setInterval(() => setT(london()), 20_000)
    return () => window.clearInterval(id)
  }, [])
  return <time>{t}</time>
}


/** Laptop and phone frames. With several projects, `active` picks the one on show. */
export function Devices({ list, active = 0 }: { list: Project[]; active?: number }) {
  const cur = list[active] ?? list[0]
  return (
    <>
      <div className="laptop">
        <div className="laptop__bar">
          <i />
          <i />
          <i />
          <span>{cur ? host(cur) : ""}</span>
        </div>
        <div className="screen">
          {list.map((q, i) =>
            q.desktop ? (
              <img key={q.slug} src={q.desktop.src} alt="" data-on={i === active} loading={i < 2 ? "eager" : "lazy"} width={1200} height={750} />
            ) : null,
          )}
        </div>
      </div>
      <div className="phone">
        {list.map((q, i) =>
          q.mobile ? <img key={q.slug} src={q.mobile.src} alt="" data-on={i === active} loading={i < 2 ? "eager" : "lazy"} width={390} height={844} /> : null,
        )}
      </div>
    </>
  )
}

/** `level` is the card title's heading level: 3 under a section h2, 2 straight under the page h1. */
export function ProjectCard({ p, wide, level = 3 }: { p: Project; wide?: boolean; level?: 2 | 3 }) {
  const Title = level === 2 ? "h2" : "h3"
  const style = { "--cc": p.colour, "--con": onColour(p.colour) } as CSSProperties
  return (
    <Link className={`card ${wide ? "card--wide" : ""}`} to={`/work/${p.slug}`} style={style}>
      <div className="card__media">
        {p.desktop ? <img src={p.desktop.src} alt={p.desktop.alt} loading="lazy" width={1200} height={750} /> : <div className="card__type">{p.name}</div>}
      </div>
      <div className="card__body">
        <div className="card__meta mono">
          <span>{kindName(p.kind)}</span>
          <span>{p.sector}</span>
        </div>
        <Title>{p.name}</Title>
        <p>{p.line}</p>
        <div className="card__foot">
          <Pill status={p.status} />
          <span className="card__go">
            <INe />
          </span>
        </div>
      </div>
    </Link>
  )
}

export function CtaBand({
  projects,
  title = "Tell me what the site has to do.",
  intro = "A paragraph is enough. If it is not something I should take on, I will say so and point you somewhere better.",
  cta = "Start a project",
}: {
  projects: Project[]
  title?: string
  intro?: string
  cta?: string
}) {
  return (
    <div className="band">
      <div className="band__strip" aria-hidden="true">
        {projects.map((p) => (
          <i key={p.slug} style={{ background: p.colour }} />
        ))}
      </div>
      <div>
        <h2 className="h-l">{title}</h2>
        <p className="lede" style={{ marginTop: 16 }}>
          {intro}
        </p>
      </div>
      <Link className="btn btn--main" to="/contact">
        {cta} <IArrow />
      </Link>
    </div>
  )
}

// ── Navigation tone: the nav takes the hero's colours while it sits over one ─

const NAV: [string, string][] = [
  ["/work", "Work"],
  ["/services", "Services"],
  ["/pricing", "Pricing"],
  ["/about", "About"],
  ["/resources", "Writing"],
]

export function SiteChrome({ children, projects }: { children: ReactNode; projects: Project[] }) {
  const [tone, setTone] = useState<Tone>(null)
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const copy = useSiteCopy()

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    if (!open) return
    // While the drawer covers the page, Escape closes it and hands focus back to the
    // toggle, and Tab cycles between the toggle and the drawer links rather than
    // reaching the hidden page behind it (K-045 audit, 2026-10-16).
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        toggle.current?.focus()
        return
      }
      if (e.key !== "Tab") return
      const stops = [toggle.current, ...Array.from(document.querySelectorAll<HTMLElement>("#site-drawer a"))].filter(Boolean) as HTMLElement[]
      if (stops.length === 0) return
      const at = stops.indexOf(document.activeElement as HTMLElement)
      const next = e.shiftKey ? (at <= 0 ? stops.length - 1 : at - 1) : at === -1 || at === stops.length - 1 ? 0 : at + 1
      e.preventDefault()
      stops[next].focus()
    }
    window.addEventListener("keydown", keys)
    return () => window.removeEventListener("keydown", keys)
  }, [open])

  const stable = useCallback((t: Tone) => setTone(t), [])
  // The open drawer sits under the bar on the page background, so the bar drops its slide tone.
  const toned = !solid && !open && tone
  const navStyle = toned ? ({ color: tone.on, "--nav-fg": tone.on, "--nav-bg": tone.bg } as CSSProperties) : undefined

  return (
    <ToneCtx.Provider value={stable}>
      <header className={`nav ${solid ? "solid" : ""}`} style={navStyle}>
        <div className="nav__in">
          <Link className="brand" to="/" aria-label="GAkinz, home">
            <span className="brand__mark" aria-hidden="true">
              <b>G</b>
            </span>
            <span className="brand__name">GAkinz</span>
          </Link>
          <ul className="nav__links">
            {NAV.map(([to, label]) => (
              <li key={to}>
                <NavLink to={to}>{label}</NavLink>
              </li>
            ))}
          </ul>
          <Link className="btn btn--main" to="/contact">
            <span>Start a project</span>
          </Link>
          <button ref={toggle} className="ctrl nav__menu" type="button" aria-expanded={open} aria-controls="site-drawer" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
            <IMenu />
          </button>
        </div>
      </header>
      <nav className={`drawer ${open ? "open" : ""}`} id="site-drawer" aria-label="Menu" aria-hidden={!open}>
        {[["/", "Home"], ...NAV, ["/contact", "Start a project"]].map(([to, label]) => (
          <Link key={to} to={to} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
            {label}
          </Link>
        ))}
      </nav>
      {children}
      <footer className="foot">
        <div className="foot__strip" aria-hidden="true">
          {projects.map((p) => (
            <i key={p.slug} style={{ background: p.colour }} />
          ))}
        </div>
        <div className="wrap">
          <div className="foot__big">
            <div>
              <p className="mono mute">Start a project</p>
              <Link className="foot__mail" to="/contact">
                {copy.contact.email}
              </Link>
            </div>
            <button className="btn" type="button" onClick={() => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}>
              Back to top ↑
            </button>
          </div>
          <div className="foot__cols">
            <div>
              <h2>GAkinz</h2>
              <p className="mute" style={{ maxWidth: "36ch" }}>
                {copy.contact.footer} {copy.contact.reply}
              </p>
            </div>
            <div>
              <h2>Work</h2>
              <ul>
                <li><Link to="/work">All projects</Link></li>
                {projects.slice(0, 2).map((p) => (
                  <li key={p.slug}><Link to={`/work/${p.slug}`}>{p.name}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h2>Studio</h2>
              <ul>
                <li><Link to="/services">Services</Link></li>
                <li><Link to="/pricing">Pricing</Link></li>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/resources">Writing</Link></li>
              </ul>
            </div>
            <div>
              <h2>Clients</h2>
              <ul>
                <li><Link to="/contact">Contact</Link></li>
                <li><Link to="/login">Client login</Link></li>
                <li><Link to="/privacy">Privacy</Link></li>
                <li><Link to="/terms">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="foot__base mono">
            <span>© {new Date().getFullYear()} Gideon Akinlotan · London</span>
            <span>
              London <LondonClock />
            </span>
            <span>The strip at the top is the palette of the work</span>
          </div>
        </div>
      </footer>
    </ToneCtx.Provider>
  )
}
