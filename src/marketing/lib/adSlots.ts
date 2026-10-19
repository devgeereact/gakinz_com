import type { Block } from "./articleFormat"
import { loadScriptOnce, type ConsentEnv } from "./consent"
import { ADSENSE_SCRIPT } from "./monetisation"

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

/** Add the AdSense script for this publisher, once. Google's documented tag: async, crossorigin="anonymous". */
export function ensureAdScript(env: ConsentEnv, clientId: string) {
  return loadScriptOnce(env, `${ADSENSE_SCRIPT}?client=${encodeURIComponent(clientId)}`, { crossorigin: "anonymous" })
}
