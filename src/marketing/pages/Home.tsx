import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import Seo from "@/marketing/components/Seo"
import { personSchema, sameAsFrom, websiteSchema } from "@/marketing/components/seo-schema"
import { CtaBand, Devices, IArrow, INext, IPause, IPlay, IPrev, LondonClock, WorkGrid } from "@/marketing/components/site-ui"
import { useNavTone } from "@/marketing/components/site-helpers"
import { kindName, onColour, selectedWork, useProjects, type Project } from "@/marketing/data/showcase"
import { groupServices, useSiteCopy } from "@/marketing/data/content"
import { howIWork, site } from "@/marketing/data/site"
import { useMarketingBlog } from "@/marketing/data/blog"
import Testimonials from "@/marketing/components/Testimonials"

/** "2026-05-12" becomes "12 May 2026". Returns the input unchanged if it will not parse. */
function readableDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
}

const pad = (n: number) => String(n).padStart(2, "0")
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
const onMotionChange = (fn: () => void) => {
  const q = window.matchMedia("(prefers-reduced-motion: reduce)")
  q.addEventListener("change", fn)
  return () => q.removeEventListener("change", fn)
}

/**
 * The brand-colour hero (D-046). One full screen; the background, the last
 * word of the headline and the device frames all change together for each of
 * up to five projects chosen in the CMS. It pauses on hover and focus, can be
 * paused outright, answers the arrow keys, and stays still for anyone who has
 * asked for reduced motion.
 */
function Hero({ list }: { list: Project[] }) {
  const copy = useSiteCopy().hero
  const ms = Math.round(copy.secs * 1000)
  const [i, setI] = useState(0)
  const [prev, setPrev] = useState(-1)
  const [shown, setShown] = useState(0)
  const [out, setOut] = useState(false)
  // Playing in the prerendered markup and in the render that hydrates it, so
  // both match; a reduced-motion preference then pauses it at once. Once the
  // visitor presses play or pause, their choice wins.
  const stillByDefault = useSyncExternalStore(onMotionChange, reduced, () => false)
  const [chosen, setChosen] = useState<boolean | null>(null)
  const paused = chosen ?? stillByDefault
  const [hold, setHold] = useState(false)
  const [cycle, setCycle] = useState(0)
  const [hidden, setHidden] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const n = list.length
  const p = list[i] ?? list[0]
  const on = onColour(p.colour)

  useNavTone(on, p.colour)

  const swap = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(swap.current), [])

  const go = useCallback(
    (to: number) => {
      const next = ((to % n) + n) % n
      setPrev(i)
      setI(next)
      setCycle((c) => c + 1)
      // Caption fades out, swaps, fades back in; instantly under reduced motion.
      window.clearTimeout(swap.current)
      if (reduced()) return setShown(next)
      setOut(true)
      swap.current = window.setTimeout(() => {
        setShown(next)
        setOut(false)
      }, 240)
    },
    [i, n],
  )

  useEffect(() => {
    const v = () => setHidden(document.hidden)
    document.addEventListener("visibilitychange", v)
    return () => document.removeEventListener("visibilitychange", v)
  }, [])

  const running = !paused && !hold && !hidden && n > 1
  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => go(i + 1), ms)
    return () => window.clearTimeout(t)
  }, [running, i, ms, go, cycle])

  const move = (e: React.PointerEvent) => {
    if (reduced() || e.pointerType !== "mouse" || !stage.current) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    stage.current.style.setProperty("--px", `${(-x * 14).toFixed(1)}px`)
    stage.current.style.setProperty("--py", `${(-y * 10).toFixed(1)}px`)
  }

  const c = list[shown] ?? p
  const style = { "--slide-bg": p.colour, "--slide-on": on, "--ms": `${ms}ms` } as CSSProperties

  return (
    <section
      className="hero"
      style={style}
      role="region"
      aria-roledescription="carousel"
      aria-label="Recent projects"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHold(true)}
      onPointerLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setHold(false)}
      onPointerMove={move}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(i + 1)
        if (e.key === "ArrowLeft") go(i - 1)
      }}
    >
      <div className="wrap hero__in">
        <div>
          <p className="hero__status mono">
            <span>
              <i aria-hidden="true" />
              {copy.status}
            </span>
            <span>
              London <LondonClock />
            </span>
          </p>
          <h1>
            <span className="sr">
              {copy.lead} small businesses: {list.map((x) => x.who).join(", ")}.
            </span>
            <span aria-hidden="true">
              {copy.lead}{" "}
              <span className="swap">
                {list.map((x, k) => (
                  <span key={x.slug} data-s={k === i ? "on" : k === prev ? "prev" : "next"}>
                    {x.who}.
                  </span>
                ))}
              </span>
            </span>
          </h1>
          <div className={`hero__case ${out ? "out" : ""}`} aria-live={paused ? "polite" : "off"}>
            <p className="mono">
              {pad(shown + 1)} · {kindName(c.kind)} · {c.sector}
            </p>
            <h2>{c.name}</h2>
            <p>{c.line}</p>
            <Link to={`/work/${c.slug}`}>
              Read the write-up <IArrow />
            </Link>
          </div>
          <div className="hero__actions">
            <Link className="btn btn--main" to="/contact">
              {copy.cta1} <IArrow />
            </Link>
            <Link className="btn" to="/work">
              {copy.cta2}
            </Link>
          </div>
        </div>
        <div className="stage" ref={stage} aria-hidden="true">
          <Devices list={list} active={i} />
        </div>
      </div>
      {n > 1 && (
        /* On light brand colours the slide text is dark, but the bar sits on the
           dark bottom shading, so it takes light text there (K-051, 6.73:1). */
        <div className="wrap hero__bar" style={on === "#FFFFFF" ? undefined : { color: "#ECE9E2" }}>
          <button className="ctrl js-prev" type="button" aria-label="Previous project" onClick={() => go(i - 1)}>
            <IPrev />
          </button>
          <div className="segs">
            {list.map((x, k) => (
              <button key={x.slug} className="seg" type="button" aria-label={`Show ${x.name}`} aria-current={k === i} onClick={() => go(k)}>
                <i
                  key={k === i ? `run-${cycle}` : "idle"}
                  className={k === i && running ? "run" : ""}
                  style={{ transform: k < i || (k === i && !running) ? "scaleX(1)" : undefined }}
                />
                <span>{x.name}</span>
              </button>
            ))}
          </div>
          <span className="count">
            {pad(i + 1)} / {pad(n)}
          </span>
          <button className="ctrl" type="button" aria-label={paused ? "Play slideshow" : "Pause slideshow"} onClick={() => setChosen(!paused)}>
            {paused ? <IPlay /> : <IPause />}
          </button>
          <button className="ctrl js-next" type="button" aria-label="Next project" onClick={() => go(i + 1)}>
            <INext />
          </button>
        </div>
      )}
    </section>
  )
}

