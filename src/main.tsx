import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { ThemeProvider } from "next-themes"
import { Toaster } from "sonner"

import UIThemeProvider from "@/providers/ui-theme-provider"

import { router } from "@/routes"
// Sofia Sans, the public family (D-037). Self-hosted; the browser downloads
// only the unicode ranges a page uses.
import "@fontsource-variable/sofia-sans"
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
