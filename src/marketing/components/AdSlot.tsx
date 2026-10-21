import { forwardRef, useEffect, useRef, useSyncExternalStore } from "react"
import { getAdConsent, subscribeAdConsent, type ConsentEnv } from "@/marketing/lib/consent"
import { adToShow, ensureAdScript, requestAdOnce, type AdQueueHost } from "@/marketing/lib/adSlots"
import { monetisation } from "@/marketing/lib/monetisation"

/**
 * One labelled AdSense unit inside an article (Task 25,
 * docs/CONTENT-AND-GROWTH.md section 3). It renders nothing, and so takes no
 * space, unless AdSense is configured with a valid publisher and slot ID, a CMP
 * is configured, and the visitor has given ad consent through it. Only then is
 * the AdSense script added, once per page however many slots there are, and
 * the space reserved so the unit does not push the text about as it fills.
 *
 * The server render never shows a slot (consent is unknown there), so the
 * prerendered pages are the same whatever the settings.
 */

/** The slot's markup: a visible "Advertisement" label and Google's ins element. */
export const AdSlotView = forwardRef<HTMLModElement, { clientId: string; slotId: string }>(function AdSlotView({ clientId, slotId }, ref) {
  return (
    <aside className="adslot" aria-label="Advertisement" data-gk-ad="">
      <p className="adslot__label mono">Advertisement</p>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
})

export default function AdSlot() {
  const cfg = monetisation()
  const consent = useSyncExternalStore(subscribeAdConsent, getAdConsent, () => false)
  const ref = useRef<HTMLModElement>(null)
  const ads = adToShow(cfg, consent)

  useEffect(() => {
    const ins = ref.current
    if (!ads || !ins) return
    const w = window as unknown as ConsentEnv & AdQueueHost
    if (requestAdOnce(ins, w)) ensureAdScript(w, ads.clientId)
  }, [ads])

  if (!ads) return null
  return <AdSlotView ref={ref} clientId={ads.clientId} slotId={ads.slotId} />
}
