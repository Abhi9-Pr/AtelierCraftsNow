import { check } from '../helpers/check.ts'
import { ROOT, scratch } from '../helpers/paths.ts'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { loadContent } from '../../vite/content.ts'

const SRC = ROOT
const WORK = scratch('back-root')

// ---------- 1. the real content ----------
{
  const { back } = await loadContent(SRC)
  const by = (slug: string) => back.find((g) => g.slug === slug)
  check('real: seven categories, in the order set', back.map((g) => g.slug).join() === 'back-template,line-style,heading,date-signed-lines,signature-picture,watermark,corner-emblem', back.map((g) => g.slug).join())
  check('real: choice counts 4 / 6 / 6 / 0 / 2 / 2 / 2', back.map((g) => g.options.length).join() === '4,6,6,0,2,2,2', back.map((g) => g.options.length).join())
  check('real: template, line style and heading must be chosen; pictures and the switch need not', [by('back-template'), by('line-style'), by('heading')].every((g) => g?.required === true) && [by('signature-picture'), by('watermark'), by('corner-emblem'), by('date-signed-lines')].every((g) => g?.required === false))
  check('real: heading lets visitors type up to 30 characters', by('heading')?.allowCustomText === true && by('heading')?.maxLength === 30)
  check('real: the switch is off to begin with', by('date-signed-lines')?.defaultOn === false && by('date-signed-lines')?.kind === 'toggle')
  check('real: pictures carry size and alignment', by('watermark')?.size === 'small' && by('corner-emblem')?.align === 'right' && by('signature-picture')?.size === 'medium')
  const plain = by('back-template')?.options[0]
  check('real: the first template is plain paper, with no picture', plain?.slug === 'back-template-plain-parchment' && plain.image === undefined, JSON.stringify(plain))
  const lines = by('line-style')?.options ?? []
  check('real: wide ruled has wide spacing; blank has no lines', lines.find((o) => o.label === 'Wide ruled')?.spacing === 'wide' && lines.find((o) => o.label === 'Blank')?.lineType === 'none')
  check('real: headings keep their exact printed words', by('heading')?.options.map((o) => o.text).slice(0, 4).join('|') === 'WANDERING THOUGHTS|WHERE THOUGHTS WANDER|MINDFUL MUSINGS|CATCH A THOUGHT')
  check('real: internal fields are not leaked', back.every((g) => !('order' in g) && g.options.every((o) => !('order' in o) && !('available' in o) && !('group' in o))))
}

// ---------- fixtures ----------
const write = (file: string, data: unknown) => {
  mkdirSync(file.replace(/\/[^/]+$/, ''), { recursive: true })
  writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data))
}
const fresh = () => {
  rmSync(WORK, { recursive: true, force: true })
  write(`${WORK}/content/themes/t.json`, { label: 'T' })
  write(`${WORK}/public/back/wash.jpg`, 'x')
  write(`${WORK}/public/back/tile.svg`, '<svg/>')
}
const group = (slug: string, data: Record<string, unknown>) => write(`${WORK}/content/back-groups/${slug}.json`, data)
const option = (slug: string, data: Record<string, unknown>) => write(`${WORK}/content/back-options/${slug}.json`, { available: true, ...data })
const attempt = async () => {
  try {
    return { content: await loadContent(WORK), error: '' }
  } catch (error) {
    return { content: undefined, error: error instanceof Error ? error.message : String(error) }
  }
}
const says = (error: string, pattern: RegExp) => pattern.test(error)

// ---------- 2. nothing there ----------
fresh()
{
  const r = await attempt()
  check('no back folders at all: the site still loads, with no categories', r.content?.back.length === 0, r.error)
}

// ---------- 3. what is allowed ----------
fresh()
group('paper', { label: 'Paper', kind: 'template', slot: 'background' })
option('paper-wash', { group: 'paper', label: 'Wash', image: '/back/wash.jpg', priceINR: 20, order: 2 })
option('paper-plain', { group: 'paper', label: 'Plain', order: 1 })
option('paper-hidden', { group: 'paper', label: 'Hidden', available: false, order: 3 })
group('empty', { label: 'Empty', kind: 'stamp', slot: 'footer' })
group('switch', { label: 'Switch', kind: 'toggle', slot: 'signature', defaultOn: true, priceINR: 15 })
group('pattern', { label: 'Pattern', kind: 'lines', slot: 'lines' })
option('pattern-tile', { group: 'pattern', label: 'Tile', lineType: 'custom', image: '/back/tile.svg' })
{
  const r = await attempt()
  const back = r.content?.back ?? []
  check('choices sort by position, and an unavailable one is dropped', back.find((g) => g.slug === 'paper')?.options.map((o) => o.slug).join() === 'paper-plain,paper-wash', r.error)
  check('a choice keeps its extra price', back.find((g) => g.slug === 'paper')?.options[1]?.priceINR === 20)
  check('a category with no choices yet stays out of the result', !back.some((g) => g.slug === 'empty'))
  check('an on/off switch shows without choices, with its price and start state', back.find((g) => g.slug === 'switch')?.defaultOn === true && back.find((g) => g.slug === 'switch')?.priceINR === 15)
  check('a custom line pattern keeps its picture', back.find((g) => g.slug === 'pattern')?.options[0]?.image === '/back/tile.svg')
  check('required falls back by kind (template yes, stamp no) when left out', back.find((g) => g.slug === 'paper')?.required === true)
}