export default function Home() {
  const { projects, hero } = useProjects()
  const copy = useSiteCopy()
  const { posts } = useMarketingBlog()

  return (
    <>
      <Seo
        description={site.line}
        path="/"
        jsonLd={[
          personSchema({ jobTitle: `${site.role}, ${site.location}`, description: site.line, sameAs: sameAsFrom(copy.business.social) }),
          websiteSchema(),
        ]}
      />

      <Hero list={hero} />

      <section className="sec wrap">
        <div className="sec__head">
          <div>
            <p className="eyebrow mono">
              Selected work · {projects.filter((p) => p.status === "Live").length} live
            </p>
            <h2 className="h-l">Real businesses, and products I run myself.</h2>
          </div>
          <p className="lede">
            Care staffing, building maintenance, an author's bookstore, a tailor in Lagos, and a rota app I run. Each card opens the write-up: what the job was, what got built, and where it stands now. Demo builds are marked as demos.
          </p>
        </div>
        <WorkGrid list={selectedWork(projects)} />
        <p style={{ marginTop: 28 }}>
          <Link className="link" to="/work">
            All the work <IArrow />
          </Link>
        </p>
      </section>

      <section className="sec wrap">
        <div className="sec__head">
          <div>
            <p className="eyebrow mono">What I do</p>
            <h2 className="h-l">Websites, and everyday IT support.</h2>
          </div>
          <p className="lede">One person does all of it. If a job needs something outside this list I will say so and point you at someone who does it for a living.</p>
        </div>
        {groupServices(copy.services).map((g) => (
          <div key={g.key} className="svc-group" role="group" aria-labelledby={`home-grp-${g.key}`}>
            <p className="eyebrow mono" id={`home-grp-${g.key}`}>
              {g.label}
            </p>
            <div className={g.items.length === 2 ? "svc svc--2" : "svc"}>
              {g.items.map((s) => (
                <Link key={s.slug} to={`/services/${s.slug}`}>
                  <h3>{s.title}</h3>
                  <p>{s.summary}</p>
                  <span className="link">
                    Read more <IArrow />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="sec wrap">
        <div className="how">
          <div>
            <p className="eyebrow mono">How I work</p>
            <h2 className="h-l">{howIWork.claim}</h2>
            <p className="lede" style={{ marginTop: 20 }}>
              {howIWork.detail}
            </p>
          </div>
          <dl className="rows">
            {howIWork.rows.map((r) => (
              <div key={r.q}>
                <dt>{r.q}</dt>
                <dd>{r.a}</dd>
              </div>
            ))}
          </dl>
        </div>
        <ol className="steps">
          {copy.process.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {posts.length > 0 && (
        <section className="sec wrap">
          <div className="sec__head">
            <div>
              <p className="eyebrow mono">Writing</p>
              <h2 className="h-l">Notes from the build.</h2>
            </div>
            <p className="lede">Mostly about the parts of a project nobody demonstrates.</p>
          </div>
          <div className="posts">
            {posts.slice(0, 3).map((p) => (
              <Link key={p.slug} className="post" to={`/resources/${p.slug}`}>
                <span className="mono mute">{readableDate(p.date)}</span>
                <h3>{p.title}</h3>
                <p>{p.excerpt}</p>
                <span className="link">
                  Read <IArrow />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Approved quotes from the CMS. Renders nothing until a client has approved one. */}
      <Testimonials />

      <section className="sec wrap">
        <CtaBand projects={projects} />
      </section>
    </>
  )
}
