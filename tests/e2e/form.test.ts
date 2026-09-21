import type { Page } from 'playwright-core'
import type { ApiOrder } from '../../src/types/orders.ts'
import { launchBrowser } from '../helpers/browser.ts'
import { buildSite, TEST_FORM_KEY, TURNSTILE_TEST } from '../helpers/build.ts'
import { check } from '../helpers/check.ts'
import { startServer } from '../helpers/server.ts'

/*
 * The request form end to end, in a real browser: the spam check, the order number, a back design order, a stale
 * design or price, the sender limit, a blocked spam check, and a server with no database, where the form falls back
 * to email and never claims a number. Two real local runtimes: one with a database and one without.
 */
const ENDPOINT = 'https://api.web3forms.com/submit'
const site = buildSite('stack', { VITE_FORM_ACCESS_KEY: TEST_FORM_KEY, VITE_TURNSTILE_SITE_KEY: TURNSTILE_TEST.site })
const full = await startServer({ name: 'stack', port: 8788, site, bindings: { TURNSTILE_SECRET: TURNSTILE_TEST.secret } })
const noDatabase = await startServer({ name: 'stack-no-database', port: 8789, site, database: false })
const FULL = full.base
const NO_DB = noDatabase.base
const cookie = full.cookie

const orders = async (): Promise<ApiOrder[]> => ((await (await fetch(`${FULL}/api/admin/orders?limit=100`, { headers: { Cookie: cookie } })).json()) as { orders: ApiOrder[] }).orders
const orderNamed = async (name: string) => (await orders()).find((o) => o.name === name)

const browser = await launchBrowser()
const errors: string[] = []
const watch = (page: Page) => {
  page.on('pageerror', (e) => errors.push(String(e)))
  // A refused order is a 4xx answer the form is built to handle, and the browser logs those itself.
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|fetchPriority|challenges\.cloudflare|Turnstile|ERR_FAILED|blocked/i.test(m.text()) && errors.push(m.text()))
}
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' })

