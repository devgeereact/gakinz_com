import { monetisation, type MonetisationConfig } from "./monetisation"

/**
 * Consent for the public site (Task 25, docs/CONTENT-AND-GROWTH.md section 3).
 *
 * With the shipped settings (src/marketing/lib/monetisation.ts) every function
 * here returns at once: no script is added, nothing is written to cookies or
 * storage, and no banner exists. When consent.mode is "cmp", startConsent()
 * loads the configured certified CMP once, on public pages only, and listens on
 * the IAB TCF CMP API (`__tcfapi`, version 2) for the visitor's choice. The CMP
 * draws its own banner and keeps its own record; this module adds neither.
 *
 * "Has ad consent" means the CMP has a settled answer (eventStatus "tcloaded"
 * or "useractioncomplete") with consent to Purpose 1, storing and reading
 * information on the device, or the CMP reports that GDPR does not apply. A
 * "cmpuishown" event, a failed call or a missing CMP counts as no consent.
 * Google reads the TC string itself for the vendor-level decision.
 *
 * Private surfaces never load anything: /app (the CMS and the client portal),
 * /verify, /p (shared proposals), /login and /set-password.
 */

/** Paths that must never carry a third-party script. Matched by whole first segment. */
export const PRIVATE_PREFIXES = ["/app", "/verify", "/p", "/login", "/set-password", "/portal"] as const

export function isPrivatePath(pathname: string): boolean {
  const p = (pathname || "/").toLowerCase()
  return PRIVATE_PREFIXES.some((pre) => p === pre || p.startsWith(`${pre}/`))
}

/** The parts of the TCF TCData object this module reads. */
export type TcData = {
  gdprApplies?: boolean
  eventStatus?: string
  listenerId?: number
  purpose?: { consents?: Record<string, boolean | undefined> }
}
export type TcfApi = (command: string, version: number, callback: (data: TcData, success: boolean) => void, parameter?: unknown) => void

/** The browser surface used here, so tests can pass a stand-in. */
export type ConsentEnv = {
  document: Pick<Document, "createElement" | "querySelector"> & { head: Pick<HTMLElement, "appendChild"> }
  __tcfapi?: TcfApi
}

/** The decision from one TCData callback. */
export function hasAdConsent(data: TcData | null | undefined, success: boolean): boolean {
  if (!success || !data) return false
  if (data.gdprApplies === false) return true
  if (data.eventStatus !== "tcloaded" && data.eventStatus !== "useractioncomplete") return false
  return data.purpose?.consents?.["1"] === true
}

/**
 * Add a script once, marked so a second call finds it. Returns the element and
 * whether this call added it.
 */
export function loadScriptOnce(env: ConsentEnv, src: string, attrs: Record<string, string> = {}): { el: HTMLScriptElement; added: boolean } {
  const existing = env.document.querySelector<HTMLScriptElement>(`script[data-gk-third-party="${cssEscape(src)}"]`)
  if (existing) return { el: existing, added: false }
  const el = env.document.createElement("script")
  el.async = true
  el.src = src
  el.setAttribute("data-gk-third-party", src)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  env.document.head.appendChild(el)
  thirdPartyLoaded = true
  return { el, added: true }
}

const cssEscape = (s: string) => s.replace(/["\\]/g, "\\$&")

let thirdPartyLoaded = false
/** True once this page has added any third-party script. */
export function thirdPartyScriptsLoaded(): boolean {
  return thirdPartyLoaded
}

// ── Consent state, shared with every ad slot ─────────────────────────────────
let granted = false
const listeners = new Set<() => void>()
function setGranted(v: boolean) {
  if (v === granted) return
  granted = v
  listeners.forEach((l) => l())
}
export function getAdConsent(): boolean {
  return granted
}
export function subscribeAdConsent(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

let listening = false
let cmpScript: HTMLScriptElement | null = null

/** Register one TCF listener, now if the CMP API exists, or once the CMP script has loaded. */
function listen(env: ConsentEnv) {
  if (listening) return
  const attach = () => {
    if (listening || typeof env.__tcfapi !== "function") return
    listening = true
    env.__tcfapi("addEventListener", 2, (data, success) => setGranted(hasAdConsent(data, success)))
  }
  attach()
  if (!listening && cmpScript) cmpScript.addEventListener("load", attach, { once: true })
}

/**
 * Start consent for the page at `pathname`. Returns true when the CMP is (or
 * already was) loaded. Does nothing, and returns false, when consent is off or
 * the path is private.
 */
export function startConsent(pathname: string, env: ConsentEnv | undefined = typeof window === "undefined" ? undefined : (window as unknown as ConsentEnv), cfg: MonetisationConfig = monetisation()): boolean {
  if (!cfg.consent || !env || isPrivatePath(pathname)) return false
  const { el } = loadScriptOnce(env, cfg.consent.scriptUrl)
  cmpScript = el
  listen(env)
  return true
}

/**
 * True when the page has moved onto a private path after a third-party script
 * was added. The caller then reloads, so the CMS, the portal or a certificate
 * starts in a clean document with no CMP or ad script running in it.
 */
export function needsCleanLoad(pathname: string): boolean {
  return thirdPartyLoaded && isPrivatePath(pathname)
}

/** Tests only: forget every loaded script and listener. */
export function resetConsentForTests() {
  thirdPartyLoaded = false
  granted = false
  listening = false
  cmpScript = null
  listeners.clear()
}
