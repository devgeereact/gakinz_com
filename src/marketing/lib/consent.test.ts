import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  getAdConsent,
  hasAdConsent,
  isPrivatePath,
  needsCleanLoad,
  resetConsentForTests,
  startConsent,
  subscribeAdConsent,
  thirdPartyScriptsLoaded,
  type ConsentEnv,
  type TcData,
  type TcfApi,
} from "./consent"
import { normaliseMonetisation, type MonetisationConfig } from "./monetisation"
import { ensureAdScript } from "./adSlots"

const CMP = "https://cmp.inmobi.com/choice/abc/gakinz.com/choice.js"
const CLIENT = "ca-pub-1234567890123456"
const OFF = normaliseMonetisation(undefined)
const ON: MonetisationConfig = normaliseMonetisation({
  ads: { provider: "adsense", client_id: CLIENT, slot_id: "1234567890" },
  consent: { mode: "cmp", cmp_script_url: CMP },
})

type FakeScript = { src: string; async: boolean; attrs: Record<string, string>; onload: (() => void)[] }

/** A stand-in for the few browser calls consent.ts makes, recording every script added. */
function fakeEnv() {
  const scripts: FakeScript[] = []
  const env = {
    document: {
      head: {
        appendChild: (el: FakeScript) => {
          scripts.push(el)
          return el
        },
      },
      createElement: () => {
        const el: FakeScript & { setAttribute: (k: string, v: string) => void; addEventListener: (t: string, f: () => void) => void } = {
          src: "",
          async: false,
          attrs: {},
          onload: [],
          setAttribute(k, v) {
            this.attrs[k] = v
          },
          addEventListener(_t, f) {
            this.onload.push(f)
          },
        }
        return el
      },
      querySelector: (sel: string) => scripts.find((s) => sel === `script[data-gk-third-party="${s.attrs["data-gk-third-party"]}"]`) ?? null,
    },
  } as unknown as ConsentEnv
  return { env, scripts }
}

/** A minimal TCF CMP: records listeners and lets the test send events. */
function fakeTcf() {
  const listeners: ((d: TcData, ok: boolean) => void)[] = []
  const api: TcfApi = (command, version, cb) => {
    expect(version).toBe(2)
    if (command === "addEventListener") listeners.push(cb)
  }
  return { api, send: (d: TcData, ok = true) => listeners.forEach((l) => l(d, ok)), listeners }
}

const yes: TcData = { gdprApplies: true, eventStatus: "useractioncomplete", purpose: { consents: { "1": true } } }

beforeEach(() => resetConsentForTests())
afterEach(() => resetConsentForTests())

describe("isPrivatePath", () => {
  it("covers the CMS, portal, certificates, shared proposals and sign-in", () => {
    for (const p of ["/app", "/app/portal", "/app/site", "/verify/12", "/p/abc", "/login", "/set-password", "/portal", "/APP/leads"]) {
      expect(isPrivatePath(p), p).toBe(true)
    }
  })
  it("leaves public pages public, including look-alike paths", () => {
    for (const p of ["/", "/resources/a-post", "/about", "/pricing", "/apply", "/privacy", "/proposal-tips", "/verifying"]) {
      expect(isPrivatePath(p), p).toBe(false)
    }
  })
})

describe("with the shipped settings", () => {
  it("adds no script, starts no listener and writes nothing to cookies or storage", () => {
    const { env, scripts } = fakeEnv()
    const writes: string[] = []
    const storage = { setItem: (k: string) => writes.push(`storage:${k}`), getItem: () => null, removeItem: (k: string) => writes.push(`remove:${k}`) }
    const g = globalThis as Record<string, unknown>
    const saved = { localStorage: g.localStorage, sessionStorage: g.sessionStorage }
    g.localStorage = storage
    g.sessionStorage = storage
    try {
      for (const path of ["/", "/resources/a-post", "/app", "/verify/1"]) expect(startConsent(path, env, OFF)).toBe(false)
    } finally {
      g.localStorage = saved.localStorage
      g.sessionStorage = saved.sessionStorage
    }
    expect(scripts).toEqual([])
    expect(writes).toEqual([])
    expect(thirdPartyScriptsLoaded()).toBe(false)
    expect(getAdConsent()).toBe(false)
  })

  it("uses no storage or cookie API anywhere in the consent and ad code", () => {
    for (const f of ["src/marketing/lib/consent.ts", "src/marketing/lib/monetisation.ts", "src/marketing/lib/adSlots.ts", "src/marketing/components/AdSlot.tsx", "src/marketing/components/ConsentLoader.tsx"]) {
      const src = readFileSync(join(import.meta.dirname, "../../..", f), "utf8")
      expect(src, f).not.toMatch(/localStorage\.|sessionStorage\.|document\.cookie|indexedDB/)
    }
  })
})

