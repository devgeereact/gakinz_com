import { useClerk } from "@clerk/clerk-react"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Sign-in security lives with Clerk (D-057): the email code, signed-in devices and any extra
 * verification are managed in Clerk's own account panel, opened from here. GAkinzOS keeps no
 * password and no session list of its own.
 */
export default function SignInSecurity() {
  const clerk = useClerk()
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        You sign in with a code sent to your email. Your signed-in devices and sign-in protection are managed in your
        secure account panel.
      </p>
      <Button type="button" variant="outline" onClick={() => clerk.openUserProfile()}>
        <ShieldCheck className="mr-2 size-4" aria-hidden />
        Manage sign-in and devices
      </Button>
    </div>
  )
}
