import type { Bookmark } from '../types/index.ts'

/** Up to three bookmarks for the home page. Falls back to the first three if none are flagged. */
export function pickFeatured(bookmarks: readonly Bookmark[]): readonly Bookmark[] {
  const flagged = bookmarks.filter((bookmark) => bookmark.featured)
  return (flagged.length > 0 ? flagged : bookmarks).slice(0, 3)
}
