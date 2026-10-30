import { useEffect, type ReactNode } from "react"
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/clerk-react"
import { CLERK_KEY, setClerkState } from "@/lib/clerk"

/** Mirrors Clerk's session into lib/clerk.ts so the API client can send a fresh token. */
function Bridge() {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth()
  const signedIn = Boolean(isSignedIn)
  useEffect(() => {
    setClerkState({ loaded: isLoaded, signedIn, getToken: () => getToken(), signOut: () => signOut() })
  }, [isLoaded, signedIn, getToken, signOut])
  return null
}

/**
 * Clerk is mounted only around the sign-in page and the CMS, never the public marketing site
 * (which is prerendered and hydrated, and should not load Clerk for every visitor).
 */
export default function ClerkSession({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl="/login">
      <Bridge />
      {children}
    </ClerkProvider>
  )
}
