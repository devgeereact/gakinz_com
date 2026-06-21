import { useEffect, useId, useRef, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { ChevronDown, ArrowRight, ArrowUpRight, PenTool, Code2, ShoppingCart, LifeBuoy } from "lucide-react"
import { cn } from "@/lib/utils"
import { services } from "@/marketing/data/site"

const ICONS: Record<string, typeof PenTool> = {
  "web-design": PenTool,
  "web-development": Code2,
  ecommerce: ShoppingCart,
  "care-and-support": LifeBuoy,
}

// Accessible desktop mega-menu for Services.
// - Hover-intent: opens on enter, closes on leave after a short delay so the
//   cursor can travel into the panel without it snapping shut.
// - Keyboard: trigger toggles on Enter/Space; ArrowDown/Enter opens and focuses
//   the first item; Escape closes and returns focus to the trigger.
// - Dismisses on outside click and on route change.
export default function ServicesMenu() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLAnchorElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelId = useId()
  const { pathname } = useLocation()

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }
  const openNow = () => {
    cancelClose()
    setOpen(true)
  }
  const closeSoon = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  // Close on route change.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Escape + outside click while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onPointer)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onPointer)
    }
  }, [open])

  useEffect(() => () => cancelClose(), [])

  const focusFirstItem = () => {
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("a")?.focus())
  }

  return (
    <div ref={wrapRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <NavLink
        ref={triggerRef}
        to="/services"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
            focusFirstItem()
          }
        }}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isActive || open
              ? "bg-[hsl(var(--gk-violet)/0.1)] text-[hsl(var(--gk-violet))]"
              : "text-foreground/70 hover:text-foreground",
          )
        }
      >
        Services
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </NavLink>

      {/* pt-2 keeps a hoverable bridge between trigger and panel */}
      <div
        className={cn(
          "absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2.5 transition-all duration-200",
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0",
        )}
      >
        <div
          ref={panelRef}
          id={panelId}
          role="menu"
          aria-label="Services"
          className="w-[min(40rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-popover/95 shadow-2xl shadow-[hsl(var(--gk-violet)/0.18)] backdrop-blur-xl"
        >
          <div className="grid gap-5 p-5 sm:grid-cols-[1.4fr_1fr]">
            {/* services grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {services.map((s) => {
                const Icon = ICONS[s.slug] ?? Code2
                return (
                  <NavLink
                    key={s.slug}
                    to={`/services/${s.slug}`}
                    role="menuitem"
                    className="group/item flex flex-col gap-2 rounded-xl p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--gk-violet)/0.1)] text-[hsl(var(--gk-violet))] transition-colors group-hover/item:bg-gradient-to-br group-hover/item:from-[hsl(var(--gk-violet))] group-hover/item:to-[hsl(var(--gk-sky))] group-hover/item:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-foreground">{s.title}</span>
                    <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{s.summary}</span>
                  </NavLink>
                )
              })}
            </div>

            {/* featured rail */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-foreground p-5 text-background">
              <span className="gk-grain" aria-hidden />
              <div
                className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[hsl(var(--gk-violet)/0.5)] blur-2xl"
                aria-hidden
              />
              <div className="relative">
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-background/60">One studio</div>
                <p className="mt-2 font-serif text-lg font-bold leading-snug">Design &amp; build, under one roof.</p>
                <p className="mt-2 text-xs leading-relaxed text-background/70">
                  Fixed price after a short call. One team, sketch to launch.
                </p>
              </div>
              <div className="relative mt-4 flex flex-col gap-2">
                <Link
                  to="/services"
                  role="menuitem"
                  className="inline-flex items-center justify-between rounded-lg bg-background/10 px-3 py-2 text-sm font-medium transition-colors hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/40"
                >
                  All services <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/contact"
                  role="menuitem"
                  className="inline-flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm font-semibold text-foreground transition-transform hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/40"
                >
                  Start a project <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
