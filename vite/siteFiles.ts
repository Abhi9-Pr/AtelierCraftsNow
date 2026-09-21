import type { Plugin } from 'vite'
import { brand } from '../src/config/brand.ts'
import { pageAddress, prerenderedPaths } from '../src/config/seo.ts'

const absolute = (path: string) => `${brand.siteUrl}${path}`

function sitemap(lastModified: string): string {
  const urls = prerenderedPaths
    .map((route) => `  <url>\n    <loc>${pageAddress(route)}</loc>\n    <lastmod>${lastModified}</lastmod>\n  </url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

/** The admin panel is for the owner, so it is kept out of search results. */
const robots = () => `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${absolute('/sitemap.xml')}\n`

/**
 * Writes sitemap.xml and robots.txt at build time from the brand config
 * and the route list, so changing the domain in brand.ts updates both.
 */
export function siteFiles(): Plugin {
  return {
    name: 'site-files',
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10)
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(today) })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots() })
    },
  }
}
