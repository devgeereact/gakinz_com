import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

// Light or dark, nothing else (D-046). Shows the sun while dark and the moon
// while light, as the prototype does, and switches to the other one.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"
  const label = isDark ? "Switch to light theme" : "Switch to dark theme"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground hover:border-line-strong [&_svg]:size-[18px]"
    >
      {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </button>
  )
}
