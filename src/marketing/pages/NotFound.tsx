import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-28 text-center sm:px-6">
      <span className="font-serif text-8xl font-extrabold text-transparent [-webkit-text-stroke:2px_hsl(var(--gk-violet)/0.4)]">404</span>
      <h1 className="mt-4 font-serif text-3xl font-bold">Page not found</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        That page has moved or never existed. Let us point you back to something useful.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link to="/">Back home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/contact">Contact us</Link>
        </Button>
      </div>
    </div>
  )
}
