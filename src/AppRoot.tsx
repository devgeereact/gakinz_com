import { StrictMode, useEffect, type ReactNode } from "react"
import { ThemeProvider } from "next-themes"
import { Toaster } from "sonner"

import UIThemeProvider from "@/providers/ui-theme-provider"
import { endSeeding } from "@/marketing/data/seed"

/** Ends the seeded first render once hydration has committed. Parent effects run after every child's. */
function Boot({ children }: { children: ReactNode }) {
  useEffect(() => endSeeding(), [])
  return children
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
        </ThemeProvider>
        <Toaster position="top-right" richColors closeButton />
      </Boot>
    </StrictMode>
  )
}
