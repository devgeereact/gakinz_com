import { useEffect, useState } from "react"
import { blog, type BlogSummary, type BlogPost } from "@/lib/api"
import { insights, type Insight } from "./site"

/**
 * One normalised shape the writing pages render, whether a post comes from the
 * CMS Blog module (live) or the curated static fallback in site.ts (pre-deploy).
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

function fromSummary(p: BlogSummary): MarketingPost {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? "",
    date: p.published_at ?? "",
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

// List hook: CMS posts when available, otherwise the curated fallback.
export function useMarketingBlog() {
  const [posts, setPosts] = useState<MarketingPost[]>(staticPosts)
  const [loading, setLoading] = useState(true)
  const [fromCms, setFromCms] = useState(false)

  useEffect(() => {
    let alive = true
    blog
      .list()
      .then((res) => {
        if (!alive) return
        if (res.ok && res.data.length > 0) {
          setPosts(res.data.map(fromSummary))
          setFromCms(true)
        }
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  return { posts, loading, fromCms }
}

// Single-post hook: CMS post by slug, falling back to a static insight.
export function useMarketingPost(slug: string | undefined) {
  const fallback = staticPosts.find((p) => p.slug === slug) ?? null
  const [post, setPost] = useState<MarketingPost | null>(fallback)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    if (!slug) {
      setLoading(false)
      return
    }
    blog
      .get(slug)
      .then((res) => {
        if (!alive) return
        if (res.ok && res.data?.slug) setPost(fromPost(res.data))
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [slug])

  return { post, loading }
}
