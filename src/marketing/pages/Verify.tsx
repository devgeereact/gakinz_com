import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api } from "@/lib/api"
import Seo from "@/marketing/components/Seo"
import { PageHead } from "@/marketing/components/site-ui"

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
 * The dl/dt/dd markup was already right and is unchanged in structure.
 *
 * D-046: the page is built from src/marketing/site.css. A found certificate
 * is a `.facts` card; "no matching certificate" (404, or an empty reference)
 * and "the register could not be reached" (anything else) are now separate
 * states, so a network fault is never reported as a forged certificate.
 */

type Cert = {
  id: string
  recipient: string
  programme: string
  issued_at: string
}

type State = "loading" | "valid" | "invalid" | "error"

export default function Verify() {
  const { id } = useParams()
  const [state, setState] = useState<State>("loading")
  const [cert, setCert] = useState<Cert | null>(null)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => {
    setState("loading")
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    let alive = true
    api.get<Cert>(`/verify.php?id=${encodeURIComponent(id || "")}`).then((res) => {
      if (!alive) return
      if (res.ok && res.data?.id) {
        setCert(res.data)
        setState("valid")
      } else if (res.ok || res.status === 404 || res.status === 400) {
        setState("invalid")
      } else {
        setState("error")
      }
    })
    return () => {
      alive = false
    }
  }, [id, attempt])

  return (
    <>
      <Seo
        title="Certificate check"
        description="Check a GAkinz certificate reference against the register and see the recipient, the programme and the date it was issued."
        path="/verify"
        noIndex
      />

      <PageHead
        crumbs={[[null, "Verification"]]}
        title="Certificate check"
        lede="Every certificate carries a reference. Enter it in the address and this page reports what the register holds against it."
      />

      <section className="sec wrap" style={{ paddingTop: 56 }}>
        <div style={{ maxWidth: "36rem" }}>
          <p className="mono mute">Reference</p>
          <p className="mono" style={{ fontSize: 15, marginTop: 8, overflowWrap: "anywhere" }}>
            {id || "none given"}
          </p>

          <div aria-live="polite" aria-busy={state === "loading"} style={{ marginTop: 32 }}>
            {state === "loading" && <p className="lede">Checking the register…</p>}

            {state === "valid" && cert && (
              <div>
                <p className="pill pill--live">Found in the register</p>
                <h2 className="h-m" style={{ margin: "14px 0 20px" }}>
                  Valid certificate
                </h2>
                <dl className="facts" style={{ position: "static" }}>
                  <div>
                    <dt>Recipient</dt>
                    <dd>{cert.recipient}</dd>
                  </div>
                  <div>
                    <dt>Programme</dt>
                    <dd>{cert.programme}</dd>
                  </div>
                  <div>
                    <dt>Issued</dt>
                    <dd>{cert.issued_at}</dd>
                  </div>
                </dl>
              </div>
            )}

            {state === "invalid" && (
              <div className="notice notice--bad">
                <h2 className="h-m">No matching certificate</h2>
                <p className="mute" style={{ marginTop: 12 }}>
                  The register holds nothing against that reference. Check the code on the certificate and try again.
                </p>
              </div>
            )}

            {state === "error" && (
              <div className="notice notice--warn">
                <h2 className="h-m">The register could not be checked</h2>
                <p className="mute" style={{ marginTop: 12 }}>
                  This is a fault at my end, not a judgement on the certificate. Try again in a minute.
                </p>
                <button className="btn" type="button" style={{ marginTop: 20 }} onClick={retry}>
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
