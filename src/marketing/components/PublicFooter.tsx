import { Link } from "react-router-dom"
import { ArrowUp, ArrowRight, Github, Linkedin, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { company, services } from "@/marketing/data/site"
import BrandMark from "./BrandMark"

export default function PublicFooter() {
  const year = 2026
  return (
    <footer className="relative overflow-hidden border-t border-border bg-muted/40">
      {/* CTA band */}
      <div className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              Let&rsquo;s build something worth visiting.
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              One short call, a fixed price, then a site that looks right and works right.
            </p>
          </div>
          <Button asChild size="lg" className="gk-shine shadow-md shadow-primary/20">
            <Link to="/contact">
              Start a project <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Col 1 — brand + contact */}
          <div>
            <Link to="/" className="flex items-center gap-2" aria-label="GAkinz home">
              <BrandMark className="h-8 w-8" />
              <span className="text-lg font-extrabold tracking-tight">
                GAkin<span className="text-primary">z</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{company.tagline}</p>
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              <li>
                <a className="hover:text-foreground" href={`mailto:${company.email}`}>
                  {company.email}
                </a>
              </li>
              <li>{company.address}</li>
            </ul>
          </div>

          {/* Col 2 — company */}
          <div>
            <h2 className="text-sm font-semibold text-foreground">Studio</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-foreground" to="/about">About</Link></li>
              <li><Link className="hover:text-foreground" to="/pricing">Pricing</Link></li>
              <li><Link className="hover:text-foreground" to="/work">Work</Link></li>
              <li><Link className="hover:text-foreground" to="/sectors">Sectors</Link></li>
              <li><Link className="hover:text-foreground" to="/contact">Contact</Link></li>
            </ul>
          </div>

          {/* Col 3 — services */}
          <div>
            <h2 className="text-sm font-semibold text-foreground">Services</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link className="hover:text-foreground" to={`/services/${s.slug}`}>
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — resources + legal */}
          <div>
            <h2 className="text-sm font-semibold text-foreground">Resources</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-foreground" to="/resources">Insights</Link></li>
              <li><Link className="hover:text-foreground" to="/privacy">Privacy</Link></li>
              <li><Link className="hover:text-foreground" to="/terms">Terms</Link></li>
              <li><Link className="hover:text-foreground" to="/cookies">Cookies</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <div>
            <p>© {year} {company.name}. All rights reserved.</p>
            <p className="mt-1 text-xs">{company.reg}</p>
          </div>
          <div className="flex items-center gap-4">
            <a href={company.social.linkedin} aria-label="LinkedIn" className="hover:text-foreground" target="_blank" rel="noreferrer">
              <Linkedin className="h-5 w-5" />
            </a>
            <a href={company.social.x} aria-label="X" className="hover:text-foreground" target="_blank" rel="noreferrer">
              <Twitter className="h-5 w-5" />
            </a>
            <a href={company.social.github} aria-label="GitHub" className="hover:text-foreground" target="_blank" rel="noreferrer">
              <Github className="h-5 w-5" />
            </a>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-1 rounded-md px-2 py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowUp className="h-4 w-4" /> Top
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
