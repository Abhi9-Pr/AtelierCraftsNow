import { execSync } from 'node:child_process'
import { ROOT, scratch } from './paths.ts'

/** Cloudflare's published test keys for Turnstile. The site key always passes, and so does its secret. */
export const TURNSTILE_TEST = { site: '1x00000000000000000000AA', secret: '1x0000000000000000000000000000000AA' }
export const TEST_FORM_KEY = 'test-form-key'
export const TEST_ANALYTICS_TOKEN = '0123456789abcdef0123456789abcdef'

/** Every setting the built site reads. A test build sets all of them, to nothing unless it says otherwise, so a real .env cannot leak in. */
const SETTINGS = ['VITE_FORM_ACCESS_KEY', 'VITE_FORMSPREE_FORM_ID', 'VITE_TURNSTILE_SITE_KEY', 'VITE_WEB_ANALYTICS_TOKEN'] as const
type Setting = (typeof SETTINGS)[number]

/**
 * Builds the site into a folder of its own in the temporary folder, so the real `dist` is never touched, and
 * returns that folder. `settings` are the build settings the test needs; every other one is left empty.
 */
export function buildSite(name: string, settings: Partial<Record<Setting, string>> = {}): string {
  const folder = scratch(`site-${name}`)
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  for (const setting of SETTINGS) env[setting] = settings[setting] ?? ''
  execSync(`npx vite build --outDir "${folder}" --emptyOutDir`, { cwd: ROOT, env, stdio: 'pipe' })
  return folder
}
