import type { ApiEvent, ApiOrder, OrderCounts } from '../../src/types/orders.ts'
import { buildSite } from '../helpers/build.ts'
import { check } from '../helpers/check.ts'
import { SECRET, startServer } from '../helpers/server.ts'
import { signSession } from '../../functions/_lib/session.ts'

/*
 * The order and dashboard addresses, on Cloudflare's own local runtime and a real local database: taking an order,
 * what is refused, the sender limits, the owner's sign-in and every change the owner can make.
 */
const server = await startServer({
  name: 'api',
  port: 8790,
  site: buildSite('api'),
  bindings: { ADMIN_GITHUB_USERS: 'Tester,second-admin', GITHUB_CLIENT_ID: 'test-client-id', GITHUB_CLIENT_SECRET: 'test-client-secret' },
})
const BASE = server.base

// ---------- helpers ----------
/** What the addresses answer with. A field is only there when the answer has it, and the checks read only what they expect. */
interface Body {
  ok?: boolean
  error?: string
  message?: string
  errors?: Record<string, string>
  id?: string
  number?: number
  login?: string
  orders: ApiOrder[]
  order: ApiOrder
  events: ApiEvent[]
  counts: OrderCounts
  nextCursor: string | null
}
/** A value the test cannot go on without. If it is missing, the test stops there with that said. */
const need = <T>(value: T | null | undefined): T => {
  if (value === null || value === undefined) throw new Error('A value the test expected was missing.')
  return value
}
interface Reply { status: number; headers: Headers; json: Body; text: string }
let sender = 0
const nextSender = () => `203.0.${Math.floor(++sender / 250)}.${(sender % 250) + 1}`

async function call(path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown; raw?: string } = {}): Promise<Reply> {
  const headers: Record<string, string> = { ...init.headers }
  let body: string | undefined = init.raw
  if (init.body !== undefined) {
    body = JSON.stringify(init.body)
    headers['Content-Type'] ??= 'application/json'
  }
  const response = await fetch(BASE + path, { method: init.method ?? 'GET', headers, body, redirect: 'manual' })
  const text = await response.text()
  let json = {} as Body
  try { json = JSON.parse(text) } catch { /* not JSON */ }
  return { status: response.status, headers: response.headers, json, text }
}
const goodOrder = (over: Record<string, unknown> = {}) => ({ name: 'Asha Rao', email: 'asha@example.com', requestType: 'other', idea: 'A set for a wedding', ...over })
const place = (body: unknown, headers: Record<string, string> = {}) => call('/api/orders', { method: 'POST', headers: { 'CF-Connecting-IP': nextSender(), Origin: BASE, ...headers }, body })

const now = Math.floor(Date.now() / 1000)
const cookieFor = async (login: string, at = now) => `atelier_admin=${await signSession(login, SECRET, at)}`
const admin = { Cookie: await cookieFor('tester'), Origin: BASE }
const list = (query = '') => call(`/api/admin/orders${query}`, { headers: admin })

