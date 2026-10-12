import { useEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { ArrowUpRight, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { site } from "@/marketing/data/site"
import BrandMark from "./BrandMark"
import { actionClass } from "./action-class"

/**
 * The masthead: one floating white pill, three zones.
 *
 * Pattern taken from the 21st.dev "Agency Hero Section" navigation
 * (ShadcnSpace, MIT): brand on the left, a segmented group of links in the
 * centre, and the enquiry action on the right with its arrow in a circle.
 * Rebuilt in the D-037 tokens with no new dependency; see DESIGN-SYSTEM 4.
 *
 * Overflow is designed out rather than squeezed:
 *   - four links, short labels, and never more (the old mega-menu is not
 *     coming back: it declared role="menu" on links and broke the link role);
 *   - the centre group appears only from 1024px, where the measured row fits
 *     with room to spare; below that the links move into the disclosure;
 *   - the enquiry action stays visible from 640px, and inside the disclosure
 *     below that, so it is never more than one tap away.
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

/** The enquiry action with the arrow in a circle. Shared with the hero and footer. */
export function StartProject({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Link
      to="/contact"
      className={actionClass({ variant: "strong", onDark, className: cn("gk-arrow-link gap-3 pr-1.5", className) })}
    >
      Start a project
      <span
        aria-hidden
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          onDark ? "bg-gk-ink text-gk-on-dark" : "bg-gk-on-dark text-gk-ink",
        )}
      >
        <ArrowUpRight className="gk-arrow h-4 w-4" />
      </span>
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
      "inline-flex min-h-[2.5rem] items-center rounded-full px-4 text-body font-medium tracking-[-0.02em] transition-colors duration-150",
      isActive ? "bg-gk-white text-gk-ink shadow-float" : "text-gk-ink-soft hover:text-gk-ink",
    )

  return (
    <header className="pointer-events-none sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="pointer-events-auto relative mx-auto w-full max-w-[76rem]">
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-full bg-gk-white py-2 pl-4 pr-2 shadow-float sm:pl-5 lg:grid-cols-[1fr_auto_1fr]">
          <Link to="/" className="flex min-h-[2.75rem] min-w-0 items-center gap-3 justify-self-start">
            <BrandMark className="h-8 w-8 shrink-0 text-gk-ink" />
            <span className="min-w-0">
              <span className="block truncate text-body font-medium leading-tight tracking-[-0.02em] text-gk-ink">
                {site.name}
              </span>
              <span className="hidden truncate text-[0.75rem] font-bold uppercase leading-tight tracking-[0.04em] text-gk-ink-mute xl:block">
                {site.role} · {site.location}
              </span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1 rounded-full bg-gk-paper p-1">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} className={linkClass}>
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2 justify-self-end">
            <StartProject className="hidden sm:inline-flex" />
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpenOn(open ? null : pathname)}
              aria-expanded={open}
              aria-controls="primary-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gk-paper text-gk-ink lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div
          id="primary-menu"
          hidden={!open}
          className="gk-menu-panel absolute inset-x-0 top-full mt-2 rounded-media bg-gk-white p-3 shadow-lifted lg:hidden"
        >
          <nav aria-label="Primary" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpenOn(null)}>
            <ul>
              {LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-[3rem] items-center rounded-action px-4 text-lede font-medium tracking-[-0.02em] text-gk-ink",
                        isActive && "bg-gk-paper",
                      )
                    }
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <StartProject className="mt-3 w-full justify-between pl-6" />
          </nav>
        </div>
      </div>
    </header>
  )
}
