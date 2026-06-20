import { ReactElement } from "react"
import { cn } from "@/lib/utils"

// A believable "website screenshot" rendered as inline SVG — the right hero
// image for a web studio: it shows the actual product, stays perfectly on
// brand (lavender/rose + ink via the --gk-* tokens), is licence-free and
// razor-sharp at any size. Variants change the page layout to suit a sector.
export type MockVariant = "health" | "retail" | "pro" | "article" | "studio"

const INK = "hsl(var(--gk-indigo))"
const VIOLET = "hsl(var(--gk-violet))"
const SKY = "hsl(var(--gk-sky))"
const soft = (n: number) => `hsl(var(--gk-indigo) / ${n})`

// Browser chrome shared by every variant.
function Chrome({ url }: { url: string }) {
  return (
    <>
      <rect x="0" y="0" width="400" height="300" fill="#ffffff" />
      <rect x="0" y="0" width="400" height="26" fill={soft(0.04)} />
      <circle cx="14" cy="13" r="3.2" fill="hsl(0 70% 70%)" />
      <circle cx="25" cy="13" r="3.2" fill="hsl(40 80% 65%)" />
      <circle cx="36" cy="13" r="3.2" fill="hsl(150 50% 60%)" />
      <rect x="120" y="8" width="160" height="10" rx="5" fill="#fff" stroke={soft(0.08)} />
      <text x="200" y="16" textAnchor="middle" fontSize="7" fill={soft(0.4)} fontFamily="monospace">
        {url}
      </text>
    </>
  )
}

function bar(x: number, y: number, w: number, h: number, fill: string, r = 3) {
  return <rect key={`${x}-${y}-${w}`} x={x} y={y} width={w} height={h} rx={r} fill={fill} />
}

function Health() {
  return (
    <>
      {/* nav */}
      {bar(20, 38, 30, 8, INK)}
      {[250, 290, 330].map((x) => bar(x, 39, 24, 6, soft(0.18)))}
      {/* hero */}
      {bar(20, 64, 150, 14, INK)}
      {bar(20, 84, 120, 14, VIOLET)}
      {bar(20, 108, 160, 6, soft(0.14))}
      {bar(20, 120, 130, 6, soft(0.14))}
      <rect x="20" y="138" width="80" height="20" rx="10" fill={VIOLET} />
      {/* hero image panel */}
      <rect x="210" y="60" width="170" height="100" rx="10" fill="url(#mkGrad)" />
      <circle cx="250" cy="100" r="14" fill="#fff" opacity="0.85" />
      {bar(238, 124, 90, 6, "#fff", 3)}
      {/* 3 info cards */}
      {[20, 148, 276].map((x) => (
        <g key={x}>
          <rect x={x} y="180" width="104" height="96" rx="8" fill={soft(0.04)} stroke={soft(0.07)} />
          <circle cx={x + 20} cy={202} r="9" fill={SKY} opacity="0.9" />
          {bar(x + 14, 220, 70, 7, soft(0.16))}
          {bar(x + 14, 234, 84, 5, soft(0.1))}
          {bar(x + 14, 244, 60, 5, soft(0.1))}
        </g>
      ))}
    </>
  )
}

function Retail() {
  return (
    <>
      {/* nav + search + cart */}
      {bar(20, 38, 28, 8, INK)}
      <rect x="230" y="37" width="110" height="10" rx="5" fill={soft(0.06)} />
      <circle cx="362" cy="42" r="7" fill={VIOLET} />
      {/* product grid 3x2 */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        const x = 20 + col * 124
        const y = 62 + row * 110
        const tint = i % 2 === 0 ? "url(#mkGrad)" : "url(#mkGrad2)"
        return (
          <g key={i}>
            <rect x={x} y={y} width="108" height="66" rx="8" fill={tint} />
            {bar(x, y + 72, 70, 6, soft(0.16))}
            <g>
              {bar(x, y + 84, 34, 8, INK)}
              <rect x={x + 74} y={y + 82} width="34" height="12" rx="6" fill={SKY} />
            </g>
          </g>
        )
      })}
    </>
  )
}

