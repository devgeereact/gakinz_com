// Post-deploy check of the live site: the list in docs/DEPLOYMENT.md section 5.
// Read only: every request is an unauthenticated GET. It sends nothing, logs in nowhere and
// changes nothing, so it is safe to run before or after a release.
//
//   npm run check:live                      # https://gakinz.com
//   npm run check:live -- https://example   # another origin
//
// Exit code 0 when every check passes, 1 otherwise.
import { pathToFileURL } from "node:url"

const BUNDLE_CHECK = "hashed bundle is cached for a year"

/** One entry per thing DEPLOYMENT.md section 5 says to look at. `/` must stay first. */
export const CHECKS = [
  { name: "home page, with security headers", path: "/", status: 200, present: ["content-security-policy", "strict-transport-security"] },
  { name: "work page", path: "/work", status: 200 },
  { name: "service page", path: "/services/web-design", status: 200 },
  { name: "sign-in page", path: "/login", status: 200 },
  { name: "app shell", path: "/app", status: 200 },
  { name: "robots.txt", path: "/robots.txt", status: 200 },
  { name: "llms.txt", path: "/llms.txt", status: 200 },
  { name: "sitemap.xml", path: "/sitemap.xml", status: 200 },
  { name: "health check hides the PHP version", path: "/api.php", status: 200, absent: ["x-powered-by"] },
  { name: "API refuses an anonymous caller", path: "/auth.php?action=me", status: 401 },
  { name: "no directory listing for assets", path: "/assets/", status: 404 },
  { name: "no directory listing for uploads", path: "/uploads/", status: 404 },
  { name: "config.php is denied", path: "/config.php", status: 403 },
  { name: "README.md is denied", path: "/README.md", status: 403 },
  { name: "backup copies are denied", path: "/config.php.bak", status: 403 },
  // `path` is filled in from the home page at run time. Keep this entry last.
  { name: BUNDLE_CHECK, path: null, status: 200, includes: { "cache-control": ["max-age=31536000", "immutable"] } },
]

/** The first hashed entry bundle the page references, e.g. /assets/index-BMBeNQHs.js. */
export function findAssetPath(html) {
  const m = /\/assets\/index-[A-Za-z0-9_-]+\.js/.exec(html ?? "")
  return m ? m[0] : null
}

/** Judge one response against one check. Pure: no network, no clock. */
export function evaluate(check, response) {
  const { path } = check
  if (response.status !== check.status) {
    return { ok: false, detail: `${path} answered ${response.status}, expected ${check.status}` }
  }
  for (const h of check.present ?? []) {
    if (!response.headers.has(h)) return { ok: false, detail: `${path} is missing the ${h} header` }
  }
  for (const h of check.absent ?? []) {
    if (response.headers.has(h)) return { ok: false, detail: `${path} must not send the ${h} header` }
  }
  for (const [h, tokens] of Object.entries(check.includes ?? {})) {
    const value = (response.headers.get(h) ?? "").toLowerCase()
    const missing = tokens.filter((t) => !value.includes(t))
    if (missing.length) return { ok: false, detail: `${path} ${h} lacks ${missing.join(", ")}` }
  }
  return { ok: true, detail: `${path} ${response.status}` }
}

/** Run every check against `base`. `fetchFn` is injectable so the tests need no network. */
export async function runChecks(base, fetchFn = fetch) {
  const results = []
  let homeBody = null
  for (const check of CHECKS) {
    const isBundle = check.name === BUNDLE_CHECK
    const path = isBundle ? findAssetPath(homeBody) : check.path
    if (path === null) {
      results.push({ name: check.name, path: null, ok: false, detail: "no /assets/index-*.js bundle found on /" })
      continue
    }
    try {
      const response = await fetchFn(new URL(path, base).href, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(10_000) })
      if (path === "/") homeBody = await response.text()
      const verdict = evaluate({ ...check, path }, response)
      results.push({ name: check.name, path, ...verdict })
    } catch (e) {
      results.push({ name: check.name, path, ok: false, detail: `${path} could not be fetched (${e.cause?.code ?? e.message})` })
    }
  }
  return results
}

async function main() {
  const base = process.argv[2] ?? "https://gakinz.com"
  if (!/^https?:\/\//.test(base)) {
    console.error("Give an origin that starts with http:// or https://")
    process.exit(2)
  }
  const results = await runChecks(base)
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}: ${r.detail}`)
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${results.length - failed} of ${results.length} checks passed against ${base}. Read only: nothing was changed.`)
  process.exit(failed ? 1 : 0)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
