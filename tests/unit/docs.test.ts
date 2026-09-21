import { check } from '../helpers/check.ts'
import { ROOT } from '../helpers/paths.ts'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

const files = ['README.md', ...readdirSync(path.join(ROOT, 'docs')).filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`)]
const read = (f: string) => readFileSync(path.join(ROOT, f), 'utf8')
const stripCode = (s: string) => s.replace(/```[\s\S]*?```/g, '')

// GitHub-style heading slugs
const slug = (h: string) => h.toLowerCase().replace(/[`*_]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
const anchors = (f: string) => new Set([...read(f).matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slug(m[1] ?? '')))

// 1. links and anchors
{
  const bad = []
  let count = 0
  for (const f of files) {
    for (const m of stripCode(read(f)).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = m[1] ?? ''
      if (/^https?:|^mailto:/.test(target)) continue
      count++
      const [p, hash] = target.split('#')
      const resolved = p ? path.posix.normalize(path.posix.join(path.posix.dirname(f), p)) : f
      if (!existsSync(path.join(ROOT, resolved))) { bad.push(`${f}: ${target} (no such file)`); continue }
      if (hash && resolved.endsWith('.md') && !anchors(resolved).has(hash)) bad.push(`${f}: ${target} (no such heading; have: ${[...anchors(resolved)].filter((a) => a.includes(hash.slice(0, 6))).join(', ') || 'none similar'})`)
    }
  }
  check(`all ${count} internal links and heading anchors resolve`, bad.length === 0, bad.join(' | '))
}

// 2. every project path mentioned in backticks exists
{
  const missing = new Set()
  let count = 0
  for (const f of files) {
    for (const m of read(f).matchAll(/`((?:src|public|docs|vite)\/[\w./\-[\]]+|\.env\.example|\.nvmrc|index\.html|package\.json)`/g)) {
      const p = (m[1] ?? '').replace(/\/$/, '')
      if (/[[\]]/.test(p)) continue
      count++
      if (!['public/artwork/night-ferry.jpg', 'public/back/blue-ribbon.svg'].includes(p) && !existsSync(path.join(ROOT, p))) missing.add(`${f}: ${m[1]}`)
    }
  }
  check(`all ${count} file and folder paths named in the docs exist`, missing.size === 0, [...missing].join(' | '))
}

// 3. npm scripts
{
  const scripts = Object.keys(JSON.parse(read('package.json')).scripts)
  const used = new Set()
  for (const f of files) for (const m of read(f).matchAll(/npm run ([\w:-]+)/g)) used.add(m[1])
  const unknown = [...used].filter((u) => !scripts.includes(String(u)))
  check(`every "npm run ..." command exists (${[...used].join(', ')})`, unknown.length === 0, unknown.join(', '))
}

// 4. environment variables
{
  const example = read('.env.example')
  const used = new Set()
  for (const f of files) for (const m of read(f).matchAll(/\b(VITE_[A-Z_]+)\b/g)) used.add(m[1])
  const unknown = [...used].filter((u) => !example.includes(String(u)))
  check(`every environment variable named is in .env.example (${[...used].join(', ')})`, unknown.length === 0, unknown.join(', '))
}

// 5. brand.ts keys named in the content guide
{
  const brand = read('src/config/brand.ts')
  const keys = ['name:', 'secondaryName:', 'taglines:', 'primary:', 'secondary:', 'watermark:', 'social:', 'instagram:', 'pinterest:', 'handle:', 'url:', 'email:', "const domain ="]
  const missing = keys.filter((k) => !brand.includes(k))
  check('every brand.ts key the guide names exists', missing.length === 0, missing.join(', '))
  const headingTexts = readdirSync(path.join(ROOT, 'content/back-options')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read('content/back-options/' + f))).filter((o) => o.group === 'heading').map((o) => o.text)
  const bookmarkHeadings = readdirSync(path.join(ROOT, 'content/bookmarks')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read('content/bookmarks/' + f)).headerText)
  const strays = [...new Set(bookmarkHeadings.filter((h) => !headingTexts.includes(h)))]
  check('every bookmark heading is one of the Heading choices in content/back-options (' + headingTexts.length + ' choices)', strays.length === 0 && headingTexts.length >= 4, strays.join(' | '))
  check('brand.ts no longer keeps its own list of headings', !brand.includes('bookmarkHeaders'))
}

