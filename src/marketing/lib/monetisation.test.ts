import { afterEach, describe, expect, it } from "vitest"
import { adsConfigured, isAllowedCmpUrl, MONETISATION, monetisation, normaliseMonetisation, setMonetisationForTests, type RawMonetisationConfig } from "./monetisation"

const CLIENT = "ca-pub-1234567890123456"
const SLOT = "1234567890"
const CMP = "https://cmp.inmobi.com/choice/abc/gakinz.com/choice.js"
const on = (over: Partial<{ provider: string; client_id: string; slot_id: string; mode: string; url: string }> = {}): RawMonetisationConfig => ({
  ads: { provider: over.provider ?? "adsense", client_id: over.client_id ?? CLIENT, slot_id: over.slot_id ?? SLOT },
  consent: { mode: over.mode ?? "cmp", cmp_script_url: over.url ?? CMP },
})

afterEach(() => setMonetisationForTests())

describe("shipped settings", () => {
  it("switch advertising and consent off", () => {
    expect(MONETISATION.ads.provider).toBe("none")
    expect(MONETISATION.consent.mode).toBe("none")
    expect(monetisation()).toEqual({ ads: null, consent: null })
    expect(adsConfigured()).toBe(false)
  })
})

describe("normaliseMonetisation", () => {
  it("accepts a complete AdSense and CMP configuration", () => {
    const cfg = normaliseMonetisation(on())
    expect(cfg.ads).toEqual({ provider: "adsense", clientId: CLIENT, slotId: SLOT })
    expect(cfg.consent).toEqual({ mode: "cmp", scriptUrl: CMP })
    expect(adsConfigured(cfg)).toBe(true)
  })

  it("switches ads off for any wrong ad setting", () => {
    for (const bad of [
      { provider: "none" },
      { provider: "AdSense" },
      { client_id: "pub-1234567890123456" },
      { client_id: "ca-pub-123" },
      { client_id: `${CLIENT}"><script>` },
      { slot_id: "" },
      { slot_id: "12345" },
      { slot_id: "abcdefghij" },
    ]) {
      expect(normaliseMonetisation(on(bad)).ads, JSON.stringify(bad)).toBeNull()
    }
  })

  it("never treats ads as configured without a CMP to ask for consent", () => {
    const cfg = normaliseMonetisation(on({ mode: "none" }))
    expect(cfg.ads).not.toBeNull()
    expect(cfg.consent).toBeNull()
    expect(adsConfigured(cfg)).toBe(false)
  })

  it("is off for missing or malformed input", () => {
    expect(normaliseMonetisation(null)).toEqual({ ads: null, consent: null })
    expect(normaliseMonetisation({} as RawMonetisationConfig)).toEqual({ ads: null, consent: null })
  })
})

describe("isAllowedCmpUrl", () => {
  it("allows https loaders on a listed host only", () => {
    expect(isAllowedCmpUrl(CMP)).toBe(true)
    expect(isAllowedCmpUrl("https://fundingchoicesmessages.google.com/i/pub-1234567890123456?ers=1")).toBe(true)
    expect(isAllowedCmpUrl("http://cmp.inmobi.com/choice.js")).toBe(false)
    expect(isAllowedCmpUrl("https://cmp.inmobi.com.evil.example/choice.js")).toBe(false)
    expect(isAllowedCmpUrl("https://evil.example/cmp.inmobi.com/choice.js")).toBe(false)
    expect(isAllowedCmpUrl("https://user:pass@cmp.inmobi.com/choice.js")).toBe(false)
    expect(isAllowedCmpUrl("https://cmp.inmobi.com:8443/choice.js")).toBe(false)
    expect(isAllowedCmpUrl("https://cmp.inmobi.com/a b.js")).toBe(false)
    expect(isAllowedCmpUrl('https://cmp.inmobi.com/a".js')).toBe(false)
    expect(isAllowedCmpUrl("javascript:alert(1)")).toBe(false)
    expect(isAllowedCmpUrl("")).toBe(false)
    expect(isAllowedCmpUrl(42)).toBe(false)
  })
})
