import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const BEACON = 'https://static.cloudflareinsights.com/beacon.min.js'
/** Cloudflare's site tokens are letters and digits. Anything else is a slip while copying it. */
const TOKEN = /^[A-Za-z0-9]{16,64}$/

/**
 * Adds Cloudflare Web Analytics to the built visitor pages when VITE_WEB_ANALYTICS_TOKEN is set. The token is
 * public by design, as the script is on every page. It is left out of `npm run dev`, so working on the site
 * is not counted, and out of the owner's dashboard, which is a page of its own. A token that does not look
 * right stops the build, so a typo is noticed now and not weeks later as a chart that stays empty.
 */
export function webAnalytics(): Plugin {
  let root = process.cwd()
  let token: string | undefined

  return {
    name: 'web-analytics',
    configResolved(config) {
      root = config.root
      const value: unknown = config.env.VITE_WEB_ANALYTICS_TOKEN
      if (config.command !== 'build' || typeof value !== 'string' || value.trim() === '') return
      if (!TOKEN.test(value.trim())) {
        throw new Error('VITE_WEB_ANALYTICS_TOKEN does not look like a Cloudflare Web Analytics token (letters and digits, 16 to 64 of them). Copy it again from the snippet in Cloudflare, or remove the setting.')
      }
      token = value.trim()
    },
    transformIndexHtml(_html, context) {
      if (!token || resolve(context.filename) !== resolve(root, 'index.html')) return undefined
      return [{ tag: 'script', attrs: { type: 'module', src: BEACON, 'data-cf-beacon': JSON.stringify({ token }) }, injectTo: 'body' }]
    },
  }
}
