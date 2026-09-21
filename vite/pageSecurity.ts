import { resolve } from 'node:path'
import type { Plugin } from 'vite'

/** What this build of the site talks to, worked out from the settings it was built with. */
export interface Features {
  /** The spam check on the request form: a script and a frame from Cloudflare */
  turnstile: boolean
  /** Cloudflare Web Analytics: a script and a report back to Cloudflare */
  analytics: boolean
  /** The address of an email service the form falls back to, if one is set up */
  formServices: string[]
}

const CLOUDFLARE_CHALLENGES = 'https://challenges.cloudflare.com'
const CLOUDFLARE_BEACON = 'https://static.cloudflareinsights.com'
const CLOUDFLARE_REPORTS = 'https://cloudflareinsights.com'

/**
 * The content security policy for the visitor pages: what a page may load or contact. The site itself, and
 * only what the settings turn on. Inline styles are allowed, because the pages set a few sizes and colours
 * from code, but no inline script and no other site's script.
 */
export function visitorPolicy({ turnstile, analytics, formServices }: Features): string {
  const scripts = ["'self'", ...(turnstile ? [CLOUDFLARE_CHALLENGES] : []), ...(analytics ? [CLOUDFLARE_BEACON] : [])]
  const connections = ["'self'", ...formServices, ...(analytics ? [CLOUDFLARE_REPORTS] : [])]
  return [
    "default-src 'none'",
    `script-src ${scripts.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connections.join(' ')}`,
    ...(turnstile ? [`frame-src ${CLOUDFLARE_CHALLENGES}`] : []),
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
}

/** The owner's dashboard talks to nothing but this site. */
export const dashboardPolicy = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ')

const FORM_SERVICES: Readonly<Record<string, string>> = {
  VITE_FORM_ACCESS_KEY: 'https://api.web3forms.com',
  VITE_FORMSPREE_FORM_ID: 'https://formspree.io',
}

/**
 * Writes the content security policy into the built pages as a meta tag, so it holds on any host, not only on
 * those that read the `_headers` file. It is left out of `npm run dev`, whose tools need inline scripts, and
 * out of the content admin, which loads its editor from another address and is checked another way.
 */
export function pageSecurity(): Plugin {
  let root = process.cwd()
  let visitors = ''

  return {
    name: 'page-security',
    configResolved(config) {
      root = config.root
      const has = (name: string): boolean => typeof config.env[name] === 'string' && String(config.env[name]).trim() !== ''
      visitors = visitorPolicy({
        turnstile: has('VITE_TURNSTILE_SITE_KEY'),
        analytics: has('VITE_WEB_ANALYTICS_TOKEN'),
        formServices: Object.entries(FORM_SERVICES).filter(([name]) => has(name)).map(([, address]) => address),
      })
      if (config.command !== 'build') visitors = ''
    },
    transformIndexHtml(_html, context) {
      if (!visitors) return undefined
      const file = resolve(context.filename)
      const content = file === resolve(root, 'index.html') ? visitors : file === resolve(root, 'admin/dashboard/index.html') ? dashboardPolicy : null
      if (content === null) return undefined
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content }, injectTo: 'head-prepend' }]
    },
  }
}
