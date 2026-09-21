import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { brand } from '@/config/brand'
import { backGroups, bookmarks } from '@/config/products'
import { BOOKMARK_PARAM, decodeDesign, designHref, encodeDesign } from '@/lib/back/designParams'
import { describeDesign, designText, priceFor, type Price, type SummaryLine } from '@/lib/back/designSummary'
import { resolveBack, type BackRender } from '@/lib/back/resolveBack'
import type { Bookmark, OrderDesign } from '@/types'

/** A design carried from the design page to the request form in the address. */
export interface DesignRequest {
  bookmark: Bookmark
  render: BackRender
  lines: readonly SummaryLine[]
  price: Price
  /** The design as plain text, with a link that draws it again. This is what the email carries. */
  text: string
  /** Back to the design page with the same design, to change it */
  changeHref: string
  /** The design as it is sent with the order */
  attachment: OrderDesign
}

/**
 * The design named in the request form's address, if there is one. It is read
 * from the same parameters the design page writes, so it can only ever show
 * what that page would show, and a bookmark that is gone or unavailable
 * attaches nothing.
 */
export function useDesignRequest(): DesignRequest | undefined {
  const [params] = useSearchParams()
  const id = params.get(BOOKMARK_PARAM)

  return useMemo(() => {
    const bookmark = bookmarks.find((candidate) => candidate.id === id)
    if (!bookmark?.available) return undefined
    const design = decodeDesign(params, backGroups)
    const lines = describeDesign(backGroups, design, bookmark)
    const price = priceFor(bookmark, lines)
    const changeHref = designHref(bookmark.id, design)
    const text = designText(bookmark, lines, price, `${brand.siteUrl}${changeHref}`)
    return {
      bookmark,
      render: resolveBack(backGroups, design, bookmark),
      lines,
      price,
      text,
      changeHref,
      attachment: {
        bookmarkId: bookmark.id,
        query: encodeDesign(design).toString(),
        expectedTotal: price.total ?? null,
        text,
      },
    }
  }, [id, params])
}
