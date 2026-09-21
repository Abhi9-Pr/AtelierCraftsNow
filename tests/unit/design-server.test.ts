import { check } from '../helpers/check.ts'
import { ROOT } from '../helpers/paths.ts'
import { checkDesign } from '../../functions/_lib/design.ts'
import { parseOrder } from '../../functions/_lib/validateOrder.ts'
import type { Catalog } from '../../functions/_lib/catalog.ts'
import { loadContent } from '../../vite/content.ts'
import { resolveBack } from '../../src/lib/back/resolveBack.ts'


// A catalog with prices, made from the real one: Dotted costs 20, the Date and Signed switch 15, the gilt border 35.
const real = await loadContent(ROOT)
const catalog: Catalog = {
  siteUrl: 'https://shop.example',
  bookmarks: [
    { id: 'priced', title: 'Priced One', available: true, headerText: 'MINDFUL MUSINGS', priceINR: 199 },
    { id: 'signed', title: 'Signed One', available: true, headerText: 'MINDFUL MUSINGS', priceINR: 249, showSignature: true },
    { id: 'made-to-order', title: 'Made To Order', available: true, headerText: 'CATCH A THOUGHT' },
    { id: 'gone', title: 'Sold Out', available: false, headerText: 'CATCH A THOUGHT', priceINR: 99 },
  ],
  back: real.back.map((g) =>
    g.slug === 'line-style' ? { ...g, options: g.options.map((o) => (o.label === 'Dotted' ? { ...o, priceINR: 20 } : o)) }
    : g.slug === 'date-signed-lines' ? { ...g, priceINR: 15 }
    : g.slug === 'back-template' ? { ...g, options: g.options.map((o) => (o.label === 'Gilt border' ? { ...o, priceINR: 35 } : o)) }
    : g,
  ) as Catalog['back'],
}
const input = (over: Record<string, unknown> = {}) => ({ bookmarkId: 'priced', query: '', expectedTotal: 199, ...over }) as { bookmarkId: string; query: string; expectedTotal: number | null }
const refused = (r: ReturnType<typeof checkDesign>) => (r.ok ? null : r)

// ---------- accepted designs: everything is the server's own ----------
{
  const r = checkDesign(catalog, input())
  check('the starting design of an available bookmark is accepted at its own price', r.ok && r.snapshot.price.total === 199 && r.snapshot.price.extras === 0)
  if (r.ok) {
    check('the snapshot names the bookmark as the catalog does, not as the browser said', r.snapshot.bookmarkId === 'priced' && r.snapshot.bookmarkTitle === 'Priced One')
    check('the plain-text copy is written by the server, with the site\'s own address in its link', r.snapshot.text.startsWith('Bookmark: Priced One\nBack picture: Plain parchment') && r.snapshot.link === 'https://shop.example/design/priced' && r.snapshot.text.endsWith('See it: https://shop.example/design/priced'), r.snapshot.text.split('\n').slice(-2).join(' | '))
    check('the snapshot carries what to draw, so the back can be shown as it was', JSON.stringify(r.snapshot.render) === JSON.stringify(resolveBack(catalog.back, {}, catalog.bookmarks[0] as never)))
    check('and every category in words, in order', r.snapshot.lines.map((l) => l.label).join() === catalog.back.map((g) => g.label).join())
  }
}
{
  const priced = checkDesign(catalog, input({ query: 'b.line-style=line-style-dotted&s.date-signed-lines=1&b.back-template=back-template-border-frame', expectedTotal: 199 + 20 + 15 + 35 }))
  check('extras are added by the server: 199 + 20 + 15 + 35 = 269', priced.ok && priced.snapshot.price.total === 269 && priced.snapshot.price.extras === 70, JSON.stringify(refused(priced)))
  check('the extras appear beside their choices in the copy', priced.ok && priced.snapshot.text.includes('Line style: Dotted (+₹20)') && priced.snapshot.text.includes('Date and Signed lines: On (+₹15)') && priced.snapshot.text.includes('Price: ₹199 plus ₹70 for the choices = ₹269'))
  const reordered = checkDesign(catalog, input({ query: 's.date-signed-lines=1&b.back-template=back-template-border-frame&b.line-style=line-style-dotted', expectedTotal: 269 }))
  check('the same design with its parts in another order is accepted', reordered.ok)
  const own = checkDesign(catalog, input({ query: 't.heading=for+mum', expectedTotal: 199 }))
  check('own words are accepted and shown in capitals', own.ok && own.snapshot.render.heading === 'FOR MUM' && own.snapshot.text.includes('Heading: FOR MUM (own words)'))
  const signed = checkDesign(catalog, input({ bookmarkId: 'signed', expectedTotal: 249 + 15 }))
  check('a bookmark that prints Date and Signed lines already has that switch on, and it is priced', signed.ok && signed.snapshot.price.total === 264 && signed.snapshot.text.includes('Date and Signed lines: On (+₹15)'))
  const off = checkDesign(catalog, input({ bookmarkId: 'signed', query: 's.date-signed-lines=0', expectedTotal: 249 }))
  check('and switching it off takes the price away', off.ok && off.snapshot.price.total === 249)
}
{
  const r = checkDesign(catalog, input({ bookmarkId: 'made-to-order', expectedTotal: null }))
  check('a made-to-order bookmark is accepted when the visitor was shown "on request"', r.ok && r.snapshot.price.total === undefined && r.snapshot.text.includes('Price: Price on request'))
  const withExtras = checkDesign(catalog, input({ bookmarkId: 'made-to-order', query: 'b.line-style=line-style-dotted', expectedTotal: null }))
  check('and with extras it still has no total, and says so', withExtras.ok && withExtras.snapshot.price.extras === 20 && withExtras.snapshot.text.includes('Price on request, plus ₹20 for the choices'))
  const wrong = refused(checkDesign(catalog, input({ bookmarkId: 'made-to-order', expectedTotal: 199 })))
  check('a total on a made-to-order bookmark is refused as a changed price', wrong?.status === 409 && wrong.error === 'price_changed')
}

