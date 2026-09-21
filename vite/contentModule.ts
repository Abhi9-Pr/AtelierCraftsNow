import path from 'node:path'
import type { Plugin } from 'vite'
import { writeCatalog } from './catalog.ts'
import { loadContent } from './content.ts'
import { checkImages } from './imageChecks.ts'

const MODULE_ID = 'virtual:content'
const RESOLVED_ID = `\0${MODULE_ID}`

const normalise = (file: string) => path.resolve(file).split(path.sep).join('/')

/**
 * Real hosts serve /admin/ from public/admin/index.html. Vite's own servers
 * would answer with the site's home page instead, so point them at the file.
 */
function serveAdminIndex(request: { url?: string }, _response: unknown, next: () => void): void {
  if (request.url === '/admin' || request.url === '/admin/') request.url = '/admin/index.html'
  next()
}

/**
 * Exposes the themes, art types, bookmarks and back-of-bookmark choices in the
 * content folder to the app as the module `virtual:content`. In dev, saving a
 * file in content/ (by hand or through the admin panel) reloads the page with
 * the change. Advice about pictures is printed once each, in dev and in builds.
 */
export function contentModule(): Plugin {
  let root = process.cwd()
  const told = new Set<string>()

  /**
   * Keeps what depends on the content in step with it: the copy the order functions check designs
   * against, and the advice about pictures. Errors in the content are reported by the module itself,
   * so they are left alone here.
   */
  async function syncWithContent(): Promise<string[]> {
    try {
      const content = await loadContent(root)
      await writeCatalog(root, content)
      const advice = (await checkImages(root, content)).filter((note) => !told.has(note))
      advice.forEach((note) => told.add(note))
      return advice
    } catch {
      return []
    }
  }

  return {
    name: 'content-module',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      return id === MODULE_ID ? RESOLVED_ID : undefined
    },
    async load(id) {
      if (id !== RESOLVED_ID) return undefined
      return `export default ${JSON.stringify(await loadContent(root))}`
    },
    async buildStart() {
      for (const note of await syncWithContent()) this.warn(note)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveAdminIndex)
    },
    configureServer(server) {
      server.middlewares.use(serveAdminIndex)
      const folder = normalise(path.join(root, 'content'))
      server.watcher.add(folder)
      server.watcher.on('all', (_event, file) => {
        if (!normalise(file).startsWith(`${folder}/`)) return
        const module = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
        void syncWithContent().then((advice) => advice.forEach((note) => server.config.logger.warn(note)))
      })
    },
  }
}
