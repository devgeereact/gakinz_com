import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth, clientAccess, API_BASE } from "@/lib/api"
import { isReferenceShape, normaliseReference, readAccessToken, redeemErrorMessage, referenceSignInEnabled } from "@/lib/clientAccess"
import { useAuth } from "@/store/auth.store"
import { defaultPathForRole } from "@/lib/access"
import AuthFrame from "@/app/components/AuthFrame"
import { initialRedirectState } from "@/lib/loginRedirect"
import { clerkEnabled } from "@/lib/clerk"
import ClerkLogin from "@/app/ClerkLogin"


export default function Login() {
  return clerkEnabled ? <ClerkLogin /> : <LegacyLogin />
}

function LegacyLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [needs2fa, setNeeds2fa] = useState(false)
  // A sign-in link or Google redirect sets the opening state; the effect below consumes it.
  const [redirect] = useState(() => initialRedirectState(window.location.hash))
  const [error, setError] = useState<string | null>(redirect.error)
  const [busy, setBusy] = useState(redirect.busy)
  const [ssoGoogle, setSsoGoogle] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [showPw, setShowPw] = useState(false)
  // Sign-in by work reference and email: shown only when the server says it
  // is switched on (client_access.php answers 404 while off).
  const [refEnabled, setRefEnabled] = useState(false)
  const [refOpen, setRefOpen] = useState(false)
  const [reference, setReference] = useState("")
  const [refEmail, setRefEmail] = useState("")
  const [refBusy, setRefBusy] = useState(false)
  const [refError, setRefError] = useState<string | null>(null)
  const [refSent, setRefSent] = useState<string | null>(null)
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

  useEffect(() => {
    clientAccess.status().then((r) => setRefEnabled(referenceSignInEnabled(r)))
  }, [])

  // OAuth bounce-back: the SSO callback redirects to /login#sso_token=… (or
  // #sso_error=…). Consume the hash, establish the session, then clean the URL.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "")
    if (!hash) return
    const params = new URLSearchParams(hash)
    const ssoToken = params.get("sso_token")
    const ssoError = params.get("sso_error")
    const magic = params.get("magic")
    const access = readAccessToken(hash)
    if (access) {
      // A reference sign-in link. Clear the address bar before anything else,
      // so the one-time token is not left in history or a shared screenshot.
      window.history.replaceState(null, "", window.location.pathname)
      clientAccess.redeem(access).then((r) => {
        setBusy(false)
        if (r.ok) {
          setAuth(r.data.token, r.data.user)
          navigate(defaultPathForRole(r.data.user.role), { replace: true })
        } else {
          setError(redeemErrorMessage(r))
        }
      })
    } else if (magic) {
      window.history.replaceState(null, "", window.location.pathname)
      auth.magicConsume(magic).then((r) => {
        setBusy(false)
        if (r.ok) {
          setAuth(r.data.token, r.data.user)
          navigate(defaultPathForRole(r.data.user.role), { replace: true })
        } else {
          setError(r.error || "That sign-in link is invalid or expired.")
        }
      })
    } else if (ssoError) {
      // Its message is already showing (initialRedirectState); only clear the address bar.
      window.history.replaceState(null, "", window.location.pathname)
    } else if (ssoToken) {
      window.history.replaceState(null, "", window.location.pathname)
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
  }, [navigate, setAuth, setUser])

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

  const sendMagic = async () => {
    if (!email.trim()) {
      setError("Enter your email first, then request a link.")
      return
    }
    setError(null)
    setBusy(true)
    await auth.magicRequest(email.trim())
    setBusy(false)
    setMagicSent(true)
  }

  const sendReference = async (e: React.FormEvent) => {
    e.preventDefault()
    const ref = normaliseReference(reference)
    if (!isReferenceShape(ref)) {
      setRefError("Enter the reference as it appears on your documents, for example GK-P-2026-0001.")
      return
    }
    if (!refEmail.trim()) {
      setRefError("Enter the email address we have for you.")
      return
    }
    setRefError(null)
    setRefBusy(true)
    const r = await clientAccess.request(ref, refEmail.trim())
    setRefBusy(false)
    if (r.ok) setRefSent(r.data.message)
    else setRefError(r.error)
  }

  // The approved sign-in screen (D-046) follows the light or dark theme like
  // the rest of GAkinzOS; its left panel is graphite in both.
  return (
    <AuthFrame>
      <h2 className="font-display text-[1.8rem] font-semibold tracking-[-0.025em]">Sign in</h2>
      <p className="mb-6 mt-2 text-muted-foreground">Use the email address your invitation was sent to.</p>

      <form onSubmit={onSubmit} noValidate className="grid gap-3.5">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-16"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-pressed={showPw}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-lg px-2.5 text-[13px] font-semibold text-acc"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {needs2fa && (
          <div className="grid gap-1.5">
            <Label htmlFor="code">Authenticator code</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="tracking-[0.4em]"
              placeholder="123456"
              maxLength={6}
              autoFocus
              required
            />
            <p className="text-xs text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
          </div>
        )}

        {error && (
          <div role="alert" className="gk-os-wrap rounded-[10px] border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-foreground">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Signing in…" : needs2fa ? "Verify & sign in" : "Sign in"}
          {!busy && <ArrowRight aria-hidden />}
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

      {!needs2fa && (
        magicSent ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            If that email has an account, a sign-in link is on its way. Check your inbox.
          </p>
        ) : (
          <button
            type="button"
            onClick={sendMagic}
            disabled={busy}
            className="mt-4 w-full rounded-[10px] text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Client? Email me a sign-in link instead
          </button>
        )
      )}

      {refEnabled && !needs2fa && (
        refSent ? (
          <p role="status" className="mt-4 text-center text-sm text-muted-foreground">{refSent}</p>
        ) : refOpen ? (
          <form onSubmit={sendReference} noValidate className="mt-5 grid gap-3.5 border-t border-border pt-5">
            <p className="text-sm text-muted-foreground">
              Client? Enter a project or enquiry reference and the email address we have for you. We will email you a
              link that signs you in once.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                autoComplete="off"
                spellCheck={false}
                placeholder="GK-P-2026-0001"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ref-email">Email</Label>
              <Input
                id="ref-email"
                type="email"
                autoComplete="email"
                value={refEmail}
                onChange={(e) => setRefEmail(e.target.value)}
                required
              />
            </div>
            {refError && (
              <div role="alert" className="gk-os-wrap rounded-[10px] border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-foreground">
                {refError}
              </div>
            )}
            <Button type="submit" variant="outline" className="w-full" disabled={refBusy}>
              {refBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {refBusy ? "Sending…" : "Email me a sign-in link"}
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => { setRefOpen(true); setRefEmail((v) => v || email) }}
            className="mt-2 w-full rounded-[10px] text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Use your reference
          </button>
        )
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/" className="rounded-[6px] hover:text-foreground">
          ← Back to gakinz.com
        </Link>
      </p>
    </AuthFrame>
  )
}