function Pro() {
  return (
    <>
      {bar(20, 38, 32, 8, INK)}
      {[250, 295, 340].map((x) => bar(x, 39, 26, 6, soft(0.18)))}
      {/* left text column */}
      {bar(20, 70, 170, 16, INK)}
      {bar(20, 92, 130, 16, INK)}
      {bar(20, 120, 175, 6, soft(0.14))}
      {bar(20, 132, 160, 6, soft(0.14))}
      {bar(20, 144, 140, 6, soft(0.14))}
      <rect x="20" y="164" width="86" height="20" rx="4" fill={VIOLET} />
      <rect x="116" y="164" width="70" height="20" rx="4" fill="none" stroke={soft(0.2)} />
      {/* right quote/portrait card */}
      <rect x="220" y="60" width="160" height="128" rx="10" fill={soft(0.04)} stroke={soft(0.07)} />
      <circle cx="248" cy="90" r="14" fill="url(#mkGrad)" />
      {bar(272, 82, 80, 7, soft(0.16))}
      {bar(272, 95, 60, 6, soft(0.1))}
      {bar(238, 120, 124, 6, soft(0.12))}
      {bar(238, 132, 124, 6, soft(0.12))}
      {bar(238, 144, 90, 6, soft(0.12))}
      {/* stat row */}
      {[20, 148, 276].map((x) => (
        <g key={x}>
          <rect x={x} y="206" width="104" height="70" rx="8" fill={soft(0.04)} stroke={soft(0.07)} />
          {bar(x + 16, 222, 40, 14, VIOLET)}
          {bar(x + 16, 244, 72, 6, soft(0.12))}
          {bar(x + 16, 256, 54, 6, soft(0.1))}
        </g>
      ))}
    </>
  )
}

function Article() {
  return (
    <>
      {bar(20, 38, 30, 8, INK)}
      {[300, 335].map((x) => bar(x, 39, 26, 6, soft(0.18)))}
      {/* eyebrow + title */}
      {bar(20, 64, 60, 6, VIOLET)}
      {bar(20, 80, 250, 16, INK)}
      {bar(20, 102, 200, 16, INK)}
      {/* meta */}
      {bar(20, 128, 90, 6, soft(0.14))}
      {/* feature image */}
      <rect x="20" y="146" width="360" height="70" rx="10" fill="url(#mkGrad)" />
      {/* paragraph lines */}
      {[228, 240, 252, 264].map((y, i) => bar(20, y, i === 3 ? 230 : 360, 5, soft(0.1)))}
    </>
  )
}

function Studio() {
  return (
    <>
      {bar(20, 38, 30, 8, INK)}
      {[270, 310, 350].map((x) => bar(x, 39, 22, 6, soft(0.18)))}
      {bar(20, 64, 150, 14, INK)}
      {bar(20, 84, 110, 14, VIOLET)}
      {bar(20, 108, 150, 6, soft(0.14))}
      {bar(20, 120, 120, 6, soft(0.14))}
      <rect x="20" y="140" width="78" height="20" rx="6" fill={INK} />
      <rect x="210" y="60" width="170" height="100" rx="10" fill="url(#mkGrad)" />
      {[20, 148, 276].map((x, i) => (
        <g key={x}>
          <rect x={x} y="182" width="104" height="94" rx="8" fill={soft(0.04)} stroke={soft(0.07)} />
          <rect x={x + 14} y="196" width="22" height="22" rx="6" fill={i === 1 ? SKY : VIOLET} opacity="0.9" />
          {bar(x + 14, 228, 76, 6, soft(0.16))}
          {bar(x + 14, 240, 60, 5, soft(0.1))}
          {bar(x + 14, 250, 70, 5, soft(0.1))}
        </g>
      ))}
    </>
  )
}

const VARIANTS: Record<MockVariant, () => ReactElement> = {
  health: Health,
  retail: Retail,
  pro: Pro,
  article: Article,
  studio: Studio,
}

const URLS: Record<MockVariant, string> = {
  health: "clinic.example",
  retail: "shop.example",
  pro: "firm.example",
  article: "gakinz.com/insights",
  studio: "gakinz.com",
}

// Map a free-text sector to the closest mockup layout.
export function variantForSector(sector: string): MockVariant {
  const s = sector.toLowerCase()
  if (s.includes("health") || s.includes("clinic")) return "health"
  if (s.includes("retail") || s.includes("ecommerce") || s.includes("commerce")) return "retail"
  if (s.includes("professional") || s.includes("services") || s.includes("startup")) return "pro"
  return "studio"
}

// Map a service slug to the kind of site that service tends to produce.
export function variantForService(slug: string): MockVariant {
  if (slug.includes("ecommerce") || slug.includes("commerce")) return "retail"
  if (slug.includes("development")) return "pro"
  return "studio"
}

export default function SiteMockup({
  variant = "studio",
  className,
  url,
}: {
  variant?: MockVariant
  className?: string
  url?: string
}) {
  const Body = VARIANTS[variant]
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="Website preview"
    >
      <defs>
        <linearGradient id="mkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={VIOLET} stopOpacity="0.85" />
          <stop offset="100%" stopColor={SKY} stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="mkGrad2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={SKY} stopOpacity="0.7" />
          <stop offset="100%" stopColor={VIOLET} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <Chrome url={url ?? URLS[variant]} />
      <Body />
    </svg>
  )
}
