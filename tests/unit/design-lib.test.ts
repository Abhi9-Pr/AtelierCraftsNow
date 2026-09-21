import { check } from '../helpers/check.ts'
import { ROOT } from '../helpers/paths.ts'
import { loadContent } from '../../vite/content.ts'
import { decodeDesign, designHref, encodeDesign, requestHref, withSelection } from '../../src/lib/back/designParams.ts'
import { describeDesign, designText, priceFor, priceText } from '../../src/lib/back/designSummary.ts'
import { resolveBack } from '../../src/lib/back/resolveBack.ts'

const canon = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canon(x)])) : v
const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b))

const { back: groups, bookmarks } = await loadContent(ROOT)
const opt = (group: string, label: string) => groups.find((g) => g.slug === group)?.options.find((o) => o.label === label)?.slug ?? 'missing'
const plain = { headerText: 'MINDFUL MUSINGS', showSignature: false }
const q = (s: string) => new URLSearchParams(s)

// ---------- encode and decode ----------
check('an empty design makes an empty address, and reads back empty', encodeDesign({}).toString() === '' && same(decodeDesign(q(''), groups), {}))
{
  const design = {
    'back-template': { option: opt('back-template', 'Soft wash') },
    'line-style': { option: opt('line-style', 'Dotted') },
    heading: { text: "Mum & Dad's day" },
    'date-signed-lines': { on: true },
    watermark: { option: '' },
    'signature-picture': { option: opt('signature-picture', 'Flourish') },
  }
  const params = encodeDesign(design)
  const back = decodeDesign(new URLSearchParams(params.toString()), groups)
  check('a varied design survives being written to an address and read back', same(back, { ...design, heading: { text: "Mum & Dad's day" } }), params.toString().slice(0, 140))
  check('the address names each category, so it is readable', params.get('b.line-style') === opt('line-style', 'Dotted') && params.get('s.date-signed-lines') === '1' && params.get('b.watermark') === '')
}

// ---------- reading an address that no longer fits ----------
{
  const stale = decodeDesign(q('b.line-style=line-style-gone&b.back-template=back-template-soft-wash&b.no-such-category=x&t.heading=hi&s.date-signed-lines=2'), groups)
  check('a choice that no longer exists is dropped', stale['line-style'] === undefined)
  check('a category that no longer exists is ignored', !('no-such-category' in stale))
  check('what still fits is kept', stale['back-template']?.option === 'back-template-soft-wash' && stale.heading?.text === 'hi')
  check('a switch value that is not 1 or 0 is dropped', stale['date-signed-lines'] === undefined)
}
check('"none" is refused for a category that must be chosen', decodeDesign(q('b.line-style='), groups)['line-style'] === undefined)
check('"none" is kept for a category that may be skipped', same(decodeDesign(q('b.watermark='), groups).watermark, { option: '' }))
check('a choice cannot be set on an on/off category', decodeDesign(q('b.date-signed-lines=x'), groups)['date-signed-lines'] === undefined)
check('own words are refused where the category does not allow them', decodeDesign(q('t.watermark=hello&t.line-style=hello'), groups).watermark === undefined)
check('own words are cut to the limit and trimmed', decodeDesign(q('t.heading=' + encodeURIComponent('   ' + 'x'.repeat(80))), groups).heading?.text === 'x'.repeat(30))
check('a space typed after a word is kept, so a visitor can type "for mum"', decodeDesign(q('t.heading=for+'), groups).heading?.text === 'for ' && decodeDesign(q('t.heading=for+mum'), groups).heading?.text === 'for mum')
check('blank own words are dropped', decodeDesign(q('t.heading=%20%20'), groups).heading === undefined)
check('a hostile address gives an empty design and no error', same(decodeDesign(q('b.=&t.=&s.=&b.__proto__=x&constructor=1'), groups), {}))

// ---------- changing one category ----------
{
  const a = withSelection({}, 'line-style', { option: 'x' })
  const b = withSelection(a, 'heading', { text: 'hi' })
  check('withSelection adds a category and keeps the others', same(b, { 'line-style': { option: 'x' }, heading: { text: 'hi' } }))
  check('and does not change what it was given', same(a, { 'line-style': { option: 'x' } }))
  check('withSelection with nothing puts a category back to its starting value', same(withSelection(b, 'heading', undefined), { 'line-style': { option: 'x' } }) && same(withSelection(b, 'heading', {}), { 'line-style': { option: 'x' } }))
}

