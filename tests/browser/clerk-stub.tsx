/**
 * A stand-in for `@clerk/clerk-react`, used only by the test build (vite.cms-test.config.ts). It is always signed in
 * and returns the session token the browser test put on `window.__GK_TEST_TOKEN`. Nothing here is bundled into the
 * shipped app, and it makes no network call.
 */
import type { ReactNode } from "react"

declare global {
  interface Window {
    __GK_TEST_TOKEN?: string
  }
}

export function ClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    getToken: async () => window.__GK_TEST_TOKEN ?? null,
    signOut: async () => {},
  }
}

export function useClerk() {
  return { openUserProfile: () => {}, signOut: async () => {} }
}

export function SignIn() {
  return <p>Sign-in is replaced by a stub in this build.</p>
}
