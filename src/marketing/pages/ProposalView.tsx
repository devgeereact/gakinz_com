import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { proposals, type PublicProposal } from "@/lib/api"
import BrandMark from "@/marketing/components/BrandMark"

const gbp = (n: number, ccy = "GBP") =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy }).format(n)

// Public, read-only proposal — opened by a client via a share link (/p/:token).
// No login required; the server records each view.
export default function ProposalView() {
  const { token = "" } = useParams()
  const [p, setP] = useState<PublicProposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.add("gk-force-light")
    proposals.publicView(token).then((res) => {
      if (res.ok) setP(res.data)
      else setError(res.error)
      setLoading(false)
    })
    return () => document.documentElement.classList.remove("gk-force-light")
  }, [token])

  const subtotal = p ? p.items.reduce((s, it) => s + it.qty * it.unit_price, 0) : 0
  const vat = p ? subtotal * (p.vat_rate / 100) : 0

  return (
    <div className="gk-public min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2" aria-label="GAkinz home">
            <BrandMark className="h-8 w-8" />
            <span className="text-lg font-extrabold tracking-tight">GAkin<span className="text-primary">z</span></span>
          </a>
          <span className="text-sm text-muted-foreground">Proposal</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading proposal…
          </div>
        ) : error ? (
          <div className="gk-ring p-8 text-center">
            <h1 className="text-xl font-bold">Proposal unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : p ? (
          <div className="gk-ring p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <h1 className="font-serif text-2xl font-bold tracking-tight">{p.title}</h1>
                {p.client_company && <p className="mt-1 text-sm text-muted-foreground">Prepared for {p.client_company}</p>}
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">{p.status}</span>
            </div>

            <table className="mt-6 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {p.items.map((it, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2">{it.description}</td>
                    <td className="py-2 text-right">{it.qty}</td>
                    <td className="py-2 text-right">{gbp(it.unit_price, p.currency)}</td>
                    <td className="py-2 text-right">{gbp(it.qty * it.unit_price, p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 space-y-1 text-right text-sm">
              <div className="text-muted-foreground">Subtotal: {gbp(subtotal, p.currency)}</div>
              {p.vat_rate > 0 && <div className="text-muted-foreground">VAT ({p.vat_rate}%): {gbp(vat, p.currency)}</div>}
              <div className="text-lg font-bold">Total: {gbp(subtotal + vat, p.currency)}</div>
            </div>

            {p.notes && (
              <div className="mt-6 border-t border-border pt-4">
                <h2 className="mb-1 text-sm font-semibold">Scope &amp; notes</h2>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.notes}</p>
              </div>
            )}
            {p.valid_until && (
              <p className="mt-6 text-xs text-muted-foreground">Valid until {new Date(p.valid_until).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.</p>
            )}
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Questions? Reply to the email this link came from, or contact GAkinz at gakinz.com.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
