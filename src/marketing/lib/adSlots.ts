import type { Block } from "./articleFormat"
import { loadScriptOnce, type ConsentEnv } from "./consent"
import { ADSENSE_SCRIPT, type MonetisationConfig } from "./monetisation"

/**
 * Where an article may carry an ad slot (Task 25): after the third paragraph
 * and after the eighth, at most two, and never after the last block, so a slot
 * always sits between paragraphs of text. Returns block indexes.
 */
export const SLOT_AFTER_PARAGRAPHS = [3, 8] as const
export function slotPositions(blocks: Block[]): number[] {
  const out: number[] = []
  let paragraphs = 0
  blocks.forEach((b, i) => {
    if (b.type !== "paragraph") return
    paragraphs += 1
    if ((SLOT_AFTER_PARAGRAPHS as readonly number[]).includes(paragraphs) && i < blocks.length - 1) out.push(i)
  })
  return out.slice(0, 2)
}

/**
 * The ad unit a slot shows, or null for none. A slot shows only when AdSense
 * is configured, a CMP is configured to ask, and the visitor has consented.
 */
export function adToShow(cfg: MonetisationConfig, consent: boolean): MonetisationConfig["ads"] {
  return cfg.ads && cfg.consent && consent ? cfg.ads : null
}

/** The page global AdSense reads its requests from. */
export type AdQueueHost = { adsbygoogle?: object[] }

/**
 * Ask AdSense to fill one ins element, once. A second push for the same
 * element makes AdSense throw, so the element is marked. Returns true when
 * this call made the request.
 */
export function requestAdOnce(ins: { dataset: DOMStringMap }, host: AdQueueHost): boolean {
  if (ins.dataset.gkPushed) return false
  ins.dataset.gkPushed = "1"
  ;(host.adsbygoogle = host.adsbygoogle || []).push({})
  return true
}

/** Add the AdSense script for this publisher, once. Google's documented tag: async, crossorigin="anonymous". */
export function ensureAdScript(env: ConsentEnv, clientId: string) {
  return loadScriptOnce(env, `${ADSENSE_SCRIPT}?client=${encodeURIComponent(clientId)}`, { crossorigin: "anonymous" })
}
