import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from 'playwright-core'
import { launchBrowser } from '../helpers/browser.ts'
import { buildSite } from '../helpers/build.ts'
import { check } from '../helpers/check.ts'
import { ROOT, scratch } from '../helpers/paths.ts'
import { startServer } from '../helpers/server.ts'

/*
 * Counting design page visits and the Insights page: what the visit address accepts and refuses, the numbers the owner
 * reads, the design page in a real browser (what is sent, and when), the Insights screen itself, and the limits that
 * keep counting from getting in the way of taking an order.
 */
const AXE = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8')
const SHOTS = scratch('insights-shots')
mkdirSync(SHOTS, { recursive: true })
const server = await startServer({ name: 'insights', port: 8793, site: buildSite('insights') })
const BASE = server.base
const DASH = `${BASE}/admin/dashboard/`
const { offline, sql } = server

const everything = (): string => JSON.stringify(['design_visits', 'option_picks', 'rate_events', 'orders'].map((table) => sql(`SELECT * FROM ${table}`)))

const cookieValue = server.cookie.split('=')[1] ?? ''
const owner = { Cookie: `atelier_admin=${cookieValue}` }
let sender = 0
const nextIp = () => `203.0.${Math.floor(++sender / 250)}.${(sender % 250) + 1}`
const visit = (body: unknown, headers: Record<string, string> = {}, raw?: string) =>
  fetch(`${BASE}/api/visits`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE, 'CF-Connecting-IP': nextIp(), ...headers }, body: raw ?? JSON.stringify(body) })
