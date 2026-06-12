import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { BadgeCheck, ShieldX, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { PageHero, Section } from "../components/primitives"

// Public certificate verification (GAkinzOS §6.8). No login required.
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
      <PageHero eyebrow="Verification" title="Certificate check" intro={`Verifying certificate ${id}.`} />
      <Section>
        <div className="gk-ring mx-auto max-w-md p-8 text-center shadow-xl shadow-primary/5">
          {state === "loading" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Checking the record…</p>
            </>
          )}
          {state === "valid" && cert && (
            <>
              <BadgeCheck className="mx-auto h-12 w-12 text-primary" />
              <h2 className="mt-4 font-serif text-2xl font-bold">Valid certificate</h2>
              <dl className="mt-6 space-y-2 text-left text-sm">
                <div className="flex justify-between border-b border-border pb-2">
                  <dt className="text-muted-foreground">Recipient</dt>
                  <dd className="font-medium">{cert.recipient}</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <dt className="text-muted-foreground">Programme</dt>
                  <dd className="font-medium">{cert.programme}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Issued</dt>
                  <dd className="font-medium">{cert.issued_at}</dd>
                </div>
              </dl>
            </>
          )}
          {state === "invalid" && (
            <>
              <ShieldX className="mx-auto h-12 w-12 text-destructive" />
              <h2 className="mt-4 font-serif text-2xl font-bold">No matching certificate</h2>
              <p className="mt-2 text-muted-foreground">
                We could not find a certificate with that reference. Check the code and try again.
              </p>
            </>
          )}
        </div>
      </Section>
    </>
  )
}
