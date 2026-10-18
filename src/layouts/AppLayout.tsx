import { useEffect, useState } from "react"
import { Menu, PanelLeft, Search } from "lucide-react"
import { Outlet, useLocation } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { GlobalSearch } from "@/components/global-search"
import { navMetaForPath } from "@/components/nav-groups"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserDropdown } from "@/components/UserDropdown"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useSidebar } from "@/components/ui/sidebar-context"
import ClockPill from "@/app/components/ClockPill"
import LockScreen from "@/app/components/LockScreen"
import NotificationBell from "@/app/components/NotificationBell"
import { cn } from "@/lib/utils"

const iconButton =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground hover:border-line-strong [&_svg]:size-[18px]"

// Shows or hides the sidebar: the drawer on a phone, the icon rail on a
// wider screen. The prototype's menu and sidebar icons.
function NavToggle() {
  const { toggleSidebar, isMobile } = useSidebar()
  return (
    <button type="button" className={iconButton} onClick={toggleSidebar} aria-label="Show or hide the menu">
      {isMobile ? <Menu aria-hidden /> : <PanelLeft aria-hidden />}
    </button>
  )
}

// The search button opens the existing GlobalSearch palette by sending it the
// same Ctrl K it already listens for, so the palette keeps one owner.
function openSearch() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
}

// "Group / Title" above each module's own heading, the prototype's `.crumb`.
function Crumb() {
  const { pathname } = useLocation()
  const meta = navMetaForPath(pathname)
  if (!meta) return null
  return (
    <p className="gk-os-mono mb-2 flex flex-wrap gap-1.5 pt-3 text-muted-foreground">
      <span>{meta.group}</span>
      {meta.group !== meta.title && (
        <>
          <span aria-hidden>/</span>
          <span>{meta.title}</span>
        </>
      )}
    </p>
  )
}

export default function AppLayout() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(true)
  const [hovered, setHovered] = useState(false)

  const isExpanded = open || hovered

  // The header gains its hairline once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Responsive sidebar: the full sidebar from 1024px, the icon rail below.
  useEffect(() => {
    const handleResize = () => setOpen(window.innerWidth >= 1024)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <SidebarProvider open={isExpanded} onOpenChange={setOpen}>
      <LockScreen />
      <AppSidebar onHoverChange={setHovered} />

      <SidebarInset className="min-w-0 bg-background">
        <header
          className={cn(
            "sticky top-0 z-30 flex min-h-16 items-center gap-2.5 border-b px-[clamp(16px,3vw,32px)] pb-2.5 pt-[calc(10px+env(safe-area-inset-top,0px))] backdrop-blur-md transition-colors",
            "bg-background/85",
            scrolled ? "border-border" : "border-transparent"
          )}
        >
          <NavToggle />
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search, Control K"
            className="flex h-10 min-w-0 max-w-[440px] flex-[3_1_0%] items-center gap-2.5 rounded-[10px] border border-border bg-card px-3 text-left text-muted-foreground hover:border-line-strong max-[560px]:w-10 max-[560px]:flex-none max-[560px]:justify-center max-[560px]:px-0"
          >
            <Search aria-hidden className="size-[18px] shrink-0" />
            <span className="truncate text-sm max-[560px]:hidden">Search screens and records…</span>
            <kbd className="ml-auto shrink-0 rounded-md border border-border bg-secondary px-1.5 py-px font-mono text-[11px] max-[1180px]:hidden">
              Ctrl K
            </kbd>
          </button>
          {/* The palette itself; its own icon trigger is hidden in favour of the search button above. */}
          <span className="hidden">
            <GlobalSearch />
          </span>
          <span className="flex-1" />
          <ClockPill className="max-[900px]:hidden" />
          <NotificationBell />
          <ThemeToggle />
          <UserDropdown />
        </header>

        <main id="main" className="gk-app-main w-full min-w-0 max-w-[1440px] flex-1 px-[clamp(16px,3vw,32px)] pb-[clamp(16px,3vw,32px)] pt-2">
          <Crumb />
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
