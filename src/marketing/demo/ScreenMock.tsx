/**
 * DEMO ONLY. Drawn interfaces for the demo work records in ./content.ts.
 * Loaded with them by ../data/useDemo.ts, never in a production build.
 */

export type MockKind = "dashboard" | "storefront" | "booking"

// ── Illustrated screens ─────────────────────────────────────────────────────

/**
 * A drawn interface, standing in for a project screenshot. Built from divs in
 * the public tokens so it needs no asset file, and so nothing image-like ships
 * to production. Decorative: the caption beside it carries the meaning.
 */
export function ScreenMock({ kind, title, bare = false }: { kind: MockKind; title: string; bare?: boolean }) {
  // `bare`: no browser chrome, for a frame that draws its own (the hero).
  if (bare)
    return (
      <div aria-hidden className="relative h-full w-full overflow-hidden bg-gk-white p-4 text-left sm:p-8">
        <span className="absolute right-4 top-4 rounded-full border border-dashed border-gk-come/70 px-2.5 py-0.5 font-data text-[0.75rem] font-bold uppercase text-gk-come">
          Demo
        </span>
        {kind === "dashboard" ? <WideDashboard /> : kind === "storefront" ? <Storefront /> : <Booking />}
      </div>
    )
  return (
    <div aria-hidden className="flex h-full w-full flex-col overflow-hidden rounded-[1.25rem] bg-gk-white shadow-lifted">
      <div className="flex items-center gap-2 border-b border-gk-rule px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-gk-rule" />
        <span className="h-2.5 w-2.5 rounded-full bg-gk-rule" />
        <span className="h-2.5 w-2.5 rounded-full bg-gk-rule" />
        <span className="ml-3 truncate rounded-full bg-gk-paper px-3 py-1 font-data text-[0.6875rem] text-gk-ink-mute">
          {title.toLowerCase().replace(/[^a-z]+/g, "")}.example
        </span>
      </div>
      <div className="min-h-0 flex-1 p-4 sm:p-5">
        {kind === "dashboard" && <Dashboard />}
        {kind === "storefront" && <Storefront />}
        {kind === "booking" && <Booking />}
      </div>
    </div>
  )
}

function Bar({ w, tone = "rule" }: { w: string; tone?: "rule" | "ink" | "paper" }) {
  const bg = tone === "ink" ? "bg-gk-ink" : tone === "paper" ? "bg-gk-paper" : "bg-gk-rule"
  return <span className={`block h-2 rounded-full ${bg}`} style={{ width: w }} />
}

