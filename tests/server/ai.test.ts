/**
 * AI proxy (server/ai.php with _ai.php). Anthropic answers first; OpenRouter takes
 * over when Anthropic has no key, errors or declines; with neither key the endpoint
 * answers 503 so the interface hides AI. Both providers are the fake provider in
 * global-setup.ts: no request leaves 127.0.0.1 and no key is real.
 */
import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { AI_MODE, WORK_DIR } from "./env"
import { api, clearProviderRequests, createClient, createUser, login, one, providerRequests, resetDb } from "./helpers"

const OVERRIDES = path.join(WORK_DIR, "overrides.json")

type AiOut = { text?: string; provider?: string; error?: string }

function mode(m: { anthropic?: string; openrouter?: string }) {
  fs.writeFileSync(AI_MODE, JSON.stringify(m))
}

function run(token: string, input = "Write a two-line reply to a pricing enquiry.") {
  return api<AiOut>("ai.php", { token, body: { task: "test_draft", input } })
}

let staff: string

beforeEach(async () => {
  resetDb()
  clearProviderRequests()
  fs.rmSync(AI_MODE, { force: true })
  fs.rmSync(OVERRIDES, { force: true })
  createUser({ email: "editor@example.test", role: "editor" })
  staff = await login("editor@example.test")
})

afterEach(() => {
  fs.rmSync(AI_MODE, { force: true })
  fs.rmSync(OVERRIDES, { force: true })
})

describe("ai.php providers", () => {
  it("answers from Anthropic first, with the current API version and refusal fallbacks", async () => {
    const r = await run(staff)
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ text: "Draft from Anthropic.", provider: "anthropic" })

    const sent = providerRequests()
    expect(sent.map((s) => s.path)).toEqual(["/v1/messages"])
    expect(sent[0].headers["x-api-key"]).toBe("test-anthropic-key")
    expect(sent[0].headers["anthropic-version"]).toBe("2026-10-21")
    expect(sent[0].headers["anthropic-beta"]).toBe("server-side-fallback-2026-07-01")
    const body = JSON.parse(sent[0].body)
    expect(body.model).toBe("claude-opus-5-5")
    expect(body.fallbacks).toBe("default")
    expect(body.system).toContain("UK English")
    expect(body.messages).toEqual([{ role: "user", content: "Write a two-line reply to a pricing enquiry." }])
    expect(one("SELECT detail FROM audit_log WHERE action = 'ai_call'")).toBe("test_draft via anthropic")
  })

  it("falls back to OpenRouter when Anthropic errors", async () => {
    mode({ anthropic: "error" })
    const r = await run(staff)
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ text: "Draft from OpenRouter.", provider: "openrouter" })
    const sent = providerRequests()
    expect(sent.map((s) => s.path)).toEqual(["/v1/messages", "/v1/chat/completions"])
    expect(sent[1].headers.authorization).toBe("Bearer test-openrouter-key")
    expect(one("SELECT detail FROM audit_log WHERE action = 'ai_call'")).toBe("test_draft via openrouter")
  })

  it("falls back to OpenRouter when Anthropic declines", async () => {
    mode({ anthropic: "refusal" })
    const r = await run(staff)
    expect(r.json.provider).toBe("openrouter")
  })

  it("uses OpenRouter alone when no Anthropic key is set", async () => {
    fs.writeFileSync(OVERRIDES, JSON.stringify({ TEST_ANTHROPIC_KEY: "" }))
    const r = await run(staff)
    expect(r.json.provider).toBe("openrouter")
    expect(providerRequests().map((s) => s.path)).toEqual(["/v1/chat/completions"])
  })

  it("treats a placeholder key as not set", async () => {
    fs.writeFileSync(OVERRIDES, JSON.stringify({ TEST_ANTHROPIC_KEY: "REPLACE_anthropic_key" }))
    const r = await run(staff)
    expect(r.json.provider).toBe("openrouter")
  })

  it("answers 502 when both providers fail, and does not count the call", async () => {
    mode({ anthropic: "error", openrouter: "error" })
    const r = await run(staff)
    expect(r.status).toBe(502)
    expect(r.json.error).toBeTruthy()
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'ai_call'")).toBe("0")
  })

  it("answers 503 with no key at all, and calls no provider", async () => {
    fs.writeFileSync(OVERRIDES, JSON.stringify({ TEST_ANTHROPIC_KEY: "", TEST_OPENROUTER_KEY: "" }))
    const r = await run(staff)
    expect(r.status).toBe(503)
    expect(providerRequests()).toEqual([])
  })
})

describe("ai.php access", () => {
  it("refuses a signed-out caller and a client-role caller", async () => {
    expect((await run("")).status).toBe(401)
    const cid = createClient("Synthetic Client Ltd")
    createUser({ email: "portal@example.test", role: "client", clientId: cid })
    const client = await login("portal@example.test")
    expect((await run(client)).status).toBe(403)
    expect(providerRequests()).toEqual([])
  })
})

describe("integrations.php", () => {
  it("reports each AI provider as a boolean, never the key", async () => {
    createUser({ email: "admin@example.test", role: "admin" })
    const admin = await login("admin@example.test")
    fs.writeFileSync(OVERRIDES, JSON.stringify({ TEST_ANTHROPIC_KEY: "REPLACE_anthropic_key" }))
    const r = await api<Record<string, unknown>>("integrations.php", { token: admin })
    expect(r.status).toBe(200)
    expect(r.json.anthropic).toBe(false)
    expect(r.json.openrouter).toBe(true)
    expect(JSON.stringify(r.json)).not.toContain("test-openrouter-key")
  })
})
