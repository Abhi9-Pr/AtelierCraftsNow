import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from 'playwright-core'
import { launchBrowser } from '../helpers/browser.ts'
import { buildSite } from '../helpers/build.ts'
import { check } from '../helpers/check.ts'
import { ROOT, scratch } from '../helpers/paths.ts'
import { startServer } from '../helpers/server.ts'

/*
 * The owner's dashboard in a real browser, against the real local runtime and database: sign-in, the list with its
 * filters, search and paging, one order with its history and every change, the spreadsheet, deleting, the back drawn
 * from a saved design, and the accessibility and layout of each screen.
 */
const AXE = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8')
const SHOTS = scratch('dashboard-shots')
mkdirSync(SHOTS, { recursive: true })
const server = await startServer({ name: 'dashboard', port: 8792, site: buildSite('dashboard') })
const BASE = server.base
const DASH = `${BASE}/admin/dashboard/`

// ---------- seed: 60 ordinary orders and five special ones, through the real order address ----------
let sender = 0
const place = async (body: Record<string, unknown>): Promise<{ id: string; number: number }> => {
  const address = `198.51.${Math.floor(++sender / 250)}.${(sender % 250) + 1}`
  const response = await fetch(`${BASE}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': address }, body: JSON.stringify({ email: 'asha@example.com', requestType: 'other', idea: 'A set for a wedding', ...body }) })
  const json = (await response.json()) as { id: string; number: number }
  if (response.status !== 201) throw new Error(`seed failed: ${response.status} ${JSON.stringify(json)}`)
  return json
}
const cookieValue = server.cookie.split('=')[1] ?? ''
const owner = { Cookie: `atelier_admin=${cookieValue}`, Origin: BASE }
const api = async (path: string, init: { method?: string; body?: unknown } = {}) => {
  const response = await fetch(BASE + path, { method: init.method ?? 'GET', headers: { ...owner, ...(init.body ? { 'Content-Type': 'application/json' } : {}) }, body: init.body ? JSON.stringify(init.body) : undefined })
  return { status: response.status, text: await response.text() }
}

const plain: { id: string; number: number }[] = []
for (let i = 1; i <= 60; i++) plain.push(await place({ name: `Person ${String(i).padStart(2, '0')}` }))
const design = await place({ name: 'Design Buyer', requestType: 'back-design', bookmarkId: 'emberwing-dragon', designQuery: 't.heading=for+mum&s.date-signed-lines=1&b.line-style=line-style-dotted', expectedTotal: 199 })
const made = await place({ name: 'Made To Order', requestType: 'back-design', bookmarkId: 'painted-to-order', designQuery: '', expectedTotal: null })
const bulk = await place({ name: 'Bulk Buyer', requestType: 'bulk', quantity: 250, referenceLink: 'https://example.com/board', idea: 'Line one\nLine two <script>window.__xss=1</script>' })
const formula = await place({ name: '=HYPERLINK("http://evil.example","x")', idea: 'a "quoted", comma' })
const longName = 'W'.repeat(90)
await place({ name: longName, idea: 'x'.repeat(300) })
const TOTAL = 65

const moves: [number, string][] = [[0, 'confirmed'], [1, 'confirmed'], [2, 'confirmed'], [3, 'confirmed'], [4, 'confirmed'], [5, 'in-production'], [6, 'in-production'], [7, 'in-production'], [8, 'shipped'], [9, 'shipped'], [10, 'cancelled']]
for (const [index, status] of moves) await api(`/api/admin/orders/${plain[index]?.id}`, { method: 'PATCH', body: { status } })
const CONFIRMED = 5

// ---------- the export, on its own ----------
const csvAt = async (path: string, headers: Record<string, string> = owner) => {
  const response = await fetch(BASE + path, { headers })
  return { status: response.status, headers: response.headers, text: await response.text() }
}
{
  const anon = await csvAt('/api/admin/export', {})
  check('the export is closed to anyone not signed in', anon.status === 401 && !anon.text.includes('Person'))
  const all = await csvAt('/api/admin/export')
  const bytes = new Uint8Array(await (await fetch(BASE + '/api/admin/export', { headers: owner })).arrayBuffer())
  const lines = all.text.split('\r\n')
  check('the export is a CSV file for download, never cached', all.status === 200 && /^text\/csv/.test(all.headers.get('content-type') ?? '') && /^attachment; filename="orders-\d{4}-\d{2}-\d{2}\.csv"$/.test(all.headers.get('content-disposition') ?? '') && all.headers.get('cache-control') === 'no-store')
  check('it starts with a byte order mark so Excel reads rupee signs and accents, and has the headings', bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf && all.text.startsWith('"Number","Received"') && lines[0]?.includes('"Request type"') === true)
  check('every order is a row, and the file ends with a line break', lines.length === TOTAL + 2 && lines.at(-1) === '')
  check('a name that starts with = is written as text, not a formula', all.text.includes(`"'=HYPERLINK(""http://evil.example"",""x"")"`) && !all.text.includes(',"=HYPERLINK'))
  check('quotes and commas inside a cell survive', all.text.includes('"a ""quoted"", comma"'))
  check('a multi-line idea stays in one cell', all.text.includes('"Line one\nLine two <script>window.__xss=1</script>"'))
  check('the design order carries its plain-text design and price', all.text.includes('"Emberwing"') && all.text.includes('Bookmark: Emberwing') && lines.some((line) => line.includes('"Design Buyer"') && line.includes(',"199",')))
  check('a made-to-order design has an empty price, not zero', lines.some((line) => line.includes('"Made To Order"') && line.includes(',,"Bookmark: ')))
  const confirmed = await csvAt('/api/admin/export?status=confirmed')
  check('the export follows the status filter', confirmed.text.split('\r\n').length === CONFIRMED + 2 && !confirmed.text.includes('"New"'))
  const searched = await csvAt('/api/admin/export?q=Person%2007')
  check('and the search', searched.text.split('\r\n').length === 3 && searched.text.includes('Person 07'))
  check('a status that does not exist is refused', (await csvAt('/api/admin/export?status=bogus')).status === 400)
  const post = await fetch(`${BASE}/api/admin/export`, { method: 'POST', headers: owner })
  check('only GET is allowed', post.status === 405)
}

// ---------- the page ----------
const browser = await launchBrowser()
const errors: string[] = []
const watch = (page: Page) => {
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && !(m.location().url.endsWith('/api/admin/session') && /401/.test(m.text())) && !/fetchPriority/.test(m.text()) && !(/Failed to load resource/.test(m.text()) && m.location().url.startsWith(BASE + '/api/admin/')) && errors.push(`${m.text()} @ ${m.location().url}`))
}
const signedIn = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
await signedIn.addCookies([{ name: 'atelier_admin', value: cookieValue, domain: '127.0.0.1', path: '/api/admin', httpOnly: true }])
const page = await signedIn.newPage()
watch(page)

const rows = (p: Page) => p.locator('ul[aria-label="Orders"] > li')
const shownText = (p: Page) => p.locator('p[role=status]').filter({ hasText: /orders? shown|Loading orders/ }).first()
const button = (p: Page, name: RegExp | string) => p.getByRole('button', { name })
const focusedId = (p: Page) => p.evaluate(() => document.activeElement?.id ?? '')

// -- the address and its headers
const headers = await fetch(DASH)
check('the page is not cached and not indexed', headers.status === 200 && headers.headers.get('cache-control') === 'no-store' && /noindex/.test(headers.headers.get('x-robots-tag') ?? ''), `${headers.status} ${headers.headers.get('cache-control')} ${headers.headers.get('x-robots-tag')}`)
const html = await headers.text()
check('its own head: no site title, no Open Graph, noindex, and no site script', /<title>Orders<\/title>/.test(html) && !/og:/.test(html) && /name="robots" content="noindex, nofollow"/.test(html))
const home = await (await fetch(BASE + '/')).text()
check('the visitor pages never load the dashboard script', !/dashboard-[\w-]+\.js/.test(home) && /<title>[^<]*Tales/.test(home))

// -- signed out
{
  const anon = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const p = await anon.newPage()
  watch(p)
  await p.goto(DASH)
  await p.getByRole('heading', { name: 'Sign in', level: 1 }).waitFor()
  const link = p.getByRole('link', { name: 'Sign in with GitHub' })
  check('signed out, the page asks for a sign-in with a link to the GitHub sign-in', (await link.getAttribute('href')) === '/api/admin/login')
  check('and shows nothing about any order', !(await p.locator('body').innerText()).match(/Person|asha@|Order \d/))
  check('with no navigation for the owner (no sign-out, no content editor link)', (await p.getByRole('button', { name: 'Sign out' }).count()) === 0)
  await anon.close()
}

// -- signed in: the list
await page.goto(DASH)
await shownText(page).filter({ hasText: 'shown' }).waitFor()
check('the header shows who is signed in and the way out', (await page.getByText('Signed in as tester').count()) === 1 && (await button(page, 'Sign out').count()) === 1)
check('the first page is 50 orders, with a note that there are more', (await rows(page).count()) === 50 && /50 orders shown, more below/.test(await shownText(page).innerText()))
check('the status buttons carry the counts', (await button(page, `All (${TOTAL})`).count()) === 1 && (await button(page, `New (${TOTAL - moves.length})`).count()) === 1 && (await button(page, `Confirmed (${CONFIRMED})`).count()) === 1 && (await button(page, 'Cancelled (1)').count()) === 1)
check('"All" is the one in force', (await button(page, /^All/).getAttribute('aria-pressed')) === 'true' && (await button(page, /^New/).getAttribute('aria-pressed')) === 'false')
const numbers = await rows(page).locator('span.text-ink-soft').allInnerTexts()
check('the rows say their order number for a screen reader ("Order 1065")', numbers.length === 50 && numbers.every((t) => /^Order \d{4}$/.test(t.replace(/\s+/g, ' ').trim()) || /^\d{4}$/.test(t.trim())))
await button(page, 'Show more').click()
await page.waitForFunction(() => document.querySelectorAll('ul[aria-label="Orders"] > li').length === 65)
const ids = await rows(page).locator('a').evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).getAttribute('href')))
check('"Show more" adds the rest, 65 in all, none twice', ids.length === TOTAL && new Set(ids).size === TOTAL && (await button(page, 'Show more').count()) === 0)

// -- filter and search
await button(page, /^Confirmed/).click()
await page.waitForFunction((n) => document.querySelectorAll('ul[aria-label="Orders"] > li').length === n, CONFIRMED)
check('filtering by Confirmed shows only those, every one with the Confirmed pill', (await rows(page).count()) === CONFIRMED && (await rows(page).locator('span', { hasText: /^Confirmed$/ }).count()) === CONFIRMED)
await button(page, /^All/).click()
await page.locator('#order-search').fill('Person 07')
await page.waitForFunction(() => document.querySelectorAll('ul[aria-label="Orders"] > li').length === 1)
check('searching for a name finds it', /Person 07/.test(await rows(page).first().innerText()))
await page.locator('#order-search').fill('emberwing')
await rows(page).filter({ hasText: 'Design Buyer' }).waitFor()
await page.waitForFunction(() => document.querySelectorAll('ul[aria-label="Orders"] > li').length === 1)
check('searching for a bookmark finds the design order', /Design Buyer/.test(await rows(page).first().innerText()))
await page.locator('#order-search').fill('zzzz-nothing')
await page.getByText('No orders match that.').waitFor()
check('a search with no match says so', (await rows(page).count()) === 0)
await page.locator('#order-search').fill('')
await page.waitForFunction(() => document.querySelectorAll('ul[aria-label="Orders"] > li').length >= 50)
check('and clearing it brings the list back', (await rows(page).count()) === 50)
const link = await page.getByRole('link', { name: 'Download spreadsheet' }).getAttribute('href')
check('the download link is for the list as filtered right now', link === '/api/admin/export')
await button(page, /^Shipped/).click()
await page.waitForFunction(() => document.querySelectorAll('ul[aria-label="Orders"] > li').length === 2)
check('and it follows the filter', (await page.getByRole('link', { name: 'Download spreadsheet' }).getAttribute('href')) === '/api/admin/export?status=shipped')
const fromPage = await page.request.get(BASE + '/api/admin/export?status=shipped')
check('opened from the browser, with its own cookie, it downloads', fromPage.status() === 200 && (await fromPage.text()).split('\r\n').length === 4)
await button(page, /^All/).click()
await page.waitForFunction(() => document.querySelectorAll('ul[aria-label="Orders"] > li').length === 50)

// -- opening an order, and coming back to the same place
await button(page, 'Show more').click()
await page.waitForFunction(() => document.querySelectorAll('ul[aria-label="Orders"] > li').length === 65)
const deep = rows(page).nth(55)
await deep.scrollIntoViewIfNeeded()
const before = await page.evaluate(() => window.scrollY)
const deepName = (await deep.locator('a').innerText()).trim()
await deep.locator('a').click()
await page.getByRole('heading', { level: 1, name: /^Order \d{4}$/ }).waitFor()
check('opening an order gives it an address, and starts at its top', /#\/order\/[0-9a-f-]{36}$/.test(page.url()) && (await page.evaluate(() => window.scrollY)) === 0)
check('focus moves to the order heading', (await focusedId(page)) === 'order-heading')
check('the list is out of sight, not read by a screen reader', await page.locator('#orders-heading').isHidden())
await page.goBack()
await page.locator('#orders-heading').waitFor({ state: 'visible' })
await page.waitForTimeout(150)
check('back returns to the list with all 65 still loaded, and the same place', (await rows(page).count()) === 65 && Math.abs((await page.evaluate(() => window.scrollY)) - before) <= 3, `${before} vs ${await page.evaluate(() => window.scrollY)} (${deepName})`)
check('focus is on the list heading again', (await focusedId(page)) === 'orders-heading')

// -- an ordinary order
await page.goto(`${DASH}#/order/${bulk.id}`)
await page.getByRole('heading', { level: 1, name: `Order ${bulk.number}` }).waitFor()
const facts = await page.locator('dl').first().innerText()
check('the request shows name, kind, quantity, idea with its line breaks, reference and time', /Bulk Buyer/.test(facts) && /Bulk order/.test(facts) && /250/.test(facts) && /Line one\s*\nLine two/.test(facts) && /example\.com\/board/.test(facts) && /2026|20\d\d/.test(facts))
check('an idea containing a script tag is shown as text and never run', /<script>window\.__xss=1<\/script>/.test(facts) && (await page.evaluate(() => (window as unknown as Record<string, unknown>).__xss)) === undefined)
check('the email is a link that opens a reply with the order number in the subject', ((await page.getByRole('link', { name: 'asha@example.com' }).getAttribute('href')) ?? '').includes(`subject=Your%20ATELIER%20CRAFTS%20NOW%20request%2C%20order%20${bulk.number}`))
const reference = page.getByRole('link', { name: /example\.com\/board/ })
check('the reference is a safe link that opens in a new tab', (await reference.getAttribute('target')) === '_blank' && /noreferrer/.test((await reference.getAttribute('rel')) ?? ''))
check('an order with no design has no design section', (await page.getByRole('heading', { name: 'The back design' }).count()) === 0)
check('the history starts with the order being received', /Order received/.test(await page.locator('#history-heading + ol').innerText()))

// -- status change
await button(page, /^Confirmed$/).click()
await page.getByText('Status changed to Confirmed.').waitFor()
check('a status change is saved, shown in the pill and announced', (await button(page, /^Confirmed$/).getAttribute('aria-pressed')) === 'true' && /^confirmed$/i.test(await page.locator('#order-heading + span').innerText()))
const history = await page.locator('#history-heading + ol').innerText()
check('and written into the history with who did it', /Status changed from New to Confirmed/.test(history) && /, tester/.test(history))
const stored = JSON.parse((await api(`/api/admin/orders/${bulk.id}`)).text) as { order: { status: string } }
check('the database agrees', stored.order.status === 'confirmed')
await button(page, /^Delivered$/).click()
await page.getByText('Status changed to Delivered.').waitFor()
await button(page, /^Shipped$/).click()
await page.getByText('Status changed to Shipped.').waitFor()
check('any status can be set, in any order', (await button(page, /^Shipped$/).getAttribute('aria-pressed')) === 'true' && (await button(page, /^Delivered$/).getAttribute('aria-pressed')) === 'false')

// -- notes
await page.getByLabel('Add a note').fill('Called her. <img src=x onerror="window.__xss=1"> Wants gold foil.')
await button(page, 'Save note').click()
await page.getByText('Note added.').waitFor()
check('a note is saved into the history, and the box is emptied', /Wants gold foil/.test(await page.locator('#history-heading + ol').innerText()) && (await page.getByLabel('Add a note').inputValue()) === '')
check('a note with markup in it is shown as text', (await page.evaluate(() => (window as unknown as Record<string, unknown>).__xss)) === undefined && (await page.locator('#history-heading + ol img').count()) === 0)
check('an empty note cannot be saved', await button(page, 'Save note').isDisabled())

// -- back on the list, the change is there
await page.getByRole('link', { name: 'All orders' }).click()
await page.locator('#orders-heading').waitFor({ state: 'visible' })
await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent === 'Shipped (3)'))
check('the list and its counts are refreshed after changes (the bulk order went New, Confirmed, Delivered, Shipped)', (await button(page, `New (${TOTAL - moves.length - 1})`).count()) === 1 && (await button(page, 'Confirmed (' + CONFIRMED + ')').count()) === 1 && (await button(page, 'Delivered (0)').count()) === 1)