// 6. content fields, admin labels and artwork in the guide vs the real files
{
  const types = read('src/types/index.ts')
  const block = types.slice(types.indexOf('export interface Bookmark'), types.indexOf('/** One chip in a filter bar'))
  const fields = [...block.matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1]).filter((f) => f !== 'id')
  const yml = read('public/admin/config.yml')
  const guide = read('docs/CONTENT-GUIDE.md')
  const noWidget = fields.filter((f) => !new RegExp('name: ' + f + '(?![A-Za-z])').test(yml))
  check('every Bookmark field has a widget in the admin config (' + fields.join(', ') + ')', noWidget.length === 0, noWidget.join(', '))
  const labels = [...yml.matchAll(/- label: (.+)\r?\n\s+name: (\w+)/g)].map((m) => (m[1] ?? '').trim())
  const unlabelled = [...new Set(labels)].filter((l) => !guide.includes('**' + l + '**'))
  check('every admin form label is described in the guide (' + [...new Set(labels)].length + ' labels)', unlabelled.length === 0, unlabelled.join(', '))
  const byHand = ['title', 'theme', 'artwork', 'artworkAlt', 'quote', 'headerText', 'description', 'priceINR', 'available', 'showSignature', 'featured', 'order', 'artType', 'label', 'kind', 'slot', 'choice', 'group', 'image', 'lineType', 'spacing', 'text']
  const noKey = byHand.filter((f) => !guide.includes('"' + f + '"'))
  check('the by-hand section shows or names every file field', noKey.length === 0, noKey.join(', '))
  const seeded = { themes: ['fantasy-whimsical', 'poetic-musings', 'custom-orders'], 'art-types': ['watercolor-wet-on-wet-wash', 'linocut-woodblock-printmaking'], bookmarks: ['emberwing-dragon'] }
  const missingSeeds = Object.entries(seeded).flatMap(([dir, names]) => names.filter((n) => !existsSync(path.join(ROOT, 'content', dir, n + '.json')) || !guide.includes(n + '.json')).map((n) => dir + '/' + n))
  check('the file names shown in the guide exist in content/', missingSeeds.length === 0, missingSeeds.join(', '))
  const listOf = (heading: string) => {
    const line = guide.split('\n').find((l) => l.startsWith('**' + heading + '.**')) ?? ''
    return line.replace(/^\*\*[^*]+\*\* /, '').replace('then: ', '').replace(', and Custom Orders last.', ', Custom Orders').replace(/\.$/, '').split(', ').map((x) => x.trim()).filter(Boolean)
  }
  const labelsOn = (dir: string) => new Set(readdirSync(path.join(ROOT, 'content', dir)).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read('content/' + dir + '/' + f)).label))
  const themeLabels = labelsOn('themes')
  const artLabels = labelsOn('art-types')
  const listedThemes = listOf('Themes')
  const listedArt = listOf('Art types')
  const badThemes = listedThemes.filter((l) => !themeLabels.has(l))
  const badArt = listedArt.filter((l) => !artLabels.has(l))
  check('the guide lists ' + listedThemes.length + ' themes and each one exists in content/themes', listedThemes.length >= 19 && badThemes.length === 0, badThemes.join(' | '))
  check('the guide lists ' + listedArt.length + ' art types and each one exists in content/art-types', listedArt.length === 14 && badArt.length === 0, badArt.join(' | '))
  const bookmarkFiles = readdirSync(path.join(ROOT, 'content/bookmarks')).filter((f) => f.endsWith('.json'))
  const artwork = bookmarkFiles.map((f) => JSON.parse(read('content/bookmarks/' + f)).artwork.replace('/artwork/', '')).filter((a) => a.endsWith('.jpg'))
  const listed = artwork.filter((a) => guide.includes('`' + a + '`'))
  const onDisk = artwork.filter((a) => existsSync(path.join(ROOT, 'public/artwork', a)))
  check('all ' + artwork.length + ' JPEG artwork files in use are listed in the guide and exist on disk', listed.length === artwork.length && onDisk.length === artwork.length, 'listed ' + listed.length + ', on disk ' + onDisk.length)
  check('the bookmark heading in the admin is a picker over the Heading choices, not a second list', /name: headerText\s+widget: relation\s+collection: back-options/.test(yml) && /field: group\s+values: \[heading\]/.test(yml) && existsSync(path.join(ROOT, 'content/back-groups/heading.json')))
  const groupLabels = new Set(readdirSync(path.join(ROOT, 'content/back-groups')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read('content/back-groups/' + f)).label))
  const tableRows = guide.split('\n').filter((l) => /^\| .+ \| (Back picture template|Line style|Words|Picture to place|On or off switch) \| .+ \| .+ \|$/.test(l))
  const tableNames = tableRows.map((l) => (l.split('|')[1] ?? '').trim())
  const missingGroups = tableNames.filter((n) => !groupLabels.has(n))
  check('the guide table lists ' + tableNames.length + ' back categories and each one exists in content/back-groups', tableNames.length === 7 && missingGroups.length === 0, missingGroups.join(' | '))
  const between = (from: string, to: string) => yml.slice(yml.indexOf(from), yml.indexOf(to, yml.indexOf(from)))
  const kinds = [...between('name: kind', 'name: slot').matchAll(/value: ([a-z-]+) \}/g)].map((m) => m[1])
  const places = [...between('name: slot', '- label: Help text').matchAll(/value: ([a-z-]+) \}/g)].map((m) => m[1])
  const schema = read('src/config/backSchema.ts')
  const schemaKinds = [...(schema.match(/backKinds = \[([^\]]+)\]/)?.[1] ?? '').matchAll(/'(\w+)'/g)].map((m) => m[1])
  const schemaSlots = [...(schema.match(/backSlots = \[([^\]]+)\]/)?.[1] ?? '').matchAll(/'([\w-]+)'/g)].map((m) => m[1])
  check('the admin form offers exactly the kinds and places the code knows', kinds.join() === schemaKinds.join() && places.join() === schemaSlots.join(), kinds.join() + ' / ' + places.join())
}

