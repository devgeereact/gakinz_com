import { describe, expect, it } from "vitest"
import {
  amountInput, amountWarning, canRecordPayment, expectedAmount, needsReference, paymentProblem, penceFromPounds,
  recordedPaymentLine,
  type PaymentDraft,
} from "./paymentModel"

const inv = { total: 119.99, issued_at: "2026-01-10" }
const ok: PaymentDraft = { method: "bank_transfer", reference: "ACME 0001", paid_on: "2026-01-15", amount: "119.99" }
const today = "2026-02-01"

describe("penceFromPounds", () => {
  it("reads whole pounds, pence and one decimal place without float error", () => {
    expect(penceFromPounds("120")).toBe(12000)
    expect(penceFromPounds("119.99")).toBe(11999)
    expect(penceFromPounds("0.1")).toBe(10)
    expect(penceFromPounds(" 50.5 ")).toBe(5050)
  })
  it("refuses anything that is not a plain non-negative amount", () => {
    for (const v of ["", "-5", "1.999", "£10", "1,000", "abc", "1e3"]) expect(penceFromPounds(v), v).toBeNull()
  })
})

describe("paymentProblem", () => {
  it("passes a complete draft for the exact total", () => {
    expect(paymentProblem(ok, inv, today)).toBeNull()
    expect(paymentProblem({ ...ok, method: "cash", reference: "" }, inv, today)).toBeNull()
  })
  it("asks for a reference on a bank transfer or cheque only", () => {
    expect(paymentProblem({ ...ok, reference: "  " }, inv, today)).toMatch(/bank transfer reference/)
    expect(paymentProblem({ ...ok, method: "cheque", reference: "" }, inv, today)).toMatch(/cheque/)
    expect(paymentProblem({ ...ok, reference: "x".repeat(101) }, inv, today)).toMatch(/100 characters/)
  })
  it("keeps the date between the issue date and today", () => {
    expect(paymentProblem({ ...ok, paid_on: "2026-02-02" }, inv, today)).toMatch(/future/)
    expect(paymentProblem({ ...ok, paid_on: "2026-01-09" }, inv, today)).toMatch(/before the invoice/)
    expect(paymentProblem({ ...ok, paid_on: "2026-01-10" }, inv, today)).toBeNull()
    expect(paymentProblem({ ...ok, paid_on: "" }, inv, today)).toMatch(/date/)
  })
  it("blocks only a malformed or zero amount, never a different one", () => {
    expect(paymentProblem({ ...ok, amount: "100.00" }, inv, today)).toBeNull()
    expect(paymentProblem({ ...ok, amount: "120.00" }, inv, today)).toBeNull()
    expect(paymentProblem({ ...ok, amount: "119.999" }, inv, today)).toMatch(/in pounds/)
    expect(paymentProblem({ ...ok, amount: "0.00" }, inv, today)).toMatch(/in pounds/)
    expect(paymentProblem({ ...ok, amount: "" }, inv, today)).toMatch(/in pounds/)
  })
})

describe("amountWarning", () => {
  it("advises when the amount differs from the listed total, naming that total", () => {
    expect(amountWarning("100.00", inv)).toContain("£119.99")
    // A penny out, as the list and _money.php can round VAT differently.
    expect(amountWarning("120.00", inv)).toMatch(/differs/)
  })
  it("says nothing for the listed total or for a malformed amount (that is paymentProblem's job)", () => {
    expect(amountWarning("119.99", inv)).toBeNull()
    expect(amountWarning("119.990", inv)).toBeNull()
  })
})

describe("expectedAmount", () => {
  it("turns the server's expected_pence into an amount field value", () => {
    expect(expectedAmount({ error: "x", expected_pence: 12000 })).toBe("120.00")
    expect(expectedAmount({ expected_pence: 11999 })).toBe("119.99")
  })
  it("returns null when the reply carries no usable figure", () => {
    expect(expectedAmount(undefined)).toBeNull()
    expect(expectedAmount({ error: "SQL 13" })).toBeNull()
    expect(expectedAmount({ expected_pence: "12000" })).toBeNull()
    expect(expectedAmount({ expected_pence: 0 })).toBeNull()
  })
})

describe("display helpers", () => {
  it("offers recording only on a sent invoice", () => {
    expect(canRecordPayment({ status: "sent" })).toBe(true)
    expect(canRecordPayment({ status: "draft" })).toBe(false)
    expect(canRecordPayment({ status: "paid" })).toBe(false)
  })
  it("prefills the amount with two decimal places", () => {
    expect(amountInput(120)).toBe("120.00")
    expect(amountInput(119.99)).toBe("119.99")
  })
  it("summarises a recorded payment, and nothing when none was recorded", () => {
    expect(recordedPaymentLine({ paid_method: "bank_transfer", paid_reference: "ABC" })).toBe("Bank transfer, ref ABC")
    expect(recordedPaymentLine({ paid_method: "cash", paid_reference: null })).toBe("Cash")
    expect(recordedPaymentLine({ paid_method: null, paid_reference: null })).toBeNull()
    expect(needsReference("other")).toBe(false)
  })
})
