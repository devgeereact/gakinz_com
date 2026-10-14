import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import ClockPill from "@/app/components/ClockPill"

// One band per project colour, as the approved sign-in screen shows (D-046).
const STRIP = ["#3B6FE0", "#33512D", "#1B2E6B", "#FF385C", "#EBB241", "#4F2149", "#B0283F", "#25282B", "#F59E0B", "#2E3A33"]

// The prototype's split sign-in screen: a graphite panel with the mark, the
// headline, a line of copy, the colour strip and the London clock on the left,
// and the form on the canvas on the right. Stacks on narrow screens.
export default function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-background min-[901px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative flex flex-col justify-between gap-8 overflow-hidden bg-sidebar p-[clamp(24px,5vw,56px)] text-sidebar-foreground">
        <Link to="/" className="flex w-fit items-center gap-2.5 rounded-[10px]" aria-label="GAkinz home">
          <span className="gk-os-mark" aria-hidden>G</span>
          <b className="font-display text-[1.1rem] font-semibold">GAkinzOS</b>
        </Link>
        <div>
          <h1 className="max-w-[14ch] font-display text-[clamp(2.2rem,4.5vw,3.8rem)] font-[720] leading-[.98] tracking-[-0.045em]">
            The studio, in one place.
          </h1>
          <p className="mt-4 max-w-[40ch] text-sidebar-muted">
            Enquiries, clients, projects, quotes, invoices and support. Clients sign in here too, and see their own
            project and nothing else.
          </p>
          <div className="gk-os-strip mt-7" aria-hidden>
            {STRIP.map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </div>
        </div>
        <ClockPill className="!px-0 uppercase tracking-[.06em] !text-sidebar-muted" />
      </section>
      <main className="grid place-items-center p-[clamp(24px,5vw,56px)]">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  )
}
