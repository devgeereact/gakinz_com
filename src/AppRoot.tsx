import { StrictMode, useEffect, type ReactNode } from "react"
import { ThemeProvider, useTheme } from "next-themes"
import { Toaster } from "sonner"

import UIThemeProvider from "@/providers/ui-theme-provider"
import { endSeeding } from "@/marketing/data/seed"

/** Ends the seeded first render once hydration has committed. Parent effects run after every child's. */
function Boot({ children }: { children: ReactNode }) {
  useEffect(() => endSeeding(), [])
  return children
}

/**
 * Toasts follow the CMS theme. next-themes only knows the resolved theme below
 * its provider, so the Toaster sits inside it. Only the CMS raises toasts; the
 * public site never does, so nothing visible changes there.
 */
function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme === "dark" ? "dark" : "light"
  return <Toaster position="top-right" richColors closeButton theme={theme} />
}

/**
 * The providers around every page, shared by the browser (src/main.tsx) and the
 * build-time prerender (src/entry-server.tsx). Hydration needs both to render
 * the same tree, down to the useId values BrandMark relies on, so the router is
 * the only part that differs and it is passed in.
 */
export default function AppRoot({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <Boot>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <UIThemeProvider>{children}</UIThemeProvider>
          <ThemedToaster />
        </ThemeProvider>
      </Boot>
    </StrictMode>
  )
}
