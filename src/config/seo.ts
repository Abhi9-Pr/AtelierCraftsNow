/**
 * Per-route page metadata and structured data. Read by two things: the
 * useSeo hook (tab title and head tags as visitors navigate) and the
 * route-heads build plugin (static HTML per route, for link previews and
 * crawlers that do not run JavaScript). Both hand in the same content, one
 * from the bundled app and one from the content folder. Keep this file free
 * of DOM and alias imports so the build can load it too.
 */
import { brand } from './brand.ts'
import { pickFeatured } from './featured.ts'
import { designPath, routes } from './nav.ts'
import type { Bookmark, Content } from '../types/index.ts'

type JsonLd = Record<string, unknown>

export interface PageMeta {
  title: string
  description: string
  path: string
  noindex?: boolean
  jsonLd?: JsonLd
}

export interface HeadTag {
  tag: 'meta' | 'link' | 'script'
  attrs: Record<string, string>
  text?: string
}

const absolute = (path: string) => `${brand.siteUrl}${path}`

/**
 * The address a page has once a host has finished with it. Static hosts serve a page from a folder, so /collection
 * is sent on to /collection/. A canonical address, a share address or a sitemap entry has to be the final one, or
 * it points search engines at a redirect.
 */
export const pageAddress = (path: string): string => absolute(path === '/' || path.endsWith('/') ? path : `${path}/`)

function organization(): JsonLd {
  return {
    '@type': 'Organization',
    '@id': absolute('/#organization'),
    name: brand.name,
    alternateName: brand.secondaryName,
    url: brand.siteUrl,
    email: brand.email,
    slogan: brand.taglines.primary,
    sameAs: [brand.social.instagram.url, brand.social.pinterest.url],
  }
}

function product(bookmark: Bookmark, category: string): JsonLd {
  return {
    '@type': 'Product',
    name: bookmark.title,
    description: bookmark.description,
    image: absolute(bookmark.artwork),
    category,
    brand: { '@id': absolute('/#organization') },
    ...(bookmark.priceINR === undefined
      ? {}
      : {
          offers: {
            '@type': 'Offer',
            price: String(bookmark.priceINR),
            priceCurrency: 'INR',
            url: pageAddress(routes.collection),
            availability: bookmark.available
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        }),
  }
}

const graph = (...nodes: JsonLd[]): JsonLd => ({
  '@context': 'https://schema.org',
  '@graph': nodes,
})

/** Metadata for every page, with structured data built from the given content. */
export function createPageMeta({ themes, bookmarks }: Pick<Content, 'themes' | 'bookmarks'>) {
  const category = (bookmark: Bookmark) =>
    themes.find((theme) => theme.slug === bookmark.theme)?.label ?? bookmark.theme

  return {
    home: {
      title: `${brand.name} | ${brand.taglines.primary}`,
      description: `${brand.name} makes dual-sided bookmarks. Hand-painted watercolor on the front, ruled paper for journaling on the back.`,
      path: routes.home,
      jsonLd: graph(
        organization(),
        ...pickFeatured(bookmarks).map((bookmark) => product(bookmark, category(bookmark))),
      ),
    },
    collection: {
      title: `Collection | ${brand.name}`,
      description:
        'The full collection of hand-painted watercolor bookmarks. Browse by theme. Every one has a ruled journaling side.',
      path: routes.collection,
      jsonLd: graph(organization(), {
        '@type': 'ItemList',
        name: `${brand.name} collection`,
        itemListElement: bookmarks.map((bookmark, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: product(bookmark, category(bookmark)),
        })),
      }),
    },
    custom: {
      title: `Custom Orders | ${brand.name}`,
      description:
        'Commission a set of bookmarks. Bulk orders, custom bookplate signatures and custom print themes, painted by hand and printed on heavy stock.',
      path: routes.custom,
    },
    privacy: {
      title: `Privacy | ${brand.name}`,
      description: `What ${brand.name} keeps when you send a request, who else handles it, and how to ask us to delete it.`,
      path: routes.privacy,
      noindex: true,
    },
    notFound: {
      title: `Page not found | ${brand.name}`,
      description: 'This page does not exist. The collection and the home page are a click away.',
      path: routes.home,
      noindex: true,
    },
  } satisfies Record<string, PageMeta>
}

/**
 * The page where a visitor designs the back of one bookmark. It is a working
 * page with its own design in the address, so it is kept out of search results.
 */
export function designMeta({ id, title }: Pick<Bookmark, 'id' | 'title'>): PageMeta {
  return {
    title: `Design the back of ${title} | ${brand.name}`,
    description: `Choose the picture, the lines and the words on the back of the ${title} bookmark.`,
    path: designPath(id),
    noindex: true,
  }
}

/** The pages that get their own pre-built HTML shell, in sitemap order. */
export const prerenderedPaths: readonly string[] = [routes.home, routes.collection, routes.custom]

const OG_IMAGE = { path: '/og-image.jpg', width: '1200', height: '630' }

/** `<` is escaped so structured data can never close its own script tag. */
const serialize = (data: JsonLd) => JSON.stringify(data).replace(/</g, '\\u003c')

export function headTags(meta: PageMeta): HeadTag[] {
  const tags: HeadTag[] = [
    { tag: 'meta', attrs: { name: 'description', content: meta.description } },
    meta.noindex
      ? { tag: 'meta', attrs: { name: 'robots', content: 'noindex' } }
      : { tag: 'link', attrs: { rel: 'canonical', href: pageAddress(meta.path) } },
    { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
    { tag: 'meta', attrs: { property: 'og:site_name', content: brand.name } },
    { tag: 'meta', attrs: { property: 'og:locale', content: 'en_IN' } },
    { tag: 'meta', attrs: { property: 'og:title', content: meta.title } },
    { tag: 'meta', attrs: { property: 'og:description', content: meta.description } },
    { tag: 'meta', attrs: { property: 'og:url', content: pageAddress(meta.path) } },
    { tag: 'meta', attrs: { property: 'og:image', content: absolute(OG_IMAGE.path) } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: OG_IMAGE.width } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: OG_IMAGE.height } },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: brand.taglines.primary } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
  ]

  if (meta.jsonLd) {
    tags.push({ tag: 'script', attrs: { type: 'application/ld+json' }, text: serialize(meta.jsonLd) })
  }
  return tags
}
