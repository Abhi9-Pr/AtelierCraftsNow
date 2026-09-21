import { Link } from 'react-router-dom'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { designPath } from '@/config/nav'
import { availabilityLabel } from '@/lib/format'
import { artTypeLabel, backGroups } from '@/config/products'
import type { Bookmark } from '@/types'
import { ThemeChip } from './ThemeChip'

interface BookmarkCaptionProps {
  bookmark: Bookmark
  /** Heading level for the title: 2 on the catalog page, 3 beneath a section heading */
  headingLevel?: 2 | 3
}

/** The text set beneath a bookmark card, exactly as wide as the card. */
export function BookmarkCaption({ bookmark, headingLevel = 2 }: BookmarkCaptionProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <div className="mt-6 w-[min(100%,var(--bookmark-width))] space-y-3 text-center">
      <ThemeChip theme={bookmark.theme} />
      <Heading className="font-display text-xl leading-tight">{bookmark.title}</Heading>
      {bookmark.artType && (
        <p className="font-display text-base italic leading-tight text-ink-soft">{artTypeLabel(bookmark.artType)}</p>
      )}
      <p className="text-sm leading-relaxed text-ink-soft">{bookmark.description}</p>
      <TrackedHeading as="p" tracking="wide" size="sm" className="text-ink">
        {availabilityLabel(bookmark)}
      </TrackedHeading>
      {bookmark.available && backGroups.length > 0 && (
        <Link to={designPath(bookmark.id)} className="inline-block py-2 text-ink">
          <TrackedHeading
            as="span"
            tracking="wide"
            size="sm"
            className="underline decoration-linen decoration-1 underline-offset-4 hover:decoration-clay"
          >
            Design the back
          </TrackedHeading>
        </Link>
      )}
    </div>
  )
}
