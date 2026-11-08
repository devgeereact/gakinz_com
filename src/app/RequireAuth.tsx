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
import { guardView, meOutcome, needsUser } from "./guardModel"

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
  const [failed, setFailed] = useState(false)
  const state = { isLoaded, isSignedIn: !!isSignedIn, hasUser: !!user, denied, failed }

  // A signed-out visitor holds no user.
  useEffect(() => {
    if (isLoaded && !isSignedIn) clear()
  }, [isLoaded, isSignedIn, clear])

  // Load the user whenever someone is signed in and none is held: on the first visit, and again after a 401
  // cleared it mid-session (the old effect ran only when Clerk's own state changed, so that hung the screen).
  // A refusal or a failure stops the loop until the person acts (guardModel.ts).
  const wantUser = needsUser(state)
  useEffect(() => {
    if (!wantUser) return
    let alive = true
    auth.me().then((res) => {
      if (!alive) return
      if (res.ok) {
        setDenied(false)
        setFailed(false)
        setUser(res.data.user)
      } else if (meOutcome(res) === "denied") setDenied(true)
      else setFailed(true)
    })
    return () => {
      alive = false
    }
  }, [wantUser, setUser])

  switch (guardView(state)) {
    case "loading":
      return <Spinner />
    case "login":
      return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    case "denied":
      return (
        <GateMessage
          title="No access yet"
          text="You are signed in, but this email is not set up in GAkinzOS. Ask the owner to add it, then sign in again."
        >
          <Button variant="outline" onClick={() => clerkSignOut().then(() => setDenied(false))}>
            Sign out
          </Button>
        </GateMessage>
      )
    case "retry":
      return (
        <GateMessage title="Could not load GAkinzOS" text="The studio could not be reached just now. Check your connection and try again.">
          <Button onClick={() => setFailed(false)}>Try again</Button>
          <Button variant="outline" onClick={() => clerkSignOut().then(() => setFailed(false))}>
            Sign out
          </Button>
        </GateMessage>
      )
    case "app":
      return <RoleGate />
  }
}

/** A centred message with actions, for the states where the person must do something. */
function GateMessage({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="max-w-sm">
        <h1 className="font-display text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>
      </div>
    </div>
  )
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
