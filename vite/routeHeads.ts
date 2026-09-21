import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { pickFeatured } from '../src/config/featured.ts'
import { HERO_IMAGE_SIZES } from '../src/config/heroImage.ts'
import { designPath } from '../src/config/nav.ts'
import { createPageMeta, designMeta, headTags, type PageMeta } from '../src/config/seo.ts'
import type { Content } from '../src/types/index.ts'
import { getArtworkAssets } from './artworkAssets.ts'
import { loadContent } from './content.ts'

const escapeAttribute = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;')

function renderTags(meta: PageMeta): string {
  return headTags(meta)
    .map(({ tag, attrs, text }) => {
      const attributes = Object.entries(attrs)
        .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
        .join('')
      // Structured data is already JSON with `<` escaped; it must not be HTML-escaped.
      return tag === 'script'
        ? `<script${attributes} data-seo>${text ?? ''}</script>`
        : `<${tag}${attributes} data-seo />`
    })
    .join('\n    ')
}

/** Starts the hero image downloading with the HTML, instead of after the JavaScript has drawn the card. */
async function heroPreload(root: string, content: Content): Promise<string> {
  const hero = pickFeatured(content.bookmarks)[0]
  const asset = hero ? (await getArtworkAssets(root)).get(hero.artwork) : undefined
  if (!asset) return ''
  const srcset = escapeAttribute(asset.srcSet)
  const sizes = escapeAttribute(HERO_IMAGE_SIZES)
  return `\n    <link rel="preload" as="image" type="image/webp" imagesrcset="${srcset}" imagesizes="${sizes}" fetchpriority="high" data-seo />`
}

/** Swaps the title and the data-seo tags in a built HTML page for one route's. */
function retarget(html: string, meta: PageMeta, extraTags = ''): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeText(meta.title)}</title>`)
    .replace(/\s*<script[^>]*data-seo[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/\s*<(?:meta|link)[^>]*data-seo[^>]*>/g, '')
    .replace('</head>', `    ${renderTags(meta)}${extraTags}\n  </head>`)
}

/**
 * Bakes each route's title, Open Graph tags and structured data into
 * static HTML, so link previews and crawlers that skip JavaScript see the
 * right page. The home page is index.html; the other routes are written
 * as <route>/index.html, which every static host serves at /<route>. A
 * noindex 404.html is written too, and the app draws the 404 page itself.
 */
export function routeHeads(): Plugin {
  let root = process.cwd()

  return {
    name: 'route-heads',
    // Runs after Vite's own HTML plugin, which is what puts index.html in the bundle.
    enforce: 'post',
    configResolved(config) {
      root = config.root
    },
    async transformIndexHtml(html, context) {
      // Only the visitor-facing page gets the home page's tags. The owner's dashboard has its own head.
      if (resolve(context.filename) !== resolve(root, 'index.html')) return html
      const content = await loadContent(root)
      return retarget(html, createPageMeta(content).home, await heroPreload(root, content))
    },
    async generateBundle(_options, bundle) {
      const index = bundle['index.html']
      if (index?.type !== 'asset') return
      const source =
        typeof index.source === 'string' ? index.source : new TextDecoder().decode(index.source)

      const content = await loadContent(root)
      const pages = createPageMeta(content)
      for (const meta of [pages.home, pages.collection, pages.custom, pages.privacy]) {
        if (meta.path === pages.home.path) continue
        this.emitFile({
          type: 'asset',
          fileName: `${meta.path.slice(1)}/index.html`,
          source: retarget(source, meta),
        })
      }

      // Each bookmark has a design page, so it needs its own file too, or a direct link would get the 404 page.
      for (const bookmark of content.bookmarks) {
        this.emitFile({
          type: 'asset',
          fileName: `${designPath(bookmark.id).slice(1)}/index.html`,
          source: retarget(source, designMeta(bookmark)),
        })
      }

      // Static hosts serve 404.html, with a 404 status, for any address that matches no file.
      this.emitFile({ type: 'asset', fileName: '404.html', source: retarget(source, pages.notFound) })
    },
  }
}
