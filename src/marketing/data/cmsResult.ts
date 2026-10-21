import type { ApiResult } from "@/lib/api"

/**
 * When the public pages trust the CMS, and when they use the static fallback.
 *
 * A successful answer is authoritative, including an empty one: if the CMS
 * says nothing is published, nothing is shown, so unpublishing a post or a
 * work record really removes it. The static fallback is only for a request
 * that failed (no network, a 5xx, the endpoint not uploaded yet) or came back
 * in a shape that cannot be read.
 *
 * For a single record, a 404 is the API saying that slug is not published.
 * It is a real not-found, even when a static record happens to share the slug.
 * request() in src/lib/api.ts only sets `status` after it has parsed a JSON
 * body, so an HTML 404 from the host (a missing PHP file) arrives without a
 * status and counts as a failure, not as an answer.
 *
 * `null` stands for a request that threw rather than resolved.
 */

export function resolveList<R, T>(
  res: ApiResult<R[]> | null,
  map: (r: R) => T,
  fallback: T[],
): { items: T[]; fromCms: boolean } {
  if (res?.ok && Array.isArray(res.data)) return { items: res.data.map(map), fromCms: true }
  return { items: fallback, fromCms: false }
}

export function resolveOne<R extends { slug?: string | null }, T>(
  res: ApiResult<R | null> | null,
  map: (r: R) => T,
  fallback: T | null,
): T | null {
  if (res?.ok && res.data?.slug) return map(res.data)
  if (res && !res.ok && res.status === 404) return null
  return fallback
}
