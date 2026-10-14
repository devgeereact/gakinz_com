import { useEffect } from "react"

// The four custom background themes (dark-blue, classic-light, gaussian-black
// and semi-dark) were retired with the GAkinzOS restyle (D-046). The CMS is
// light or dark only, and next-themes owns that class.
//
// A browser that chose one of the old themes still has its class name saved
// under "ui-theme". This provider clears that once, and strips any leftover
// class from <html>, so nobody is stuck on a theme whose styles are gone.
const RETIRED_THEMES = ["dark-blue", "classic-light", "gaussian-black", "semi-dark"]
const RETIRED_STORAGE_KEY = "ui-theme"

export default function UIThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const html = document.documentElement
    RETIRED_THEMES.forEach((t) => html.classList.remove(t))
    try {
      localStorage.removeItem(RETIRED_STORAGE_KEY)
    } catch {
      // Storage can be blocked; there is nothing to clear then.
    }
  }, [])

  return <>{children}</>
}
