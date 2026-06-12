import { useEffect, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { Menu, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { services } from "@/marketing/data/site"
import BrandMark from "./BrandMark"

const primary = [
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/work", label: "Work" },
  { to: "/sectors", label: "Sectors" },
  { to: "/resources", label: "Resources" },
]

export default function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [mobileServices, setMobileServices] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false)
    setServicesOpen(false)
    setMobileServices(false)
  }, [location.pathname])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      isActive
        ? "bg-primary/8 text-primary"
        : "text-foreground/70 hover:bg-muted hover:text-foreground",
    )

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all",
        scrolled
          ? "border-b border-border bg-background/80 shadow-sm shadow-primary/5 backdrop-blur-xl"
          : "border-b border-transparent bg-background/60 backdrop-blur",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Primary">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="GAkinz home"
        >
          <BrandMark className="h-8 w-8" />
          <span className="text-lg font-extrabold tracking-tight">
            GAkin<span className="text-primary">z</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {/* Services dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              type="button"
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "text-foreground/70 hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
              aria-expanded={servicesOpen}
              aria-haspopup="true"
              onClick={() => setServicesOpen((v) => !v)}
            >
              Services
              <ChevronDown className={cn("h-4 w-4 transition-transform", servicesOpen && "rotate-180")} />
            </button>
            {servicesOpen && (
              <div className="absolute left-0 top-full w-[34rem] pt-2">
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-popover p-2 shadow-lg">
                  {services.map((s) => (
                    <Link
                      key={s.slug}
                      to={`/services/${s.slug}`}
                      className="rounded-lg p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="text-sm font-semibold text-foreground">{s.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{s.summary}</div>
                    </Link>
                  ))}
                  <Link
                    to="/services"
                    className="col-span-2 rounded-lg bg-accent/60 p-3 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    View all services →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {primary.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild size="sm" className="gk-shine shadow-md shadow-primary/20">
            <Link to="/contact">Start a project</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="rounded-md p-2 text-foreground lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="space-y-1 px-4 py-4">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-base font-medium text-foreground"
              aria-expanded={mobileServices}
              onClick={() => setMobileServices((v) => !v)}
            >
              Services
              <ChevronDown className={cn("h-5 w-5 transition-transform", mobileServices && "rotate-180")} />
            </button>
            {mobileServices && (
              <div className="space-y-1 pl-3">
                {services.map((s) => (
                  <NavLink
                    key={s.slug}
                    to={`/services/${s.slug}`}
                    className="block rounded-md px-3 py-2 text-sm text-foreground/70 hover:text-foreground"
                  >
                    {s.title}
                  </NavLink>
                ))}
              </div>
            )}
            {primary.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className="block rounded-md px-3 py-2 text-base font-medium text-foreground/70 hover:text-foreground"
              >
                {l.label}
              </NavLink>
            ))}
            <div className="flex flex-col gap-2 pt-3">
              <Button asChild variant="outline">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/contact">Start a project</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
