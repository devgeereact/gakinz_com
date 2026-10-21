import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom"
import { Button } from "@/components/ui/button"

// Branded error boundary. Maps the common HTTP status codes to friendly copy so
// a 400/403/404/500/503 all render a consistent GAkinz page rather than a raw
// React Router stack. Falls back to a generic message for anything else.
const COPY: Record<number, { title: string; message: string }> = {
  400: { title: "Bad request", message: "Something about that request wasn’t quite right. Try again." },
  403: { title: "No access", message: "You don’t have permission to view this. Ask an admin if you think that’s wrong." },
  404: { title: "Page not found", message: "That page doesn’t exist or has moved." },
  500: { title: "Something broke", message: "This page hit a problem while loading. Try again in a moment." },
  503: { title: "Temporarily unavailable", message: "The service is down for maintenance or overloaded. Please try again soon." },
}

export default function ErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()

  let status = 500
  let detail = ""
  if (isRouteErrorResponse(error)) {
    status = error.status
    detail = error.statusText || ""
  } else {
    // A thrown exception's message is for the developer, not the visitor: it can
    // name files, fields or server replies. It goes to the console only.
    console.error(error)
  }

  const known = COPY[status]
  const copy = known ?? { title: "Something went wrong", message: "This page hit a problem. Try again in a moment." }

  return (
    <div className="flex h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold text-primary">{status}</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{copy.title}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{copy.message}</p>
      {detail && known && (
        <p className="mt-2 text-xs text-muted-foreground/70">{detail}</p>
      )}
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
        <Button onClick={() => navigate("/")}>Home</Button>
      </div>
    </div>
  )
}
