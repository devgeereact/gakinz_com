import { useEffect, useState } from "react"

// The studio's clock in the CMS header: London time, weekday and hours, in
// mono (D-046). Client-side only. It ticks every 20 seconds, which is enough
// for a minute display.
const fmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
})

export default function ClockPill({ className = "" }: { className?: string }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20_000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className={`whitespace-nowrap px-2 font-mono text-xs text-muted-foreground ${className}`}>
      London <time dateTime={now.toISOString()}>{fmt.format(now)}</time>
    </span>
  )
}