/** Waits for Cloudflare's widget to hand the form a pass. */
const passReady = (page: Page) => page.waitForFunction(() => Boolean((document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value), null, { timeout: 40000 })
async function fill(page: Page, name: string, type = 'other') {
  await page.locator('[name=name]').fill(name)
  await page.locator('[name=email]').fill('asha@example.com')
  await page.locator('[name=requestType]').selectOption(type)
}
const send = (page: Page) => page.locator('form button[type=submit]').click()
const status = (page: Page) => page.locator('[role=status]').innerText()

// ---------- 1. an ordinary request, through the real form, the real functions and a real database ----------
{
  const page = await ctx.newPage()
  watch(page)
  await page.goto(`${FULL}/custom`)
  await page.waitForSelector('form')
  check('the spam check widget appears in the form when the site has a key', await page.waitForSelector('input[name="cf-turnstile-response"]', { state: 'attached', timeout: 30000 }).then(() => true, () => false))
  await fill(page, 'Plain Request')
  await page.locator('[name=idea]').fill('A set of six for a wedding')
  await send(page)
  await page.waitForTimeout(600)
  const early = await status(page)
  if (/wait a moment/i.test(early)) {
    check('sending before the spam check has a pass asks the visitor to wait, and does not send', /wait a moment while we check that you are not a robot/i.test(early) && !(await orderNamed('Plain Request')))
    await passReady(page)
    await page.waitForTimeout(3200)
    await send(page)
  } else {
    check('the spam check gave its pass before the first click', true)
  }
  await page.waitForSelector('text=Thank you.', { timeout: 20000 })
  const message = await page.locator('main').innerText()
  const number = Number(/its number is (\d+)/.exec(message)?.[1])
  const stored = await orderNamed('Plain Request')
  check('the confirmation gives the order number', number >= 1001, message.replace(/\s+/g, ' ').slice(message.indexOf('Your request') , message.indexOf('Your request') + 90))
  check('the order is in the database with what was typed, and its number matches', stored?.number === number && stored.email === 'asha@example.com' && stored.requestType === 'other' && stored.idea === 'A set of six for a wedding' && stored.status === 'new')
  await page.close()
}

// ---------- 2. a back design, from the design page to a stored, priced snapshot ----------
let designNumber = 0
{
  const page = await ctx.newPage()
  watch(page)
  await page.goto(`${FULL}/design/emberwing-dragon`)
  await page.waitForSelector('.bookmark-back', { state: 'attached' })
  await page.getByLabel('Dotted', { exact: true }).click({ force: true })
  await page.locator('input[name="own-heading"]').pressSequentially('for mum')
  await page.locator('input[type=checkbox]').check()
  await page.getByRole('link', { name: 'Request this design' }).click()
  await page.waitForSelector('form')
  check('the request form shows the design and starts as a back design request', (await page.getByText('Your design: Emberwing').count()) === 1 && (await page.locator('[name=requestType]').inputValue()) === 'back-design')
  await page.locator('[name=name]').fill('Design Request')
  await page.locator('[name=email]').fill('asha@example.com')
  await passReady(page)
  await send(page)
  await page.waitForSelector('text=Thank you.', { timeout: 20000 })
  designNumber = Number(/its number is (\d+)/.exec(await page.locator('main').innerText())?.[1])
  const stored = await orderNamed('Design Request')
  check('the design order is stored with the number shown', stored?.number === designNumber && stored.requestType === 'back-design')
  check('it holds the server\'s copy of the design: bookmark, choices in words, price and a link', stored?.bookmarkTitle === 'Emberwing' && (stored.design ?? '').includes('Line style: Dotted') && (stored.design ?? '').includes('Heading: FOR MUM (own words)') && (stored.design ?? '').includes('Date and Signed lines: On') && (stored.design ?? '').includes('Price: ₹199') && stored.priceTotal === 199)
  check('and the snapshot can draw exactly the back the visitor designed', stored?.designSnapshot?.render?.heading === 'FOR MUM' && stored.designSnapshot.render.lines.type === 'dotted' && stored.designSnapshot.render.signature.some((p) => p.kind === 'signature-lines'))
  await page.close()
}

// ---------- 3. a made-to-order bookmark: no total, and the form does not stumble on it ----------
{
  const page = await ctx.newPage()
  watch(page)
  await page.goto(`${FULL}/design/painted-to-order`)
  await page.waitForSelector('.bookmark-back', { state: 'attached' })
  await page.getByRole('link', { name: 'Request this design' }).click()
  await page.waitForSelector('form')
  await page.locator('[name=name]').fill('Made To Order')
  await page.locator('[name=email]').fill('asha@example.com')
  await passReady(page)
  await send(page)
  await page.waitForSelector('text=Thank you.', { timeout: 20000 })
  const stored = await orderNamed('Made To Order')
  check('a made-to-order design is accepted, and stored with no total', stored?.priceTotal === null && (stored.design ?? '').includes('Price: Price on request'))
  await page.close()
}

// ---------- 4. a page that was out of date: the server refuses, the form says why, and keeps everything ----------
{
  const page = await ctx.newPage()
  watch(page)
  const before = (await orders()).length
  await page.goto(`${FULL}/design/emberwing-dragon`)
  await page.waitForSelector('.bookmark-back', { state: 'attached' })
  await page.getByLabel('Dotted', { exact: true }).click({ force: true })
  await page.getByRole('link', { name: 'Request this design' }).click()
  await page.waitForSelector('form')
  await page.locator('[name=name]').fill('Stale Design')
  await page.locator('[name=email]').fill('asha@example.com')
  await page.locator('[name=idea]').fill('keep this text')
  await passReady(page)

  await page.route('**/api/orders', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}')
    body.designQuery = 'b.line-style=line-style-gone'
    await route.continue({ postData: JSON.stringify(body) })
  })
  await send(page)
  await page.waitForFunction(() => /no longer available/.test(document.querySelector('[role=status]')?.textContent ?? ''), null, { timeout: 15000 })
  check('a design that has changed is explained in plain words, with the way to fix it', /Some of the choices in this design are no longer available\. Please open the design page again/.test(await status(page)))
  check('the form is still there with everything the visitor typed, and nothing was stored', (await page.locator('[name=name]').inputValue()) === 'Stale Design' && (await page.locator('[name=idea]').inputValue()) === 'keep this text' && (await orders()).length === before)
  await page.unroute('**/api/orders')

  await passReady(page)
  await page.waitForTimeout(3200)
  await page.route('**/api/orders', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}')
    body.expectedTotal = 1
    await route.continue({ postData: JSON.stringify(body) })
  })
  await send(page)
  await page.waitForFunction(() => /price of this design has changed/.test(document.querySelector('[role=status]')?.textContent ?? ''), null, { timeout: 15000 })
  check('a price that has changed is explained too', /price of this design has changed since you chose it/.test(await status(page)) && (await orders()).length === before)
  await page.unroute('**/api/orders')

  await passReady(page)
  await page.waitForTimeout(3200)
  await send(page)
  await page.waitForSelector('text=Thank you.', { timeout: 20000 })
  check('after a refusal the spam check gave a fresh pass, and the same form then goes through', (await orderNamed('Stale Design'))?.idea === 'keep this text')
  await page.close()
}

