import type Lenis from "lenis"

/**
 * Scroll polish for the public site (D-051): Lenis smooths wheel scrolling and
 * GSAP ScrollTrigger lifts sections in as they reach the screen.
 *
 * Enhancement only. Nothing here is in the prerendered markup or the first
 * paint: the libraries load in their own chunk once the browser is idle, and
 * only for visitors who have not asked for reduced motion. An element is
 * hidden for its entrance only if it starts below the first screen, so content
 * already on screen never flashes, and a failure to load leaves every element
 * visible (the `.rise` rule in CLAUDE.md).
 */

/** What lifts in. Anything outside this list is untouched. */
const REVEAL = [
  ".sec__head",
  ".grid-work > *",
  ".svc > a",
  ".svc-list > *",
  ".steps > li",
  ".rows > div",
  ".posts > a",
  ".quotes > *",
  ".sectors > *",
  ".band",
].join(",")

type Engine = {
  gsap: typeof import("gsap").gsap
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger
  Lenis: typeof Lenis
}

let engine: Promise<Engine> | null = null
let run = 0
let lenis: Lenis | null = null
let scope: { revert(): void } | null = null
let teardown: (() => void) | null = null

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

function load(): Promise<Engine> {
  engine ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("lenis"), import("lenis/dist/lenis.css")]).then(
    ([g, st, l]) => {
      g.gsap.registerPlugin(st.ScrollTrigger)
      return { gsap: g.gsap, ScrollTrigger: st.ScrollTrigger, Lenis: l.default }
    },
  )
  return engine
}

/** The elements that start below the first screen. Those already in view keep their place. */
export function belowFold<T extends Element>(els: T[], viewport: number): T[] {
  return els.filter((el) => el.getBoundingClientRect().top > viewport)
}

/**
 * Starts smooth scrolling and the entrances. Returns the function that stops
 * them; the public layout calls both, so GAkinzOS never carries either.
 */
export function startSiteMotion(): () => void {
  const mine = ++run
  const q = window.matchMedia("(prefers-reduced-motion: reduce)")
  // Asking for reduced motion mid-visit stops everything and shows every element.
  const onChange = () => q.matches && stop()
  q.addEventListener("change", onChange)

  const begin = () => {
    if (mine !== run || reduced()) return
    void load().then(({ gsap, ScrollTrigger, Lenis }) => {
      if (mine !== run || reduced()) return
      const l = new Lenis({ autoRaf: false })
      const tick = (time: number) => l.raf(time * 1000)
      l.on("scroll", ScrollTrigger.update)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)
      // Content arriving from the CMS changes the page height; positions follow.
      let t: number | undefined
      const ro = new ResizeObserver(() => {
        window.clearTimeout(t)
        t = window.setTimeout(() => ScrollTrigger.refresh(), 150)
      })
      const main = document.getElementById("main")
      if (main) ro.observe(main)
      lenis = l
      teardown = () => {
        window.clearTimeout(t)
        ro.disconnect()
        gsap.ticker.remove(tick)
        gsap.ticker.lagSmoothing(500, 33)
        l.destroy()
      }
      revealPage()
    })
  }

  // Safari has no requestIdleCallback; a short timeout stands in for it.
  const hasIdle = typeof window.requestIdleCallback === "function"
  const idle = hasIdle ? window.requestIdleCallback(begin, { timeout: 1500 }) : window.setTimeout(begin, 200)

  function stop() {
    if (mine !== run) return
    run++
    if (hasIdle) window.cancelIdleCallback(idle)
    else window.clearTimeout(idle)
    q.removeEventListener("change", onChange)
    scope?.revert()
    scope = null
    teardown?.()
    teardown = null
    lenis = null
  }
  return stop
}

/**
 * Sets up the entrances for the page now on screen, replacing the last page's.
 * Called after every route change; does nothing until the motion has started.
 */
export function revealPage(): void {
  if (!lenis || !engine) return
  const mine = run
  void engine.then(({ gsap, ScrollTrigger }) => {
    if (mine !== run) return
    scope?.revert()
    const main = document.getElementById("main")
    if (!main) return
    scope = gsap.context(() => {
      const els = belowFold(gsap.utils.toArray<HTMLElement>(REVEAL, main), window.innerHeight)
      if (els.length) {
        gsap.set(els, { autoAlpha: 0, y: 28 })
        ScrollTrigger.batch(els, {
          start: "top 90%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, overwrite: true }),
        })
      }
      // The home hero's copy drifts a little slower than the page as it leaves.
      const hero = main.querySelector(".hero__in")
      if (hero) {
        gsap.to(hero, { yPercent: 10, ease: "none", scrollTrigger: { trigger: hero.parentElement, start: "top top", end: "bottom top", scrub: true } })
      }
    }, main)
  })
}

/** Jumps or glides to the top, through Lenis when it is running so the two never disagree. */
export function scrollToTop(smooth = false): void {
  if (lenis) return lenis.scrollTo(0, { immediate: !smooth, force: true })
  window.scrollTo({ top: 0, behavior: smooth && !reduced() ? "smooth" : "auto" })
}

/** Holds the page still while the mobile drawer is open. */
export function holdScroll(on: boolean): void {
  if (on) lenis?.stop()
  else lenis?.start()
}
