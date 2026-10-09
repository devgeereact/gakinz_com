import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api } from "@/lib/api"
import Seo from "@/marketing/components/Seo"
import { Label, PageHero, Section } from "../components/primitives"
import { cn } from "@/lib/utils"

/**
 * /verify/:id: public certificate verification (GAkinzOS §6.8). No login.
 *
 * TWO RECORDED FINDINGS, both fixed here.
 *
 * 1. The loading and result states sat in an ordinary <div>. Nothing told
 *    assistive technology that the page had changed, so a screen-reader user
 *    who opened a verification link was never told the outcome of the check:
 *    the spinner, the "Valid certificate" heading and the "No matching
 *    certificate" message all arrived silently. WCAG 4.1.3 Status Messages
 *    (AA). The result now lives in an aria-live="polite" region that also
 *    carries aria-busy while the request is in flight.
 *
 * 2. The page was fully crawlable. Every verification URL is a distinct,
 *    thin, per-certificate page that exists to be opened from a link someone
 *    was handed, and half of them report a failure. It is now noindex, and
 *    the certificate reference is kept out of the description so an arbitrary
 *    URL segment cannot end up in a meta tag.
 *
 * The dl/dt/dd markup was already right and is unchanged in structure. The
 * spine colour follows the same convention as the work ledger: navy for a
 * record that is settled, red oxide where there is no material behind it.
 */

type Cert = {
  id: string
  recipient: string
  programme: string
  issued_at: string
}

export default function Verify() {
  const { id } = useParams()
  const [state, setState] = useState<"loading" | "valid" | "invalid">("loading")
  const [cert, setCert] = useState<Cert | null>(null)

  useEffect(() => {
    let alive = true
    api.get<Cert>(`/verify.php?id=${encodeURIComponent(id || "")}`).then((res) => {
      if (!alive) return
      if (res.ok && res.data?.id) {
        setCert(res.data)
        setState("valid")
      } else {
        setState("invalid")
      }
    })
    return () => {
      alive = false
    }
  }, [id])

  return (
    <>
      <Seo
        title="Certificate check"
        description="Check a GAkinz certificate reference against the register and see the recipient, the programme and the date it was issued."
        path="/verify"
        noIndex
      />

      <PageHero
        eyebrow="Verification"
        breadcrumb="Verification"
        title="Certificate check"
        intro="Every certificate carries a reference. Enter it in the address and this page reports what the register holds against it."
      />

      <Section>
        <div className="max-w-xl">
          <Label>Reference</Label>
          <p className="mt-2 font-data text-body text-gk-ink">{id || "none given"}</p>

          <div
            aria-live="polite"
            aria-busy={state === "loading"}
            className={cn(
              "mt-8 border border-gk-edge border-l-2 p-6 sm:p-8",
              state === "valid" && "border-l-gk-set",
              state === "invalid" && "border-l-gk-come",
              state === "loading" && "border-l-gk-edge",
            )}
          >
            {state === "loading" && <p className="text-lede text-gk-ink-soft">Checking the register…</p>}

            {state === "valid" && cert && (
              <>
                <h2 className="font-display text-t3 text-gk-set">Valid certificate</h2>
                <dl className="mt-6 border-t border-gk-rule font-data text-label">
                  <div className="flex items-baseline justify-between gap-6 border-b border-gk-rule py-3">
                    <dt className="uppercase text-gk-ink-mute">Recipient</dt>
                    <dd className="text-right text-gk-ink">{cert.recipient}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-6 border-b border-gk-rule py-3">
                    <dt className="uppercase text-gk-ink-mute">Programme</dt>
                    <dd className="text-right text-gk-ink">{cert.programme}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-6 py-3">
                    <dt className="uppercase text-gk-ink-mute">Issued</dt>
                    <dd className="text-right text-gk-ink">{cert.issued_at}</dd>
                  </div>
                </dl>
              </>
            )}

            {state === "invalid" && (
              <>
                <h2 className="font-display text-t3 text-gk-come">No matching certificate</h2>
                <p className="mt-4 text-body text-gk-ink-soft">
                  The register holds nothing against that reference. Check the code on the
                  certificate and try again.
                </p>
              </>
            )}
          </div>
        </div>
      </Section>
    </>
  )
}
