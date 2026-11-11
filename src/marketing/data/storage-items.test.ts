import { readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { describe, expect, it } from "vitest"
import { STORED_ITEMS } from "./storage-items"

const SRC = join(__dirname, "..", "..")
const ROOT = join(SRC, "..")

const KNOWN_FILES = [
  "src/components/nav-main.tsx",
  "src/components/ui/sidebar.tsx",
  "src/providers/ui-theme-provider.tsx",
  "src/store/auth.store.ts",
]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    if (e.isDirectory()) return sourceFiles(p)
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name) ? [p] : []
  })
}

// Strip comments so a sentence that merely mentions localStorage is not counted as a use.
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")

describe("STORED_ITEMS", () => {
  it("lists every item the signed-in area stores", () => {
    expect(STORED_ITEMS.map((i) => i.name).sort()).toEqual(
      ["__client", "__client_uat", "__session", "gk-auth", "gkos-groups", "sidebar_state", "theme"].sort(),
    )
  })

  it("does not list the retired gk_oauth_state cookie or the gk-locked item", () => {
    const names = STORED_ITEMS.map((i) => i.name)
    expect(names).not.toContain("gk_oauth_state")
    expect(names).not.toContain("gk-locked")
  })

  it("says how long gk-auth lasts in words that follow the \"Lasts:\" label (store/auth.store.ts: sign-out keeps an empty entry)", () => {
    const gkAuth = STORED_ITEMS.find((i) => i.name === "gk-auth")
    expect(gkAuth?.lasts).toMatch(/^Until you sign out\./)
    expect(gkAuth?.lasts).toContain("an empty entry stays")
  })

  it("gives every item a kind, a setter, a purpose and a lifetime", () => {
    for (const i of STORED_ITEMS) {
      expect(["cookie", "local storage"]).toContain(i.kind)
      expect(["this site", "Clerk"]).toContain(i.setBy)
      expect(i.purpose.length).toBeGreaterThan(10)
      expect(i.lasts.length).toBeGreaterThan(3)
    }
  })

  it("every use of cookies or local storage in src/ is in a known file", () => {
    const found = sourceFiles(SRC)
      .filter((f) => /localStorage\.|sessionStorage\.|document\.cookie\s*=|\bpersist\(/.test(code(readFileSync(f, "utf8"))))
      .map((f) => relative(ROOT, f).split(sep).join("/"))
      .sort()
    expect(
      found,
      "A file in src/ uses cookies or browser storage that this test does not know about: add the new item to STORED_ITEMS and to this list",
    ).toEqual(KNOWN_FILES)
  })

  it("every name those files read, write or remove is listed in STORED_ITEMS", () => {
    // The one key a file may touch without listing it: ui-theme-provider.tsx only REMOVES it, to clear a retired theme.
    const RETIRED = ["ui-theme"]
    const listed = STORED_ITEMS.map((i) => i.name)
    const unlisted: string[] = []
    for (const f of KNOWN_FILES) {
      const src = code(readFileSync(join(ROOT, f), "utf8"))
      // A name is a string literal, or an identifier declared as `const X = "literal"` in the same file.
      const resolve = (arg: string) => {
        const lit = arg.match(/^["'`]([^"'`$]+)["'`]$/)
        if (lit) return lit[1]
        return src.match(new RegExp(`const ${arg}\\s*=\\s*["']([^"']+)["']`))?.[1] ?? `UNRESOLVED(${arg})`
      }
      const used = [
        ...[...src.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(\s*([^,)\s]+)/g)].map((m) => resolve(m[1])),
        // document.cookie = `${NAME}=...` or "name=..."
        ...[...src.matchAll(/document\.cookie\s*=\s*[`"']\$?\{?([\w-]+)\}?=/g)].map((m) =>
          /^[A-Z_]+$/.test(m[1]) ? resolve(m[1]) : m[1],
        ),
        // zustand persist options: name: "x" or name: IDENT
        ...[...src.matchAll(/\bname:\s*(["'][^"']+["']|[A-Z_]+)\s*,/g)].map((m) => resolve(m[1])),
      ]
      for (const name of used) if (!listed.includes(name) && !RETIRED.includes(name)) unlisted.push(`${f}: ${name}`)
    }
    expect(unlisted, "These browser storage names are not in STORED_ITEMS: add each one there, so the cookie policy lists it").toEqual([])
  })
})
