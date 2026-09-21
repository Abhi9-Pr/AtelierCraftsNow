import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium, type Browser, type Page } from 'playwright-core'

const CHANNELS = ['chrome', 'msedge']

/**
 * A Chromium browser that is already on the computer. Nothing is downloaded. Set BROWSER_PATH to the program's
 * file to use a particular one, or BROWSER_CHANNEL to `chrome` or `msedge`.
 */
export async function launchBrowser(): Promise<Browser> {
  const executablePath = process.env.BROWSER_PATH
  if (executablePath) return chromium.launch({ executablePath })
  const channels = process.env.BROWSER_CHANNEL ? [process.env.BROWSER_CHANNEL] : CHANNELS
  let lastError: unknown
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel })
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(`No Chrome or Edge could be started. Install one, or set BROWSER_PATH. (${String(lastError)})`)
}

const AXE = readFileSync(resolve(import.meta.dirname, '../../node_modules/axe-core/axe.min.js'), 'utf8')

interface AxeWindow {
  axe: { run: (context: unknown, options: unknown) => Promise<{ violations: { id: string; nodes: { html: string }[] }[] }> }
}

/** What the accessibility checker finds wrong on the page as it is now, one line each. Empty means nothing. */
export async function accessibilityProblems(page: Page): Promise<string[]> {
  await page.evaluate(AXE)
  return page.evaluate(async () => {
    const result = await (window as unknown as AxeWindow).axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] })
    return result.violations.map((violation) => `${violation.id} (${violation.nodes.length}): ${violation.nodes[0]?.html.slice(0, 100)}`)
  })
}
