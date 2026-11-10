// facts-check.mjs: lists every placeholder still showing on the built public pages (dist/), which owner fact
// each one waits for, and where the answer goes. V1 finish line item 4 is ticked when
// `npm run check:facts -- --strict` exits 0.
//
//   npm run build && npm run check:facts            # report; fails only on an invented-looking value
//   npm run check:facts -- --strict                 # also fails while any owner fact is missing
//
// A "gap" is the site's labelled marker for a value the owner has not supplied (src/marketing/data/site.ts
// explains why it is a marker and not a made-up value). Two kinds are told apart:
//   - OPEN FACT  : "[... to supply]", "[... to confirm]" and the IT pricing line "Priced per job, ask for a quote."
//   - NOTE       : an honest statement that renders in the same style (for example "not measured yet"); it is
//                  not a missing fact and never fails the check.
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

/** Values the site once shipped as stand-ins. They must never appear again. */
export const INVENTED = [
  { re: /\+44 ?20 ?0000 ?0000/, what: "placeholder telephone number" },
  { re: /\b0{8}\b/, what: "placeholder company number 00000000" },
]

const OPEN = /(to supply|to confirm)/i
const QUOTE_ONLY = "Priced per job, ask for a quote."

/** Where each kind of open fact is answered. First match wins. */
export const FACTS = [
  { re: /legal name|trading form/i, fact: "Trading identity (sole trader or limited company, registered name and number)", where: "site.ts studio.registration and the /privacy and /terms wording in src/marketing/pages/Legal.tsx" },
  { re: /VAT basis/i, fact: "VAT status and whether prices include VAT", where: "src/marketing/pages/Pricing.tsx and the invoice VAT rate" },
  { re: /ICO/i, fact: "ICO data protection fee and registration number", where: "src/marketing/pages/Legal.tsx (/privacy)" },
  { re: /lawful basis|international transfers/i, fact: "Lawful bases and international transfers (adviser)", where: "src/marketing/pages/Legal.tsx (/privacy)" },
  { re: /hosting provider|email provider|payment, text message/i, fact: "Processors and data location", where: "src/marketing/pages/Legal.tsx (/privacy)" },
  { re: /period/i, fact: "Retention periods (adviser)", where: "src/marketing/pages/Legal.tsx (/privacy) and the $RETENTION_* keys" },
  { re: /governing law/i, fact: "Governing law and courts (adviser)", where: "src/marketing/pages/Legal.tsx (/terms)" },
  { re: /review date/i, fact: "Date each legal page was reviewed", where: "src/marketing/pages/Legal.tsx" },
  { re: /priced per job/i, fact: "IT support and consultancy pricing, coverage area and response time", where: "src/marketing/data/site.ts (QUOTE_ONLY and the IT service entries)" },
]

export function gapsIn(html) {
  const out = []
  for (const m of html.matchAll(/class="gap"[^>]*>([^<]*)</g)) out.push(m[1].trim())
  if (html.includes(QUOTE_ONLY)) out.push(QUOTE_ONLY)
  return out
}

export const isOpenFact = (text) => OPEN.test(text) || text === QUOTE_ONLY

export function factFor(text) {
  return FACTS.find((f) => f.re.test(text)) ?? { fact: "Unclassified placeholder", where: "search the text in src/marketing" }
}

function* htmlFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* htmlFiles(p)
    else if (e.name.endsWith(".html")) yield p
  }
}

export function scan(distDir) {
  const pages = []
  const invented = []
  for (const file of htmlFiles(distDir)) {
    const html = fs.readFileSync(file, "utf8")
    const route = "/" + path.relative(distDir, file).replace(/index\.html$/, "").replace(/\.html$/, "").replace(/\/$/, "")
    const gaps = gapsIn(html)
    if (gaps.length) pages.push({ route, gaps })
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "")
    for (const i of INVENTED) if (i.re.test(visible)) invented.push({ route, what: i.what })
  }
  return { pages, invented }
}

function main() {
  const dist = path.resolve(process.cwd(), "dist")
  if (!fs.existsSync(dist)) {
    console.error("dist/ is missing. Run `npm run build` first.")
    process.exit(2)
  }
  const strict = process.argv.includes("--strict")
  const { pages, invented } = scan(dist)
  const open = new Map() // fact -> { where, texts:Set, routes:Set }
  const notes = new Map()
  for (const p of pages) {
    for (const g of p.gaps) {
      if (isOpenFact(g)) {
        const f = factFor(g)
        const e = open.get(f.fact) ?? { where: f.where, texts: new Set(), routes: new Set() }
        e.texts.add(g)
        e.routes.add(p.route)
        open.set(f.fact, e)
      } else notes.set(g, (notes.get(g) ?? new Set()).add(p.route))
    }
  }
  console.log(`facts-check: ${pages.length} of the built pages carry a placeholder marker.\n`)
  console.log(`OPEN OWNER FACTS (${open.size})`)
  for (const [fact, e] of open) {
    console.log(`\n  - ${fact}\n    answer goes in: ${e.where}\n    shows on: ${[...e.routes].sort().join(", ")}`)
    for (const t of e.texts) console.log(`    wording now: ${t}`)
  }
  if (notes.size) {
    console.log(`\nNOTES (honest statements in the gap style, not missing facts)`)
    for (const [t, r] of notes) console.log(`  - "${t}" on ${r.size} page(s)`)
  }
  if (invented.length) {
    console.log(`\nINVENTED-LOOKING VALUES (never allowed)`)
    for (const i of invented) console.log(`  - ${i.what} on ${i.route}`)
    process.exit(1)
  }
  if (strict && open.size) {
    console.log(`\nFAIL (--strict): ${open.size} owner fact(s) still missing.`)
    process.exit(1)
  }
  console.log(open.size ? `\nOK so far: no invented values. ${open.size} owner fact(s) still missing (run with --strict to fail on them).` : "\nOK: no placeholders left.")
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
