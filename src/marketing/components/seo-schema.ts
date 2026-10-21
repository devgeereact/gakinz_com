// Site constants and JSON-LD builders for the public site, kept apart from the
// Seo component so that file exports only a component (react-refresh).

export const SITE_URL = "https://gakinz.com"
export const SITE_NAME = "Gideon Akinlotan"
export const OG_IMAGE = `${SITE_URL}/og.png`

/** One pattern each for a public email and phone number, shared by the website and the editor. Mirrors server/site.php. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]*$/

/** JSON for a <script type="application/ld+json"> block: `<`, `>`, `&` and the line separators escaped so no value can close the tag. */
export function jsonLdString(block: unknown): string {
  return JSON.stringify(block)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

/** True for a full https address with a host and no sign-in details. Anything else never becomes a link or a sameAs entry. */
export function isHttpsUrl(v: unknown): v is string {
  // Whitespace, control characters and the characters that can break out of markup or a JSON string never belong in a profile address.
  if (typeof v !== "string" || /[\s<>"\\`]/.test(v) || [...v].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return false
  try {
    const u = new URL(v)
    return u.protocol === "https:" && u.hostname.includes(".") && !u.username && !u.password
  } catch {
    return false
  }
}

/** The sameAs list for a set of profiles: https addresses only, each once, in order. */
export function sameAsFrom(links: { url: string }[] | null | undefined): string[] {
  return [...new Set((links ?? []).map((l) => l.url).filter(isHttpsUrl))]
}

/**
 * The Person record for the site owner.
 *
 * Only fields with a real value belong here. `sameAs` is deliberately built
 * from whatever real profile URLs exist and is omitted entirely when there are
 * none — a sameAs pointing at https://github.com/ rather than at a profile is
 * a false statement about identity, and structured data is read by machines
 * that cannot tell the difference.
 */
export function personSchema(opts: { sameAs?: string[]; jobTitle: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/#person`,
    name: SITE_NAME,
    url: SITE_URL,
    jobTitle: opts.jobTitle,
    description: opts.description,
    address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" },
    ...(opts.sameAs && opts.sameAs.length ? { sameAs: opts.sameAs } : {}),
  }
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: "en-GB",
    publisher: { "@id": `${SITE_URL}/#person` },
  }
}
