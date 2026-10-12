import { useEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { ArrowRight, Clock, Mail, MapPin, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { site } from "@/marketing/data/site"
import BrandMark from "./BrandMark"
import { actionClass } from "./action-class"

/**
 * The masthead: a slim utility line, then one solid bar (D-047).
 *
 * Modelled on the owner's own EGO LTD and RitaGreen sites, which the owner
 * named as the standard: contact facts in a dark utility line, the brand with
 * the nav beside it, and the sign-in link and the one action on the right.
 * Every fact in the utility line comes from `site`; nothing is invented.
 *
 * Overflow is designed out rather than squeezed: four links, never more,
 * shown inline only from 1024px, where the measured row fits with room to
 * spare. Below that they move into the disclosure with the sign-in link and
 * the action. The utility line hides below 768px.
 *
 * The mobile panel is a disclosure, not a modal: no focus trap, because a
 * disclosure should not have one. It closes on Escape (returning focus to its
 * trigger), on a route change, and when a link in it is clicked.
 */

const LINKS = [
  { to: "/work", label: "Work" },
  { to: "/services", label: "Services" },
  { to: "/resources", label: "Writing" },
  { to: "/about", label: "About" },
]

/** The enquiry action. Shared with the hero and the footer. */
export function StartProject({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Link to="/contact" className={actionClass({ variant: "strong", onDark, className: cn("gk-arrow-link", className) })}>
      Start a project
      <ArrowRight aria-hidden className="gk-arrow h-4 w-4" />
    </Link>
  )
}

export default function PublicNavbar() {
  // The menu remembers the path it was opened on, so it is closed on any
  // other route without a state update inside an effect.
  const { pathname } = useLocation()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenOn(null)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative inline-flex min-h-[2.75rem] items-center px-1 text-body font-medium tracking-[-0.01em] transition-colors duration-150",
      "after:absolute after:inset-x-1 after:bottom-1.5 after:h-0.5 after:rounded-full",
      isActive ? "text-gk-ink after:bg-gk-ink" : "text-gk-ink-soft hover:text-gk-ink after:bg-transparent",
    )

  return (
    <>
      {/* ── Utility line ─────────────────────────────────────────────── */}
      <div className="hidden bg-gk-ink text-[0.8125rem] text-gk-on-dark-soft md:block">
        <div className="mx-auto flex h-10 w-full max-w-[76rem] items-center justify-between gap-6 px-8 lg:px-12">
          <div className="flex items-center gap-6">
            <a href={`mailto:${site.contact.email}`} className="inline-flex items-center gap-2 hover:text-gk-on-dark">
              <Mail aria-hidden className="h-3.5 w-3.5" />
              {site.contact.email}
            </a>
            <span className="inline-flex items-center gap-2">
              <MapPin aria-hidden className="h-3.5 w-3.5" />
              {site.contact.place}
            </span>
          </div>
          <span className="inline-flex items-center gap-2">
            <Clock aria-hidden className="h-3.5 w-3.5" />I aim to reply the next working day
          </span>
        </div>
      </div>

      {/* ── Bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gk-rule bg-gk-white/95 backdrop-blur supports-[backdrop-filter]:bg-gk-white/85">
        <div className="relative mx-auto flex h-[4.5rem] w-full max-w-[76rem] items-center gap-10 px-4 sm:px-8 lg:px-12">
          <Link to="/" className="flex min-h-[2.75rem] min-w-0 items-center gap-3">
            <BrandMark className="h-9 w-9 shrink-0 text-gk-ink" />
            <span className="min-w-0">
              <span className="block truncate text-body font-bold leading-tight tracking-[-0.01em] text-gk-ink">
                {site.name}
              </span>
              <span className="block truncate text-[0.6875rem] font-bold uppercase leading-tight tracking-[0.12em] text-gk-ink-mute">
                {site.role}
              </span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-7">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} className={linkClass}>
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/login"
              className="hidden min-h-[2.75rem] items-center px-2 text-body font-medium text-gk-ink-soft transition-colors duration-150 hover:text-gk-ink lg:inline-flex"
            >
              Client login
            </Link>
            <StartProject className="hidden sm:inline-flex" />
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpenOn(open ? null : pathname)}
              aria-expanded={open}
              aria-controls="primary-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-action border border-gk-rule text-gk-ink lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div
          id="primary-menu"
          hidden={!open}
          className="gk-menu-panel absolute inset-x-0 top-full border-b border-gk-rule bg-gk-white px-4 pb-5 pt-2 shadow-lifted sm:px-8 lg:hidden"
        >
          <nav aria-label="Primary" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpenOn(null)}>
            <ul className="divide-y divide-gk-rule">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-[3.25rem] items-center justify-between text-lede font-medium tracking-[-0.01em]",
                        isActive ? "text-gk-ink" : "text-gk-ink-soft",
                      )
                    }
                  >
                    {l.label}
                    <ArrowRight aria-hidden className="h-4 w-4 text-gk-ink-mute" />
                  </NavLink>
                </li>
              ))}
              <li>
                <Link to="/login" className="flex min-h-[3.25rem] items-center text-lede font-medium text-gk-ink-soft">
                  Client login
                </Link>
              </li>
            </ul>
            <StartProject className="mt-4 w-full" />
          </nav>
        </div>
      </header>
    </>
  )
}
