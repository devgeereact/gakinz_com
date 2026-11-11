import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { STORED_ITEMS } from "@/marketing/data/storage-items"
import { Cookies, Privacy } from "./Legal"

const render = (el: React.ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>)

describe("the cookie policy", () => {
  const out = render(<Cookies />)

  it("names Clerk and gk-auth and handles Google truthfully", () => {
    expect(out).toContain("Clerk")
    expect(out).toContain("gk-auth")
    expect(out).toContain("__session")
    expect(out).toContain("Signing in with Google is handled by Clerk and Google")
    expect(out).not.toContain("gk_oauth_state")
    expect(out).not.toContain("gk-locked")
  })

  it("lists every stored item from one source", () => {
    for (const i of STORED_ITEMS) expect(out).toContain(i.name)
  })

  it("says the public pages set nothing", () => {
    expect(out).toMatch(/public pages[^.]*set no cookies/)
  })
})

describe("the privacy notice", () => {
  it("points to the cookie policy and names Clerk", () => {
    const out = render(<Privacy />)
    expect(out).toContain("cookie policy")
    expect(out).toContain("Clerk")
  })
})