// ---------- links ----------
check('a design page link with no changes has no query', designHref('emberwing-dragon', {}) === '/design/emberwing-dragon')
check('a design page link carries the design', designHref('emberwing-dragon', { 'line-style': { option: 'line-style-dotted' } }) === '/design/emberwing-dragon?b.line-style=line-style-dotted')
check('the request link names the bookmark first, then the design', requestHref('/custom', 'emberwing-dragon', { 'date-signed-lines': { on: true } }) === '/custom?bookmark=emberwing-dragon&s.date-signed-lines=1')

// ---------- what is chosen, in words ----------
{
  const lines = describeDesign(groups, {}, plain)
  check('the starting design reads: plain paper, ruled, the bookmark\'s own heading, all else off or none', same(lines.map((l) => l.value), ['Plain parchment', 'Ruled', 'MINDFUL MUSINGS', 'Off', 'None', 'None', 'None']), lines.map((l) => l.value).join(' | '))
  check('the labels are the categories\' own names, in order', lines.map((l) => l.label).join() === groups.map((g) => g.label).join())
  check('a bookmark with Date and Signed lines switched on shows On', describeDesign(groups, {}, { ...plain, showSignature: true })[3]?.value === 'On')
  const chosen = describeDesign(groups, { heading: { option: opt('heading', 'Margin notes') }, watermark: { option: opt('watermark', 'Leaf') }, 'line-style': { option: opt('line-style', 'Wide ruled') } }, plain)
  check('chosen choices show their names, and a chosen heading shows its printed words', chosen[1]?.value === 'Wide ruled' && chosen[2]?.value === 'MARGIN NOTES' && chosen[5]?.value === 'Leaf')
  check('own words are shown as such, in capitals', describeDesign(groups, { heading: { text: 'for mum' } }, plain)[2]?.value === 'FOR MUM (own words)')
  check('the summary always agrees with what is drawn: the same heading', describeDesign(groups, { heading: { text: 'for mum' } }, plain)[2]?.value.startsWith(resolveBack(groups, { heading: { text: 'for mum' } }, plain).heading))
}

// ---------- price ----------
{
  const priced = groups.map((g) => (g.slug === 'line-style' ? { ...g, options: g.options.map((o) => (o.label === 'Dotted' ? { ...o, priceINR: 20 } : o)) } : g.slug === 'date-signed-lines' ? { ...g, priceINR: 15 } : g.slug === 'watermark' ? { ...g, options: g.options.map((o) => ({ ...o, priceINR: 0 })) } : g))
  const none = describeDesign(priced, {}, plain)
  check('the starting design adds nothing', priceFor({ priceINR: 199 }, none).extras === 0 && priceFor({ priceINR: 199 }, none).total === 199)
  const one = describeDesign(priced, { 'line-style': { option: opt('line-style', 'Dotted') } }, plain)
  check('a priced choice adds its price', priceFor({ priceINR: 199 }, one).extras === 20 && priceFor({ priceINR: 199 }, one).total === 219)
  const both = describeDesign(priced, { 'line-style': { option: opt('line-style', 'Dotted') }, 'date-signed-lines': { on: true } }, plain)
  check('a switch adds its price only when on, and prices add up', priceFor({ priceINR: 199 }, both).extras === 35 && priceFor({ priceINR: 199 }, describeDesign(priced, { 'date-signed-lines': { on: false } }, plain)).extras === 0)
  check('a choice priced at 0 is not shown as an extra', describeDesign(priced, { watermark: { option: opt('watermark', 'Leaf') } }, plain)[5]?.extraINR === undefined)
  const onRequest = priceFor({ priceINR: undefined }, both)
  check('a made-to-order bookmark has no total, but still reports the extras', onRequest.base === undefined && onRequest.total === undefined && onRequest.extras === 35)
  check('price in words, plain', priceText(priceFor({ priceINR: 199 }, none)) === '₹199', priceText(priceFor({ priceINR: 199 }, none)))
  check('price in words, with extras', priceText(priceFor({ priceINR: 199 }, both)) === '₹199 plus ₹35 for the choices = ₹234', priceText(priceFor({ priceINR: 199 }, both)))
  check('price in words, on request', priceText(onRequest) === 'Price on request, plus ₹35 for the choices' && priceText(priceFor({ priceINR: undefined }, none)) === 'Price on request')
  const text = designText({ title: 'Emberwing' }, both, priceFor({ priceINR: 199 }, both), 'https://example.test/design/emberwing-dragon?x=1')
  check('the email text lists the bookmark, every category, the price and the link', text.startsWith('Bookmark: Emberwing\nBack picture: Plain parchment\nLine style: Dotted (+₹20)') && text.includes('Date and Signed lines: On (+₹15)') && text.includes('Price: ₹199 plus ₹35') && text.endsWith('See it: https://example.test/design/emberwing-dragon?x=1'), text.split('\n').slice(0, 3).join(' / '))
}
check('there are real bookmarks to design', bookmarks.length > 0)