// ---------- refused designs ----------
{
  const unknown = refused(checkDesign(catalog, input({ bookmarkId: 'no-such' })))
  check('an unknown bookmark is refused (400)', unknown?.status === 400 && unknown.errors.bookmarkId === 'That bookmark does not exist.')
  const unavailable = refused(checkDesign(catalog, input({ bookmarkId: 'gone', expectedTotal: 99 })))
  check('an unavailable bookmark is refused (400)', unavailable?.status === 400 && /unavailable/.test(unavailable.message))
  const stale = refused(checkDesign(catalog, input({ query: 'b.line-style=line-style-gone' })))
  check('a choice that no longer exists is refused as a changed design (409), never quietly swapped', stale?.status === 409 && stale.error === 'design_changed' && /open the design page again/i.test(stale.message))
  const ghost = refused(checkDesign(catalog, input({ query: 'b.no-such-category=x' })))
  check('a category that no longer exists is refused the same way', ghost?.status === 409 && ghost.error === 'design_changed')
  const priceUp = refused(checkDesign(catalog, input({ query: 'b.line-style=line-style-dotted', expectedTotal: 199 })))
  check('a total that is not the current one is refused (409), so nobody pays a price they did not see', priceUp?.status === 409 && priceUp.error === 'price_changed' && /price of this design has changed/.test(priceUp.message))
  const cheat = refused(checkDesign(catalog, input({ query: 'b.line-style=line-style-dotted&s.date-signed-lines=1', expectedTotal: 100 })))
  check('a lower total sent by the browser is refused, not believed', cheat?.status === 409 && cheat.error === 'price_changed')
  check('a switch value that is not 1 or 0 is refused as changed', refused(checkDesign(catalog, input({ query: 's.date-signed-lines=maybe' })))?.status === 409)
  check('a design repeated with two values is refused, not merged', refused(checkDesign(catalog, input({ query: 'b.line-style=line-style-dotted&b.line-style=line-style-grid', expectedTotal: 219 })))?.status === 409)
  check('a choice set on a switch is refused', refused(checkDesign(catalog, input({ query: 'b.date-signed-lines=x' })))?.status === 409)
  check('"none" on a category that must be chosen is refused', refused(checkDesign(catalog, input({ query: 'b.line-style=' })))?.status === 409)
  check('own words where the category does not allow them are refused', refused(checkDesign(catalog, input({ query: 't.watermark=hello' })))?.status === 409)
  check('a very long own text is refused rather than cut and stored', refused(checkDesign(catalog, input({ query: 't.heading=' + 'x'.repeat(200) })))?.status === 409)
  check('garbage in the address is refused without an error', refused(checkDesign(catalog, input({ query: '%%%&=&&b.=&__proto__=1', expectedTotal: 199 })))?.status === 409)
}

// ---------- reading the order itself ----------
const order = (over: Record<string, unknown> = {}) => { return { name: 'Asha', email: 'a@b.co', requestType: 'back-design', bookmarkId: 'priced', designQuery: 'b.line-style=line-style-dotted', expectedTotal: 219, ...over } }
{
  const ok = parseOrder(order())
  check('a design order carries its design as structured input', ok.ok && ok.order.design?.bookmarkId === 'priced' && ok.order.design.query === 'b.line-style=line-style-dotted' && ok.order.design.expectedTotal === 219)
  check('an empty design address means the starting design', (() => { const r = parseOrder(order({ designQuery: '' })); return r.ok && r.order.design?.query === '' })())
  check('a missing design address also means the starting design', (() => { const { designQuery: _q, ...rest } = order(); const r = parseOrder(rest); return r.ok && r.order.design?.query === '' })())
  check('an expected total of null is accepted, for a price on request', (() => { const r = parseOrder(order({ expectedTotal: null })); return r.ok && r.order.design?.expectedTotal === null })())
  for (const [label, bad] of [['left out', undefined], ['a string', '219'], ['a fraction', 219.5], ['negative', -1], ['an object', {}]] as const) {
    const r = parseOrder({ ...order(), expectedTotal: bad })
    check(`an expected total that is ${label} is refused`, !r.ok && typeof r.errors.expectedTotal === 'string')
  }
  const noBookmark = parseOrder(order({ bookmarkId: '' }))
  check('a design order with no bookmark is refused', !noBookmark.ok && typeof noBookmark.errors.bookmarkId === 'string')
  check('a bookmark name that is not a plain name is refused', !parseOrder(order({ bookmarkId: '../x' })).ok && !parseOrder(order({ bookmarkId: 'A B' })).ok)
  check('a design address over 2,000 characters is refused', !parseOrder(order({ designQuery: 'b.x=' + 'y'.repeat(2100) })).ok)
  const legacy = parseOrder(order({ design: 'Bookmark: Emberwing\nPrice: ₹1', priceTotal: 1, bookmarkTitle: 'Fake' }))
  check('design text, prices and titles sent by the browser are ignored, never stored', legacy.ok && JSON.stringify(legacy.order).indexOf('Fake') === -1 && JSON.stringify(legacy.order).indexOf('Emberwing') === -1)
  const plain = parseOrder({ name: 'Asha', email: 'a@b.co', requestType: 'other', bookmarkId: 'priced', designQuery: 'x', expectedTotal: 5 })
  check('design fields on an ordinary request are ignored', plain.ok && plain.order.design === null)
}
