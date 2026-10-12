import { useEffect, useState } from "react"
import { DEMO_ON } from "@/marketing/demo/flag"

type DemoModule = typeof import("@/marketing/demo/content") & typeof import("@/marketing/demo/ScreenMock")

/**
 * The demo fixtures, in development only; `null` everywhere else.
 *
 * In a production build `DEMO_ON` is the constant `false`, so the effect body
 * is dead code and Rollup drops the dynamic import, which means the fixture
 * chunk is never emitted. See src/marketing/demo/flag.ts.
 */
export function useDemo(): DemoModule | null {
  const [demo, setDemo] = useState<DemoModule | null>(null)

  useEffect(() => {
    if (!DEMO_ON) return
    let alive = true
    Promise.all([import("@/marketing/demo/content"), import("@/marketing/demo/ScreenMock")]).then(
      ([content, screens]) => alive && setDemo({ ...content, ...screens }),
    )
    return () => {
      alive = false
    }
  }, [])

  return demo
}