function Dashboard() {
  const bars = [38, 52, 44, 66, 58, 80, 72, 94]
  return (
    <div className="grid h-full grid-cols-[5.5rem_1fr] gap-4">
      <div className="space-y-3 border-r border-gk-rule pr-3">
        <Bar w="70%" tone="ink" />
        {["Overview", "Requests", "Invoices", "Files"].map((l, i) => (
          <span
            key={l}
            className={`block rounded-lg px-2 py-1.5 text-[0.6875rem] ${i === 0 ? "bg-gk-paper text-gk-ink" : "text-gk-ink-mute"}`}
          >
            {l}
          </span>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-[0.8125rem] font-medium text-gk-ink">Good morning.</p>
        <div className="grid grid-cols-3 gap-2">
          {["Open", "Due", "Paid"].map((l) => (
            <div key={l} className="space-y-1.5 rounded-xl border border-gk-rule p-2">
              <span className="block text-[0.625rem] uppercase text-gk-ink-mute">{l}</span>
              <Bar w="60%" tone="paper" />
            </div>
          ))}
        </div>
        <div className="flex flex-1 items-end gap-1.5 rounded-xl border border-gk-rule p-3">
          {bars.map((h, i) => (
            <span
              key={i}
              className={`flex-1 rounded-t-md ${i === bars.length - 1 ? "bg-gk-ink" : "bg-gk-rule"}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Storefront() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <Bar w="28%" tone="ink" />
        <span className="rounded-full bg-gk-ink px-3 py-1 text-[0.625rem] text-gk-on-dark">Enquire</span>
      </div>
      <div className="grid flex-1 grid-cols-[1.3fr_1fr] gap-3">
        <div className="rounded-2xl bg-[linear-gradient(135deg,#E8DED3,#CDBBA7)]" />
        <div className="grid gap-3">
          <div className="rounded-2xl bg-[linear-gradient(135deg,#EFE7DF,#D9CCBE)]" />
          <div className="rounded-2xl bg-[linear-gradient(135deg,#DCD3C9,#BFAF9E)]" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Bar w="64%" />
        <Bar w="42%" />
      </div>
    </div>
  )
}

function Booking() {
  const taken = new Set([2, 3, 9, 10, 16, 17, 18])
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[0.8125rem] font-medium text-gk-ink">Evening classes</span>
        <span className="rounded-full bg-gk-paper px-2.5 py-1 text-[0.625rem] text-gk-ink-mute">This month</span>
      </div>
      <div className="grid flex-1 grid-cols-7 gap-1.5">
        {Array.from({ length: 21 }, (_, i) => (
          <span
            key={i}
            className={`rounded-lg ${i === 11 ? "bg-gk-ink" : taken.has(i) ? "bg-gk-rule" : "border border-gk-rule"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-gk-rule px-3 py-2">
        <Bar w="40%" />
        <span className="rounded-full bg-gk-ink px-3 py-1 text-[0.625rem] text-gk-on-dark">Book</span>
      </div>
    </div>
  )
}

/** The hero-sized dashboard: a workspace overview with words, never figures. */
function WideDashboard() {
  const rows = [
    ["Northwick & Vale", "Quote sent", "bg-gk-paper text-gk-ink-soft"],
    ["Ledgerline", "In build", "bg-gk-ink text-gk-on-dark"],
    ["Kiln Street Studio", "Paid", "border border-gk-rule text-gk-ink-soft"],
  ] as const
  return (
    <div className="grid h-full gap-6 text-[0.75rem] sm:grid-cols-[9rem_1fr]">
      <div className="hidden space-y-1.5 border-r border-gk-rule pr-4 sm:block">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-6 w-6 rounded-md bg-gk-ink" />
          <span className="font-medium text-gk-ink">GAkinzOS</span>
        </div>
        {["Today", "Enquiries", "Clients", "Projects", "Money", "Website"].map((l, i) => (
          <span key={l} className={`block rounded-lg px-2.5 py-1.5 ${i === 0 ? "bg-gk-paper text-gk-ink" : "text-gk-ink-mute"}`}>
            {l}
          </span>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.9375rem] font-medium text-gk-ink">Today</p>
            <p className="text-gk-ink-mute">What needs you next.</p>
          </div>
          <span className="hidden w-40 rounded-lg border border-gk-rule px-3 py-1.5 text-gk-ink-mute sm:block">Search…</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["New enquiries", "Follow-ups due", "Invoices open", "Support requests"].map((l) => (
            <div key={l} className="space-y-2 rounded-xl border border-gk-rule p-3">
              <span className="block text-gk-ink-mute">{l}</span>
              <Bar w="45%" tone="ink" />
            </div>
          ))}
        </div>
        <div className="hidden min-h-0 flex-1 grid-cols-[1.4fr_1fr] gap-3 sm:grid">
          <div className="flex flex-col rounded-xl border border-gk-rule p-3">
            <span className="text-gk-ink-mute">Enquiries this quarter</span>
            <div className="mt-3 flex flex-1 items-end gap-2">
              {[30, 46, 38, 58, 50, 72, 64, 86].map((h, i) => (
                <span key={i} className={`flex-1 rounded-t-md ${i === 7 ? "bg-gk-ink" : "bg-gk-rule"}`} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gk-rule p-3">
            <span className="text-gk-ink-mute">Projects</span>
            <ul className="mt-2 divide-y divide-gk-rule">
              {rows.map(([name, status, tone]) => (
                <li key={name} className="flex items-center justify-between gap-2 py-2">
                  <span className="truncate text-gk-ink">{name}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] ${tone}`}>{status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