// -- a back design order
await page.goto(`${DASH}#/order/${design.id}`)
await page.getByRole('heading', { level: 1, name: `Order ${design.number}` }).waitFor()
const designSection = page.locator('section[aria-labelledby=design-heading]')
await designSection.waitFor()
const shot = await designSection.innerText()
check('the design shows each category in words, the price, and the bookmark', /On Emberwing/.test(shot) && /Heading/.test(shot) && /FOR MUM/.test(shot) && /Dotted/.test(shot) && /₹199/.test(shot), shot.replace(/\s+/g, ' ').slice(0, 200))
check('the back is drawn from the saved design, with the studio watermark', (await designSection.locator('.bookmark-back').count()) === 1 && /FOR MUM/.test(await designSection.locator('.bookmark-back').innerText()) && (await designSection.locator('.back-lines-dotted').count()) === 1)
check('the drawn back is shown face on and to size (about 11rem wide, 1:3)', await designSection.locator('.bookmark-back').evaluate((el) => { const r = el.getBoundingClientRect(); return Math.abs(r.width - 176) < 2 && Math.abs(r.height - 528) < 4 }))
check('it links to the design on the site', ((await designSection.getByRole('link', { name: 'Open this design on the site' }).getAttribute('href')) ?? '').includes('/design/emberwing-dragon?'))
await page.screenshot({ path: `${SHOTS}/dash-detail-1280.png`, fullPage: true })

