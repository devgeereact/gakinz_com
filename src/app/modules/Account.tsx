import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TwoFactorPanel, SessionsPanel } from "@/app/components/AccountSecurity"
import { DeletionRequestCard } from "@/app/components/DeletionRequest"
import { PageHeader } from "@/app/components/page-kit"
import { useAuth } from "@/store/auth.store"
import { ROLE_LABEL } from "@/lib/access"

// My account (K-023, K-024). Open to every signed-in role, client included.
// Everything here acts on the caller's own account only: auth.php resolves the
// user from the bearer token and ignores any user id in the request.
export default function Account() {
  const me = useAuth((s) => s.user)
  const { hash } = useLocation()

  // The user menu links to #security; bring that section into view.
  useEffect(() => {
    if (!hash) return
    document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  return (
    <div>
      <PageHeader title="My account" subtitle="Your profile, sign-in security and signed-in devices." />

      <div className="grid items-start gap-4 min-[901px]:grid-cols-2">
        <Card aria-labelledby="account-profile">
          <CardHeader className="flex-row items-center gap-2.5 space-y-0">
            <CardTitle id="account-profile">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)] gap-x-4 gap-y-2.5 max-sm:grid-cols-1">
              <dt className="text-[13.5px] text-muted-foreground">Name</dt>
              <dd className="m-0 min-w-0 [overflow-wrap:anywhere]">{me?.name || <span className="text-muted-foreground">Not set</span>}</dd>
              <dt className="text-[13.5px] text-muted-foreground">Email</dt>
              <dd className="m-0 min-w-0 font-mono text-[13.5px] [overflow-wrap:anywhere]">
                {me?.email || <span className="font-sans text-muted-foreground">Not set</span>}
              </dd>
              {me?.role && (
                <>
                  <dt className="text-[13.5px] text-muted-foreground">Role</dt>
                  <dd className="m-0 min-w-0">{ROLE_LABEL[me.role]}</dd>
                </>
              )}
            </dl>
            <p className="mt-3.5 text-[13px] text-muted-foreground">To change your name or email, contact GAkinz.</p>
          </CardContent>
        </Card>

        {/* TwoFactorPanel is shared with Settings; `bare` drops its own frame
            so this card is the only one. */}
        <Card id="security" aria-labelledby="account-security" className="scroll-mt-20">
          <CardHeader className="flex-row items-center gap-2.5 space-y-0">
            <CardTitle id="account-security">Sign-in security</CardTitle>
          </CardHeader>
          <CardContent>
            <TwoFactorPanel bare />
          </CardContent>
        </Card>
      </div>

      {me?.role === "client" && (
        <div className="mt-4 grid items-start gap-4 min-[901px]:grid-cols-2">
          <DeletionRequestCard email={me.email} />
        </div>
      )}

      <section aria-labelledby="account-sessions" className="mt-6 min-w-0">
        <h2 id="account-sessions" className="mb-3 font-display text-[1.05rem] font-semibold leading-tight tracking-[-0.01em]">
          Signed-in devices
        </h2>
        <SessionsPanel />
      </section>
    </div>
  )
}
