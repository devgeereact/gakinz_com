import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import { cspHashProblems, inlineScriptHashes, policyHashes } from "./csp"

const sha = (s: string) => `sha256-${createHash("sha256").update(s).digest("base64")}`

describe("inlineScriptHashes", () => {
  it("hashes inline scripts and skips external and JSON-LD ones", () => {
    const html = `<script>a()</script><script type="module" src="/x.js"></script><script type="application/ld+json">{"a":1}</script><script>b()</script>`
    expect(inlineScriptHashes(html)).toEqual([sha("a()"), sha("b()")])
  })
})

describe("policyHashes", () => {
  it("reads the hashes from the enforced page policy in .htaccess", () => {
    const ht = `<FilesMatch "^index\\.html$">\n  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'sha256-AAA=' 'sha256-BBB='"\n</FilesMatch>`
    expect([...policyHashes(ht)]).toEqual(["sha256-AAA=", "sha256-BBB="])
  })
})

describe("cspHashProblems", () => {
  const ht = (h: string) => `Header always set Content-Security-Policy "script-src 'self' '${h}'"`
  it("passes when every inline script is allowed", () => {
    expect(cspHashProblems([{ path: "/", html: "<script>a()</script>" }], ht(sha("a()")))).toEqual([])
  })
  it("names the page and the missing hash otherwise", () => {
    const p = cspHashProblems([{ path: "/work", html: "<script>changed()</script>" }], ht(sha("a()")))
    expect(p).toHaveLength(1)
    expect(p[0]).toContain("/work")
    expect(p[0]).toContain(sha("changed()"))
  })
  it("fails when .htaccess has no enforced policy at all", () => {
    expect(cspHashProblems([{ path: "/", html: "<script>a()</script>" }], "")).toHaveLength(1)
  })
})
