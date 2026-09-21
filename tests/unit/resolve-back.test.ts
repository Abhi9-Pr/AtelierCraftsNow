import { check } from '../helpers/check.ts'
import { ROOT } from '../helpers/paths.ts'
import { loadContent } from '../../vite/content.ts'
import { resolveBack } from '../../src/lib/back/resolveBack.ts'

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const { back: groups } = await loadContent(ROOT)
const plain = { headerText: 'MINDFUL MUSINGS', showSignature: false }
const signed = { headerText: 'MINDFUL MUSINGS', showSignature: true }
const opt = (group: string, label: string) => groups.find((g) => g.slug === group)?.options.find((o) => o.label === label)?.slug ?? 'missing'

// ---------- 1. the starting back is the back the site has always had ----------
{
  const r = resolveBack(groups, {}, plain)
  check('starting back: no picture behind, plain ruled lines, the bookmark\'s own heading', r.background === undefined && same(r.lines, { type: 'ruled', spacing: 'regular' }) && r.heading === 'MINDFUL MUSINGS', JSON.stringify(r))
  check('starting back: nothing in the signature area, the foot or the corner', r.signature.length === 0 && r.footer.length === 0 && r.corner.length === 0)
  const s = resolveBack(groups, {}, signed)
  check('a bookmark set to print Date and Signed lines gets them', same(s.signature, [{ kind: 'signature-lines' }]), JSON.stringify(s.signature))
}
{
  const r = resolveBack([], {}, plain)
  check('with no categories at all: the plain ruled back, own heading, nothing else', r.background === undefined && same(r.lines, { type: 'ruled', spacing: 'regular' }) && r.heading === 'MINDFUL MUSINGS' && r.signature.length + r.footer.length + r.corner.length === 0)
  check('with no categories, a bookmark set to print Date and Signed lines still does', same(resolveBack([], {}, signed).signature, [{ kind: 'signature-lines' }]))
}

// ---------- 2. picture, lines, heading ----------
{
  const r = resolveBack(groups, { 'back-template': { option: opt('back-template', 'Soft wash') }, 'line-style': { option: opt('line-style', 'Wide ruled') } }, plain)
  check('a chosen back picture is used', r.background === '/back/soft-wash.jpg', String(r.background))
  check('a chosen line style keeps its type and spacing', same(r.lines, { type: 'ruled', spacing: 'wide' }), JSON.stringify(r.lines))
  check('dotted and blank line styles', resolveBack(groups, { 'line-style': { option: opt('line-style', 'Dotted') } }, plain).lines.type === 'dotted' && resolveBack(groups, { 'line-style': { option: opt('line-style', 'Blank') } }, plain).lines.type === 'none')
}
{
  const h = (selection: object) => resolveBack(groups, { heading: selection }, plain).heading
  check('a chosen heading replaces the bookmark\'s own', h({ option: opt('heading', 'Margin notes') }) === 'MARGIN NOTES')
  check('own words are tidied, capitalised and used', h({ text: '  for   mum ' }) === 'FOR MUM', h({ text: '  for   mum ' }))
  check('own words are cut at the category\'s limit (30)', h({ text: 'a'.repeat(50) }) === 'A'.repeat(30), String(h({ text: 'a'.repeat(50) }).length))
  check('own words win over a chosen heading', h({ option: opt('heading', 'Margin notes'), text: 'mine' }) === 'MINE')
  check('empty own words fall back to the chosen heading, then to the bookmark\'s own', h({ option: opt('heading', 'Margin notes'), text: '   ' }) === 'MARGIN NOTES' && h({ text: '   ' }) === 'MINDFUL MUSINGS')
  check('a heading choice that has been removed falls back to the bookmark\'s own', h({ option: 'heading-gone' }) === 'MINDFUL MUSINGS')
}

// ---------- 3. pictures to place ----------
{
  const r = resolveBack(groups, {
    'signature-picture': { option: opt('signature-picture', 'Flourish') },
    watermark: { option: opt('watermark', 'Crescent moon') },
    'corner-emblem': { option: opt('corner-emblem', 'Star') },
  }, plain)
  check('signature picture: medium in the signature area is 45% wide, centred', same(r.signature, [{ kind: 'picture', src: '/back/signature-flourish.svg', widthCqw: 45, align: 'center' }]), JSON.stringify(r.signature))
  check('watermark: small at the foot is 12% wide', same(r.footer, [{ kind: 'picture', src: '/back/watermark-moon.svg', widthCqw: 12, align: 'center' }]), JSON.stringify(r.footer))
  check('corner emblem: small in the corner is 10% wide, to the right', same(r.corner, [{ kind: 'picture', src: '/back/emblem-star.svg', widthCqw: 10, align: 'right' }]), JSON.stringify(r.corner))
  const none = resolveBack(groups, { watermark: { option: '' } }, plain)
  check('choosing none for an optional picture category shows nothing', none.footer.length === 0)
  const stale = resolveBack(groups, { watermark: { option: 'watermark-gone' } }, plain)
  check('a picture choice that has been removed shows nothing rather than failing', stale.footer.length === 0)
}

