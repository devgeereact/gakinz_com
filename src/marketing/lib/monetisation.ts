/**
 * Advertising and consent configuration for the public site (Task 25).
 *
 * WHERE THE SETTINGS LIVE: this tracked file, not Site content. Switching on a
 * third-party script is a change to what runs on an origin that also holds the
 * CMS sign-in token in localStorage (K-033), so it goes through the same review,
 * CI and deploy as any other code change instead of a CMS form an editor role
 * could fill in. The AdSense publisher ID and a CMP loader address are public
 * values, so nothing secret is kept here.
 *
 * DEFAULT: everything off. With these values the public site loads no
 * third-party script, writes nothing to storage, shows no consent banner and
 * renders no ad slot. The site stores nothing optional today
 * (docs/PRIVACY-READINESS.md section 4), so no banner is needed while this
 * stays off.
 *
 * TO SWITCH ON (only after the steps in docs/CONTENT-AND-GROWTH.md section 3):
 *   consent.mode            "cmp"
 *   consent.cmp_script_url  the certified CMP's https loader, on a host in CMP_HOSTS
 *   ads.provider            "adsense"
 *   ads.client_id           "ca-pub-" and 16 digits
 *   ads.slot_id             the in-article ad unit's 10-digit slot ID
 * Ads never load without a CMP: with consent.mode "none" there is no consent
 * signal, so no slot ever renders.
 */

export type RawMonetisationConfig = {
  ads: { provider: string; client_id: string; slot_id: string }
  consent: { mode: string; cmp_script_url: string }
}

/** The values the site ships with. Change these, and nothing else, to switch the pilot on. */
export const MONETISATION: RawMonetisationConfig = {
  ads: { provider: "none", client_id: "", slot_id: "" },
  consent: { mode: "none", cmp_script_url: "" },
}

/**
 * Hosts a CMP loader may come from. A loader on any other host is ignored. As
 * at 2026-10-19 these are the published loader hosts of Google's own Privacy &
 * messaging, InMobi CMP, Cookiebot, OneTrust and Didomi. Being on this list is
 * not evidence of Google certification: check the CMP against Google's
 * certified list before switching it on.
 */
export const CMP_HOSTS = [
  "fundingchoicesmessages.google.com",
  "cmp.inmobi.com",
  "consent.cookiebot.com",
  "cdn.cookielaw.org",
  "sdk.privacy-center.org",
] as const

export const ADSENSE_CLIENT = /^ca-pub-\d{16}$/
export const ADSENSE_SLOT = /^\d{10}$/
export const ADSENSE_SCRIPT = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"

export type MonetisationConfig = {
  /** Null unless every ad setting is valid. */
  ads: { provider: "adsense"; clientId: string; slotId: string } | null
  /** Null unless the mode is "cmp" and the loader address is allowed. */
  consent: { mode: "cmp"; scriptUrl: string } | null
}

/** True for an https address on an allowed CMP host, with no port, sign-in details or odd characters. */
export function isAllowedCmpUrl(v: unknown): v is string {
  if (typeof v !== "string" || !v || v.length > 500 || /[\s<>"'`\\]/.test(v)) return false
  let u: URL
  try {
    u = new URL(v)
  } catch {
    return false
  }
  return (
    u.protocol === "https:" &&
    !u.username &&
    !u.password &&
    !u.port &&
    (CMP_HOSTS as readonly string[]).includes(u.hostname)
  )
}

/** The raw settings, checked. Anything wrong switches that part off rather than half on. */
export function normaliseMonetisation(raw: RawMonetisationConfig | null | undefined): MonetisationConfig {
  const a = raw?.ads
  const c = raw?.consent
  const ads =
    a && a.provider === "adsense" && ADSENSE_CLIENT.test(a.client_id) && ADSENSE_SLOT.test(a.slot_id)
      ? { provider: "adsense" as const, clientId: a.client_id, slotId: a.slot_id }
      : null
  const consent = c && c.mode === "cmp" && isAllowedCmpUrl(c.cmp_script_url) ? { mode: "cmp" as const, scriptUrl: c.cmp_script_url } : null
  return { ads, consent }
}

let current = normaliseMonetisation(MONETISATION)

/** The checked settings the site runs with. */
export function monetisation(): MonetisationConfig {
  return current
}

/** Tests only: run with other settings. Pass nothing to go back to the shipped values. */
export function setMonetisationForTests(raw?: RawMonetisationConfig) {
  current = normaliseMonetisation(raw ?? MONETISATION)
}

/** True when ad slots could ever render: AdSense configured and a CMP to ask for consent. */
export function adsConfigured(cfg: MonetisationConfig = current): boolean {
  return Boolean(cfg.ads && cfg.consent)
}
