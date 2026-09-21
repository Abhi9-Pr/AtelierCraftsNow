import type { ArtType, Bookmark, Content, Theme } from '../src/types/index.ts'
import { loadBack } from './backContent.ts'
import {
  blank,
  byOrder,
  flag,
  pictureExists,
  readEntries,
  text,
  whole,
} from './contentFiles.ts'

const THEMES_DIR = 'content/themes'
const ART_TYPES_DIR = 'content/art-types'
const BOOKMARKS_DIR = 'content/bookmarks'
const ARTWORK_PREFIX = '/artwork/'

/** Themes and art types are both a name and an optional position, so they are read the same way. */
async function readLabelled(root: string, dir: string, problems: string[]): Promise<{ slug: string; label: string }[]> {
  return (await readEntries(root, dir, problems))
    .map((entry) => ({
      slug: entry.slug,
      label: text(entry, 'label', problems),
      order: whole(entry, 'order', problems),
    }))
    .sort((a, b) => byOrder(a, b) || a.label.localeCompare(b.label))
    .map(({ slug, label }) => ({ slug, label }))
}

/**
 * Reads the site's themes, art types, bookmarks and back-of-bookmark choices
 * from the content folder. Anything wrong is reported together, naming the
 * file and the field, and the build stops, so a broken entry can never reach
 * the live site.
 */
export async function loadContent(root: string): Promise<Content> {
  const problems: string[] = []

  const themes: Theme[] = await readLabelled(root, THEMES_DIR, problems)
  const artTypes: ArtType[] = await readLabelled(root, ART_TYPES_DIR, problems)
  const themeSlugs = new Set(themes.map((theme) => theme.slug))
  const artTypeSlugs = new Set(artTypes.map((artType) => artType.slug))

  const bookmarks: (Bookmark & { order: number | undefined; added: string })[] = []
  for (const entry of await readEntries(root, BOOKMARKS_DIR, problems)) {
    const theme = text(entry, 'theme', problems)
    if (theme && !themeSlugs.has(theme)) {
      problems.push(`${entry.file}: theme "${theme}" does not exist. Themes are: ${[...themeSlugs].join(', ') || 'none'}`)
    }

    const artType = typeof entry.data.artType === 'string' ? entry.data.artType.trim() : ''
    if (!blank(entry.data.artType) && typeof entry.data.artType !== 'string') {
      problems.push(`${entry.file}: "artType" must be the name of an art type`)
    } else if (artType && !artTypeSlugs.has(artType)) {
      problems.push(`${entry.file}: art type "${artType}" does not exist. Art types are: ${[...artTypeSlugs].join(', ') || 'none'}`)
    }

    const artwork = text(entry, 'artwork', problems)
    if (artwork && !(await pictureExists(root, artwork, ARTWORK_PREFIX))) {
      problems.push(`${entry.file}: the picture "${artwork}" is not in public/artwork`)
    }

    const priceINR = whole(entry, 'priceINR', problems)
    const bookmark: Bookmark & { order: number | undefined; added: string } = {
      id: entry.slug,
      title: text(entry, 'title', problems),
      theme,
      artwork,
      artworkAlt: text(entry, 'artworkAlt', problems),
      quote: text(entry, 'quote', problems),
      headerText: text(entry, 'headerText', problems),
      description: text(entry, 'description', problems),
      available: flag(entry, 'available', true, problems),
      order: whole(entry, 'order', problems),
      added: typeof entry.data.added === 'string' ? entry.data.added : '',
    }
    if (artType) bookmark.artType = artType
    if (priceINR !== undefined) bookmark.priceINR = priceINR
    if (flag(entry, 'showSignature', false, problems)) bookmark.showSignature = true
    if (flag(entry, 'featured', false, problems)) bookmark.featured = true
    bookmarks.push(bookmark)
  }

  const back = await loadBack(root, problems)

  if (problems.length > 0) {
    throw new Error(`The content folder has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n - ${problems.join('\n - ')}`)
  }

  // Bookmarks with a position come first in that order. The rest follow, oldest first.
  bookmarks.sort((a, b) => byOrder(a, b) || a.added.localeCompare(b.added) || a.title.localeCompare(b.title))

  return {
    themes,
    artTypes,
    bookmarks: bookmarks.map(({ order: _order, added: _added, ...bookmark }): Bookmark => bookmark),
    back,
  }
}
