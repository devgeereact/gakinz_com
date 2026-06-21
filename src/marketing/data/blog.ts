import { useEffect, useState } from "react"
import { blog, type BlogSummary, type BlogPost } from "@/lib/api"
import { insights, type Insight } from "./site"
import type { MockVariant } from "../components/SiteMockup"

// One normalised shape the marketing pages render, whether a post comes from the
// CMS Blog module (live) or the curated static fallback in site.ts (pre-deploy).
export type MarketingPost = {
  slug: string
  title: string
  excerpt: string
  date: string
  readMins: number
  cover: MockVariant
  category: string
  bodyParas: string[]
}

const COVERS: MockVariant[] = ["article", "studio", "retail", "pro", "health"]
const asCover = (s: string): MockVariant => (COVERS.includes(s as MockVariant) ? (s as MockVariant) : "article")

function fromStatic(p: Insight): MarketingPost {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    date: p.date,
    readMins: p.readMins,
    cover: "article",
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
    readMins: p.read_mins,
    cover: asCover(p.cover),
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

// List hook — CMS posts when available, otherwise the curated fallback.
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

// Single-post hook — CMS post by slug, falling back to a static insight.
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