// -- a made-to-order design
await page.goto(`${DASH}#/order/${made.id}`)
await page.getByRole('heading', { level: 1, name: `Order ${made.number}` }).waitFor()
check('a made-to-order design says the price is on request', /Price on request/.test(await page.locator('section[aria-labelledby=design-heading]').innerText()))

// -- long words do not break the layout
for (const [name, path] of [['list', '#/'], ['a plain order', `#/order/${bulk.id}`], ['a design order', `#/order/${design.id}`], ['an order with a 90-character name and a 300-character word', `#/order/${(await (async () => { const list = JSON.parse((await api('/api/admin/orders?q=WWWWWWWW')).text) as { orders: { id: string }[] }; return list.orders[0]?.id })())}`]] as const) {
  for (const width of [320, 375, 768, 1280]) {
    const p = await signedIn.newPage()
    await p.setViewportSize({ width, height: 900 })
    await p.goto(DASH + path)
    await p.locator('h1:visible').first().waitFor()
    await p.waitForTimeout(400)
    const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    check(`no sideways scroll: ${name} at ${width}px`, over <= 0, `${over}px over`)
    if (width === 375 && name === 'list') await p.screenshot({ path: `${SHOTS}/dash-list-375.png`, fullPage: false })
    if (width === 375 && name === 'a design order') await p.screenshot({ path: `${SHOTS}/dash-detail-375.png`, fullPage: true })
    await p.close()
  }
}