// ---------- 3b. the visitor-choice setting ----------
type Row = [string | undefined, string, string, boolean]
const rows: Row[] = [
  ['auto', 'template', 'background', true],
  ['auto', 'stamp', 'footer', false],
  ['required', 'stamp', 'footer', true],
  ['optional', 'template', 'background', false],
  [undefined, 'lines', 'lines', true],
]
for (const [choice, kind, slot, expected] of rows) {
  fresh()
  group('g', { label: 'G', kind, slot, ...(choice ? { choice } : {}) })
  option('g-1', kind === 'stamp' ? { group: 'g', label: 'One', image: '/back/wash.jpg' } : kind === 'lines' ? { group: 'g', label: 'One', lineType: 'ruled' } : { group: 'g', label: 'One' })
  const r = await attempt()
  check(`choice ${choice ?? 'left out'} on a ${kind} category means required = ${expected}`, r.content?.back[0]?.required === expected, r.error.split('\n')[1] ?? '')
}

// ---------- 4. mistakes, each reported by file ----------
const bad = async (label: string, setup: () => void, pattern: RegExp) => {
  fresh()
  setup()
  const r = await attempt()
  check(label, r.content === undefined && says(r.error, pattern), r.error.split('\n').slice(1, 3).join(' | ').slice(0, 220))
}
await bad('a visitor choice that does not exist', () => group('g', { label: 'G', kind: 'stamp', slot: 'footer', choice: 'maybe' }), /back-groups\/g\.json: "choice" must be one of: auto, required, optional/)
await bad('a kind that does not exist', () => group('g', { label: 'G', kind: 'sparkle', slot: 'footer' }), /back-groups\/g\.json: "kind" must be one of: template, lines, text, stamp, toggle/)
await bad('a category with no kind', () => group('g', { label: 'G', slot: 'footer' }), /back-groups\/g\.json: "kind" is required/)
await bad('a category with no place', () => group('g', { label: 'G', kind: 'stamp' }), /back-groups\/g\.json: "slot" is required/)
await bad('a kind in a place it cannot go', () => group('g', { label: 'G', kind: 'template', slot: 'heading' }), /a "template" category cannot go in the "heading" place\. It can go in: background/)
await bad('two categories with choices in a one-thing place', () => {
  group('a', { label: 'Head A', kind: 'text', slot: 'heading' })
  group('b', { label: 'Head B', kind: 'text', slot: 'heading' })
  option('a-x', { group: 'a', label: 'X', text: 'X' })
  option('b-y', { group: 'b', label: 'Y', text: 'Y' })
}, /"Head A" and "Head B" both use the "heading" place, which holds only one/)
await bad('a choice for a category that does not exist', () => {
  group('a', { label: 'A', kind: 'text', slot: 'heading' })
  option('z-1', { group: 'zzz', label: 'Z', text: 'Z' })
}, /back-options\/z-1\.json: category "zzz" does not exist\. Categories are: a/)
await bad('a choice with no category', () => option('z-1', { label: 'Z', text: 'Z' }), /back-options\/z-1\.json: "group" is required/)
await bad('a picture that is not there', () => {
  group('a', { label: 'A', kind: 'template', slot: 'background' })
  option('a-1', { group: 'a', label: 'One', image: '/back/nope.jpg' })
}, /a-1\.json: the picture "\/back\/nope\.jpg" is not in public\/back/)
await bad('a picture outside the back folder', () => {
  group('a', { label: 'A', kind: 'template', slot: 'background' })
  option('a-1', { group: 'a', label: 'One', image: '/artwork/still-water.jpg' })
}, /a-1\.json: the picture "\/artwork\/still-water\.jpg" is not in public\/back/)
await bad('a picture path that climbs out of the folder', () => {
  group('a', { label: 'A', kind: 'template', slot: 'background' })
  option('a-1', { group: 'a', label: 'One', image: '/back/../../secret.jpg' })
}, /is not in public\/back/)
await bad('a line style with no line type', () => {
  group('a', { label: 'A', kind: 'lines', slot: 'lines' })
  option('a-1', { group: 'a', label: 'One' })
}, /a-1\.json: "lineType" is required/)
await bad('a line type that does not exist', () => {
  group('a', { label: 'A', kind: 'lines', slot: 'lines' })
  option('a-1', { group: 'a', label: 'One', lineType: 'wavy' })
}, /"lineType" must be one of: ruled, dotted, grid, dot-grid, none, custom/)
await bad('a custom line type without a picture', () => {
  group('a', { label: 'A', kind: 'lines', slot: 'lines' })
  option('a-1', { group: 'a', label: 'One', lineType: 'custom' })
}, /a "custom" line type needs a picture/)
await bad('a words choice with no words', () => {
  group('a', { label: 'A', kind: 'text', slot: 'heading' })
  option('a-1', { group: 'a', label: 'One' })
}, /a-1\.json: "text" is required/)
await bad('a picture-to-place choice with no picture', () => {
  group('a', { label: 'A', kind: 'stamp', slot: 'footer' })
  option('a-1', { group: 'a', label: 'One' })
}, /a-1\.json: "A" needs a picture for this choice/)
await bad('a choice inside an on/off switch', () => {
  group('a', { label: 'Switch', kind: 'toggle', slot: 'signature' })
  option('a-1', { group: 'a', label: 'One' })
}, /"Switch" is an on\/off switch, so it has no choices/)
await bad('an on/off switch with no picture outside the signature area', () => group('a', { label: 'Lines switch', kind: 'toggle', slot: 'footer' }), /a\.json: an on\/off switch with no picture draws the Date and Signed lines, which belong in the "signature" place/)
await bad('an on/off switch whose picture is not there', () => group('a', { label: 'Foil', kind: 'toggle', slot: 'corner', image: '/back/nope.svg' }), /a\.json: the picture "\/back\/nope\.svg" is not in public\/back/)
await bad('two on/off switches with no picture', () => {
  group('a', { label: 'Lines one', kind: 'toggle', slot: 'signature' })
  group('b', { label: 'Lines two', kind: 'toggle', slot: 'signature' })
}, /"Lines one" and "Lines two" are both on\/off switches with no picture, so both would draw the Date and Signed lines/)

