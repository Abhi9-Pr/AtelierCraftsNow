import { encodeDesign } from './back/designParams'
import type { BackDesign } from './back/resolveBack'

/**
 * Words a visitor typed are never sent. A single letter stands in for them, so the server can tell that
 * words were typed, which is all it counts.
 */
const withoutWords = (design: BackDesign): BackDesign =>
  Object.fromEntries(Object.entries(design).map(([slug, selection]) => [slug, selection?.text ? { ...selection, text: 'x' } : selection]))

/** A visitor who has asked not to be tracked, by Do Not Track or Global Privacy Control, is not counted at all. */
export function countingAllowed(): boolean {
  const control = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
  return navigator.doNotTrack !== '1' && control !== true
}

/**
 * Tells the site's own order service that a design page was visited, and which choices the visitor ended with.
 * It is sent as a beacon, the way to send something as a page is being left, and the answer is not waited for.
 */
export function reportVisit(bookmarkId: string, design: BackDesign): void {
  const body = JSON.stringify({ bookmarkId, query: encodeDesign(withoutWords(design)).toString() })
  navigator.sendBeacon('/api/visits', new Blob([body], { type: 'application/json' }))
}
