import { Fragment, type ReactNode } from "react"
import type { Block, Inline } from "@/marketing/lib/articleFormat"
import { slotPositions } from "@/marketing/lib/adSlots"

/** The text shown for a missing affiliate disclosure (D-027 gap marker). */
export const AFFILIATE_DISCLOSURE_GAP = "[Affiliate disclosure: owner to supply]"

/** Inline text, bold and links from the article format, as React elements. */
export function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return nodes.map((n, i) => {
    if (n.type === "text") return <Fragment key={i}>{n.text}</Fragment>
    if (n.type === "bold") {
      return (
        <strong key={i}>
          <InlineNodes nodes={n.children} />
        </strong>
      )
    }
    const rel = n.sponsored ? "sponsored noopener noreferrer" : n.external ? "noopener noreferrer" : undefined
    return (
      <a key={i} href={n.href} rel={rel} target={n.external ? "_blank" : undefined}>
        <InlineNodes nodes={n.children} />
        {n.external && <span className="sr"> (opens in a new tab)</span>}
      </a>
    )
  })
}

/**
 * One recommendation card. An affiliate item carries rel="sponsored nofollow
 * noopener noreferrer" and a visible "Affiliate link" label, kept outside the
 * link so a screen reader announces it once.
 */
function Recommendation({ block }: { block: Extract<Block, { type: "recommend" }> }) {
  const rel = block.affiliate
    ? "sponsored nofollow noopener noreferrer"
    : block.external
      ? "noopener noreferrer"
      : undefined
  return (
    <aside className="rec" aria-label={`Recommendation: ${block.title}`}>
      <p className="rec__label mono">
        Recommended{block.affiliate && <span className="rec__aff"> · Affiliate link</span>}
      </p>
      <h3 className="rec__title">
        <a href={block.href} rel={rel} target={block.external ? "_blank" : undefined}>
          {block.title}
          {block.external && <span className="sr"> (opens in a new tab)</span>}
        </a>
      </h3>
      {block.note.length > 0 && (
        <p className="rec__note">
          <InlineNodes nodes={block.note} />
        </p>
      )}
    </aside>
  )
}

/**
 * The parsed blocks of a post as React elements. If any recommendation is an
 * affiliate link, the disclosure gap marker is shown once, above the first
 * recommendation. No disclosure wording is invented.
 */
export function ArticleBody({ blocks, slot }: { blocks: Block[]; slot?: (n: number) => ReactNode }) {
  const firstRec = blocks.findIndex((b) => b.type === "recommend")
  const needsDisclosure = blocks.some((b) => b.type === "recommend" && b.affiliate)
  const at = slot ? slotPositions(blocks) : []
  const out = blocks.map((block, i) => {
    const el = renderBlock(block, i)
    const n = at.indexOf(i)
    if (n < 0) return el
    return (
      <Fragment key={i}>
        {el}
        {slot?.(n)}
      </Fragment>
    )
  })
  return out

  function renderBlock(block: Block, i: number) {
    if (block.type === "recommend") {
      return (
        <Fragment key={i}>
          {needsDisclosure && i === firstRec && (
            <p className="rec__gap">
              <span className="gap">{AFFILIATE_DISCLOSURE_GAP}</span>
            </p>
          )}
          <Recommendation block={block} />
        </Fragment>
      )
    }
    if (block.type === "heading") {
      const H = block.level === 2 ? "h2" : "h3"
      return (
        <H key={i}>
          <InlineNodes nodes={block.children} />
        </H>
      )
    }
    if (block.type === "list") {
      const List = block.ordered ? "ol" : "ul"
      return (
        <List key={i} start={block.ordered && block.start !== 1 ? block.start : undefined}>
          {block.items.map((item, j) => (
            <li key={j}>
              <InlineNodes nodes={item} />
            </li>
          ))}
        </List>
      )
    }
    return (
      <p key={i}>
        <InlineNodes nodes={block.children} />
      </p>
    )
  }
}
