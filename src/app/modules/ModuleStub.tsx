import { Link } from "react-router-dom"
import { Hammer, ArrowRight } from "lucide-react"

// Placeholder for GAkinzOS modules not yet built. Keeps the sidebar navigable
// and signals what is coming, instead of a 404.
export default function ModuleStub({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Hammer className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">{title} is in build</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          This module is part of the GAkinzOS roadmap. The Leads module is live and the rest follow
          the same pattern: a PHP endpoint, a MySQL table, and a screen here.
        </p>
        <Link
          to="/app/leads"
          className="mt-6 inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          See the live Leads module <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