describe("with a CMP configured", () => {
  it("never loads on a private path", () => {
    const { env, scripts } = fakeEnv()
    for (const path of ["/app", "/app/portal", "/verify/9", "/p/token", "/login", "/set-password"]) {
      expect(startConsent(path, env, ON)).toBe(false)
    }
    expect(scripts).toEqual([])
  })

  it("loads the CMP script exactly once across public page changes", () => {
    const { env, scripts } = fakeEnv()
    expect(startConsent("/", env, ON)).toBe(true)
    expect(startConsent("/resources/a-post", env, ON)).toBe(true)
    expect(startConsent("/about", env, ON)).toBe(true)
    expect(scripts).toHaveLength(1)
    expect(scripts[0].src).toBe(CMP)
    expect(scripts[0].async).toBe(true)
  })

  it("has no ad consent until the CMP answers, and follows grant and withdrawal", () => {
    const { env, scripts } = fakeEnv()
    const tcf = fakeTcf()
    let changes = 0
    subscribeAdConsent(() => changes++)
    startConsent("/resources/a-post", env, ON)
    expect(getAdConsent()).toBe(false)
    // The CMP defines __tcfapi when its script loads.
    env.__tcfapi = tcf.api
    scripts[0].onload.forEach((f) => f())
    expect(tcf.listeners).toHaveLength(1)
    tcf.send({ gdprApplies: true, eventStatus: "cmpuishown", purpose: { consents: {} } })
    expect(getAdConsent()).toBe(false)
    tcf.send(yes)
    expect(getAdConsent()).toBe(true)
    tcf.send({ ...yes, purpose: { consents: { "1": false } } })
    expect(getAdConsent()).toBe(false)
    expect(changes).toBe(2)
    // A second start does not register a second listener.
    startConsent("/about", env, ON)
    expect(tcf.listeners).toHaveLength(1)
  })

  it("asks a page reload only after a third-party script, and only for a private path", () => {
    expect(needsCleanLoad("/app")).toBe(false)
    const { env } = fakeEnv()
    startConsent("/", env, ON)
    expect(needsCleanLoad("/about")).toBe(false)
    expect(needsCleanLoad("/app")).toBe(true)
    expect(needsCleanLoad("/verify/3")).toBe(true)
  })
})

describe("hasAdConsent", () => {
  it("needs a settled answer with Purpose 1 consent", () => {
    expect(hasAdConsent(yes, true)).toBe(true)
    expect(hasAdConsent({ ...yes, eventStatus: "tcloaded" }, true)).toBe(true)
    expect(hasAdConsent({ ...yes, eventStatus: "cmpuishown" }, true)).toBe(false)
    expect(hasAdConsent({ ...yes, purpose: { consents: {} } }, true)).toBe(false)
    expect(hasAdConsent(yes, false)).toBe(false)
    expect(hasAdConsent(null, true)).toBe(false)
  })
  it("treats a visitor outside GDPR as consented, and an unknown answer as not", () => {
    expect(hasAdConsent({ gdprApplies: false }, true)).toBe(true)
    expect(hasAdConsent({ eventStatus: "tcloaded" }, true)).toBe(false)
  })
})

describe("ensureAdScript", () => {
  it("adds Google's documented tag once per page, with the publisher ID", () => {
    const { env, scripts } = fakeEnv()
    expect(ensureAdScript(env, CLIENT).added).toBe(true)
    expect(ensureAdScript(env, CLIENT).added).toBe(false)
    expect(scripts).toHaveLength(1)
    expect(scripts[0].src).toBe(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`)
    expect(scripts[0].attrs.crossorigin).toBe("anonymous")
  })

  it("gives one script for each provider when consent and ads both run", () => {
    const { env, scripts } = fakeEnv()
    startConsent("/resources/a-post", env, ON)
    ensureAdScript(env, CLIENT)
    ensureAdScript(env, CLIENT)
    startConsent("/resources/another", env, ON)
    expect(scripts.map((s) => new URL(s.src).hostname).sort()).toEqual(["cmp.inmobi.com", "pagead2.googlesyndication.com"])
  })
})
