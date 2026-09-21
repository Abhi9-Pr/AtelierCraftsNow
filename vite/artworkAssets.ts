import { readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import type { Plugin } from 'vite'

const MODULE_ID = 'virtual:artwork-assets'
const RESOLVED_ID = `\0${MODULE_ID}`
const ARTWORK_DIR = 'public/artwork'
const IMAGE = /\.(jpe?g|png|webp)$/i
// Two sizes keep the browser's choice predictable: 300 for 1x screens, 600 for 2x and up.
// (Chrome does not always take the tightest fit from a longer list.)
const WIDTHS = [300, 600]
const VARIANT_URL = /^\/artwork\/(.+)-(\d+)\.webp$/

export interface ArtworkAsset {
  /** 16px blurred stand-in, as a data URI */
  placeholder: string
  /** srcset value listing the WebP variants */
  srcSet: string
  variants: { fileName: string; data: Buffer }[]
}

const cache = new Map<string, Promise<Map<string, ArtworkAsset>>>()

const resize = (source: string, width: number) =>
  sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 78 })

async function buildAssets(root: string): Promise<Map<string, ArtworkAsset>> {
  const directory = path.join(root, ARTWORK_DIR)
  const files = (await readdir(directory)).filter((file) => IMAGE.test(file)).sort()
  const assets = new Map<string, ArtworkAsset>()

  for (const file of files) {
    const source = path.join(directory, file)
    const base = file.replace(IMAGE, '')
    const tiny = await sharp(source).resize({ width: 16 }).jpeg({ quality: 45 }).toBuffer()

    const variants: ArtworkAsset['variants'] = []
    const seen = new Set<number>()
    for (const width of WIDTHS) {
      const { data, info } = await resize(source, width).toBuffer({ resolveWithObject: true })
      if (seen.has(info.width)) continue
      seen.add(info.width)
      variants.push({ fileName: `artwork/${base}-${info.width}.webp`, data })
    }

    assets.set(`/artwork/${file}`, {
      placeholder: `data:image/jpeg;base64,${tiny.toString('base64')}`,
      srcSet: variants.map((v) => `/${v.fileName} ${v.fileName.match(/-(\d+)\.webp$/)?.[1]}w`).join(', '),
      variants,
    })
  }
  return assets
}

/** Forgets the built assets, so the next request rebuilds them (used when a picture changes in dev). */
export function clearArtworkAssets(root: string): void {
  cache.delete(root)
}

/** Built once per project root and shared by every plugin that needs it. */
export function getArtworkAssets(root: string): Promise<Map<string, ArtworkAsset>> {
  let assets = cache.get(root)
  if (!assets) {
    assets = buildAssets(root)
    cache.set(root, assets)
  }
  return assets
}

/**
 * For every file in public/artwork, provides a tiny blurred placeholder and
 * 300 and 600 px WebP variants, all generated from the original at
 * build time. Drop in a new image and they follow. The variants are served
 * on demand in dev and written to dist/artwork at build.
 */
export function artworkAssets(): Plugin {
  let root = process.cwd()

  return {
    name: 'artwork-assets',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      return id === MODULE_ID ? RESOLVED_ID : undefined
    },
    async load(id) {
      if (id !== RESOLVED_ID) return undefined
      const assets = await getArtworkAssets(root)
      const exported = Object.fromEntries(
        [...assets].map(([key, asset]) => [key, { placeholder: asset.placeholder, srcSet: asset.srcSet }]),
      )
      return `export default ${JSON.stringify(exported)}`
    },
    configureServer(server) {
      // A picture added or replaced while the dev server runs gets its placeholder and sizes too.
      const folder = path.resolve(root, ARTWORK_DIR).split(path.sep).join('/')
      server.watcher.add(folder)
      server.watcher.on('all', (_event, file) => {
        if (!path.resolve(file).split(path.sep).join('/').startsWith(`${folder}/`)) return
        clearArtworkAssets(root)
        const module = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      })

      server.middlewares.use(async (request, response, next) => {
        const match = VARIANT_URL.exec((request.url ?? '').split('?')[0] ?? '')
        if (!match) return next()
        const [, base, width] = match
        const assets = await getArtworkAssets(root)
        const variant = [...assets.values()]
          .flatMap((asset) => asset.variants)
          .find((v) => v.fileName === `artwork/${base}-${width}.webp`)
        if (!variant) return next()
        response.setHeader('Content-Type', 'image/webp')
        response.end(variant.data)
      })
    },
    async generateBundle() {
      const assets = await getArtworkAssets(root)
      for (const asset of assets.values()) {
        for (const variant of asset.variants) {
          this.emitFile({ type: 'asset', fileName: variant.fileName, source: variant.data })
        }
      }
    },
  }
}
