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
 * Clerk's form drawn with GAkinzOS tokens (D-053, K-112 C1). Values are the CSS variables from
 * src/index.css, so light and dark follow the theme without a second object. Elements are addressed by
 * Clerk's element keys, never by `.cl-*` class selectors. The card loses its own frame because
 * AuthFrame already provides one.
 */
const APPEARANCE = {
  variables: {
    colorPrimary: "hsl(var(--primary))",
    colorPrimaryForeground: "hsl(var(--primary-foreground))",
    colorBackground: "hsl(var(--background))",
    colorForeground: "hsl(var(--foreground))",
    colorMutedForeground: "hsl(var(--muted-foreground))",
    colorInput: "hsl(var(--card))",
    colorInputForeground: "hsl(var(--foreground))",
    colorBorder: "hsl(var(--input))",
    colorRing: "hsl(var(--ring))",
    colorDanger: "hsl(var(--destructive))",
    borderRadius: "0.625rem",
    fontFamily: "inherit",
  },
  elements: {
    cardBox: { boxShadow: "none", border: "0", width: "100%" },
    card: { boxShadow: "none", border: "0", background: "transparent", padding: "0" },
  },
}

/**
 * Clerk is mounted only around the sign-in page and the CMS, never the public marketing site
 * (which is prerendered and hydrated, and should not load Clerk for every visitor).
 */
export default function ClerkSession({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl="/login" appearance={APPEARANCE}>
      <Bridge />
      {children}
    </ClerkProvider>
  )
}
