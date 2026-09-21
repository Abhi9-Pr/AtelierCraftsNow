import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { brand } from '../src/config/brand.ts'
import type { Content } from '../src/types/index.ts'

const CATALOG_FILE = 'functions/_generated/catalog.json'

/**
 * A copy of what the order functions need to check a design against: the address of the site, each
 * bookmark's price and whether it can be ordered, and every back category and choice. The functions
 * run on Cloudflare and cannot read the content folder, so they read this instead. It is rewritten
 * on every build and whenever content changes in dev. Only what a design needs is in it.
 */
export async function writeCatalog(root: string, content: Content): Promise<void> {
  const catalog = {
    siteUrl: brand.siteUrl,
    bookmarks: content.bookmarks.map(({ id, title, available, priceINR, headerText, showSignature }) => ({
      id,
      title,
      available,
      headerText,
      ...(priceINR === undefined ? {} : { priceINR }),
      ...(showSignature === undefined ? {} : { showSignature }),
    })),
    back: content.back,
  }
  const file = path.join(root, CATALOG_FILE)
  const next = `${JSON.stringify(catalog, null, 2)}\n`
  // Left alone when nothing changed, so builds and the dev watcher do not touch files for no reason.
  const current = await readFile(file, 'utf8').catch(() => '')
  if (current === next) return
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, next)
}
