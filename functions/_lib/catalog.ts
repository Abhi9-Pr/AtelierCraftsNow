import raw from '../_generated/catalog.json'
import type { BackGroup, Bookmark } from '../../src/types/index.ts'

/** A bookmark as far as ordering is concerned. */
export type CatalogBookmark = Pick<Bookmark, 'id' | 'title' | 'available' | 'headerText'> &
  Partial<Pick<Bookmark, 'priceINR' | 'showSignature'>>

/**
 * What the functions check a design against. It is written by the build (vite/catalog.ts) from the
 * content folder, so it is exactly the catalog the visitor's page was built from.
 */
export interface Catalog {
  siteUrl: string
  bookmarks: CatalogBookmark[]
  back: BackGroup[]
}

export const catalog = raw as unknown as Catalog
