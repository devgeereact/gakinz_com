import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth, API_BASE } from "@/lib/api"
import { useAuth } from "@/store/auth.store"
import { defaultPathForRole } from "@/lib/access"
import BrandMark from "@/marketing/components/BrandMark"

const SSO_ERRORS: Record<string, string> = {
  cancelled: "Google sign-in was cancelled.",
  no_account: "No GAkinz account matches that Google email. Ask an admin to create one.",
  inactive: "That account is suspended.",
  exchange_failed: "Google sign-in failed. Please try again.",
  no_email: "Google didn’t return a verified email.",
}

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [needs2fa, setNeeds2fa] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [ssoGoogle, setSsoGoogle] = useState(false)
  const setAuth = useAuth((s) => s.setAuth)
  const setUser = useAuth((s) => s.setUser)
  const token = useAuth((s) => s.token)
  const user = useAuth((s) => s.user)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || "/app"

  // Already signed in? Don't show the form — go straight to where this role
  // belongs. Stops a logged-in user who lands on /login from re-authenticating
  // and feeling "signed out".
  useEffect(() => {
    if (token && user) navigate(defaultPathForRole(user.role), { replace: true })
  }, [token, user, navigate])

  // Is Google SSO configured on the server?
  useEffect(() => {
    auth.ssoStatus().then((r) => r.ok && setSsoGoogle(r.data.google))
  }, [])

  // OAuth bounce-back: the SSO callback redirects to /login#sso_token=… (or
  // #sso_error=…). Consume the hash, establish the session, then clean the URL.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "")
    if (!hash) return
    const params = new URLSearchParams(hash)
    const ssoToken = params.get("sso_token")
    const ssoError = params.get("sso_error")
    if (ssoError) {
      setError(SSO_ERRORS[ssoError] || "Google sign-in failed.")
      window.history.replaceState(null, "", window.location.pathname)
    } else if (ssoToken) {
      window.history.replaceState(null, "", window.location.pathname)
      setBusy(true)
      // We have a token but not the user yet — persist the token, fetch /me.
      useAuth.getState().setAuth(ssoToken, useAuth.getState().user as never)
      auth.me().then((r) => {
        setBusy(false)
        if (r.ok) {
          setUser(r.data.user)
          navigate(defaultPathForRole(r.data.user.role), { replace: true })
        } else {
          useAuth.getState().clear()
          setError("Could not complete Google sign-in.")
        }
      })
    }
  }, [navigate, setUser])

  // Login screen is the light brand theme too — assert it via the same marker
  // the public layout uses (CSS re-asserts light tokens; next-themes keeps `dark`).
  useEffect(() => {
    document.documentElement.classList.add("gk-force-light")
    return () => document.documentElement.classList.remove("gk-force-light")
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await auth.login(email.trim(), password, needs2fa ? code.trim() : undefined)
    setBusy(false)
    if (res.ok) {
      setAuth(res.data.token, res.data.user)
      navigate(from, { replace: true })
    } else if (res.details?.two_factor_required) {
      // Password was accepted; now ask for the authenticator code.
      setNeeds2fa(true)
      setError(needs2fa ? res.error : null)
    } else {
      setError(res.error)
    }
  }

  return (
    <div className="gk-public relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="gk-aurora" aria-hidden />
      <div className="absolute inset-0 gk-grid" aria-hidden />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2" aria-label="GAkinz home">
          <BrandMark className="h-9 w-9" />
          <span className="text-xl font-extrabold tracking-tight">
            GAkin<span className="text-primary">z</span>
          </span>
        </Link>

        <div className="gk-ring p-6 shadow-xl shadow-primary/10 sm:p-8">
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            Member <span className="gk-grad-text">sign in</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Access the GAkinz platform.</p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>

            {needs2fa && (
              <div>
                <Label htmlFor="code">Authenticator code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1.5 tracking-[0.4em]"
                  placeholder="123456"
                  maxLength={6}
                  autoFocus
                  required
                />
                <p className="mt-1.5 text-xs text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="gk-shine w-full shadow-md shadow-primary/20" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {busy ? "Signing in…" : needs2fa ? "Verify & sign in" : "Sign in"}
            </Button>
          </form>

          {ssoGoogle && !needs2fa && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => { window.location.href = `${API_BASE}/oauth.php?action=start` }}
              >
                Continue with Google
              </Button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Back to gakinz.com
          </Link>
        </p>
      </div>
    </div>
  )
}
