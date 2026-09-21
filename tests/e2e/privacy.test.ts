import type { Page } from 'playwright-core'
import { brand } from '../../src/config/brand.ts'
import { accessibilityProblems, launchBrowser } from '../helpers/browser.ts'
import { buildSite, TEST_ANALYTICS_TOKEN, TEST_FORM_KEY, TURNSTILE_TEST } from '../helpers/build.ts'
import { check } from '../helpers/check.ts'
import { startServer } from '../helpers/server.ts'

/*
 * The privacy page, in a real browser, on two builds of the site: one with no optional feature and one with the
 * spam check and visitor counting on. The notice has to match each, be reachable from the footer and from the
 * request form, and be readable at every size.
 */
const plainSite = startServer({ name: 'privacy-plain', port: 8804, site: buildSite('privacy-plain'), database: false })
const fullSite = startServer({ name: 'privacy-full', port: 8805, site: buildSite('privacy-full', { VITE_FORM_ACCESS_KEY: TEST_FORM_KEY, VITE_TURNSTILE_SITE_KEY: TURNSTILE_TEST.site, VITE_WEB_ANALYTICS_TOKEN: TEST_ANALYTICS_TOKEN }), database: false })
const [plain, full] = [await plainSite, await fullSite]
const browser = await launchBrowser()
const problems: string[] = []
const watch = (page: Page): void => {
  page.on('pageerror', (error) => problems.push(String(error)))
  page.on('console', (message) => message.type() === 'error' && !/cloudflareinsights|Failed to load resource/.test(message.location().url + message.text()) && problems.push(message.text()))
}
const bodyText = (page: Page): Promise<string> => page.locator('main').innerText()

for (const [label, server, features] of [['a site with no optional feature', plain, false], ['a site with the spam check and visitor counting', full, true]] as const) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  await context.addInitScript(() => {
    const found: string[] = []
    ;(window as unknown as { __csp: string[] }).__csp = found
    document.addEventListener('securitypolicyviolation', (event) => found.push(event.violatedDirective))
  })
  const page = await context.newPage()
  watch(page)

  const response = await page.goto(`${server.base}/privacy`)
  await page.getByRole('heading', { level: 1 }).waitFor()
  check(`${label}: the page opens straight from its address, with its own title`, response?.status() === 200 && (await page.title()) === `Privacy | ${brand.name}`, await page.title())
  check(`${label}: it is kept out of search results`, (await page.locator('meta[name=robots]').getAttribute('content')) === 'noindex')
  const headings = await page.locator('main h2').allInnerTexts()
  check(`${label}: it has nine parts, each a heading`, headings.length === 9 && headings[0] === 'Who this is about' && headings.at(-1) === 'Changes', headings.join('|'))
  check(`${label}: every part is named by its own heading, and no id has a space in it`, await page.locator('main section').evaluateAll((sections) => sections.every((section) => { const id = section.getAttribute('aria-labelledby') ?? ''; return !/\s/.test(id) && document.getElementById(id)?.tagName === 'H2' })))
  const text = await bodyText(page)
  check(`${label}: it names the studio's address for questions`, text.includes(brand.email))
  check(`${label}: it says what is kept and that no payment is taken`, /name and email address/.test(text) && /do not take payment/.test(text))
  check(`${label}: ${features ? 'it describes the spam check and visitor counting the site uses' : 'it does not describe a spam check or visitor counting the site does not use'}`, features ? /spam check/.test(text) && /Cloudflare Web Analytics/.test(text) : !/spam check|Web Analytics/.test(text))
  check(`${label}: no exclamation mark`, !text.includes('!'))
  check(`${label}: no policy violation`, ((await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).length) === 0)
  const audit = await accessibilityProblems(page)
  check(`${label}: no accessibility problems`, audit.length === 0, audit.join(' | '))

  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.waitForTimeout(150)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    check(`${label}: no sideways scroll at ${width}px`, over <= 0, `${over}px over`)
  }
  await page.setViewportSize({ width: 1280, height: 900 })

  // -- getting there
  await page.goto(`${server.base}/`)
  const footerLink = page.locator('footer').getByRole('link', { name: 'Privacy' })
  const box = await footerLink.boundingBox()
  check(`${label}: the footer link is big enough to press (at least 24 by 24 pixels, WCAG 2.2)`, (box?.height ?? 0) >= 24 && (box?.width ?? 0) >= 24, JSON.stringify(box))
  await footerLink.click()
  await page.getByRole('heading', { level: 1, name: 'What we do with your details.' }).waitFor()
  check(`${label}: the footer link on every page leads to it, inside the site`, page.url().startsWith(`${server.base}/privacy`))

  await page.goto(`${server.base}/custom`)
  await page.locator('form').waitFor()
  const link = page.getByRole('link', { name: /How we look after them/ })
  check(`${label}: the request form points to it, in a new tab so nothing typed is lost`, (await link.getAttribute('target')) === '_blank' && /noopener/.test((await link.getAttribute('rel')) ?? '') && (await link.getAttribute('href')) === '/privacy')
  await page.locator('[name=name]').fill('Asha Rao')
  const [opened] = await Promise.all([context.waitForEvent('page'), link.click()])
  await opened.getByRole('heading', { level: 1 }).waitFor()
  check(`${label}: it opens, and what was typed in the form is still there`, opened.url().startsWith(`${server.base}/privacy`) && (await page.locator('[name=name]').inputValue()) === 'Asha Rao')
  await context.close()
}

check('the site sent no error to the console', problems.length === 0, problems.slice(0, 3).join(' | '))
await browser.close()
plain.stop()
full.stop()
