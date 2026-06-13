import { create } from "zustand"

type UIThemeState = {
  theme: string
  setTheme: (theme: string) => void
}

export const useUIThemeStore = create<UIThemeState>((set) => ({
  theme: localStorage.getItem("ui-theme") || "",

  setTheme: (theme) => {
    localStorage.setItem("ui-theme", theme)
    // Single synchronous update — the provider effect ([theme] dep) reapplies the
    // class. The old clear-then-setTimeout double-set caused a one-frame flash to
    // the default theme on every change.
    set({ theme })
  },
}))