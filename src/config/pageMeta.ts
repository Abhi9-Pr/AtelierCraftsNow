import { bookmarks, themes } from './products'
import { createPageMeta } from './seo'

/** Page metadata for the running app, built from the bundled content. */
export const pageMeta = createPageMeta({ themes, bookmarks })
