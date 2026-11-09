import AuthFrame from "@/app/components/AuthFrame"
import ClerkLogin from "@/app/ClerkLogin"
import { clerkEnabled } from "@/lib/clerk"

/**
 * The one sign-in screen: Clerk email code (D-057). The password, magic-link, Google-redirect and work-reference
 * forms were retired; an old link of those kinds lands here and simply asks for the email code.
 */
export default function Login() {
  if (clerkEnabled) return <ClerkLogin />
  return (
    <AuthFrame>
      <h2 className="font-display text-xl font-semibold">Sign-in is not set up</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This build has no Clerk key, so nobody can sign in. Set VITE_CLERK_PUBLISHABLE_KEY and rebuild.
      </p>
    </AuthFrame>
  )
}
