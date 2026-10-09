import { useId } from "react"
import { cn } from "@/lib/utils"

/**
 * The GAkinz mark: a rounded tile with the G cut out of it.
 *
 * It used to be a tile filled with `hsl(var(--primary))` and a G painted on
 * top in a literal `#fff`. That worked on exactly one background. On the new
 * warm paper the tile came out in a retired violet, and on the dark ink band
 * the white G sat on a colour that no longer exists anywhere else on the site.
 *
 * Now the tile is `currentColor` and the G is a hole through it, so the mark
 * takes the ink of whatever is around it and the letter shows the surface
 * behind. On paper it reads as a dark tile with a paper G; on the ink band it
 * inverts to a light tile with an ink G; and in the CMS, where all four call
 * sites place it in ordinary foreground text, it follows the theme in both
 * light and dark without any of them changing.
 *
 * The cut-out is done with a mask rather than an even-odd fill so it does not
 * depend on the winding of the glyph path. The mask id comes from useId, so
 * two marks on one page cannot collide; the id is stripped to characters that
 * are safe in a fragment reference.
 *
 * Props, `role="img"` and the accessible name are unchanged: four files in
 * src/app render this component and none of them were touched.
 */
export default function BrandMark({ className }: { className?: string }) {
  const maskId = `gk-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`

  return (
    <svg viewBox="0 0 40 40" className={cn(className)} role="img" aria-label="GAkinz">
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">
        <rect width="40" height="40" rx="10" fill="#fff" />
        <path
          d="M27.5 15.2a7.6 7.6 0 1 0 1.4 8.3h-7.1v-3.3h10.7c.1.7.1 1.2.1 1.7 0 6.6-4.8 11.4-11.6 11.4A11.7 11.7 0 1 1 30.6 12.4l-3.1 2.8Z"
          fill="#000"
        />
      </mask>
      <rect width="40" height="40" rx="10" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  )
}
