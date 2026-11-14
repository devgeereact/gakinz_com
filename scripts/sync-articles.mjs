// Refresh the built-in articles in src/marketing/data/site.ts from the live CMS (V1.3 item 6, K-147).
//
//   pnpm run sync:articles                 # rewrite the `insights` array from https://gakinz.com
//   pnpm run sync:articles -- --dry-run    # change nothing; exit 1 if the snapshot is out of date
//   pnpm run sync:articles https://other   # another origin
//
// Read only on the network side: two unauthenticated GETs per post (`/blog.php` and `/blog.php?slug=...`), the same
// public endpoints the site itself calls. The build stays offline (it reads the snapshot) and `check:live` stays the
// alarm that the sitemap and the CMS agree. The conversion mirrors src/marketing/data/blog.ts: the date is the first ten
// characters of published_at and the body splits on blank lines.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
export const SITE_FILE = path.join(ROOT, "src/marketing/data/site.ts")
const START = "export const insights: Insight[] = ["

/** CMS list rows plus the full post for each slug, in, the `insights` array out, verbatim. */
export function postsToInsights(list, fullBySlug) {
  return list.map((row) => {
    const full = fullBySlug[row.slug]
    if (!full) throw new Error(`No full post for "${row.slug}".`)
    const date = /^(\d{4}-\d{2}-\d{2})(?:[ T].*)?$/.exec(String(row.published_at ?? "").trim())?.[1]
    if (!date) throw new Error(`Post "${row.slug}" has no published date.`)
    const body = String(full.body ?? "").split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
    if (body.length === 0) throw new Error(`Post "${row.slug}" has no body.`)
    return { slug: row.slug, title: row.title, excerpt: row.excerpt ?? "", date, body }
  })
}

const q = (s) => JSON.stringify(s)

/** The source text of the array, one canonical layout (strings are JSON strings, so they survive verbatim). */
export function renderInsights(insights) {
  const items = insights.map((p) =>
    [
      "  {",
      `    slug: ${q(p.slug)},`,
      `    title: ${q(p.title)},`,
      "    excerpt:",
      `      ${q(p.excerpt)},`,
      `    date: ${q(p.date)},`,
      "    body: [",
      ...p.body.map((para) => `      ${q(para)},`),
      "    ],",
      "  },",
    ].join("\n"),
  )
  return `${START}\n${items.join("\n")}\n]`
}

/** The source with its `insights` array replaced. Throws if the array cannot be found. */
export function replaceInsights(source, rendered) {
  const start = source.indexOf(START)
  if (start < 0) throw new Error("Could not find `export const insights` in site.ts.")
  const end = source.indexOf("\n]\n", start)
  if (end < 0) throw new Error("Could not find the end of the insights array in site.ts.")
  return source.slice(0, start) + rendered + source.slice(end + 2)
}

async function getJson(fetchFn, url) {
  const res = await fetchFn(url, { headers: { accept: "application/json" } })
  if (!res.ok) throw new Error(`${url} answered ${res.status}`)
  return res.json()
}

/** Fetch the published posts and return the new site.ts text. */
export async function buildSnapshot({ origin, source, fetchFn = fetch }) {
  const list = await getJson(fetchFn, `${origin}/blog.php`)
  if (!Array.isArray(list) || list.length === 0) throw new Error("The CMS returned no published posts; refusing to empty the snapshot.")
  const fullBySlug = {}
  for (const row of list) fullBySlug[row.slug] = await getJson(fetchFn, `${origin}/blog.php?slug=${encodeURIComponent(row.slug)}`)
  return replaceInsights(source, renderInsights(postsToInsights(list, fullBySlug)))
}

export async function main(argv, fetchFn = fetch) {
  const dryRun = argv.includes("--dry-run")
  const origin = (argv.find((a) => /^https?:\/\//.test(a)) ?? "https://gakinz.com").replace(/\/$/, "")
  const source = fs.readFileSync(SITE_FILE, "utf8")
  const next = await buildSnapshot({ origin, source, fetchFn })
  if (next === source) {
    console.log(`The built-in articles already match ${origin}.`)
    return 0
  }
  if (dryRun) {
    console.log(`The built-in articles differ from ${origin}. Run \`pnpm run sync:articles\` to update src/marketing/data/site.ts.`)
    return 1
  }
  fs.writeFileSync(SITE_FILE, next)
  console.log(`Updated the built-in articles in src/marketing/data/site.ts from ${origin}. Review the diff, then run the tests.`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => {
    console.error(String(e?.message ?? e))
    process.exit(2)
  })
}
