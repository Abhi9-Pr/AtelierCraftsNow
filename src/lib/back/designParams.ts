import { DEFAULT_TEXT_LENGTH } from '../../config/backSchema.ts'
import { designPath } from '../../config/nav.ts'
import type { BackGroup } from '../../types/index.ts'
import type { BackDesign, Selection } from './resolveBack.ts'

/*
 * A design lives in the address, so it survives a refresh, can be shared, and
 * can be sent in an email as a link that draws the same back. Each category
 * the visitor changed becomes one parameter, named after the category:
 *   b.<category>  the chosen choice, or empty for "none"
 *   t.<category>  the visitor's own words
 *   s.<category>  1 or 0 for an on/off category
 * Categories left alone are not in the address, so they keep their starting value.
 */
const CHOICE = 'b.'
const WORDS = 't.'
const SWITCH = 's.'

/** Names the bookmark in the request form's address. */
export const BOOKMARK_PARAM = 'bookmark'

export function encodeDesign(design: BackDesign): URLSearchParams {
  const params = new URLSearchParams()
  // Sorted, so the same design always makes the same address however the choices were made.
  for (const [slug, selection] of Object.entries(design).sort(([first], [second]) => first.localeCompare(second))) {
    if (!selection) continue
    if (selection.option !== undefined) params.set(CHOICE + slug, selection.option)
    if (selection.text) params.set(WORDS + slug, selection.text)
    if (selection.on !== undefined) params.set(SWITCH + slug, selection.on ? '1' : '0')
  }
  return params
}

/**
 * Reads a design back from an address. Only what still makes sense is kept:
 * a category that has been removed, a choice that no longer exists, or words
 * longer than the category allows are dropped, so an old link still opens a
 * good design and never an error.
 */
export function decodeDesign(params: URLSearchParams, groups: readonly BackGroup[]): BackDesign {
  const design: Record<string, Selection> = {}
  for (const group of groups) {
    const selection: Selection = {}

    const option = params.get(CHOICE + group.slug)
    const known = option !== null && group.options.some((choice) => choice.slug === option)
    if (option !== null && (known || (option === '' && !group.required && group.kind !== 'toggle'))) {
      selection.option = option
    }

    // Only leading spaces go here, so a visitor can type the space between two words. Drawing tidies the rest.
    const words = params.get(WORDS + group.slug)?.replace(/^\s+/, '').slice(0, group.maxLength ?? DEFAULT_TEXT_LENGTH)
    if (words && group.allowCustomText) selection.text = words

    const on = params.get(SWITCH + group.slug)
    if (group.kind === 'toggle' && (on === '1' || on === '0')) selection.on = on === '1'

    if (Object.keys(selection).length > 0) design[group.slug] = selection
  }
  return design
}

/** A design with one category's choice replaced. Passing nothing puts the category back to its starting value. */
export function withSelection(design: BackDesign, slug: string, selection: Selection | undefined): BackDesign {
  const next: Record<string, Selection | undefined> = { ...design }
  if (selection && Object.keys(selection).length > 0) next[slug] = selection
  else delete next[slug]
  return next
}

/** The design page for a bookmark, with the design in its address. */
export function designHref(bookmarkId: string, design: BackDesign): string {
  const query = encodeDesign(design).toString()
  return query ? `${designPath(bookmarkId)}?${query}` : designPath(bookmarkId)
}

/** The request form, told which bookmark and design to attach. */
export function requestHref(requestPath: string, bookmarkId: string, design: BackDesign): string {
  const params = new URLSearchParams({ [BOOKMARK_PARAM]: bookmarkId })
  for (const [name, value] of encodeDesign(design)) params.set(name, value)
  return `${requestPath}?${params.toString()}`
}
