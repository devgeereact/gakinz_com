import { useEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { site } from "@/marketing/data/site"
import BrandMark from "./BrandMark"
import { actionClass } from "./action-class"

/**
 * The masthead: the reference's floating navigation pill.
 *
 * A white pill that docks 16px below the top of the viewport and stays
 * there, lifted by the reference's level-one shadow. The GAkinz mark sits at
 * the left of it on every width, which is what the brand-confusion check in
 * DESIGN-SYSTEM 10.2 looks for first. `html { scroll-padding-top: 6rem }`
 * keeps a focused target clear of it (WCAG 2.4.11).
 *
 * The old Services mega-menu declared role="menu" on navigation links, which
 * overrode the link role and promised a keyboard pattern it never had. It is
 * not coming back: four links and one action fit the pill.
 *
 * The mobile panel is a disclosure, not a modal: no focus trap, because a
 * disclosure should not have one. It closes on Escape and returns focus to
 * its trigger. It drops out of the pill as a rounded white panel and fades
 * in over 200ms where motion is allowed; it leaves instantly.
 */

const LINKS = [
  { to: "/work", label: "Work" },
  { to: "/services", label: "What I do" },
  { to: "/resources", label: "Writing" },
  { to: "/about", label: "About" },
]

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
      "inline-flex min-h-[2.75rem] items-center rounded-full px-4 text-body font-medium tracking-[-0.02em] text-gk-ink-soft transition-colors duration-150 hover:text-gk-ink",
      isActive && "bg-gk-paper text-gk-ink",
    )

  return (
    <header className="pointer-events-none sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="pointer-events-auto relative mx-auto w-full max-w-[76rem]">
        <div className="flex items-center justify-between gap-4 rounded-full bg-gk-white py-2 pl-4 pr-2 shadow-float sm:pl-6 lg:py-2.5 lg:pr-2.5">
          <Link to="/" className="flex min-h-[2.75rem] min-w-0 items-center gap-3">
            <BrandMark className="h-8 w-8 shrink-0 text-gk-ink" />
            <span className="min-w-0">
              <span className="block truncate text-body font-medium leading-tight tracking-[-0.02em] text-gk-ink">
                {site.name}
              </span>
              <span className="hidden text-label font-bold uppercase leading-tight text-gk-ink-mute lg:block">
                {site.role} · {site.location}
              </span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
            <Link to="/contact" className={actionClass({ variant: "strong", className: "ml-2" })}>
              Start a project
            </Link>
          </nav>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpenOn(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="primary-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gk-paper text-gk-ink md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div
          id="primary-menu"
          hidden={!open}
          className="gk-menu-panel absolute inset-x-0 top-full mt-2 rounded-media bg-gk-white p-3 shadow-lifted md:hidden"
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
            <Link to="/contact" className={actionClass({ variant: "strong", className: "mt-3 w-full" })}>
              Start a project
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