// ---------- 5. the limit on one sender is explained to the visitor ----------
{
  const page = await ctx.newPage()
  watch(page)
  await page.goto(`${FULL}/custom`)
  await page.waitForSelector('form')
  const seen: string[] = []
  for (let i = 0; i < 4; i++) {
    await fill(page, `Limit ${i}`)
    await passReady(page)
    await page.waitForTimeout(3200)
    await send(page)
    await page.waitForFunction(() => /Thank you\.|a lot of requests/.test(document.body.innerText), null, { timeout: 20000 })
    if (await page.getByText('Thank you.').count()) {
      seen.push('sent')
      await page.getByRole('button', { name: 'Send another request' }).click()
      await page.waitForSelector('form')
    } else {
      seen.push('limited')
      break
    }
  }
  check('from one connection the fifth order in an hour is refused, and the visitor is told to try later', seen.includes('limited') && /a lot of requests from your connection just now\. Please try again in an hour/.test(await status(page)), seen.join(','))
  await page.close()
}

// ---------- 6. the spam check cannot load: the order is sent without a pass and the server refuses it plainly ----------
{
  const blocked = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' })
  await blocked.route('**/challenges.cloudflare.com/**', (route) => route.abort())
  const page = await blocked.newPage()
  watch(page)
  await page.goto(`${FULL}/custom`)
  await page.waitForSelector('form')
  await fill(page, 'Blocked Check')
  await page.waitForTimeout(1500)
  await send(page)
  await page.waitForFunction(() => /spam check did not pass/.test(document.querySelector('[role=status]')?.textContent ?? ''), null, { timeout: 15000 })
  check('with the check blocked, the visitor is told it did not pass, and the form keeps their details', /The spam check did not pass\. Please try again\./.test(await status(page)) && (await page.locator('[name=name]').inputValue()) === 'Blocked Check' && !(await orderNamed('Blocked Check')))
  await blocked.close()
}

// ---------- 7. a server with no database: the email relay takes over, and the visitor still gets through ----------
{
  const page = await ctx.newPage()
  watch(page)
  const emailed: Record<string, unknown>[] = []
  await page.route(ENDPOINT, async (route) => {
    emailed.push(JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>)
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' })
  })
  await page.goto(`${NO_DB}/design/emberwing-dragon`)
  await page.waitForSelector('.bookmark-back', { state: 'attached' })
  await page.getByLabel('Dotted', { exact: true }).click({ force: true })
  await page.getByRole('link', { name: 'Request this design' }).click()
  await page.waitForSelector('form')
  await page.locator('[name=name]').fill('No Database')
  await page.locator('[name=email]').fill('asha@example.com')
  await passReady(page)
  await send(page)
  await page.waitForSelector('text=Thank you.', { timeout: 20000 })
  const message = await page.locator('main').innerText()
  check('with no database the request still goes through, by email, and no number is claimed', emailed.length === 1 && !/its number is/.test(message))
  check('the email carries the request type and the design text and link', emailed[0]?.request_type === 'Custom back design' && String(emailed[0]?.design).includes('Line style: Dotted') && String(emailed[0]?.design).includes('See it: https://'))
  check('and it is sent once, not twice', emailed.length === 1)
  await page.close()
}

check('no unexpected console or page errors in any of it', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close()
full.stop()
noDatabase.stop()
