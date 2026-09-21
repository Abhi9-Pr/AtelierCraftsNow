import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { artTypes, bookmarks, themes } from '@/config/products'
import type { Bookmark, FilterOption } from '@/types'

const THEME_PARAM = 'theme'
const ART_PARAM = 'art'

/** "All", then each entry that at least one bookmark uses, so a chip never leads to an empty page. */
function optionsFor(
  entries: readonly { slug: string; label: string }[],
  used: (bookmark: Bookmark) => string | undefined,
): readonly FilterOption[] {
  return [
    { value: 'all', label: 'All' },
    ...entries
      .filter((entry) => bookmarks.some((bookmark) => used(bookmark) === entry.slug))
      .map((entry) => ({ value: entry.slug, label: entry.label })),
  ]
}

export const themeOptions = optionsFor(themes, (bookmark) => bookmark.theme)
export const artOptions = optionsFor(artTypes, (bookmark) => bookmark.artType)

/** Unknown values in the address fall back to "all". */
function parse(value: string | null, options: readonly FilterOption[]): string {
  return options.find((option) => option.value === value)?.value ?? 'all'
}

interface CatalogFilter {
  theme: string
  art: string
  setTheme: (next: string) => void
  setArt: (next: string) => void
  isVisible: (bookmark: Bookmark) => boolean
}

/**
 * The active filters live in the query string (?theme=poetic-musings&art=watercolor),
 * so a filtered view can be shared and survives a refresh. A bookmark shows
 * when it matches both.
 */
export function useCatalogFilter(): CatalogFilter {
  const [params, setParams] = useSearchParams()
  const theme = parse(params.get(THEME_PARAM), themeOptions)
  const art = parse(params.get(ART_PARAM), artOptions)

  const update = useCallback(
    (next: { theme: string; art: string }) => {
      const query: Record<string, string> = {}
      if (next.theme !== 'all') query[THEME_PARAM] = next.theme
      if (next.art !== 'all') query[ART_PARAM] = next.art
      setParams(query, { replace: true })
    },
    [setParams],
  )

  const setTheme = useCallback((next: string) => update({ theme: next, art }), [update, art])
  const setArt = useCallback((next: string) => update({ theme, art: next }), [update, theme])

  const isVisible = useCallback(
    (bookmark: Bookmark) =>
      (theme === 'all' || bookmark.theme === theme) && (art === 'all' || bookmark.artType === art),
    [theme, art],
  )

  return { theme, art, setTheme, setArt, isVisible }
}
