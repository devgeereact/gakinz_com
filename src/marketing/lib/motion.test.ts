import { describe, expect, it } from "vitest"
import { belowFold } from "./motion"

const at = (top: number) => ({ getBoundingClientRect: () => ({ top }) }) as unknown as Element

describe("belowFold", () => {
  it("keeps only elements that start below the first screen", () => {
    const els = [at(-200), at(0), at(799), at(800), at(801), at(2400)]
    expect(belowFold(els, 800)).toEqual([els[4], els[5]])
  })

  it("leaves everything alone when nothing is below the fold", () => {
    expect(belowFold([at(10), at(300)], 800)).toEqual([])
  })
})
