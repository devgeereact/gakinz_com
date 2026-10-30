import { useEffect, useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth as useClerkAuth } from "@clerk/clerk-react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/api"
import { clerkEnabled, clerkSignOut } from "@/lib/clerk"
import ClerkSession from "@/app/ClerkSession"
import { useAuth } from "@/store/auth.store"
import { canAccess, defaultPathForRole, moduleKeyForPath } from "@/lib/access"

// Gates the /app CMS.
//   • No token → redirect to /login (remembering where you were).
//   • With a token → revalidate against the server; a 401 clears the stale
//     session so the next render redirects.
//   • Role gate → if the signed-in role can't open this module, bounce it to
//     the role's default landing. This is UX only; every endpoint also enforces
//     the role server-side (see src/lib/access.ts).
function LegacyGuard() {
  const location = useLocation()
  const token = useAuth((s) => s.token)
  const user = useAuth((s) => s.user)
  const setUser = useAuth((s) => s.setUser)
  const clear = useAuth((s) => s.clear)

  useEffect(() => {
    if (!token) return
    let alive = true
    auth.me().then((res) => {
      if (!alive) return
      if (res.ok) setUser(res.data.user)
      else if (res.status === 401) clear()
    })
    return () => {
      alive = false
    }
  }, [token, setUser, clear])

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  // Role gate. `user` comes from the persisted store, so it's available on the
  // first render after login/refresh. Skip until we have it (me() may still be
  // in flight on a cold load).
  if (user) {
    const moduleKey = moduleKeyForPath(location.pathname)
    if (moduleKey && !canAccess(user.role, moduleKey)) {
      const fallback = defaultPathForRole(user.role)
      if (location.pathname !== fallback) {
        return <Navigate to={fallback} replace />
      }
    }
  }

  return <Outlet />
}

/**
 * Clerk sign-in (email code). Being signed in to Clerk is not enough: the email must also be an
 * active user (auth.php?action=me answers 401 otherwise), and then we say so instead of looping.
 * A session token from the magic-link or reference sign-in (a portal client) still uses LegacyGuard.
 */
function ClerkGuard() {
  const location = useLocation()
  const { isLoaded, isSignedIn } = useClerkAuth()
  const user = useAuth((s) => s.user)
  const setUser = useAuth((s) => s.setUser)
  const clear = useAuth((s) => s.clear)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      clear()
      return
    }
    let alive = true
    auth.me().then((res) => {
      if (!alive) return
      if (res.ok) {
        setDenied(false)
        setUser(res.data.user)
      } else if (res.status === 401 || res.status === 403) setDenied(true)
    })
    return () => {
      alive = false
    }
  }, [isLoaded, isSignedIn, setUser, clear])

  if (!isLoaded) return <Spinner />
  if (!isSignedIn) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (denied) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-xl font-semibold">No access yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You are signed in, but this email is not set up in GAkinzOS. Ask the owner to add it, then sign in again.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => clerkSignOut().then(() => setDenied(false))}>
            Sign out
          </Button>
        </div>
      </div>
    )
  }
  if (!user) return <Spinner />
  return <RoleGate />
}

function Spinner() {
  return (
    <div className="grid min-h-dvh place-items-center text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
}

/** The role gate (UX only; every endpoint enforces the role server-side). */
function RoleGate() {
  const location = useLocation()
  const user = useAuth((s) => s.user)
  if (user) {
    const moduleKey = moduleKeyForPath(location.pathname)
    if (moduleKey && !canAccess(user.role, moduleKey)) {
      const fallback = defaultPathForRole(user.role)
      if (location.pathname !== fallback) return <Navigate to={fallback} replace />
    }
  }
  return <Outlet />
}

export default function RequireAuth() {
  const token = useAuth((s) => s.token)
  if (!clerkEnabled || token) return <LegacyGuard />
  return (
    <ClerkSession>
      <ClerkGuard />
    </ClerkSession>
  )
}
