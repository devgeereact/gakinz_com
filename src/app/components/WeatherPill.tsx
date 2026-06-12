import { useEffect, useState } from "react"
import { Cloud, Loader2 } from "lucide-react"
import { weather, type Weather } from "@/lib/api"

// Compact weather widget for the CMS header. Pulls current conditions from the
// server proxy (weather.php → OpenWeather; key stays server-side) and caches the
// result for 10 minutes server-side. Renders nothing if weather is not
// configured/unavailable, so it never clutters the header on a fresh install.
export default function WeatherPill({ city = "London" }: { city?: string }) {
  const [data, setData] = useState<Weather | null>(null)
  const [state, setState] = useState<"loading" | "ok" | "hidden">("loading")

  useEffect(() => {
    let alive = true
    weather.current(city).then((res) => {
      if (!alive) return
      if (res.ok && res.data.temp !== null) {
        setData(res.data)
        setState("ok")
      } else {
        // 503 (not configured), network error, etc. — stay out of the way.
        setState("hidden")
      }
    })
    return () => {
      alive = false
    }
  }, [city])

  if (state === "hidden") return null

  const unitSymbol = data?.units === "imperial" ? "°F" : "°C"

  return (
    <div
      className="hidden items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm md:inline-flex"
      title={
        data
          ? `${data.description}${data.feels_like !== null ? ` · feels ${data.feels_like}${unitSymbol}` : ""}${
              data.humidity !== null ? ` · ${data.humidity}% humidity` : ""
            }`
          : "Loading weather"
      }
    >
      {state === "loading" || !data ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Weather</span>
        </>
      ) : (
        <>
          {data.icon ? (
            <img
              src={`https://openweathermap.org/img/wn/${data.icon}.png`}
              alt={data.description}
              width={24}
              height={24}
              className="h-6 w-6"
            />
          ) : (
            <Cloud className="h-4 w-4 text-primary" />
          )}
          <span className="font-semibold text-foreground">
            {data.temp}
            {unitSymbol}
          </span>
          <span className="hidden text-muted-foreground lg:inline">{data.city}</span>
        </>
      )}
    </div>
  )
}