// 6b. server settings: the example file, the code and the setup guide agree
{
  const example = [...read('.dev.vars.example').matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1])
  const inCode = [...read('functions/_lib/env.ts').matchAll(/^\s+([A-Z][A-Z0-9_]+)\??:/gm)].map((m) => m[1]).filter((n) => n !== 'DB')
  const setup = read('docs/SETUP.md')
  check('.dev.vars.example lists exactly the settings the functions read (' + inCode.join(', ') + ')', [...example].sort().join() === [...inCode].sort().join(), example.join(', '))
  const undocumented = example.filter((n) => !setup.includes('`' + n + '`'))
  check('every server setting is named in the setup guide', undocumented.length === 0, undocumented.join(', '))
  check('no server setting starts with VITE_, so none reaches the published site', ![...example, ...inCode].some((n) => String(n).startsWith('VITE_')))
  const scripts = JSON.parse(read('package.json')).scripts
  check('the database scripts use the separately named config file, never wrangler.toml', /wrangler.d1.toml/.test(scripts['db:local']) && /wrangler.d1.toml/.test(scripts['db:remote']) && !existsSync(path.join(ROOT, 'wrangler.toml')))
}

// 7. copy rules in the prose (code blocks excluded)
{
  const banned = /\belevate\b|\bcurated?\b|\bunleash|\bjourney|\bmagical\b|\bdelve\b|\bwhimsy\b|\bvibes\b|\bnot just\b|\byou deserve\b/gi
  const problems = []
  for (const f of files) {
    const prose = stripCode(read(f)).replace(/`[^`]*`/g, '')
    for (const m of prose.matchAll(/!/g)) {
      const around = prose.slice(Math.max(0, m.index - 12), m.index + 3)
      if (!/!\[/.test(around) && !around.includes('!=')) problems.push(`${f}: "!" near "${around.trim()}"`)
    }
    const w = prose.match(banned)
    if (w) problems.push(`${f}: banned word ${w.join(',')}`)
  }
  // the guide lists the banned words on purpose, so allow them there only
  const real = problems.filter((p) => !p.startsWith('docs/CONTENT-GUIDE.md: banned'))
  check('no exclamation marks or banned words in the docs (the guide lists the banned words on purpose)', real.length === 0, real.join(' | '))
}

// 8. line lengths sanity: no doc left as a stub
{
  const stubs = files.filter((f) => /Filled in Phase 8|completed in Phase 8|lands in `docs\/` during Phase 8/i.test(read(f)))
  check('no doc still says it is a stub or "completed in Phase 8"', stubs.length === 0, stubs.join(', '))
}
