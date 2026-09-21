import { createServer } from 'node:http'
import type { Page } from 'playwright-core'
import { check } from '../helpers/check.ts'
import { launchBrowser } from '../helpers/browser.ts'
import { buildSite, TEST_ANALYTICS_TOKEN, TEST_FORM_KEY, TURNSTILE_TEST } from '../helpers/build.ts'
import { startServer } from '../helpers/server.ts'

/*
 * The site's security headers and content security policy, on the real built pages with every optional feature
 * switched on (the spam check, the email service and visitor counting), so the policy has to allow each of them
 * and nothing else. Every page and feature is used with violation reporting on, and then the things the policy
 * exists to stop are tried, and must fail.
 */
const site = buildSite('security', { VITE_FORM_ACCESS_KEY: TEST_FORM_KEY, VITE_TURNSTILE_SITE_KEY: TURNSTILE_TEST.site, VITE_WEB_ANALYTICS_TOKEN: TEST_ANALYTICS_TOKEN })
const server = await startServer({ name: 'security', port: 8801, site, bindings: { TURNSTILE_SECRET: TURNSTILE_TEST.secret } })
const browser = await launchBrowser()
const framing = createServer((_request, response) => {
  response.setHeader('Content-Type', 'text/html')
  response.end(`<iframe id="dash" src="${server.base}/admin/dashboard/"></iframe><iframe id="site" src="${server.base}/"></iframe>`)
})
await new Promise<void>((resolve) => framing.listen(8802, '127.0.0.1', resolve))

const policyOf = async (path: string): Promise<string | null> => {
  const html = await (await fetch(server.base + path)).text()
  const tag = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1]
  return tag === undefined ? null : tag.replace(/&#39;/g, "'").replace(/&amp;/g, '&')
}

// ---------- 1. headers ----------
{
  const page = await fetch(server.base + '/collection')
  const one = (name: string): string | null => page.headers.get(name)
  check('a page is not sniffed for another type, and is sent with a strict referrer policy', one('x-content-type-options') === 'nosniff' && one('referrer-policy') === 'strict-origin-when-cross-origin')
  check('a page cannot be shown inside another site\'s frame, once (rules that overlap would join two values)', one('x-frame-options') === 'SAMEORIGIN')
  check('the connection is to stay on HTTPS', /^max-age=\d{7,}$/.test(one('strict-transport-security') ?? ''))
  check('camera, microphone, location, payment and USB are switched off', ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()', 'usb=()'].every((entry) => (one('permissions-policy') ?? '').includes(entry)))
  const admin = await fetch(server.base + '/admin/')
  check('the content admin is never cached or listed, and has the same single frame rule', admin.headers.get('cache-control') === 'no-store' && /noindex/.test(admin.headers.get('x-robots-tag') ?? '') && admin.headers.get('x-frame-options') === 'SAMEORIGIN')
  const api = await fetch(server.base + '/api/orders')
  check('the functions send their own headers, since the headers file does not reach them', api.status === 405 && api.headers.get('cache-control') === 'no-store' && api.headers.get('x-content-type-options') === 'nosniff')
}

// ---------- 2. the policy in each kind of page ----------
const home = (await policyOf('/')) ?? ''
const directive = (policy: string, name: string): string[] => (policy.split('; ').find((part) => part.startsWith(`${name} `)) ?? '').split(' ').slice(1)
check('the home page has a policy that starts by allowing nothing', home.startsWith("default-src 'none'"))
for (const path of ['/collection', '/custom', '/design/emberwing-dragon', '/nope']) check(`and so does ${path}`, (await policyOf(path)) === home)
check('scripts: the site, the spam check and visitor counting, and nothing else', JSON.stringify(directive(home, 'script-src')) === JSON.stringify(["'self'", 'https://challenges.cloudflare.com', 'https://static.cloudflareinsights.com']))
check('no inline script and no eval is allowed', !/'unsafe-inline'|'unsafe-eval'/.test(directive(home, 'script-src').join(' ')))
check('connections: the site, the email service and Cloudflare\'s report address', JSON.stringify(directive(home, 'connect-src')) === JSON.stringify(["'self'", 'https://api.web3forms.com', 'https://cloudflareinsights.com']))
check('frames: only the spam check', JSON.stringify(directive(home, 'frame-src')) === JSON.stringify(['https://challenges.cloudflare.com']))
check('a page may not add a base address, or send a form to another site, or embed an object', directive(home, 'base-uri').join() === "'self'" && directive(home, 'form-action').join() === "'self'" && directive(home, 'object-src').join() === "'none'")
const dashboard = (await policyOf('/admin/dashboard/')) ?? ''
check('the owner\'s dashboard talks to this site and nowhere else', directive(dashboard, 'connect-src').join() === "'self'" && directive(dashboard, 'script-src').join() === "'self'" && !/https:/.test(dashboard))
check('and cannot send a form or add a base address', directive(dashboard, 'form-action').join() === "'none'" && directive(dashboard, 'base-uri').join() === "'none'")
check('the content admin has no policy of this kind, because it loads its editor from another address', (await policyOf('/admin/')) === null)

// ---------- 3. every page and feature, with violations reported ----------
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
await context.addInitScript(() => {
  const found: string[] = []
  ;(window as unknown as { __csp: string[] }).__csp = found
  document.addEventListener('securitypolicyviolation', (event) => found.push(`${event.violatedDirective} ${event.blockedURI}`))
})
const consoleMessages: string[] = []
/** From the attacks on, the browser is meant to complain about what it blocks. Before that, any complaint is a fault. */
let attacking = false
const requested: string[] = []
const watch = (page: Page): void => {
  page.on('console', (message) => message.type() === 'error' && !/cloudflareinsights|fetchPriority/.test(message.location().url + message.text()) && !message.location().url.endsWith('/nope') && !(attacking && /Content Security Policy/.test(message.text())) && consoleMessages.push(`${message.text()} @ ${message.location().url}`))
  page.on('pageerror', (error) => consoleMessages.push(String(error)))
  page.on('request', (request) => requested.push(request.url()))
}
const violations = (page: Page): Promise<string[]> => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)
const page = await context.newPage()
watch(page)

