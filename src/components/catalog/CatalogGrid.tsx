import type { Bookmark } from '@/types'
import { CatalogItem } from './CatalogItem'

interface CatalogGridProps {
  items: readonly Bookmark[]
  isVisible: (bookmark: Bookmark) => boolean
  /** Changes with the active filter; flipped cards return to their front */
  resetKey: string
  /** Level for each card title; 3 when the grid sits under a section heading */
  headingLevel?: 2 | 3
}

/*
 * A wrapping flex row rather than a CSS grid, so an incomplete last row
 * (three filtered cards, or the ninth card alone) centres itself. Column
 * widths are worked out from the gaps: 2 columns on mobile, 3 from md
 * and 4 from lg.
 */
export function CatalogGrid({ items, isVisible, resetKey, headingLevel = 2 }: CatalogGridProps) {
  return (
    <ul
      role="list"
      className="catalog-grid flex flex-wrap justify-center gap-y-16"
    >
      {items.map((bookmark) => (
        <CatalogItem
          key={bookmark.id}
          bookmark={bookmark}
          shown={isVisible(bookmark)}
          resetKey={resetKey}
          headingLevel={headingLevel}
        />
      ))}
    </ul>
  )
}
