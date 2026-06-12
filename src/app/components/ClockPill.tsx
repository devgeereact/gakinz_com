import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

// Live local date + time for the CMS header. Ticks every second, client-side —
// no server needed, so it always works (unlike the weather pill, which depends
// on a configured API key). Uses the viewer's own locale/timezone.
export default function ClockPill() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  const date = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })

  return (
    <div
      className="hidden items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm md:inline-flex"
      title={now.toLocaleString("en-GB")}
    >
      <Clock className="h-4 w-4 text-primary" />
      <span className="font-semibold tabular-nums text-foreground">{time}</span>
      <span className="hidden text-muted-foreground lg:inline">{date}</span>
    </div>
  )
}
