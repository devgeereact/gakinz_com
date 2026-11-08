import { describe, expect, it } from "vitest"
import { ticketPanelView } from "./ticketPanelModel"

describe("ticketPanelView: the ticket panel must not show a skeleton for ever", () => {
  it("shows the skeleton only while the ticket is loading", () => {
    expect(ticketPanelView({ loading: true, hasTicket: false })).toBe("loading")
    expect(ticketPanelView({ loading: true, hasTicket: true })).toBe("loading")
  })

  it("shows the ticket once it is loaded", () => {
    expect(ticketPanelView({ loading: false, hasTicket: true })).toBe("ticket")
  })

  it("shows an error with a retry when loading finished and there is no ticket", () => {
    // Before the fix this case fell through to the skeleton, so a failed load looked like loading for ever.
    expect(ticketPanelView({ loading: false, hasTicket: false })).toBe("error")
  })
})
