/**
 * Keeps the public pages' Content-Security-Policy (server/.htaccess) and the
 * built HTML in step. The policy allows inline scripts only by hash; if a
 * dependency changes the one inline script (next-themes), its hash changes and
 * the browser would block it. scripts/prerender.mjs runs cspHashProblems over
 * every prerendered page and fails the build instead (go-live 2026-11-01).
 */
import { createHash } from "node:crypto"

/** sha256 source expressions for each inline script, in page order. External and JSON-LD scripts are skipped. */
export function inlineScriptHashes(html: string): string[] {
  const out: string[] = []
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const [, attrs, body] = m
    if (/\bsrc\s*=/.test(attrs) || /application\/ld\+json/.test(attrs)) continue
    out.push(`sha256-${createHash("sha256").update(body).digest("base64")}`)
  }
  return out
}

/** The hashes in the enforced Content-Security-Policy lines of an .htaccess (Report-Only lines are ignored). */
export function policyHashes(htaccess: string): Set<string> {
  const out = new Set<string>()
  for (const m of htaccess.matchAll(/Header\s+always\s+set\s+Content-Security-Policy\s+"([^"]*)"/g)) {
    for (const h of m[1].matchAll(/'(sha256-[A-Za-z0-9+/=]+)'/g)) out.add(h[1])
  }
  return out
}

/** One line per page whose inline script the policy would block. */
export function cspHashProblems(pages: { path: string; html: string }[], htaccess: string): string[] {
  const allowed = policyHashes(htaccess)
  const problems: string[] = []
  for (const { path, html } of pages) {
    for (const h of inlineScriptHashes(html)) {
      if (!allowed.has(h)) problems.push(`${path}: inline script '${h}' is not in the Content-Security-Policy in server/.htaccess`)
    }
  }
  return problems
}