try {
  // ---------- 1. placing orders ----------
  const first = await place(goodOrder())
  check('a valid order is stored and answered with its id and number, 1001 first', first.status === 201 && first.json?.ok === true && first.json?.number === 1001 && /^[0-9a-f-]{36}$/.test(first.json.id ?? ''), first.text.slice(0, 100))
  const second = await place(goodOrder({ name: 'Second Person' }))
  check('the next order is 1002', second.json?.number === 1002)
  check('responses are never cached', first.headers.get('cache-control') === 'no-store')

  const listed = await list()
  check('the owner can see both, newest first, with counts', listed.status === 200 && listed.json.orders.map((o) => o.number).join() === '1002,1001' && listed.json.counts.new === 2 && listed.json.counts.cancelled === 0, JSON.stringify(listed.json?.counts))
  const stored = need(listed.json.orders[1])
  check('the stored order has what was sent, as readable fields, in status "new"', stored.name === 'Asha Rao' && stored.email === 'asha@example.com' && stored.requestType === 'other' && stored.idea === 'A set for a wedding' && stored.status === 'new' && stored.design === null)
  check('nothing about the sender leaks into the order', !/203\.0\.|sender:|CF-Connecting|ipHash/i.test(JSON.stringify(listed.json)))

  // ---------- 2. what is refused ----------
  const refuse = async (label: string, body: unknown, status: number, field?: string) => {
    const r = await place(body)
    check(label, r.status === status && (!field || typeof r.json?.errors?.[field] === 'string'), `${r.status} ${r.text.slice(0, 90)}`)
  }
  await refuse('an empty order lists what is missing', {}, 400, 'name')
  await refuse('a missing email is refused with the form\'s own wording', goodOrder({ email: '' }), 400, 'email')
  await refuse('an email that does not look right', goodOrder({ email: 'nope' }), 400, 'email')
  await refuse('a request type that does not exist', goodOrder({ requestType: 'bogus' }), 400, 'requestType')
  await refuse('a bulk order with a quantity of 0', goodOrder({ requestType: 'bulk', quantity: 0 }), 400, 'quantity')
  await refuse('an idea over 2,000 characters', goodOrder({ idea: 'x'.repeat(2001) }), 400, 'idea')
  await refuse('a name over 100 characters', goodOrder({ name: 'n'.repeat(101) }), 400, 'name')
  await refuse('a name that is not text', goodOrder({ name: 123 }), 400, 'name')
  await refuse('a reference link that is not a web address', goodOrder({ referenceLink: 'not a link' }), 400, 'referenceLink')
  await refuse('a body that is not an object', ['a'], 400)
  await refuse('a back design request with no total says so', goodOrder({ requestType: 'back-design', bookmarkId: 'emberwing-dragon' }), 400, 'expectedTotal')
  await refuse('a back design request with a bad bookmark name', goodOrder({ requestType: 'back-design', bookmarkId: '../etc', expectedTotal: null }), 400, 'bookmarkId')
  check('a body that is not JSON is refused', (await call('/api/orders', { method: 'POST', headers: { 'CF-Connecting-IP': nextSender(), 'Content-Type': 'application/json' }, raw: '{ nope' })).status === 400)
  check('a body with the wrong content type is refused', (await call('/api/orders', { method: 'POST', headers: { 'CF-Connecting-IP': nextSender(), 'Content-Type': 'text/plain' }, raw: '{}' })).status === 415)
  check('a body over 16 KB is refused', (await place(goodOrder({ idea: 'y'.repeat(20000) }))).status === 413)
  check('an order from another website is refused', (await place(goodOrder(), { Origin: 'https://evil.example' })).status === 403)
  check('nothing refused was stored', (await list()).json.orders.length === 2)

  // ---------- 3. what is cleaned, and what is kept exactly ----------
  const tricky = await place(goodOrder({ name: "Robert'); DROP TABLE orders;--", idea: 'line one\nline two\u0007 with a bell', referenceLink: 'example.com/board' }))
  const trickyStored = (await call(`/api/admin/orders/${tricky.json.id}`, { headers: admin })).json.order
  check('text that looks like SQL is stored as plain text, and the table is fine', tricky.status === 201 && trickyStored.name === "Robert'); DROP TABLE orders;--" && (await list()).json.orders.length === 3)
  check('control characters are removed, line breaks kept', trickyStored.idea === 'line one\nline two with a bell', JSON.stringify(trickyStored.idea))
  check('a link without https gets one', trickyStored.referenceLink === 'https://example.com/board', String(trickyStored.referenceLink))
  const unicode = await place(goodOrder({ name: 'अभि Ünïcode 🌼' }))
  check('names in any script are kept', (await call(`/api/admin/orders/${unicode.json.id}`, { headers: admin })).json.order.name === 'अभि Ünïcode 🌼')
  const bulk = await place(goodOrder({ requestType: 'bulk', quantity: '250' }))
  check('a bulk order keeps its quantity as a number', (await call(`/api/admin/orders/${bulk.json.id}`, { headers: admin })).json.order.quantity === 250)
  const plainQty = await place(goodOrder({ quantity: 5 }))
  check('a quantity on a non-bulk order is ignored', (await call(`/api/admin/orders/${plainQty.json.id}`, { headers: admin })).json.order.quantity === null)
  const design = await place(goodOrder({ requestType: 'back-design', bookmarkId: 'emberwing-dragon', designQuery: 't.heading=for+mum&s.date-signed-lines=1', expectedTotal: 199, design: 'Bookmark: FAKE\nPrice: ₹1', priceTotal: 1, bookmarkTitle: 'Fake title' }))
  const designStored = (await call(`/api/admin/orders/${design.json.id}`, { headers: admin })).json.order
  const designText = designStored.design ?? ''
  check('a back design order is stored with the server\'s own copy of the design, not the browser\'s', design.status === 201 && designStored.bookmarkId === 'emberwing-dragon' && designStored.bookmarkTitle === 'Emberwing' && designStored.requestType === 'back-design' && designText.startsWith('Bookmark: Emberwing\n') && !JSON.stringify(designStored).includes('FAKE') && !JSON.stringify(designStored).includes('Fake title'), String(designText).slice(0, 60))
  const dropped = await place(goodOrder({ design: 'should be dropped', bookmarkId: 'x' }))
  const droppedStored = (await call(`/api/admin/orders/${dropped.json.id}`, { headers: admin })).json.order
  check('a design sent with another kind of request is dropped', droppedStored.design === null && droppedStored.bookmarkId === null)

  // ---------- 3b. design orders: the server rebuilds and prices the design itself ----------
  check('the stored design text names the choices in words and the price', designText.includes('Heading: FOR MUM (own words)') && designText.includes('Date and Signed lines: On') && designText.includes('Price: ₹199'), designText.split('\n').slice(-3).join(' | '))
  check('its link uses the site\'s address from the catalog, and carries the design', /See it: https:\/\/[a-z0-9.-]+\/design\/emberwing-dragon\?/.test(designText) && designText.includes('t.heading=for+mum'))
  check('the total is stored as a number, and the browser\'s own figure is ignored', designStored.priceTotal === 199)
  const snapshot = need(designStored.designSnapshot)
  check('a snapshot is stored: version, bookmark, choices, each category in words, the price, and what to draw', snapshot?.version === 1 && snapshot.bookmarkId === 'emberwing-dragon' && snapshot.choices?.heading?.text === 'for mum' && Array.isArray(snapshot.lines) && snapshot.lines.length === 7 && snapshot.price?.total === 199 && snapshot.render?.heading === 'FOR MUM', JSON.stringify(snapshot)?.slice(0, 100))
  check('the snapshot can draw the back by itself: the lines, the signature area and the heading', snapshot.render.lines.type === 'ruled' && snapshot.render.signature.some((piece) => piece.kind === 'signature-lines') && snapshot.render.background === undefined)
  const made = await place(goodOrder({ requestType: 'back-design', bookmarkId: 'painted-to-order', designQuery: '', expectedTotal: null }))
  const madeStored = (await call(`/api/admin/orders/${made.json.id}`, { headers: admin })).json.order
  check('a made-to-order bookmark is accepted at "price on request", and stored with no total', made.status === 201 && madeStored.priceTotal === null && (madeStored.design ?? '').includes('Price: Price on request'))
  const before3b = (await list('?limit=100')).json.orders.length
  const turnedAway = async (label: string, over: Record<string, unknown>, status: number, error: string) => {
    const r = await place(goodOrder({ requestType: 'back-design', bookmarkId: 'emberwing-dragon', designQuery: '', expectedTotal: 199, ...over }))
    check(label, r.status === status && r.json?.error === error && typeof r.json?.message === 'string', `${r.status} ${r.text.slice(0, 110)}`)
  }
  await turnedAway('a choice that no longer exists is refused with 409 and words to show', { designQuery: 'b.line-style=line-style-gone' }, 409, 'design_changed')
  await turnedAway('a category that does not exist is refused with 409', { designQuery: 'b.made-up=1' }, 409, 'design_changed')
  await turnedAway('a total the browser invented is refused with 409', { expectedTotal: 1 }, 409, 'price_changed')
  await turnedAway('a total on a made-to-order bookmark is refused with 409', { bookmarkId: 'painted-to-order', expectedTotal: 199 }, 409, 'price_changed')
  await turnedAway('a bookmark that does not exist is refused with 400', { bookmarkId: 'no-such-bookmark' }, 400, 'invalid')
  await turnedAway('a bookmark that is unavailable is refused with 400', { bookmarkId: 'frostwing-dragon', expectedTotal: 199 }, 400, 'invalid')
  check('nothing turned away was stored', (await list('?limit=100')).json.orders.length === before3b)
  const listedWithDesign = (await list('?limit=100')).json.orders.find((o) => o.id === design.json.id)
  check('the order list carries the design summary too, for the dashboard', listedWithDesign?.bookmarkTitle === 'Emberwing' && listedWithDesign.priceTotal === 199 && listedWithDesign.designSnapshot?.version === 1)
  const plainListed = need((await list('?limit=100')).json.orders.find((o) => o.number === 1001))
  check('and an ordinary order shows no design, title or total', plainListed.bookmarkTitle === null && plainListed.priceTotal === null && plainListed.designSnapshot === null)

  // ---------- 4. spam controls ----------
  const before = (await list()).json.orders.length
  const bot = await place(goodOrder({ website_url: 'http://spam.example' }))
  check('a bot that fills the hidden field is told it worked, and nothing is stored', bot.status === 201 && bot.json?.ok === true && bot.json?.id === undefined && (await list()).json.orders.length === before)
  const same = nextSender()
  const statuses: number[] = []
  for (let i = 0; i < 6; i++) statuses.push((await call('/api/orders', { method: 'POST', headers: { 'CF-Connecting-IP': same, Origin: BASE }, body: goodOrder() })).status)
  check('one sender gets 5 orders an hour, then is slowed down', statuses.join() === '201,201,201,201,201,429', statuses.join())
  const slowed = await call('/api/orders', { method: 'POST', headers: { 'CF-Connecting-IP': same, Origin: BASE }, body: goodOrder() })
  check('the slow-down says when to try again', slowed.status === 429 && slowed.headers.get('retry-after') === '3600' && slowed.json?.error === 'rate_limited')
  check('a different sender is not affected', (await place(goodOrder())).status === 201)

  // ---------- 5. the dashboard is closed to everyone but the owner ----------
  const id = need(first.json.id)
  const closed = async (label: string, headers: Record<string, string>, expected = 401) => {
    const checks = await Promise.all([
      call('/api/admin/orders', { headers }),
      call(`/api/admin/orders/${id}`, { headers }),
      call(`/api/admin/orders/${id}`, { method: 'PATCH', headers: { ...headers, Origin: BASE }, body: { status: 'confirmed' } }),
      call(`/api/admin/orders/${id}`, { method: 'DELETE', headers: { ...headers, Origin: BASE } }),
    ])
    check(label, checks.every((r) => r.status === expected), checks.map((r) => r.status).join())
  }
  await closed('no cookie: every admin route says sign in', {})
  await closed('a made-up cookie is refused', { Cookie: 'atelier_admin=abc.def' })
  await closed('a cookie signed with the wrong secret is refused', { Cookie: `atelier_admin=${await signSession('tester', 'some-other-secret-that-is-long-enough-0123', now)}` })
  await closed('a cookie that has expired is refused', { Cookie: await cookieFor('tester', now - 8 * 24 * 3600) })
  await closed('a genuine cookie for someone not on the list is refused', { Cookie: await cookieFor('stranger') })
  const tampered = (await cookieFor('tester')).replace(/^(atelier_admin=)([^.]+)/, (_m, a, b) => a + Buffer.from(JSON.stringify({ l: 'stranger', e: now + 99999 })).toString('base64url') + ('.' + b).slice(0, 0))
  await closed('a cookie whose name was changed after signing is refused', { Cookie: tampered })
  check('the list is open to a name written in different capitals, which is how GitHub names behave', (await call('/api/admin/orders', { headers: { Cookie: await cookieFor('TESTER') } })).status === 200 && (await call('/api/admin/orders', { headers: { Cookie: await cookieFor('Second-Admin') } })).status === 200)
  check('the session route says who is signed in', (await call('/api/admin/session', { headers: admin })).json?.login === 'tester' && (await call('/api/admin/session')).status === 401)

  // ---------- 6. reading orders ----------
  const all = (await list('?limit=100')).json
  const total = all.orders.length
  check('counts add up to the number of orders', Object.values<number>(all.counts).reduce((a, b) => a + b, 0) === total)
  const page1 = (await list('?limit=3')).json
  const page2 = (await list(`?limit=3&cursor=${encodeURIComponent(page1.nextCursor ?? '')}`)).json
  check('pages of three, each carrying a cursor to the next', page1.orders.length === 3 && page1.nextCursor !== null && page2.orders.length === 3 && (page2.orders[0]?.number ?? 0) < (page1.orders[2]?.number ?? 0), `${page1.orders.map((o) => o.number)} then ${page2.orders.map((o) => o.number)}`)
  const walked: number[] = []
  let cursor = ''
  for (let i = 0; i < 40; i++) {
    const p = (await list(`?limit=4${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)).json
    walked.push(...p.orders.map((o) => o.number))
    if (!p.nextCursor) break
    cursor = p.nextCursor
  }
  check('walking every page finds each order exactly once, newest to oldest', walked.length === total && new Set(walked).size === total && walked.every((n, i) => i === 0 || n < (walked[i - 1] ?? Infinity)), `${walked.length} of ${total}`)
  check('a search finds by name', (await list('?q=Second')).json.orders.length === 1)
  check('a search finds by email', (await list('?q=asha@example')).json.orders.length >= 3)
  check('a search finds by order number', (await list('?q=1002')).json.orders[0]?.number === 1002)
  check('a search finds by bookmark', (await list('?q=emberwing')).json.orders.length === 1)
  check('a search for a percent sign matches only a percent sign', (await list('?q=%25')).json.orders.length === 0 && (await list('?q=_')).json.orders.length === 0)
  check('a search for quote marks and SQL is harmless', (await list("?q=';DROP TABLE orders;--")).status === 200)
  check('a bad status filter is refused', (await list('?status=bogus')).status === 400)
  check('a bad limit is refused', (await list('?limit=0')).status === 400 && (await list('?limit=101')).status === 400 && (await list('?limit=abc')).status === 400)

  // ---------- 7. changing an order ----------
  const patch = (orderId: string, body: unknown, headers: Record<string, string> = admin) => call(`/api/admin/orders/${orderId}`, { method: 'PATCH', headers, body })
  const changed = await patch(need(id), { status: 'confirmed' })
  check('a status change is saved and shown', changed.status === 200 && changed.json.order.status === 'confirmed')
  const step = need(changed.json.events.at(-1))
  check('the history records who, from and to', step.kind === 'status' && step.from === 'new' && step.to === 'confirmed' && step.by === 'tester', JSON.stringify(step))
  check('the first event is when the order arrived', changed.json.events[0]?.kind === 'created')
  const again = await patch(id, { status: 'confirmed' })
  check('setting the same status again adds nothing to the history', again.json.events.length === changed.json.events.length)
  const noted = await patch(id, { note: '  Paid by UPI, ref 4471  ' })
  check('a note is saved, tidied, and attributed', noted.status === 200 && noted.json.events.at(-1)?.kind === 'note' && noted.json.events.at(-1)?.note === 'Paid by UPI, ref 4471' && noted.json.events.at(-1)?.by === 'tester')
  const both = await patch(id, { status: 'in-production', note: 'Started printing' })
  check('a status and a note together make two events', both.json.events.slice(-2).map((e) => e.kind).join() === 'status,note' && both.json.order.status === 'in-production')
  check('the counts follow the change', (await list()).json.counts['in-production'] === 1)
  const filtered = (await list('?status=in-production')).json
  check('filtering by status finds it', filtered.orders.length === 1 && filtered.orders[0]?.id === id)
  check('the updated time moves on', both.json.order.updatedAt > stored.updatedAt)
  const badPatch = async (label: string, body: unknown, expected = 400) => check(label, (await patch(id, body)).status === expected)
  await badPatch('a status that does not exist is refused', { status: 'lost' })
  await badPatch('an empty change is refused', {})
  await badPatch('an empty note is refused', { note: '   ' })
  await badPatch('a note that is not text is refused', { note: 5 })
  await badPatch('a note over 2,000 characters is refused', { note: 'n'.repeat(2001) })
  await badPatch('a field that cannot be changed is refused (the customer\'s name)', { name: 'Someone else' })
  check('a change from another website is refused', (await patch(id, { status: 'shipped' }, { ...admin, Origin: 'https://evil.example' })).status === 403)
  check('a change with no Origin at all is refused', (await patch(id, { status: 'shipped' }, { Cookie: admin.Cookie })).status === 403)
  check('the refused changes changed nothing', (await call(`/api/admin/orders/${id}`, { headers: admin })).json.order.status === 'in-production')
  check('an order that is not there is a 404', (await patch('00000000-0000-4000-8000-000000000000', { status: 'shipped' })).status === 404 && (await call('/api/admin/orders/not-an-id', { headers: admin })).status === 404)

  // ---------- 8. deleting ----------
  const gone = await call(`/api/admin/orders/${id}`, { method: 'DELETE', headers: admin })
  check('an order can be deleted for good', gone.status === 200 && (await call(`/api/admin/orders/${id}`, { headers: admin })).status === 404)
  check('deleting again is a 404', (await call(`/api/admin/orders/${id}`, { method: 'DELETE', headers: admin })).status === 404)
  check('a delete from another website is refused', (await call(`/api/admin/orders/${second.json.id}`, { method: 'DELETE', headers: { Cookie: admin.Cookie, Origin: 'https://evil.example' } })).status === 403)
  check('and the other orders are still there', (await list()).json.orders.length === total - 1)

  // ---------- 9. method guards, sign-in start and sign-out ----------
  const wrong = await call('/api/orders')
  check('reading /api/orders is refused and says what is allowed', wrong.status === 405 && wrong.headers.get('allow') === 'POST')
  check('other methods on the list and on an order are refused', (await call('/api/admin/orders', { method: 'POST', headers: { ...admin } })).status === 405 && (await call(`/api/admin/orders/${second.json.id}`, { method: 'PUT', headers: { ...admin } })).status === 405)
  const login = await call('/api/admin/login')
  const target = new URL(login.headers.get('location') ?? 'http://none/')
  check('sign-in sends the visitor to GitHub asking for no permissions at all', login.status === 302 && target.hostname === 'github.com' && target.searchParams.get('scope') === null && target.searchParams.get('client_id') === 'test-client-id' && target.searchParams.get('redirect_uri') === `${BASE}/api/callback`)
  const cookies = login.headers.getSetCookie()
  const state = target.searchParams.get('state') ?? ''
  check('and remembers the state and that it is the dashboard, in cookies scripts cannot read', cookies.some((c) => c.startsWith(`oauth_state=${state}`) && /HttpOnly/i.test(c) && /Secure/i.test(c) && /SameSite=Lax/i.test(c)) && cookies.some((c) => c.startsWith('oauth_mode=admin')))
  const badReturn = await call('/api/callback?code=abc&state=wrong', { headers: { Cookie: `oauth_state=${state}; oauth_mode=admin` } })
  check('coming back with the wrong state is refused, and no session is given', badReturn.status === 400 && !badReturn.headers.getSetCookie().some((c) => c.startsWith('atelier_admin=') && !/Max-Age=0/.test(c)))
  const lost = await call('/api/callback?code=abc', { headers: { Cookie: `oauth_mode=admin` } })
  check('coming back with no state cookie is refused', lost.status === 400)
  const out = await call('/api/admin/logout', { method: 'POST', headers: { Origin: BASE } })
  check('signing out clears the cookie', out.status === 200 && out.headers.getSetCookie().some((c) => c.startsWith('atelier_admin=;') && /Max-Age=0/.test(c)))
  check('signing out from another website is refused', (await call('/api/admin/logout', { method: 'POST', headers: { Origin: 'https://evil.example' } })).status === 403)

  // ---------- 10. the overall limit ----------
  let accepted = (await list('?limit=100')).json.orders.length
  let firstRefusal = 0
  for (let i = 0; i < 130 && !firstRefusal; i++) {
    const r = await place(goodOrder({ name: `Flood ${i}` }))
    if (r.status === 429) firstRefusal = accepted
    else accepted++
  }
  const overall = (await call('/api/admin/orders?limit=100', { headers: admin })).json
  check('the whole site stops taking orders after 100 in an hour, whoever sends them', firstRefusal > 0, `first refusal after ${firstRefusal} orders`)
  check('and it never stored more than it accepted', overall.orders.length <= 100 + 1)

  // ---------- 11. the database itself refuses a status that is not on the list ----------
  const refused = await server.offline(() => {
    try {
      server.sql("UPDATE orders SET status = 'bogus'")
      return false
    } catch {
      return true
    }
  })
  check('the database itself refuses a made-up status', refused)
} finally {
  server.stop()
}
