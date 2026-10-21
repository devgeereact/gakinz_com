import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { needsCleanLoad, startConsent } from "@/marketing/lib/consent"

/**
 * Starts the configured CMP on public pages (src/marketing/lib/consent.ts).
 * PublicLayout mounts this only when consent.mode is "cmp", so with the shipped
 * settings it is not in the tree at all. It renders nothing.
 *
 * Leaving the public site for a private surface after a CMP or ad script has
 * loaded reloads the page, so no third-party script keeps running inside the
 * CMS, the portal, a shared proposal or a certificate.
 */
export default function ConsentLoader() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (needsCleanLoad(pathname)) {
      window.location.reload()
      return
    }
    startConsent(pathname)
  }, [pathname])

  // PublicLayout unmounts on the way to /app, /login or /p: by then the
  // browser's address is the new, private one.
  useEffect(
    () => () => {
      if (needsCleanLoad(window.location.pathname)) window.location.reload()
    },
    [],
  )

  return null
}