// -- deleting
await page.goto(`${DASH}#/order/${formula.id}`)
await page.getByRole('heading', { level: 1, name: `Order ${formula.number}` }).waitFor()
check('a name that starts with = is shown as plain text on screen', /=HYPERLINK\("http:\/\/evil\.example","x"\)/.test(await page.locator('dl').first().innerText()))
await button(page, 'Delete this order').click()
check('deleting asks first, and the safe choice has focus', (await page.getByText(/Delete order \d+ and its whole history for good/).count()) === 1 && (await page.evaluate(() => document.activeElement?.textContent)) === 'Keep it')
await button(page, 'Keep it').click()
check('"Keep it" changes nothing', (await page.getByText(/for good\?/).count()) === 0 && (await api(`/api/admin/orders/${formula.id}`)).status === 200)
await button(page, 'Delete this order').click()
await button(page, 'Delete for good').click()
await page.locator('#orders-heading').waitFor({ state: 'visible' })
check('"Delete for good" returns to the list, and the order is gone from the database', page.url().endsWith('#/') && (await api(`/api/admin/orders/${formula.id}`)).status === 404)
await page.waitForFunction((n) => [...document.querySelectorAll('button')].some((b) => b.textContent === `All (${n})`), TOTAL - 1)
check('and from the counts', true)
await page.goto(`${DASH}#/order/${formula.id}`)
await page.getByText('That order could not be found').waitFor()
check('opening a deleted order says so plainly', true)

