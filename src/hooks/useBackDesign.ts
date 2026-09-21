import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { backGroups } from '@/config/products'
import { decodeDesign, encodeDesign, withSelection } from '@/lib/back/designParams'
import { describeDesign, priceFor, type Price, type SummaryLine } from '@/lib/back/designSummary'
import { resolveBack, type BackDesign, type BackRender, type Selection } from '@/lib/back/resolveBack'
import type { Bookmark } from '@/types'

interface BackDesignState {
  design: BackDesign
  render: BackRender
  lines: readonly SummaryLine[]
  price: Price
  /** True once the visitor has changed anything from the starting design */
  changed: boolean
  /** Sets one category's choice. Passing nothing puts it back to its starting value. */
  choose: (slug: string, selection: Selection | undefined) => void
  reset: () => void
}

/**
 * The visitor's design for one bookmark's back. It starts from the address, so
 * a shared link opens the same design, and it is written back to the address
 * as it changes, so a refresh keeps it. The design itself is ordinary state,
 * not read back from the address, because a fast typist would otherwise see
 * their letters lost while the address caught up.
 */
export function useBackDesign(bookmark: Bookmark): BackDesignState {
  const [params, setParams] = useSearchParams()
  const [design, setDesign] = useState<BackDesign>(() => decodeDesign(params, backGroups))

  // The address writer is kept in a ref so that writing to the address does not, in turn, re-run the effect.
  const address = useRef({ params, setParams })
  useEffect(() => {
    address.current = { params, setParams }
  })
  useEffect(() => {
    const next = encodeDesign(design)
    if (next.toString() !== address.current.params.toString()) address.current.setParams(next, { replace: true })
  }, [design])

  const render = useMemo(() => resolveBack(backGroups, design, bookmark), [design, bookmark])
  const lines = useMemo(() => describeDesign(backGroups, design, bookmark), [design, bookmark])
  const price = useMemo(() => priceFor(bookmark, lines), [bookmark, lines])

  const choose = useCallback(
    (slug: string, selection: Selection | undefined) => setDesign((current) => withSelection(current, slug, selection)),
    [],
  )
  const reset = useCallback(() => setDesign({}), [])

  return { design, render, lines, price, changed: Object.keys(design).length > 0, choose, reset }
}
