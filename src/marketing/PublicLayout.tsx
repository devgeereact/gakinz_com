import { useEffect, useRef } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { SiteChrome } from "./components/site-ui"
import { useProjects } from "./data/showcase"
import "./site.css"

/**
 * The public site frame (D-044): navigation, page, footer, all inside the
 * `.gk-site` scope so its styles never reach GAkinzOS.
 *
 * On a route change the window returns to the top and focus moves to the new
 * page's heading, so a keyboard or screen reader user lands on the content
 * rather than on the link they just used. The first load is left alone.
 */
export default function PublicLayout() {
  const { pathname } = useLocation()
  const { projects } = useProjects()
  const last = useRef(pathname)

  useEffect(() => {
    window.scrollTo(0, 0)
    // Compare paths rather than counting runs, so StrictMode's double effect in
    // development does not move focus on the first load.
    if (last.current === pathname) return
    last.current = pathname
    const h = document.querySelector<HTMLElement>("#main h1")
    if (h) {
      h.setAttribute("tabindex", "-1")
      h.focus({ preventScroll: true })
    }
  }, [pathname])

  // The page behind the site is dark too, so overscroll never flashes white.
  useEffect(() => {
    document.documentElement.classList.add("gk-site-root")
    return () => document.documentElement.classList.remove("gk-site-root")
  }, [])

  return (
    <div className="gk-site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <SiteChrome projects={projects}>
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </SiteChrome>
    </div>
  )
}
