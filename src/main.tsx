import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { ThemeProvider } from "next-themes"
import { Toaster } from "sonner"

import UIThemeProvider from "@/providers/ui-theme-provider"

import { router } from "@/routes"
// D-046 type, self-hosted for both surfaces; the browser downloads only the
// unicode ranges a page uses. Bricolage Grotesque for display, Hanken Grotesk
// for text, JetBrains Mono for figures and labels.
// The optical-size build: weight and opsz axes, so display sizes get the
// tighter letterforms the design was approved with.
import "@fontsource-variable/bricolage-grotesque/opsz.css"
import "@fontsource-variable/hanken-grotesk"
import "@fontsource-variable/jetbrains-mono"
import "@/index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      
      <UIThemeProvider>
        <RouterProvider router={router} />
      </UIThemeProvider>
    </ThemeProvider>
    <Toaster position="top-right" richColors closeButton />
  </React.StrictMode>
)
