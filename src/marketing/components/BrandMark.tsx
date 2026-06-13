import { cn } from "@/lib/utils"

// GAkinz mark: a rounded "G" tile in the active brand primary. Used in nav,
// footer, favicon. Inherits the public violet via --primary so it always
// matches the surrounding theme (was hardcoded to the CMS violet #6e56cf).
export default function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn(className)} role="img" aria-label="GAkinz">
      <rect width="40" height="40" rx="10" fill="hsl(var(--primary))" />
      <path
        d="M27.5 15.2a7.6 7.6 0 1 0 1.4 8.3h-7.1v-3.3h10.7c.1.7.1 1.2.1 1.7 0 6.6-4.8 11.4-11.6 11.4A11.7 11.7 0 1 1 30.6 12.4l-3.1 2.8Z"
        fill="#fff"
      />
    </svg>
  )
}
