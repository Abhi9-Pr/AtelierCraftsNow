import { execSync, spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { signSession } from '../../functions/_lib/session.ts'
import { ROOT, scratch } from './paths.ts'

export { ROOT }
/** Long enough to be accepted as a session secret, and not a real one. */
export const SECRET = 'a-long-random-test-secret-0123456789abcdef'
export const OWNER = 'tester'

export interface Options {
  /** Each test file uses its own port and its own database folder, so they can run one after another without trace */
  name: string
  port: number
  /** Extra settings for the functions, as the host would give them */
  bindings?: Record<string, string>
  /** Without a database the order functions answer "not configured" */
  database?: boolean
  /** The built site to serve. It is the project's own `dist` unless a test built one of its own. */
  site?: string
  /** Where the local database is kept, when a test needs to know. It is a folder of its own in the temporary folder unless given. */
  state?: string
}

export interface Server {
  base: string
  /** The value of a signed-in owner's cookie */
  cookie: string
  stop: () => void
  /**
   * Runs `work` with the server stopped, then starts it again on the same saved state. The local database
   * cannot be read from outside while the server has it open.
   */
  offline: <T>(work: () => T) => Promise<T>
  /** Runs SQL against the local database. Only while the server is stopped, so use it inside `offline`. */
  sql: (command: string) => Record<string, unknown>[]
}

/**
 * Starts the built site (`dist`) with its functions, on Cloudflare's own local runtime and a real local
 * database. It is the site as the host would run it, so `npm run build` must have been run first.
 */
export async function startServer({ name, port, bindings = {}, database = true, site = join(ROOT, 'dist'), state = scratch(name) }: Options): Promise<Server> {
  rmSync(state, { recursive: true, force: true })
  mkdirSync(state, { recursive: true })
  if (database) execSync(`npx wrangler d1 migrations apply DB --local --config wrangler.d1.toml --persist-to "${state}"`, { cwd: ROOT, stdio: 'pipe' })

  const base = `http://127.0.0.1:${port}`
  const settings = { SESSION_SECRET: SECRET, ADMIN_GITHUB_USERS: OWNER, ...bindings }
  let child: ChildProcess | undefined

  const stop = (): void => {
    if (!child?.pid) return
    try {
      execSync(process.platform === 'win32' ? `taskkill /PID ${child.pid} /T /F` : `kill -9 -${child.pid}`, { stdio: 'ignore' })
    } catch {
      // Already gone.
    }
    child = undefined
  }
  const start = async (): Promise<void> => {
    const args = ['wrangler', 'pages', 'dev', `"${site}"`, '--port', String(port), '--persist-to', state]
    if (database) args.push('--d1', 'DB=atelier-local')
    for (const [key, value] of Object.entries(settings)) args.push('--binding', `${key}=${value}`)
    child = spawn('npx', args, { cwd: ROOT, shell: true, stdio: 'ignore' })
    for (let attempt = 0; attempt < 120; attempt++) {
      try {
        if ((await fetch(`${base}/api/admin/session`)).status === 401) return
      } catch {
        // Not up yet.
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 500))
    }
    throw new Error(`The local server on port ${port} did not start.`)
  }

  // A test that fails half way must not leave the server, or the browser waiting on it, running.
  const abandon = (error: unknown): never => {
    stop()
    console.error(error)
    process.exit(1)
  }
  process.on('exit', stop)
  process.on('uncaughtException', abandon)
  process.on('unhandledRejection', abandon)
  await start()
  return {
    base,
    cookie: `atelier_admin=${await signSession(OWNER, SECRET, Math.floor(Date.now() / 1000))}`,
    stop,
    offline: async (work) => {
      stop()
      await new Promise((resolveWait) => setTimeout(resolveWait, 1500))
      try {
        return work()
      } finally {
        await start()
      }
    },
    sql: (command) => {
      const out = execSync(`npx wrangler d1 execute DB --local --persist-to "${state}" --config wrangler.d1.toml --json --command "${command}"`, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      return (JSON.parse(out.slice(out.indexOf('['))) as { results: Record<string, unknown>[] }[])[0]?.results ?? []
    },
  }
}
