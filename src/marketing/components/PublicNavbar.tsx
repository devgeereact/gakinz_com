import { useEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { site } from "@/marketing/data/site"

/**
 * The masthead.
 *
 * A ruled line of type, not a floating pill bar. The old navbar carried a
 * Services mega-menu that declared role="menu" and role="menuitem" on
 * navigation links: that overrode the native link role, so assistive
 * technology announced "menu item" and lost the URL, and it promised the ARIA
 * menu keyboard pattern — roving tabindex, arrow keys, typeahead — which was
 * never implemented. It has been removed rather than completed. The four
 * services are a short list on /services, which is one click away and needs
 * no keyboard pattern of its own.
 *
 * The mobile panel is a disclosure, not a modal: no focus trap, because a
 * disclosure should not have one. It does close on Escape and it does return
 * focus to its trigger, both of which were missing.
 */

const LINKS = [
  { to: "/work", label: "Work" },
  { to: "/services", label: "What I do" },
  { to: "/resources", label: "Writing" },
  { to: "/about", label: "About" },
]

export default function PublicNavbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "inline-flex min-h-[2.75rem] items-center text-body text-gk-ink-soft hover:text-gk-ink",
      isActive && "text-gk-ink underline underline-offset-[6px]",
    )

  return (
    <header className="border-b border-gk-edge bg-gk-paper">
      <div className="mx-auto w-full max-w-[76rem] px-5 sm:px-8">
        <div className="flex items-center justify-between gap-6 py-4">
          <Link to="/" className="group min-w-0 py-1">
            <span className="block font-display text-lede leading-none text-gk-ink">{site.name}</span>
            <span className="mt-1 block font-data text-label uppercase text-gk-ink-mute">
              {site.role} · {site.location}
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
            <Link
              to="/contact"
              className="inline-flex min-h-[2.75rem] items-center bg-gk-set px-5 text-body font-medium text-gk-paper hover:bg-gk-ink"
            >
              Start a project
            </Link>
          </nav>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="primary-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center text-gk-ink md:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div
        id="primary-menu"
        hidden={!open}
        className="border-t border-gk-edge bg-gk-paper md:hidden"
      >
        <nav aria-label="Primary" className="mx-auto w-full max-w-[76rem] px-5 py-2 sm:px-8">
          <ul>
            {LINKS.map((l) => (
              <li key={l.to} className="border-b border-gk-rule last:border-b-0">
                <NavLink to={l.to} className="flex min-h-[3rem] items-center text-body text-gk-ink">
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <Link
            to="/contact"
            className="my-4 inline-flex min-h-[2.75rem] w-full items-center justify-center bg-gk-set px-5 text-body font-medium text-gk-paper"
          >
            Start a project
          </Link>
        </nav>
      </div>
    </header>
  )
}
