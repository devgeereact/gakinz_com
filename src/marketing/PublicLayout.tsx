import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import PublicNavbar from "./components/PublicNavbar"
import PublicFooter from "./components/PublicFooter"

export default function PublicLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // The public site is ALWAYS the light brand theme (brand guideline). A staff
  // user who left the CMS in dark mode carries `html.dark`, which keeps the page
  // body dark — translucent marketing surfaces then composite over it and wash
  // out. We mark <html> with `gk-force-light` (CSS re-asserts light tokens, see
  // index.css) instead of removing `dark`, so next-themes — which owns the
  // `dark` class — can't race us by re-adding it.
  useEffect(() => {
    document.documentElement.classList.add("gk-force-light")
    return () => document.documentElement.classList.remove("gk-force-light")
  }, [])

  return (
    <div className="gk-public flex min-h-screen flex-col bg-background text-foreground">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
