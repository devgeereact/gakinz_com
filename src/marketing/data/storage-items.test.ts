import { readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { describe, expect, it } from "vitest"
import { STORED_ITEMS } from "./storage-items"

const SRC = join(__dirname, "..", "..")
const ROOT = join(SRC, "..")

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

  it("gives every item a kind, a setter, a purpose and a lifetime", () => {
    for (const i of STORED_ITEMS) {
      expect(["cookie", "local storage"]).toContain(i.kind)
      expect(["this site", "Clerk"]).toContain(i.setBy)
      expect(i.purpose.length).toBeGreaterThan(10)
      expect(i.lasts.length).toBeGreaterThan(3)
    }
  })

  it("every use of cookies or local storage in src/ is in a known file", () => {
    const KNOWN = [
      "src/components/nav-main.tsx",
      "src/components/ui/sidebar.tsx",
      "src/providers/ui-theme-provider.tsx",
      "src/store/auth.store.ts",
    ]
    const found = sourceFiles(SRC)
      .filter((f) => /localStorage\.|sessionStorage\.|document\.cookie\s*=|\bpersist\(/.test(code(readFileSync(f, "utf8"))))
      .map((f) => relative(ROOT, f).split(sep).join("/"))
      .sort()
    expect(
      found,
      "A file in src/ uses cookies or browser storage that this test does not know about: add the new item to STORED_ITEMS and to this list",
    ).toEqual(KNOWN)
  })
})
