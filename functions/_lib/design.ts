import { decodeDesign, designHref, encodeDesign } from '../../src/lib/back/designParams.ts'
import { describeDesign, designText, priceFor } from '../../src/lib/back/designSummary.ts'
import { resolveBack } from '../../src/lib/back/resolveBack.ts'
import type { DesignSnapshot } from '../../src/types/orders.ts'
import type { Catalog } from './catalog.ts'

/** What the visitor says they designed: which bookmark, the design as the page writes it, and the total they were shown. */
export interface DesignInput {
  bookmarkId: string
  query: string
  /** null means they were shown "Price on request" */
  expectedTotal: number | null
}

export type DesignResult =
  | { ok: true; snapshot: DesignSnapshot }
  | { ok: false; status: 400 | 409; error: string; message: string; errors: Record<string, string> }

const refuse = (status: 400 | 409, error: string, message: string, field: string): DesignResult => ({
  ok: false,
  status,
  error,
  message,
  errors: { [field]: message },
})

/** The parameters of an address as sorted text, so two addresses that say the same thing compare equal. */
const asText = (params: URLSearchParams): string =>
  [...params].map(([name, value]) => `${name}=${value}`).sort().join('&')

/**
 * Checks a design against the catalog and works out everything about it itself: the choices, each
 * category in words, the total and the plain-text copy. Nothing the browser says about a design or a
 * price is trusted. If the design the visitor's page held no longer matches the catalog, or the total
 * they were shown is not the total now, the order is refused with a message they can act on.
 */
export function checkDesign(catalog: Catalog, input: DesignInput): DesignResult {
  const bookmark = catalog.bookmarks.find((candidate) => candidate.id === input.bookmarkId)
  if (!bookmark) return refuse(400, 'invalid', 'That bookmark does not exist.', 'bookmarkId')
  if (!bookmark.available) return refuse(400, 'invalid', 'That bookmark is currently unavailable.', 'bookmarkId')

  const sent = new URLSearchParams(input.query)
  const design = decodeDesign(sent, catalog.back)
  const kept = encodeDesign(design)
  if (asText(sent) !== asText(kept)) {
    return refuse(409, 'design_changed', 'Some of the choices in this design are no longer available. Please open the design page again and check it.', 'design')
  }

  const lines = describeDesign(catalog.back, design, bookmark)
  const price = priceFor(bookmark, lines)
  // A made-to-order piece has no total on the server and null in the request, and those mean the same thing.
  if ((price.total ?? null) !== input.expectedTotal) {
    return refuse(409, 'price_changed', 'The price of this design has changed since you chose it. Please open the design page again to see the new price.', 'design')
  }

  const link = `${catalog.siteUrl}${designHref(bookmark.id, design)}`
  return {
    ok: true,
    snapshot: {
      version: 1,
      bookmarkId: bookmark.id,
      bookmarkTitle: bookmark.title,
      choices: design,
      lines,
      price,
      render: resolveBack(catalog.back, design, bookmark),
      link,
      text: designText(bookmark, lines, price, link),
    },
  }
}
