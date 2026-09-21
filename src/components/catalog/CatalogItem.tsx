import { BookmarkCard } from '@/components/bookmark/BookmarkCard'
import { backFor } from '@/config/back'
import type { Bookmark } from '@/types'
import { BookmarkCaption } from './BookmarkCaption'

interface CatalogItemProps {
  bookmark: Bookmark
  shown: boolean
  resetKey: string
  headingLevel: 2 | 3
}

/*
 * Items are never unmounted. A hidden item is faded out and taken out of
 * the layout by CSS (see .catalog-item), and `inert` keeps it out of the
 * tab order and the accessibility tree from the first frame of the fade.
 */
export function CatalogItem({ bookmark, shown, resetKey, headingLevel }: CatalogItemProps) {
  return (
    <li className="catalog-item" data-shown={shown} inert={shown ? undefined : ''}>
      <div className="flex flex-col items-center">
        <BookmarkCard
          artwork={bookmark.artwork}
          artworkAlt={bookmark.artworkAlt}
          quote={bookmark.quote}
          themeSlug={bookmark.theme}
          back={backFor(bookmark)}
          resetKey={resetKey}
        />
        <BookmarkCaption bookmark={bookmark} headingLevel={headingLevel} />
      </div>
    </li>
  )
}
