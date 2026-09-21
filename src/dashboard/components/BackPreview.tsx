import type { CSSProperties } from 'react'
import { BookmarkBack } from '@/components/bookmark/BookmarkBack'
import { brand } from '@/config/brand'
import type { BackRender } from '@/lib/back/resolveBack'

/** The back of the bookmark, drawn from what was saved with the order, at the size of a card on the site. */
export function BackPreview({ back }: { back: BackRender }) {
  return (
    <figure className="w-[11rem] shrink-0">
      <div className="bookmark" data-flipped="true" style={{ '--bookmark-width': '11rem' } as CSSProperties}>
        <div className="bookmark-inner">
          <BookmarkBack back={back} watermarkText={brand.watermark} facingAway={false} />
        </div>
      </div>
      <figcaption className="mt-4 text-xs text-ink-soft">The back, drawn from what was saved with this order.</figcaption>
    </figure>
  )
}