// a switch with a picture, beside the one without
fresh()
group('lines-switch', { label: 'Lines', kind: 'toggle', slot: 'signature' })
group('foil', { label: 'Foil', kind: 'toggle', slot: 'corner', image: '/back/wash.jpg', size: 'large', align: 'left', priceINR: 30 })
group('foil-default', { label: 'Foil default', kind: 'toggle', slot: 'footer', image: '/back/wash.jpg' })
{
  const r = await attempt()
  const back = r.content?.back ?? []
  const foil = back.find((g) => g.slug === 'foil')
  const plainFoil = back.find((g) => g.slug === 'foil-default')
  check('a switch with a picture beside the Date and Signed one loads', back.length === 3, r.error.split('\n')[1] ?? '')
  check('a switch with a picture keeps it, with its size, alignment and price', foil?.image === '/back/wash.jpg' && foil.size === 'large' && foil.align === 'left' && foil.priceINR === 30)
  check('and takes medium and centre when they are left out', plainFoil?.size === 'medium' && plainFoil.align === 'center')
  check('the Date and Signed switch carries no picture, size or alignment', back.find((g) => g.slug === 'lines-switch')?.image === undefined && back.find((g) => g.slug === 'lines-switch')?.size === undefined)
}
await bad('a price that is not a whole number', () => {
  group('a', { label: 'A', kind: 'template', slot: 'background' })
  option('a-1', { group: 'a', label: 'One', priceINR: 1.5 })
}, /a-1\.json: "priceINR" must be a whole number/)
await bad('own-text length out of range', () => group('a', { label: 'A', kind: 'text', slot: 'heading', allowCustomText: true, maxLength: 99 }), /"maxLength" must be between 1 and 60/)
await bad('a badly named file', () => write(`${WORK}/content/back-groups/Bad Name.json`, { label: 'B', kind: 'stamp', slot: 'footer' }), /Bad Name\.json: the file name must be lowercase/)
await bad('a file that is not valid JSON', () => write(`${WORK}/content/back-options/broken.json`, '{ nope'), /broken\.json: not valid JSON/)

fresh()
group('a', { label: 'A', kind: 'text', slot: 'footer' })
option('a-1', { group: 'a', label: 'One' })
option('a-2', { group: 'a', label: 'Two', priceINR: -3 })
option('a-3', { group: 'nope', label: 'Three', text: 'x' })
{
  const r = await attempt()
  check('several mistakes are reported together, with the count', /has 4 problems:/.test(r.error), r.error.split('\n')[0])
}

rmSync(WORK, { recursive: true, force: true })
