import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TwoFactorPanel, SessionsPanel } from "@/app/components/AccountSecurity"
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
    <div className="space-y-8">
      <div>
        <h1 className="gk-app-grad text-2xl font-bold tracking-tight">My account</h1>
        <p className="text-sm text-muted-foreground">Your profile, sign-in security and signed-in devices.</p>
      </div>

      <section aria-labelledby="account-profile" className="max-w-xl space-y-4">
        <h2 id="account-profile" className="text-lg font-semibold">Profile</h2>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="acc-name">Name</Label>
              <Input id="acc-name" value={me?.name ?? ""} readOnly className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="acc-email">Email</Label>
              <Input id="acc-email" type="email" value={me?.email ?? ""} readOnly className="mt-1.5" />
            </div>
          </div>
          {me?.role && (
            <p className="mt-4 text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{ROLE_LABEL[me.role]}</span>.
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            To change your name or email, contact GAkinz.
          </p>
        </div>
      </section>

      <section id="security" aria-labelledby="account-security" className="scroll-mt-20 space-y-4">
        <h2 id="account-security" className="text-lg font-semibold">Sign-in security</h2>
        <TwoFactorPanel />
      </section>

      <section aria-labelledby="account-sessions" className="space-y-4">
        <h2 id="account-sessions" className="text-lg font-semibold">Signed-in devices</h2>
        <SessionsPanel />
      </section>
    </div>
  )
}
