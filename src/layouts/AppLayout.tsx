import { Outlet } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationDropdown } from "@/components/notification-dropdown"
import { AppLauncherDropdown } from "@/components/appLauncher-dropdown"
import { Button } from "@/components/ui/button"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { GlobalSearch } from "@/components/global-search"

import Footer from "@/layouts/Footer"

import ThemeCustomizer from "@/components/theme-customizer"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { LanguageDropdown } from "@/components/language-dropdown"
import { UserDropdown } from "@/components/UserDropdown"

export default function AppLayout() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(true)
  const [hovered, setHovered] = useState(false)

  const isExpanded = open || hovered

  const [themesopen, themessetOpen] = useState(false)

  // Handle header background on scroll
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      setOpen(window.innerWidth >= 1024)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])


  return (
    <SidebarProvider open={isExpanded} onOpenChange={setOpen}>
      <AppSidebar onHoverChange={setHovered} />

      <SidebarInset>
        {/* HEADER */}
        <header
                className={cn(
                    "px-6 sticky top-0 z-40 flex h-16 w-full shrink-0 items-center gap-2 transition-all duration-200 border-b",
                    scrolled
                    ? "bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md"
                    : "bg-transparent"
                )}
              >
              <div className="flex items-center gap-1">
                <SidebarTrigger
                  className="-ml-1 rounded-full h-10 w-10 [&_svg]:!size-5 hover:bg-muted/60 transition-colors"
                />
                <div className="header-quick-link hidden md:flex items-center gap-1">
                   <Button variant="ghost" className="font-medium text-sm h-8 px-3 py-0 rounded-lg">
                    Pricing
                  </Button>
                    <Button variant="ghost" className="font-medium text-sm h-8 px-3 py-0 rounded-lg">
                      Docs
                    </Button>
                    <Button variant="ghost" className="font-medium text-sm h-8 px-3 py-0 rounded-lg">
                      Reports
                    </Button>
                    <Button variant="ghost" className="font-medium text-sm h-8 px-3 py-0 rounded-lg">
                      Support
                    </Button>
                </div>
              </div>

                <div className="ml-auto">
                    <div className="flex items-center gap-1">
                        <GlobalSearch />
                        <ThemeToggle />
                        <LanguageDropdown />
                        <AppLauncherDropdown />
                        <div className="relative hidden md:inline-flex">
                            <NotificationDropdown />
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                                5
                            </span>
                        </div>
                         <UserDropdown />
                    </div>
                </div>
              </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>

        <Footer />
        <ThemeCustomizer />
      </SidebarInset>
    </SidebarProvider>
  )
}
