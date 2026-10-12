import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import PublicNavbar from "./components/PublicNavbar"
import PublicFooter from "./components/PublicFooter"
import { DEMO_ON } from "./demo/flag"

export default function PublicLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // The public site is ALWAYS the light brand theme. A staff user who left the
  // CMS in dark mode carries `html.dark`, which keeps the page body dark and
  // washes out the public surface. We mark <html> with `gk-force-light` (CSS
  // re-asserts the light tokens, see index.css) rather than removing `dark`,
  // so next-themes — which owns the `dark` class — cannot race us by re-adding it.
  useEffect(() => {
    document.documentElement.classList.add("gk-force-light")
    return () => document.documentElement.classList.remove("gk-force-light")
  }, [])

  return (
    <div className="gk-public flex min-h-screen flex-col bg-gk-paper font-ui text-gk-ink">
      {/* WCAG 2.4.1 Bypass Blocks. Visually hidden until focused, then it sits
          above the masthead so it is not obscured (2.4.11). */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-action focus:bg-gk-ink focus:px-5 focus:py-3 focus:text-gk-paper"
      >
        Skip to content
      </a>
      <PublicNavbar />
      <main id="main" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
      {/* Development only: says that tagged items are fictional fixtures.
          DEMO_ON is `false` in a production build, so this never ships. */}
      {DEMO_ON && (
        <p className="pointer-events-none fixed bottom-4 left-4 z-[60] rounded-full border border-dashed border-gk-come/70 bg-gk-white/95 px-4 py-2 font-data text-[0.75rem] font-bold uppercase tracking-[0.04em] text-gk-come shadow-float">
          Demo content on · dev only · VITE_DEMO=off to hide
        </p>
      )}
    </div>
  )
}