// ---------- 4. the on/off switch ----------
{
  check('switch on: Date and Signed lines', same(resolveBack(groups, { 'date-signed-lines': { on: true } }, plain).signature, [{ kind: 'signature-lines' }]))
  check('switch explicitly off beats the bookmark\'s own setting', resolveBack(groups, { 'date-signed-lines': { on: false } }, signed).signature.length === 0)
  const both = resolveBack(groups, { 'date-signed-lines': { on: true }, 'signature-picture': { option: opt('signature-picture', 'Scrawl') } }, plain)
  check('the signature area stacks in the order set: lines first, then the picture', both.signature.map((p) => p.kind).join() === 'signature-lines,picture', both.signature.map((p) => p.kind).join())
}

// ---------- 5. synthetic categories: switch with a picture, footer words, custom lines, required picture ----------
const base = { slug: 'x', label: 'X', required: false, options: [] }
{
  const foil: Record<string, unknown> = { ...base, slug: 'foil', kind: 'toggle', slot: 'corner', image: '/back/emblem-star.svg', size: 'large', align: 'left', defaultOn: true }
  const r = resolveBack([foil as never], {}, plain)
  check('a switch with a picture draws it when on, at its size and alignment', same(r.corner, [{ kind: 'picture', src: '/back/emblem-star.svg', widthCqw: 20, align: 'left' }]), JSON.stringify(r.corner))
  check('and nothing when off', resolveBack([foil as never], { foil: { on: false } }, plain).corner.length === 0)
  check('a bookmark\'s Date and Signed setting does not turn on a switch that has a picture', resolveBack([{ ...foil, defaultOn: false } as never], {}, signed).corner.length === 0)
  check('with a picture switch but no lines switch, a signed bookmark still gets its lines', same(resolveBack([{ ...foil, defaultOn: false } as never], {}, signed).signature, [{ kind: 'signature-lines' }]))

  const words: Record<string, unknown> = { ...base, slug: 'tag', kind: 'text', slot: 'footer', required: true, options: [{ slug: 'tag-a', label: 'A', text: 'HAND MADE' }, { slug: 'tag-b', label: 'B', text: 'IN INDIA' }] }
  check('a required footer words category starts on its first choice', same(resolveBack([words as never], {}, plain).footer, [{ kind: 'words', text: 'HAND MADE' }]))
  check('and takes another choice', same(resolveBack([words as never], { tag: { option: 'tag-b' } }, plain).footer, [{ kind: 'words', text: 'IN INDIA' }]))
  check('an optional one starts empty', resolveBack([{ ...words, required: false } as never], {}, plain).footer.length === 0)

  const pattern = { ...base, slug: 'pat', kind: 'lines', slot: 'lines', required: true, options: [{ slug: 'pat-a', label: 'A', lineType: 'custom', spacing: 'tight', image: '/back/tile.svg' }] } as never
  check('a custom line pattern passes its picture through', same(resolveBack([pattern], {}, plain).lines, { type: 'custom', spacing: 'tight', src: '/back/tile.svg' }), JSON.stringify(resolveBack([pattern], {}, plain).lines))

  const required = { ...base, slug: 'req', kind: 'stamp', slot: 'footer', required: true, size: 'small', options: [{ slug: 'req-a', label: 'A', image: '/back/watermark-leaf.svg' }] } as never
  check('a required picture starts on its first choice and cannot be set to none', resolveBack([required], {}, plain).footer.length === 1 && resolveBack([required], { req: { option: '' } }, plain).footer.length === 1)
}

// ---------- 6. it never changes what it is given ----------
{
  const frozen = JSON.parse(JSON.stringify(groups))
  const deep = (o: unknown): void => { if (o && typeof o === 'object') { Object.freeze(o); Object.values(o).forEach(deep) } }
  deep(frozen)
  let threw = false
  try { resolveBack(frozen, { heading: { text: 'x' }, 'date-signed-lines': { on: true } }, signed) } catch { threw = true }
  check('it works on frozen input, so it changes nothing it is given', !threw)
}
