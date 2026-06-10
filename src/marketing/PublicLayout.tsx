import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import PublicNavbar from "./components/PublicNavbar"
import PublicFooter from "./components/PublicFooter"

export default function PublicLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

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
