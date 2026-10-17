import { useEffect, useState } from "react"
import { blog, type BlogSummary, type BlogPost } from "@/lib/api"
import { insights, type Insight } from "./site"
import { resolveList, resolveOne } from "./cmsResult"
import { seedFromFallback } from "./seed"

/**
 * One normalised shape the writing pages render, whether a post comes from the
 * CMS Blog module (live) or the curated static fallback in site.ts (used only
 * when the CMS request fails).
 *
 * TWO FIELDS WERE REMOVED IN THE 2026-09-22 RELAUNCH.
 *
 * `readMins`. The static `Insight` type dropped it upstream because the figure
 * was asserted per post with no basis. It has gone from here too rather than
 * being kept as an optional CMS-only value, and the reason is that the CMS
 * figure is not a measurement either: `posts.read_mins` is `INT NOT NULL
 * DEFAULT 4` (server/schema.sql), the admin form opens at 4
 * (src/app/modules/Blog.tsx) and server/blog.php clamps whatever arrives to
 * 1..60 without ever deriving it from the body. So a post that no one edited
 * would have printed "4 min read" as though someone had timed it. The date is
 * real and is what the list now carries. If read_mins is later computed from
 * the body, adding it back is a two-line change.
 *
 * `cover`. It held a `MockVariant` naming one of the generated SVG wireframes
 * in SiteMockup, which is retired. Nothing replaced it: the writing index and
 * the article page are designed to need no image, so an article without a real
 * cover photograph is not a hole in the layout.
 *
 * `category` stays. It is a real editor-entered string on the CMS post, and
 * the writing index uses the set of categories actually present as its filter
 * list rather than inventing a fixed list of topics.
 */
export type MarketingPost = {
  slug: string
  title: string
  excerpt: string
  date: string
  category: string
  bodyParas: string[]
}

function fromStatic(p: Insight): MarketingPost {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    date: p.date,
    category: "Insight",
    bodyParas: p.body,
  }
}

/**
 * The CMS sends MySQL time ("2026-05-12 10:00:00"). The pages, the <time>
 * element and the Article JSON-LD all expect an ISO date, which the static
 * posts already use, and Safari will not parse the MySQL form. Anything else
 * becomes "", which the pages treat as no date.
 */
export function isoDate(value: string | null | undefined): string {
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T].*)?$/.exec((value ?? "").trim())
  return m ? m[1] : ""
}

function fromSummary(p: BlogSummary): MarketingPost {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? "",
    date: isoDate(p.published_at),
    category: p.category,
    bodyParas: [],
  }
}

function fromPost(p: BlogPost): MarketingPost {
  return {
    ...fromSummary(p),
    bodyParas: (p.body ?? "").split(/\n{2,}/).map((s) => s.trim()).filter(Boolean),
  }
}

const staticPosts = insights.map(fromStatic)

/*
 * Publishing is real. The CMS answer decides what is shown, including an empty
 * answer, so an unpublished post disappears from the site. The curated static
 * posts appear only when the request fails; see ./cmsResult.ts.
 *
 * In the browser nothing is rendered from the static list before the request
 * settles. Showing it first would flash a post that may have been unpublished,
 * then remove it, so the pages show a loading line instead. The exception is
 * the build-time prerender and the hydration of its markup (./seed.ts): a
 * prerendered page has to carry real content, so it carries the static posts
 * until the CMS answer replaces them.
 */

// List hook: CMS posts when the CMS answers, otherwise the curated fallback.
export function useMarketingBlog() {
  // Seeded only for the prerender and the hydration of its markup (./seed.ts).
  const [posts, setPosts] = useState<MarketingPost[]>(() => (seedFromFallback() ? staticPosts : []))
  const [loading, setLoading] = useState(() => !seedFromFallback())
  const [fromCms, setFromCms] = useState(false)

  useEffect(() => {
    let alive = true
    blog
      .list()
      .catch(() => null)
      .then((res) => {
        if (!alive) return
        const { items, fromCms } = resolveList(res, fromSummary, staticPosts)
        setPosts(items)
        setFromCms(fromCms)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  return { posts, loading, fromCms }
}

// Single-post hook: the CMS post by slug. A 404 is a real not-found; the static
// insight with that slug is used only when the request fails. The result is
// keyed by slug, so moving to another article never shows the previous one
// while the next loads.
export function useMarketingPost(slug: string | undefined) {
  const [result, setResult] = useState<{ slug: string; post: MarketingPost | null } | null>(() =>
    slug && seedFromFallback() ? { slug, post: staticPosts.find((p) => p.slug === slug) ?? null } : null,
  )

  useEffect(() => {
    if (!slug) return
    let alive = true
    blog
      .get(slug)
      .catch(() => null)
      .then((res) => {
        if (!alive) return
        setResult({ slug, post: resolveOne(res, fromPost, staticPosts.find((p) => p.slug === slug) ?? null) })
      })
    return () => {
      alive = false
    }
  }, [slug])

  const current = slug && result?.slug === slug ? result : null
  return { post: current ? current.post : null, loading: Boolean(slug) && !current }
}
