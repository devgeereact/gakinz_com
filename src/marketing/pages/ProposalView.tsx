import { useEffect, useState, type ReactNode } from "react"
import { useParams } from "react-router-dom"
import { proposals, type PublicProposal } from "@/lib/api"
import Seo from "@/marketing/components/Seo"
import BrandMark from "@/marketing/components/BrandMark"
import { cn } from "@/lib/utils"

/** The page's centred column. Kept local when the D-037 primitives were removed, same classes. */
function Measure({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[76rem] px-4 sm:px-8 lg:px-12", className)}>{children}</div>
}

const gbp = (n: number, ccy = "GBP") =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy }).format(n)

/**
 * /p/:token: a client's own proposal, opened from a share link. No login;
 * the server records each view.
 *
 * RECORDED FINDING, now fixed: this route is mounted outside PublicLayout, so
 * it inherited none of the site's landmarks. It rendered no <header>, <nav>,
 * <main> or <footer> at all, which put one hundred per cent of its content
 * outside any landmark region. That is WCAG 1.3.1 Info and Relationships, and the
 * reason a screen-reader user had no way to skip the masthead or jump to the
 * figures. It now carries its own header, main and footer.
 *
 * It is also noindex. A proposal is a private document reachable by anyone
 * holding the link, and it should never have been indexable. The share token
 * is deliberately kept out of the canonical and og:url as well, so a link
 * preview scraper cannot copy it into a third party's logs.
 *
 * Two h1s, one in each of two mutually exclusive branches, became one. It was
 * legal before; one heading whose text follows the state is tidier and is what
 * an assistive-technology user gets a stable outline from.
 *
 * DELIBERATELY UNTOUCHED: what this page requests, and how it renders money.
 * The publicView call, the subtotal and VAT arithmetic and the Intl currency
 * formatting are character for character what they were. A real client reads
 * real figures here.
 */
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

  const heading = p ? p.title : error ? "Proposal unavailable" : "Proposal"

  return (
    <div className="gk-public flex min-h-screen flex-col bg-gk-paper font-ui text-gk-ink">
      <header className="border-b border-gk-edge">
        <Measure className="flex items-center justify-between gap-4 py-5">
          <a href="/" className="flex items-center gap-3" aria-label="Gideon Akinlotan, home">
            <BrandMark className="h-8 w-8" />
            <span className="font-display text-t4 text-gk-ink">GAkinz</span>
          </a>
          <span className="font-data text-label uppercase text-gk-ink-mute">Proposal</span>
        </Measure>
      </header>

      <main className="flex-1">
        <Measure className="py-12 sm:py-16">
          <div className="mx-auto w-full max-w-3xl">
            <h1 className="font-display text-t3 font-normal text-gk-ink sm:text-t2">{heading}</h1>

            <div aria-live="polite" aria-busy={loading}>
              {loading ? (
                <p className="mt-6 text-lede text-gk-ink-soft">Loading the proposal…</p>
              ) : error ? (
                <p className="mt-6 border-l-2 border-gk-come pl-5 text-lede text-gk-ink-soft">{error}</p>
              ) : p ? (
                <>
                  <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-gk-edge pb-5">
                    {p.client_company ? (
                      <p className="text-lede text-gk-ink-soft">Prepared for {p.client_company}</p>
                    ) : (
                      <span />
                    )}
                    <span className="font-data text-label uppercase text-gk-ink-mute">
                      Status · {p.status}
                    </span>
                  </div>

                  {/* The only part of the acceptance evidence a client sees: the date. */}
                  {p.status === "accepted" && p.accepted_on && (
                    <p className="mt-5 font-data text-label uppercase text-gk-ink-mute">
                      Accepted on{" "}
                      <time dateTime={p.accepted_on}>
                        {new Date(`${p.accepted_on.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </time>
                    </p>
                  )}

                  <table className="mt-8 w-full text-body">
                    <caption className="sr-only">Priced items in this proposal</caption>
                    <thead>
                      <tr className="border-b border-gk-edge text-left font-data text-label uppercase text-gk-ink-mute">
                        <th scope="col" className="py-3 font-normal">
                          Description
                        </th>
                        <th scope="col" className="py-3 text-right font-normal">
                          Qty
                        </th>
                        <th scope="col" className="py-3 text-right font-normal">
                          Unit
                        </th>
                        <th scope="col" className="py-3 text-right font-normal">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.items.map((it, i) => (
                        <tr key={i} className="border-b border-gk-rule align-top">
                          <td className="py-3 pr-4 text-gk-ink">{it.description}</td>
                          <td className="py-3 text-right font-data text-gk-ink-soft">{it.qty}</td>
                          <td className="py-3 text-right font-data text-gk-ink-soft">
                            {gbp(it.unit_price, p.currency)}
                          </td>
                          <td className="py-3 text-right font-data text-gk-ink">
                            {gbp(it.qty * it.unit_price, p.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <dl className="mt-6 ml-auto max-w-xs font-data text-body">
                    <div className="flex items-baseline justify-between gap-6 py-1">
                      <dt className="text-gk-ink-mute">Subtotal</dt>
                      <dd className="text-gk-ink-soft">{gbp(subtotal, p.currency)}</dd>
                    </div>
                    {p.vat_rate > 0 && (
                      <div className="flex items-baseline justify-between gap-6 py-1">
                        <dt className="text-gk-ink-mute">VAT ({p.vat_rate}%)</dt>
                        <dd className="text-gk-ink-soft">{gbp(vat, p.currency)}</dd>
                      </div>
                    )}
                    <div className="mt-2 flex items-baseline justify-between gap-6 border-t border-gk-edge pt-3">
                      <dt className="uppercase text-gk-ink-mute">Total</dt>
                      <dd className="text-t4 text-gk-ink">{gbp(subtotal + vat, p.currency)}</dd>
                    </div>
                  </dl>

                  {p.notes && (
                    <section className="mt-12 border-t border-gk-edge pt-6">
                      <h2 className="font-display text-t4 text-gk-ink">Scope and notes</h2>
                      <p className="mt-4 whitespace-pre-wrap text-body text-gk-ink-soft">{p.notes}</p>
                    </section>
                  )}

                  {p.valid_until && (
                    <p className="mt-10 font-data text-label uppercase text-gk-ink-mute">
                      Valid until{" "}
                      <time dateTime={p.valid_until}>
                        {new Date(p.valid_until).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </time>
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </Measure>
      </main>

      <footer className="border-t border-gk-edge">
        <Measure className="py-8">
          <p className="mx-auto w-full max-w-3xl text-body text-gk-ink-soft">
            Questions? Reply to the email this link came from, or find me at{" "}
            <a href="https://gakinz.com" className="text-gk-set underline hover:text-gk-ink">
              gakinz.com
            </a>
            .
          </p>
        </Measure>
      </footer>

      {/* The share token is intentionally absent from the canonical: this page
          is noindex, and a private document should not publish its own key in
          a meta tag. */}
      <Seo
        title="Proposal"
        description="A proposal prepared for a client, opened from a private share link."
        path="/p"
        noIndex
      />
    </div>
  )
}
