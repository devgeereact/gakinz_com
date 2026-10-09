/**
 * Per-route document metadata for the public site.
 *
 * No metadata library is used. React 19 hoists `<title>`, `<meta>` and `<link>`
 * into the document head from anywhere in the tree, so a page can declare its
 * own metadata beside its own markup. Adding react-helmet would buy nothing.
 *
 * JSON-LD is the exception: React has no special handling for an inline
 * `<script>`, so it renders in place. That is valid — structured data may sit
 * anywhere in the document.
 *
 * NOTE ON CRAWLERS: this is a client-rendered SPA with no prerender step, so a
 * crawler that does not execute JavaScript sees none of this. Recorded in
 * docs/KNOWN-ISSUES.md. Googlebot renders; most social scrapers and LLM
 * crawlers do not.
 */

export const SITE_URL = "https://gakinz.com"
export const SITE_NAME = "Gideon Akinlotan"
export const OG_IMAGE = `${SITE_URL}/og.png`

type SeoProps = {
  /** Page title, without the site suffix. Omit on the home page. */
  title?: string
  /** 50–160 characters. One sentence, specific, no marketing register. */
  description: string
  /** Path only, e.g. "/work". Joined to SITE_URL for the canonical. */
  path: string
  /** "website" for pages, "article" for a post or a work record. */
  type?: "website" | "article"
  /** Absolute URL. Falls back to the site card. */
  image?: string
  /** Keep thin or transactional pages out of the index. */
  noIndex?: boolean
  /** Structured data. Emitted verbatim; caller owns correctness. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export default function Seo({
  title,
  description,
  path,
  type = "website",
  image = OG_IMAGE,
  noIndex = false,
  jsonLd,
}: SeoProps) {
  // Middle dot, not an em dash: it is the separator the masthead and the labels
  // already use, so the browser tab matches the page.
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · designer and developer, London`
  const url = `${SITE_URL}${path}`
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex, follow" />}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_GB" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  )
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