// -- the sign-in ending, and signing out
await page.goto(DASH)
await shownText(page).filter({ hasText: 'shown' }).waitFor()
await signedIn.clearCookies()
await button(page, 'Refresh').click()
await page.getByRole('heading', { name: 'Sign in', level: 1 }).waitFor()
check('when the sign-in has ended, the page says so and offers the sign-in', /Your sign-in has ended/.test(await page.locator('main').innerText()) && (await page.getByText(/Person \d\d/).count()) === 0)
{
  const again = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await again.addCookies([{ name: 'atelier_admin', value: cookieValue, domain: '127.0.0.1', path: '/api/admin', httpOnly: true }])
  const p = await again.newPage()
  watch(p)
  await p.goto(DASH)
  await button(p, 'Sign out').waitFor()
  await button(p, 'Sign out').click()
  await p.getByRole('heading', { name: 'Sign in', level: 1 }).waitFor()
  const after = await p.evaluate(async () => (await fetch('/api/admin/session')).status)
  check('signing out ends the sign-in for real', after === 401 && (await again.cookies()).every((c) => c.name !== 'atelier_admin' || c.value === ''))
  await again.close()
}

// -- keyboard, and axe
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addCookies([{ name: 'atelier_admin', value: cookieValue, domain: '127.0.0.1', path: '/api/admin', httpOnly: true }])
  const p = await ctx.newPage()
  watch(p)
  await p.goto(DASH)
  await shownText(p).filter({ hasText: 'shown' }).waitFor()
  const audit = async (label: string) => {
    await p.evaluate(AXE)
    const result = await p.evaluate(async () => {
      const r = await (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { html: string }[] }[] }> } }).axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] })
      return r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.html.slice(0, 90)}`)
    })
    check(`no axe violations: ${label}`, result.length === 0, result.join(' | '))
  }
  await audit('the list')
  await p.keyboard.press('Tab')
  check('the first Tab stop is the skip link, and it leads to the content', (await p.evaluate(() => document.activeElement?.textContent)) === 'Skip to content')
  await p.locator('ul[aria-label=Orders] a').first().focus()
  await p.keyboard.press('Enter')
  await p.getByRole('heading', { level: 1, name: /^Order \d{4}$/ }).waitFor()
  check('Enter on a focused order opens it, and focus lands on its heading', (await focusedId(p)) === 'order-heading')
  await audit('an order')
  await p.goto(`${DASH}#/order/${design.id}`)
  await p.locator('.bookmark-back').waitFor()
  await audit('a back design order')
  await p.evaluate(() => { location.hash = '#/' })
  await ctx.clearCookies()
  await p.goto(DASH)
  await p.getByRole('heading', { name: 'Sign in', level: 1 }).waitFor()
  await audit('the sign-in screen')
  await ctx.close()
}

check('no unexpected console or page errors anywhere', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close()
server.stop()