await page.goto(server.base + '/')
await page.locator('h1').first().waitFor()
await page.waitForTimeout(1200)
check('the home page runs with no violation', (await violations(page)).length === 0, (await violations(page)).join(' | '))
check('the visitor counting script was asked for, and allowed', requested.some((url) => url.startsWith('https://static.cloudflareinsights.com/beacon.min.js')))
await page.goto(server.base + '/collection')
await page.locator('h1').first().waitFor()
await page.locator('.bookmark-hit').first().click()
await page.waitForTimeout(900)
check('the collection, with a card turned over, runs with no violation', (await violations(page)).length === 0, (await violations(page)).join(' | '))

await page.goto(server.base + '/design/emberwing-dragon')
await page.getByLabel('Soft wash', { exact: true }).click({ force: true })
await page.getByLabel('Dotted', { exact: true }).click({ force: true })
await page.locator('input[name="own-heading"]').fill('for mum')
await page.locator('input[type=checkbox]').check()
await page.waitForTimeout(500)
check('the design page, with pictures, dots, own words and a switch, runs with no violation', (await violations(page)).length === 0, (await violations(page)).join(' | '))

await page.goto(server.base + '/custom?bookmark=emberwing-dragon&b.line-style=line-style-dotted')
await page.locator('form').waitFor()
await page.waitForFunction(() => Boolean((document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value), null, { timeout: 40000 })
check('the spam check loaded and passed under the policy', (await violations(page)).length === 0, (await violations(page)).join(' | '))
await page.locator('[name=name]').fill('Asha Rao')
await page.locator('[name=email]').fill('asha@example.com')
await page.locator('form button[type=submit]').click()
await page.getByText(/its number is \d+/).waitFor({ timeout: 20000 })
check('a request is sent, stored and confirmed under the policy', (await violations(page)).length === 0, (await violations(page)).join(' | '))

await page.goto(server.base + '/nope')
await page.locator('h1').first().waitFor()
check('the 404 page runs with no violation', (await violations(page)).length === 0)

// ---------- 4. the dashboard, signed in ----------
const owner = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
await owner.addCookies([{ name: 'atelier_admin', value: server.cookie.split('=')[1] ?? '', domain: '127.0.0.1', path: '/api/admin', httpOnly: true }])
await owner.addInitScript(() => {
  const found: string[] = []
  ;(window as unknown as { __csp: string[] }).__csp = found
  document.addEventListener('securitypolicyviolation', (event) => found.push(`${event.violatedDirective} ${event.blockedURI}`))
})
const dash = await owner.newPage()
watch(dash)
await dash.goto(server.base + '/admin/dashboard/')
await dash.locator('ul[aria-label="Orders"] a').first().waitFor()
await dash.locator('ul[aria-label="Orders"] a').first().click()
await dash.locator('.bookmark-back').waitFor()
check('the dashboard, on an order with its back drawn, runs with no violation', (await violations(dash)).length === 0, (await violations(dash)).join(' | '))
await dash.goto(server.base + '/admin/dashboard/#/insights')
await dash.getByText(/^Counting from/).waitFor()
check('and on Insights', (await violations(dash)).length === 0, (await violations(dash)).join(' | '))
check('the cookie is sent to the owner\'s addresses and not to the public ones', (await (await fetch(server.base + '/api/admin/session', { headers: { Cookie: server.cookie } })).status) === 200)

// ---------- 5. what the policy is there to stop ----------
attacking = true
const attack = async (target: Page, label: string, run: () => Promise<unknown> | unknown, blocked: string): Promise<void> => {
  const before = (await violations(target)).length
  const result = await target.evaluate(run as () => unknown).catch((error: unknown) => `threw: ${String(error)}`)
  await target.waitForTimeout(500)
  const found = (await violations(target)).slice(before)
  check(`${label}`, found.some((entry) => entry.startsWith(blocked)) && !/^ran/.test(String(result)), `${found.join(' | ')} / ${String(result)}`)
}
await page.goto(server.base + '/')
await page.locator('h1').first().waitFor()
await attack(page, 'an inline script slipped into a page does not run', () => { const script = document.createElement('script'); script.textContent = 'window.__ran = 1'; document.head.append(script); return (window as unknown as { __ran?: number }).__ran === 1 ? 'ran' : 'did not run' }, 'script-src')
await attack(page, 'a script from another site is not loaded', () => { const script = document.createElement('script'); script.src = 'https://example.com/x.js'; document.head.append(script) }, 'script-src')
await attack(page, 'a picture from another site is not loaded', () => { const image = document.createElement('img'); image.src = 'https://example.com/pixel.gif'; document.body.append(image) }, 'img-src')
await attack(page, 'the page cannot send data to another site', () => fetch('https://example.com/collect', { method: 'POST', body: 'x' }).then(() => 'ran').catch(() => 'blocked'), 'connect-src')
await attack(page, 'another site cannot be shown in a frame', () => { const frame = document.createElement('iframe'); frame.src = 'https://example.com/'; document.body.append(frame) }, 'frame-src')
await attack(page, 'a form cannot be sent to another site', () => { const form = document.createElement('form'); form.action = 'https://example.com/steal'; form.method = 'post'; document.body.append(form); if (form.requestSubmit) form.requestSubmit()
  else form.submit() }, 'form-action')
await dash.goto(server.base + '/admin/dashboard/')
await dash.getByRole('heading', { level: 1 }).first().waitFor()
await attack(dash, 'the dashboard cannot send data to another site either', () => fetch('https://example.com/collect', { method: 'POST', body: 'x' }).then(() => 'ran').catch(() => 'blocked'), 'connect-src')
await attack(dash, 'nor run an inline script', () => { const script = document.createElement('script'); script.textContent = 'window.__ran = 1'; document.head.append(script); return 'did not run' }, 'script-src')

// -- framing
const outsider = await browser.newPage()
await outsider.goto('http://127.0.0.1:8802/')
await outsider.waitForTimeout(2500)
const frames = Object.fromEntries(outsider.frames().slice(1).map((frame) => [frame.name() || frame.url(), frame.url()]))
const urls = outsider.frames().slice(1).map((frame) => frame.url())
check('another site cannot show the dashboard, or the site, in a frame', urls.length === 2 && urls.every((url) => url.startsWith('chrome-error://')), JSON.stringify(frames))
await page.goto(server.base + '/admin/')
const sameOrigin = await page.evaluate(
  () =>
    new Promise<string>((resolve) => {
      const frame = document.createElement('iframe')
      frame.src = '/collection'
      frame.onload = () => resolve(frame.contentWindow?.location.href ?? 'blocked')
      setTimeout(() => resolve('did not load'), 8000)
      document.body.append(frame)
    }),
)
check("the site's own pages can still be framed by the site, which the content admin needs", sameOrigin.startsWith(server.base + '/collection'), sameOrigin)
// -- the address a page declares is the address the host serves, not one it redirects
for (const path of ['/collection', '/custom']) {
  const html = await (await fetch(server.base + path + '/')).text()
  const canonical = /rel="canonical" href="https:\/\/[^/"]+([^"]*)"/.exec(html)?.[1] ?? ''
  const served = await fetch(server.base + canonical, { redirect: 'manual' })
  check(`the canonical address of ${path} is served directly, with no redirect`, canonical === path + '/' && served.status === 200, `${canonical} -> ${served.status}`)
}

check('no unexpected console or page errors anywhere', consoleMessages.length === 0, consoleMessages.slice(0, 3).join(' | '))

await browser.close()
framing.close()
server.stop()
