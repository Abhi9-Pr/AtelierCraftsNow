import { check } from '../helpers/check.ts'
import { ROOT, scratch } from '../helpers/paths.ts'
import { cpSync, rmSync, writeFileSync } from 'node:fs'
import { loadContent } from '../../vite/content.ts'

const SRC = ROOT
const WORK = scratch('at-root')
const fresh = () => {
  rmSync(WORK, { recursive: true, force: true })
  cpSync(`${SRC}/content`, `${WORK}/content`, { recursive: true })
  cpSync(`${SRC}/public/artwork`, `${WORK}/public/artwork`, { recursive: true })
  cpSync(`${SRC}/public/back`, `${WORK}/public/back`, { recursive: true })
}
const bookmark = (extra: Record<string, unknown>) =>
  JSON.stringify({
    title: 'Probe',
    theme: 'poetic-musings',
    artwork: '/artwork/still-water.jpg',
    artworkAlt: 'A probe entry used only by this test, painted nowhere.',
    quote: 'q',
    headerText: 'CATCH A THOUGHT',
    description: 'd',
    available: true,
    ...extra,
  })
const attempt = async () => {
  try {
    return { content: await loadContent(WORK), error: '' }
  } catch (error) {
    return { content: undefined, error: error instanceof Error ? error.message : String(error) }
  }
}

// 1. the real content folder
{
  const content = await loadContent(SRC)
  check('real content: 14 art types, in the order given', content.artTypes.length === 14 && content.artTypes[0]?.label === 'Watercolor & Wet-on-Wet Wash' && content.artTypes[13]?.label === 'Mixed Media Collage', content.artTypes.map((a) => a.slug).join(','))
  check('real content: 16 new themes plus the existing ones, Custom Orders last', content.themes.length >= 20 && content.themes.at(-1)?.slug === 'custom-orders', content.themes.map((t) => t.slug).join(','))
  const seeded = content.bookmarks.filter((b) => b.artType === 'watercolor-wet-on-wet-wash')
  check('real content: the nine starter bookmarks are Watercolor', seeded.length === 9)
  check('real content: every art type on a bookmark exists', content.bookmarks.every((b) => !b.artType || content.artTypes.some((a) => a.slug === b.artType)))
}

// 2. no art type is allowed, and a real one is kept
fresh()
writeFileSync(`${WORK}/content/bookmarks/probe.json`, bookmark({}))
{
  const r = await attempt()
  check('a bookmark with no art type still loads', r.content !== undefined && r.content.bookmarks.find((b) => b.id === 'probe')?.artType === undefined, r.error)
}
writeFileSync(`${WORK}/content/bookmarks/probe.json`, bookmark({ artType: 'papercut-shadowbox-art' }))
{
  const r = await attempt()
  check('a bookmark with a real art type keeps it', r.content?.bookmarks.find((b) => b.id === 'probe')?.artType === 'papercut-shadowbox-art', r.error)
}

// 3. mistakes are reported, naming the file
writeFileSync(`${WORK}/content/bookmarks/probe.json`, bookmark({ artType: 'nope' }))
{
  const r = await attempt()
  check('an unknown art type stops the build and names file and choices', /content\/bookmarks\/probe\.json: art type "nope" does not exist\. Art types are: watercolor-wet-on-wet-wash/.test(r.error), r.error.split('\n')[1])
}
writeFileSync(`${WORK}/content/bookmarks/probe.json`, bookmark({ artType: 5 }))
{
  const r = await attempt()
  check('a non-text art type is reported', /probe\.json: "artType" must be the name of an art type/.test(r.error), r.error.split('\n')[1])
}
writeFileSync(`${WORK}/content/bookmarks/probe.json`, bookmark({ artType: '' }))
{
  const r = await attempt()
  check('an empty art type counts as none', r.content !== undefined, r.error)
}
writeFileSync(`${WORK}/content/bookmarks/probe.json`, bookmark({}))
writeFileSync(`${WORK}/content/art-types/Bad Name.json`, JSON.stringify({ label: 'Bad' }))
writeFileSync(`${WORK}/content/art-types/no-label.json`, JSON.stringify({ order: 2 }))
writeFileSync(`${WORK}/content/art-types/bad-order.json`, JSON.stringify({ label: 'Bad order', order: 1.5 }))
{
  const r = await attempt()
  check('a badly named art type file is reported', /art-types\/Bad Name\.json: the file name must be lowercase/.test(r.error))
  check('an art type without a name is reported', /art-types\/no-label\.json: "label" is required/.test(r.error))
  check('a non-whole position is reported', /art-types\/bad-order\.json: "order" must be a whole number/.test(r.error))
  check('all three are reported together, with the count', /has 3 problems:/.test(r.error), r.error.split('\n')[0])
}

// 4. deleting an art type that a bookmark still uses
fresh()
rmSync(`${WORK}/content/art-types/watercolor-wet-on-wet-wash.json`)
{
  const r = await attempt()
  check('removing a used art type stops the build, naming the bookmarks', /emberwing-dragon\.json: art type "watercolor-wet-on-wet-wash" does not exist/.test(r.error))
}

// 5. a missing art-types folder is fine (an older checkout)
fresh()
rmSync(`${WORK}/content/art-types`, { recursive: true })
for (const f of ['emberwing-dragon', 'frostwing-dragon', 'harvest-moon', 'lantern-forest', 'misted-castle', 'still-water', 'winter-margins', 'bookplate-set', 'painted-to-order']) {
  const p = `${WORK}/content/bookmarks/${f}.json`
  const fs = await import('node:fs')
  const d = JSON.parse(fs.readFileSync(p, 'utf8'))
  delete d.artType
  fs.writeFileSync(p, JSON.stringify(d))
}
{
  const r = await attempt()
  check('with no art-types folder and no art types on bookmarks, the site still builds', r.content !== undefined && r.content.artTypes.length === 0, r.error.split('\n')[1])
}

rmSync(WORK, { recursive: true, force: true })