const order = async (body: Record<string, unknown>) => (await fetch(`${BASE}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': nextIp() }, body: JSON.stringify({ name: 'Asha', email: 'asha@example.com', requestType: 'other', ...body }) })).status
type Insights = { days: number; since: string; bookmark: string | null; totals: { visits: number; requests: number; orders: number }; choices: { id: string; title: string }[]; bookmarks: { id: string; title: string; visits: number; requests: number }[]; groups: { slug: string; label: string; options: { key: string; label: string; picks: number; requested: number }[] }[] }
const insights = async (query = ''): Promise<Insights> => ((await (await fetch(`${BASE}/api/admin/insights${query}`, { headers: owner })).json()) as { insights: Insights }).insights
const pick = (data: Insights, group: string, key: string) => data.groups.find((g) => g.slug === group)?.options.find((o) => o.key === key)
const EMBER = 'emberwing-dragon'

// ---------- 1. what the visit address accepts and refuses ----------
check('a visit is accepted with no body back', (await visit({ bookmarkId: EMBER, query: 'b.back-template=back-template-pressed-leaves&b.line-style=line-style-dotted&t.heading=SECRETWORDS&s.date-signed-lines=1&b.watermark=watermark-moon' })).status === 204)
check('a second, with a starting-value design and a "none"', (await visit({ bookmarkId: EMBER, query: 'b.line-style=line-style-dotted&b.watermark=' })).status === 204)
check('a visit with no changes at all is counted', (await visit({ bookmarkId: 'misted-castle', query: '' })).status === 204)
check('a design full of nonsense is counted as a visit, with no choices', (await visit({ bookmarkId: EMBER, query: 'b.line-style=nope&b.bogus=x&s.line-style=1&t.watermark=zzz&t.line-style=words' })).status === 204)
check('an unavailable bookmark can be visited too', (await visit({ bookmarkId: 'frostwing-dragon', query: '' })).status === 204)
const refuse = async (label: string, promise: Promise<Response>, status: number) => { const r = await promise; check(label, r.status === status, `${r.status}`) }
await refuse('a bookmark that does not exist is refused', visit({ bookmarkId: 'nope', query: '' }), 400)
await refuse('a bookmark name that is not text is refused', visit({ bookmarkId: 5, query: '' }), 400)
await refuse('a missing design is refused', visit({ bookmarkId: EMBER }), 400)
await refuse('a design over 2,000 characters is refused', visit({ bookmarkId: EMBER, query: 'a'.repeat(2001) }), 400)
await refuse('a body that is not an object is refused', visit(['a']), 400)
await refuse('a body that is not JSON is refused', visit(null, {}, 'nope'), 400)
await refuse('a body of the wrong type is refused', visit(null, { 'Content-Type': 'text/plain' }, '{}'), 415)
await refuse('a request from another site is refused', visit({ bookmarkId: EMBER, query: '' }, { Origin: 'https://evil.example' }), 403)
{
  const noOrigin = await fetch(`${BASE}/api/visits`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookmarkId: EMBER, query: '' }) })
  check('so is one with no Origin at all (a tool, not one of the site\'s pages)', noOrigin.status === 403)
  check('only POST is allowed', (await fetch(`${BASE}/api/visits`)).status === 405)
}

// ---------- 2. the numbers the owner reads ----------
check('the owner\'s insights are closed to anyone else', (await fetch(`${BASE}/api/admin/insights`)).status === 401)
for (const bad of ['?days=0', '?days=91', '?days=abc', '?days=1.5', '?bookmark=../etc', '?bookmark=a%20b']) check(`a bad question is refused: ${bad}`, (await fetch(`${BASE}/api/admin/insights${bad}`, { headers: owner })).status === 400)
let all = await insights()
check('five visits are counted (the refused ones are not)', all.totals.visits === 5 && all.totals.requests === 0 && all.totals.orders === 0, JSON.stringify(all.totals))
check('the visits are per bookmark, most visited first', all.bookmarks[0]?.id === EMBER && all.bookmarks[0].visits === 3 && all.bookmarks.find((b) => b.id === 'misted-castle')?.visits === 1 && all.bookmarks.find((b) => b.id === 'frostwing-dragon')?.visits === 1)
check('every available bookmark is listed, even with no visits', all.bookmarks.some((b) => b.id === 'lantern-forest' && b.visits === 0))
check('a picked line style is counted for each visit that picked it', pick(all, 'line-style', 'line-style-dotted')?.picks === 2 && pick(all, 'line-style', 'line-style-ruled')?.picks === 0)
check('a picked picture, a switch, a signature-less "none" and own words are counted', pick(all, 'back-template', 'back-template-pressed-leaves')?.picks === 1 && pick(all, 'date-signed-lines', 'on')?.picks === 1 && pick(all, 'watermark', 'none')?.picks === 1 && pick(all, 'watermark', 'watermark-moon')?.picks === 1 && pick(all, 'heading', 'own-words')?.picks === 1)
check('the nonsense design added no choices at all', all.groups.every((g) => g.options.every((o) => o.key !== 'nope')) && pick(all, 'line-style', 'line-style-dotted')?.picks === 2 && pick(all, 'date-signed-lines', 'off')?.picks === 0)
check('a category that does not offer "none" does not list it, and a switch lists on and off', pick(all, 'line-style', 'none') === undefined && pick(all, 'date-signed-lines', 'on') !== undefined && pick(all, 'date-signed-lines', 'off') !== undefined && pick(all, 'watermark', 'none') !== undefined)
{
  const dump = await offline(() => ({ all: everything(), counts: JSON.stringify([sql('SELECT * FROM design_visits'), sql('SELECT * FROM option_picks')]) }))
  check('the words typed are nowhere in the database', !/SECRETWORDS|zzz|"words"/i.test(dump.all))
  check('and no address, cookie or per-visit identity sits beside a count', !/203\.0\.|127\.0\.0\.1|atelier_admin/.test(dump.counts))
}

// design requests, through the real order address
check('a back design request is accepted', (await order({ requestType: 'back-design', bookmarkId: EMBER, designQuery: 'b.line-style=line-style-dotted&t.heading=for+mum', expectedTotal: 199 })) === 201 && (await order({ requestType: 'back-design', bookmarkId: EMBER, designQuery: 'b.line-style=line-style-grid&s.date-signed-lines=1', expectedTotal: 199 })) === 201 && (await order({ idea: 'plain' })) === 201)
all = await insights()
check('requests are counted apart from all orders', all.totals.requests === 2 && all.totals.orders === 3 && all.bookmarks[0]?.requests === 2)
check('what was chosen on purpose in the requests is counted, apart from what visitors picked', pick(all, 'line-style', 'line-style-dotted')?.requested === 1 && pick(all, 'line-style', 'line-style-grid')?.requested === 1 && pick(all, 'heading', 'own-words')?.requested === 1 && pick(all, 'date-signed-lines', 'on')?.requested === 1 && pick(all, 'line-style', 'line-style-dotted')?.picks === 2)
const one = await insights(`?bookmark=misted-castle`)
check('one bookmark narrows everything to it', one.bookmark === 'misted-castle' && one.totals.visits === 1 && one.totals.requests === 0 && one.totals.orders === 0 && one.bookmarks.length === 1 && pick(one, 'line-style', 'line-style-dotted')?.picks === 0 && one.choices.length === all.choices.length)
const ember = await insights(`?bookmark=${EMBER}`)
check('and for a busy one, its own', ember.totals.visits === 3 && ember.totals.requests === 2 && ember.totals.orders === 2 && pick(ember, 'line-style', 'line-style-dotted')?.picks === 2)

// data the catalog no longer knows
await offline(() => {
  sql(`INSERT INTO option_picks VALUES (date('now'), '${EMBER}', 'line-style', 'line-style-old', 4)`)
  sql(`INSERT INTO option_picks VALUES (date('now'), '${EMBER}', 'ghost-group', 'x', 9)`)
  sql(`INSERT INTO design_visits VALUES (date('now'), 'gone-bookmark', 2)`)
  sql(`INSERT INTO design_visits VALUES ('2020-01-01', '${EMBER}', 500)`)
})
all = await insights()
check('a choice that has since been removed still shows, marked as removed', pick(all, 'line-style', 'line-style-old')?.picks === 4 && /removed/.test(pick(all, 'line-style', 'line-style-old')?.label ?? ''))
check('a category that no longer exists is left out, and a removed bookmark is shown as removed', all.groups.every((g) => g.slug !== 'ghost-group') && all.bookmarks.some((b) => b.id === 'gone-bookmark' && /removed/.test(b.title) && b.visits === 2))
check('days outside the period are not counted', all.totals.visits === 7, `${all.totals.visits}`)

await import('node:timers/promises').then((t) => t.setTimeout(0))

// ---------- 3. the design page, in a real browser, as a visitor ----------
const browser = await launchBrowser()
const errors: string[] = []
const beacons: { url: string; body: string }[] = []
const watch = (page: Page) => {
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && !/fetchPriority/.test(m.text()) && !(/Failed to load resource/.test(m.text()) && m.location().url.startsWith(BASE + '/api/admin/')) && errors.push(`${m.text()} @ ${m.location().url}`))
  page.on('request', (r) => r.method() === 'POST' && r.url().endsWith('/api/visits') && beacons.push({ url: r.url(), body: r.postData() ?? '' }))
}
/** What the page itself handed to sendBeacon. Playwright cannot read a beacon's body while a page is being left. */
const bodies: string[] = []
const visitor = async (init?: () => void) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' })
  await ctx.exposeFunction('recordBeacon', (text: string) => { bodies.push(text) })
  await ctx.addInitScript(() => {
    const original = navigator.sendBeacon.bind(navigator)
    navigator.sendBeacon = (url, data) => {
      if (data instanceof Blob) void data.text().then((text) => (window as unknown as { recordBeacon: (t: string) => void }).recordBeacon(text))
      return original(url, data)
    }
  })
  if (init) await ctx.addInitScript(init)
  const page = await ctx.newPage()
  watch(page)
  return page
}
const click = (p: Page, name: string) => p.getByLabel(name, { exact: true }).click({ force: true })
const settle = () => new Promise((resolve) => setTimeout(resolve, 700))

{
  const before = await insights()
  const page = await visitor()
  beacons.length = 0; bodies.length = 0
  await page.goto(`${BASE}/design/${EMBER}`)
  await page.locator('h1').waitFor()
  await click(page, 'Dotted')
  await page.locator('input[name="own-heading"]').fill('MY PRIVATE WORDS')
  await page.locator('input[type=checkbox]').check()
  check('nothing is sent while the visitor is still on the page', beacons.length === 0)
  await page.getByRole('link', { name: 'Collection' }).first().click()
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  await settle()
  check('leaving the page sends one message', beacons.length === 1, `${beacons.length}`)
  const sent = JSON.parse(bodies[0] ?? '{}') as { bookmarkId?: string; query?: string }
  check('it names the bookmark and the choices, and stands a letter in for the words', sent.bookmarkId === EMBER && (sent.query ?? '').includes('b.line-style=line-style-dotted') && (sent.query ?? '').includes('s.date-signed-lines=1') && (sent.query ?? '').includes('t.heading=x'), sent.query)
  check('the words the visitor typed never left the page', bodies.length === 1 && !/PRIVATE|WORDS/i.test(bodies[0] ?? ''))
  const after = await insights()
  check('the count went up by one visit and by exactly those choices', after.totals.visits === before.totals.visits + 1 && (pick(after, 'line-style', 'line-style-dotted')?.picks ?? 0) === (pick(before, 'line-style', 'line-style-dotted')?.picks ?? 0) + 1 && (pick(after, 'date-signed-lines', 'on')?.picks ?? 0) === (pick(before, 'date-signed-lines', 'on')?.picks ?? 0) + 1 && (pick(after, 'heading', 'own-words')?.picks ?? 0) === (pick(before, 'heading', 'own-words')?.picks ?? 0) + 1)
  await page.context().close()
}
{
  const page = await visitor()
  beacons.length = 0; bodies.length = 0
  await page.goto(`${BASE}/design/${EMBER}`)
  await click(page, 'Grid')
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await settle()
  check('switching away from the tab sends the visit', beacons.length === 1 && /line-style-grid/.test(bodies[0] ?? ''), `${beacons.length}`)
  await page.goto(`${BASE}/collection`)
  await settle()
  check('and leaving after that does not count it a second time', beacons.length === 1, `${beacons.length}`)
  await page.context().close()
}
{
  const page = await visitor()
  beacons.length = 0; bodies.length = 0
  await page.goto(`${BASE}/design/frostwing-dragon`)
  await page.locator('h1').waitFor()
  await page.goto(`${BASE}/`)
  await settle()
  const frost = (data: Insights) => data.bookmarks.find((b) => b.id === 'frostwing-dragon')?.visits ?? 0
  check('a full page load away from a design page (not just a link inside the site) counts it too, even with no changes', frost(await insights()) === 2, `${frost(await insights())} counted`)
  await page.context().close()
}
for (const [name, init] of [['Do Not Track', () => Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' })], ['Global Privacy Control', () => Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true })]] as const) {
  const page = await visitor(init)
  beacons.length = 0; bodies.length = 0
  await page.goto(`${BASE}/design/${EMBER}`)
  await click(page, 'Grid')
  await page.goto(`${BASE}/collection`)
  await settle()
  check(`a visitor who has set ${name} is not counted at all`, beacons.length === 0, `${beacons.length}`)
  await page.context().close()
}
{
  const page = await visitor()
  beacons.length = 0; bodies.length = 0
  await page.goto(`${BASE}/collection`)
  await page.goto(`${BASE}/custom`)
  await settle()
  check('other pages send nothing', beacons.length === 0)
  await page.context().close()
}
const afterBrowser = await insights()
check('the browser visits show in the numbers: 4 more than the 7 before (dotted visit, grid visit, frostwing, and the gone one already there)', afterBrowser.totals.visits >= 10, `${afterBrowser.totals.visits}`)

// ---------- 4. the Insights screen ----------
const owned = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
await owned.addCookies([{ name: 'atelier_admin', value: cookieValue, domain: '127.0.0.1', path: '/api/admin', httpOnly: true }])
const page = await owned.newPage()
watch(page)
await page.goto(DASH)
await page.getByRole('heading', { name: 'Orders', level: 1 }).waitFor()
check('the two sections are linked, Orders current', (await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Orders' }).getAttribute('aria-current')) === 'page')
await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Insights' }).click()
await page.getByRole('heading', { name: 'Insights', level: 1 }).waitFor()
check('opening Insights gives it an address, marks it current and moves focus to its heading', page.url().endsWith('#/insights') && (await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Insights' }).getAttribute('aria-current')) === 'page' && (await page.evaluate(() => document.activeElement?.id)) === 'insights-heading')
await page.locator('dl dd').first().waitFor()
await page.waitForFunction(() => !/Loading/.test(document.querySelector('[role=status]')?.textContent ?? ''))
const numbersOn = async (p: Page) => p.locator('dl dd').allInnerTexts()
const shown = await numbersOn(page)
check('the totals are shown: visits, design requests, all orders', shown.length === 3 && Number(shown[0]) === afterBrowser.totals.visits && Number(shown[1]) === 2 && Number(shown[2]) === 3, shown.join(','))
check('it says what is counted and what is not', /never kept/.test(await page.locator('main').innerText()) && /Cloudflare Web Analytics/.test(await page.locator('main').innerText()))
check('the period buttons show 30 days in force', (await page.getByRole('button', { name: 'Last 30 days' }).getAttribute('aria-pressed')) === 'true' && (await page.getByRole('button', { name: 'Last 7 days' }).getAttribute('aria-pressed')) === 'false')
const lineTable = page.locator('table', { has: page.locator('caption', { hasText: /^Line style$/ }) })
const rowsOf = (t: ReturnType<Page['locator']>) => t.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('th,td')].map((c) => (c.textContent ?? '').trim())))
const lineRows = await rowsOf(lineTable)
check('each category has a table of its choices, most picked first, with the counts as text', lineRows.length >= 6 && lineRows.every((r) => r.length === 3) && lineRows.every((r, i) => i === 0 || Number(lineRows[i - 1]?.[1]) >= Number(r[1])) && lineRows.some((r) => r[0]?.startsWith('Dotted') && Number(r[1]) >= 3), JSON.stringify(lineRows.slice(0, 3)))
check('the bookmark table lists visits and requests', /Emberwing/.test(await page.locator('table', { has: page.locator('caption', { hasText: 'Bookmarks' }) }).innerText()))
check('the removed choice is shown as removed', lineRows.some((r) => /removed/.test(r[0] ?? '') && Number(r[1]) === 4))
await page.getByRole('button', { name: 'Last 7 days' }).click()
await page.getByText(/^Counting from/).waitFor()
check('changing the period asks again and marks the new one', (await page.getByRole('button', { name: 'Last 7 days' }).getAttribute('aria-pressed')) === 'true' && (await page.getByRole('button', { name: 'Last 30 days' }).getAttribute('aria-pressed')) === 'false')
await page.getByLabel('Bookmark').selectOption('lantern-forest')
await page.getByText('Nothing has been counted for this period yet.').waitFor()
const none = await numbersOn(page)
check('a bookmark with no data says so, and shows zeros', none.join(',') === '0,0,0', none.join(','))
check('the bookmark list still offers every bookmark after choosing one', (await page.getByLabel('Bookmark').locator('option').count()) === all.choices.length + 1)
await page.getByLabel('Bookmark').selectOption(EMBER)
await page.waitForFunction(() => Number(document.querySelectorAll('dl dd')[1]?.textContent) === 2)
check('choosing Emberwing narrows it to Emberwing', (await numbersOn(page))[1] === '2')
await page.getByLabel('Bookmark').selectOption('')
await page.screenshot({ path: `${SHOTS}/insights-1280.png`, fullPage: true })

// -- back to Orders: the list is where it was
await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Orders' }).click()
await page.getByRole('heading', { name: 'Orders', level: 1 }).waitFor()
check('back to Orders shows the list, with focus on its heading', (await page.locator('ul[aria-label="Orders"] > li').count()) === 3 && (await page.evaluate(() => document.activeElement?.id)) === 'orders-heading')

// -- sizes, keyboard and axe
for (const width of [320, 375, 768, 1280]) {
  const p = await owned.newPage()
  await p.setViewportSize({ width, height: 900 })
  await p.goto(`${DASH}#/insights`)
  await p.getByText(/^Counting from/).waitFor()
  await p.waitForTimeout(300)
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  check(`no sideways scroll on Insights at ${width}px`, over <= 0, `${over}px over`)
  if (width === 375) await p.screenshot({ path: `${SHOTS}/insights-375.png`, fullPage: false })
  await p.close()
}
{
  const p = await owned.newPage()
  watch(p)
  await p.goto(`${DASH}#/insights`)
  await p.getByText(/^Counting from/).waitFor()
  await p.evaluate(AXE)
  const result = await p.evaluate(async () => {
    const r = await (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { html: string }[] }[] }> } }).axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] })
    return r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.html.slice(0, 100)}`)
  })
  check('no axe violations on Insights', result.length === 0, result.join(' | '))
  await p.keyboard.press('Tab')
  await p.keyboard.press('Tab')
  check('keyboard: the section links, period buttons and bookmark picker are all reachable', await p.evaluate(() => [...document.querySelectorAll('nav[aria-label=Sections] a, [role=group][aria-label=Period] button, #insights-bookmark')].every((el) => (el as HTMLElement).tabIndex >= 0)))
  await owned.clearCookies()
  await p.getByRole('button', { name: 'Last 90 days' }).click()
  await p.getByRole('heading', { name: 'Sign in', level: 1 }).waitFor()
  check('if the sign-in ends while on Insights, the page says so', /Your sign-in has ended/.test(await p.locator('main').innerText()))
  await p.close()
}

// ---------- 5. counting can never get in the way of taking an order ----------
const ip = '198.51.100.7'
let statuses: number[] = []
for (let i = 0; i < 32; i++) statuses.push((await visit({ bookmarkId: EMBER, query: '' }, { 'CF-Connecting-IP': ip })).status)
check('one sender is counted 30 times an hour and then told to wait', statuses.slice(0, 30).every((s) => s === 204) && statuses[30] === 429 && statuses[31] === 429, statuses.slice(28, 32).join(','))
const wait = await visit({ bookmarkId: EMBER, query: '' }, { 'CF-Connecting-IP': ip })
check('with a Retry-After', wait.headers.get('retry-after') === '3600')
check('another sender is unaffected', (await visit({ bookmarkId: EMBER, query: '' })).status === 204)
let refused = 0
for (let i = 0; i < 400 && refused === 0; i++) if ((await visit({ bookmarkId: EMBER, query: '' })).status === 429) refused++
check('and by then a customer can still send a request', (await order({ idea: 'still works' })) === 201)
const counters = await offline(() => ({
  visits: Number(sql(`SELECT COUNT(*) AS n FROM rate_events WHERE bucket = 'visits-all'`)[0]?.n),
  orders: Number(sql(`SELECT COUNT(*) AS n FROM rate_events WHERE bucket = 'all'`)[0]?.n),
  typed: everything().includes('MY PRIVATE'),
}))
check('the whole site is counted 300 times an hour, then refused', refused === 1 && counters.visits === 300, `${counters.visits} counted`)
check('orders have their own counter, untouched by the visits', counters.orders === 4, `${counters.orders}`)
check('and the words typed in the browser never reached the database', !counters.typed)

check('no unexpected console or page errors anywhere', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close()
server.stop()
