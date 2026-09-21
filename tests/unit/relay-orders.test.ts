import { check } from '../helpers/check.ts'
// The relay runs in the browser, and it reads window.setTimeout. Node has no window, so it is given one.
;(globalThis as unknown as { window: unknown }).window = globalThis
const { submitViaApi } = await import('../../src/lib/relay/orders.ts')
const { orderFields } = await import('../../src/lib/relay/fields.ts')
const { toPayload, subjectFor } = await import('../../src/lib/orderPayload.ts')
import type { OrderPayload, OrderValues, SubmitResult } from '../../src/types/index.ts'


const realFetch = globalThis.fetch
let sentBody: Record<string, unknown> = {}
let sentUrl = ''
const reply = (status: number, body: unknown, contentType = 'application/json') => async (url: string, init?: RequestInit) => {
  sentUrl = url
  sentBody = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': contentType } })
}
const serve = (handler: (url: string, init?: RequestInit) => Promise<Response>) => { globalThis.fetch = handler as typeof fetch }

const payload = (over: Partial<OrderPayload> = {}): OrderPayload => ({ name: 'Asha', email: 'a@b.co', requestType: 'other', idea: 'hello', ...over })
let fallbackCalls = 0
const fallback = async (p: OrderPayload): Promise<SubmitResult> => { fallbackCalls++; return { ok: true, message: `email:${p.name}` } }
const send = async (p = payload()) => { fallbackCalls = 0; return submitViaApi(p, fallback) }

// ---------- success ----------
serve(reply(201, { ok: true, id: 'abc', number: 1001 }))
{
  const r = await send()
  check('an order the API stored is a success, carrying its number', r.ok && r.number === 1001 && fallbackCalls === 0, JSON.stringify(r))
  check('it goes to the site\'s own /api/orders', sentUrl === '/api/orders')
  check('the body carries the fields as the API reads them, and leaves out what is not set', sentBody.name === 'Asha' && sentBody.requestType === 'other' && sentBody.idea === 'hello' && !('quantity' in sentBody) && !('bookmarkId' in sentBody) && !('captchaToken' in sentBody), JSON.stringify(sentBody))
}
serve(reply(201, { ok: true }))
check('a stored order with no number is still a success', (await send()).ok === true)
serve(reply(201, { ok: true, id: 'abc', number: 1002 }))
{
  await send(payload({ requestType: 'back-design', design: { bookmarkId: 'emberwing-dragon', query: 'b.line-style=line-style-dotted', expectedTotal: 219, text: 'Bookmark: Emberwing\nPrice: ₹219' }, captchaToken: 'tok' }))
  check('a design is sent as the bookmark, the design address and the total shown, and the browser\'s own text is not sent', sentBody.bookmarkId === 'emberwing-dragon' && sentBody.designQuery === 'b.line-style=line-style-dotted' && sentBody.expectedTotal === 219 && !('design' in sentBody) && !JSON.stringify(sentBody).includes('Price: '))
  check('the spam check pass goes along', sentBody.captchaToken === 'tok')
  await send(payload({ requestType: 'back-design', design: { bookmarkId: 'painted-to-order', query: '', expectedTotal: null, text: 'x' } }))
  check('"price on request" is sent as null, and an empty design address stays empty', sentBody.expectedTotal === null && sentBody.designQuery === '')
}

// ---------- refusals the visitor can act on ----------
serve(reply(409, { ok: false, error: 'design_changed', message: 'Some of the choices are gone.' }))
{
  const r = await send()
  check('a design that has changed is reported with the server\'s words, and is not sent by email', r.ok === false && r.reason === 'design-changed' && r.message === 'Some of the choices are gone.' && fallbackCalls === 0)
}
serve(reply(409, { ok: false, error: 'price_changed', message: 'The price changed.' }))
{
  const r = await send()
  check('a price that has changed is reported the same way', r.ok === false && r.reason === 'price-changed' && r.message === 'The price changed.' && fallbackCalls === 0)
}
serve(reply(429, { ok: false, error: 'rate_limited' }))
{
  const r = await send()
  check('a rate limit says so, and suggests trying later', r.ok === false && r.reason === 'rate-limited' && /try again in an hour/.test(r.message ?? '') && fallbackCalls === 0)
}
serve(reply(400, { ok: false, error: 'captcha', errors: { captcha: 'x' } }))
{
  const r = await send()
  check('a failed spam check says so', r.ok === false && r.reason === 'captcha' && /spam check/.test(r.message ?? '') && fallbackCalls === 0)
}
serve(reply(400, { ok: false, error: 'invalid', errors: { name: 'x' } }))
check('any other refusal is a plain failure, with no fallback', (await send()).ok === false && fallbackCalls === 0)
serve(reply(500, { ok: false, error: 'boom' }))
check('a server error is a failure and is not sent again by email', (await send()).ok === false && fallbackCalls === 0)

// ---------- no order API: the email relay takes over ----------
serve(reply(503, { ok: false, error: 'not_configured' }))
{
  const r = await send()
  check('an API that is not set up hands over to the email relay', fallbackCalls === 1 && r.message === 'email:Asha')
}
serve(reply(404, '<html>Not found</html>', 'text/html'))
check('a page instead of the API (a host with no functions) hands over', (await send(), fallbackCalls === 1))
serve(reply(200, '<!doctype html><html></html>', 'text/html'))
check('the site\'s own page instead of the API hands over', (await send(), fallbackCalls === 1))
serve(reply(200, 'not json at all', 'text/plain'))
check('an answer that is not JSON hands over', (await send(), fallbackCalls === 1))
serve(reply(200, [1, 2, 3]))
check('JSON that is not an object hands over', (await send(), fallbackCalls === 1))
serve(reply(503, { ok: false, error: 'something_else' }))
check('a 503 for any other reason is a failure, not a handover', (await send()).ok === false && fallbackCalls === 0)

// ---------- unknown outcomes are never sent twice ----------
serve(async () => { throw new TypeError('network down') })
{
  const r = await send()
  check('a dropped connection is a failure, and the email relay is not tried, so no duplicate can be made', r.ok === false && fallbackCalls === 0)
}
serve(async (_url, init) => new Promise((_resolve, reject) => { init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))) }))
{
  const started = Date.now()
  const r = await send()
  check('a request that never answers ends in a failure after the timeout, with no email fallback', r.ok === false && fallbackCalls === 0 && Date.now() - started < 20000, `${Date.now() - started} ms`)
}
globalThis.fetch = realFetch

// ---------- building the payload, and the email relays ----------
const values = (over: Partial<OrderValues> = {}): OrderValues  => { return { name: ' Asha ', email: ' a@b.co ', requestType: 'other', quantity: '', idea: '  hi  ', referenceLink: '', ...over } }
{
  const p = toPayload(values(), undefined, null)
  check('the payload is trimmed and carries the request type as its value', p.name === 'Asha' && p.email === 'a@b.co' && p.requestType === 'other' && p.idea === 'hi')
  check('the payload has no empty extras', !('quantity' in p) && !('referenceLink' in p) && !('design' in p) && !('captchaToken' in p))
  check('a bulk order carries its quantity as a number', toPayload(values({ requestType: 'bulk', quantity: '250' }), undefined, null).quantity === 250)
  check('a quantity on another request type is dropped', !('quantity' in toPayload(values({ quantity: '250' }), undefined, null)))
  check('a reference link gets https', toPayload(values({ referenceLink: 'example.com/board' }), undefined, null).referenceLink === 'https://example.com/board')
  const design = { bookmarkId: 'x', query: '', expectedTotal: 1, text: 't' }
  check('a design is attached only to a back design request', 'design' in toPayload(values({ requestType: 'back-design' }), design, null) && !('design' in toPayload(values({ requestType: 'other' }), design, null)))
  check('a spam check pass is attached when there is one', toPayload(values(), undefined, 'tok').captchaToken === 'tok')
  check('the label for an email subject is the words, not the value', subjectFor(p) === 'Something else' && subjectFor(toPayload(values({ requestType: 'back-design' }), design, null)) === 'Custom back design')
  const fields = orderFields(toPayload(values({ requestType: 'back-design' }), { ...design, text: 'Bookmark: X\nPrice: ₹1' }, null))
  check('the email relays name the request type by its label and carry the design text', fields.request_type === 'Custom back design' && fields.design === 'Bookmark: X\nPrice: ₹1' && fields.name === 'Asha')
  check('and leave out the design fields on an ordinary request', !('design' in orderFields(p)) && orderFields(p).request_type === 'Something else')
}

// ---------- a server that broke is not "no order API" ----------
serve(reply(500, 'error code: 1101', 'text/plain'))
check('a server error with no JSON in it is a failure, and is not sent again by email (the order may already be stored)', (await send()).ok === false && fallbackCalls === 0)
serve(reply(502, '<html>Bad gateway</html>', 'text/html'))
check('so is a bad gateway page', (await send()).ok === false && fallbackCalls === 0)
serve(reply(404, '<html>Not found</html>', 'text/html'))
check('a 404 page still means there is no order API, so the email relay takes over', (await send()).ok === true && fallbackCalls === 1)
serve(reply(200, '<html>the site</html>', 'text/html'))
check('and so does a host that answers every address with its home page', (await send()).ok === true && fallbackCalls === 1)
