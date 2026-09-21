import { execFileSync, execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { orderStatuses } from '../../src/config/orderStatuses.ts'
import { buildSite } from '../helpers/build.ts'
import { check } from '../helpers/check.ts'
import { ROOT, scratch } from '../helpers/paths.ts'
import { startServer } from '../helpers/server.ts'

/*
 * Backing up and pruning, on a real local database. A backup must be able to rebuild the database from nothing, with
 * every order and its history the same, and pruning must delete exactly the finished, old orders it says it will,
 * only when told to, and only after a backup.
 */
// A folder set up like a small project of its own (its own wrangler.d1.toml and local state), so the tools can be aimed at it.
const project = scratch('backup-project')
rmSync(project, { recursive: true, force: true })
mkdirSync(project, { recursive: true })
copyFileSync(join(ROOT, 'wrangler.d1.toml'), join(project, 'wrangler.d1.toml'))
const state = join(project, '.wrangler', 'state')
const server = await startServer({ name: 'backup', port: 8806, site: buildSite('backup'), state })
const cookie = server.cookie
let sender = 0
const place = async (name: string): Promise<string> => {
  const response = await fetch(`${server.base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': `203.0.113.${++sender}` }, body: JSON.stringify({ name, email: `${name.toLowerCase().replace(/\s/g, '.')}@example.com`, requestType: 'other', idea: `Idea from ${name}` }) })
  return ((await response.json()) as { id: string }).id
}
const change = (id: string, body: unknown) => fetch(`${server.base}/api/admin/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: server.base }, body: JSON.stringify(body) })

const oldDelivered = await place('Old Delivered')
const oldCancelled = await place('Old Cancelled')
await place('Old Still Open')
const recentDelivered = await place('Recent Delivered')
const fresh = await place('Fresh Order')
await change(oldDelivered, { status: 'delivered', note: 'Sent and paid' })
await change(oldCancelled, { status: 'cancelled' })
await change(recentDelivered, { status: 'delivered' })
await change(fresh, { note: 'Waiting for a reply' })
server.stop()
await new Promise((resolve) => setTimeout(resolve, 1500))

const sql = (command: string, where = state): Record<string, unknown>[] => {
  const out = execSync(`npx wrangler d1 execute DB --local --persist-to "${where}" --config wrangler.d1.toml --json --command "${command}"`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return (JSON.parse(out.slice(out.indexOf('['))) as { results: Record<string, unknown>[] }[])[0]?.results ?? []
}
const ago = (months: number): string => {
  const date = new Date()
  date.setUTCMonth(date.getUTCMonth() - months)
  return date.toISOString()
}
sql(`UPDATE orders SET updated_at = '${ago(30)}' WHERE name IN ('Old Delivered', 'Old Cancelled', 'Old Still Open')`)
sql(`UPDATE orders SET updated_at = '${ago(2)}' WHERE name = 'Recent Delivered'`)

interface Ran {
  status: number
  out: string
  err: string
}
const run = (script: string, ...args: string[]): Ran => {
  try {
    const out = execFileSync('node', [join(ROOT, 'scripts', script), ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return { status: 0, out, err: '' }
  } catch (error) {
    const failed = error as { status?: number; stdout?: string; stderr?: string }
    return { status: failed.status ?? 1, out: failed.stdout ?? '', err: failed.stderr ?? '' }
  }
}
const folder = scratch('backup-files')
const empty = scratch('backup-none')
for (const path of [folder, empty]) {
  rmSync(path, { recursive: true, force: true })
  mkdirSync(path, { recursive: true })
}
const local = ['--local', '--project', project]
const count = (table: string, where = state): number => Number(sql(`SELECT COUNT(*) AS n FROM ${table}`, where)[0]?.n)
const listing = (where: string): string => JSON.stringify(sql('SELECT number, status, name, email, created_at, updated_at, idea FROM orders ORDER BY number', where)) + JSON.stringify(sql('SELECT order_id, at, kind, from_status, to_status, note, by FROM order_events ORDER BY id', where))

// ---------- 1. a backup ----------
const first = run('backup.mjs', ...local, '--into', folder)
const files = (): string[] => readdirSync(folder).filter((name) => /^orders-.*\.sql$/.test(name)).sort()
check('a backup says how many orders it saved and where, and warns that the file is private', first.status === 0 && /Saved 5 orders, with their history, to /.test(first.out) && /Keep it private/.test(first.out), first.out + first.err)
check('it makes one file, named by the moment it was made', files().length === 1 && /^orders-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.sql$/.test(files()[0] ?? ''))
const saved = readFileSync(join(folder, files()[0] ?? ''), 'utf8')
check('the file describes the tables and holds every order and every event', /CREATE TABLE\s+["`]?orders/i.test(saved) && /CREATE TABLE\s+["`]?order_events/i.test(saved) && (saved.match(/INSERT INTO\s+["`]?orders["`]?\s/gi) ?? []).length === 5 && (saved.match(/INSERT INTO\s+["`]?order_events["`]?\s/gi) ?? []).length === count('order_events'))
check('customers\' details are in it, which is why it must be kept private', /Old Delivered/.test(saved) && /old\.delivered@example\.com/.test(saved))

// ---------- 2. the backup rebuilds the database ----------
const rebuilt = scratch('backup-rebuilt')
rmSync(rebuilt, { recursive: true, force: true })
execSync(`npx wrangler d1 execute DB --local --persist-to "${rebuilt}" --config wrangler.d1.toml --file "${join(folder, files()[0] ?? '')}"`, { cwd: ROOT, stdio: 'pipe' })
check('restored into an empty database, every order and every event is the same as the original', count('orders', rebuilt) === 5 && listing(rebuilt) === listing(state))
check('and the restored database still keeps its rules: the next order takes the next number', Number(sql('SELECT COALESCE(MAX(number), 1000) + 1 AS next FROM orders', rebuilt)[0]?.next) === 1006)

// ---------- 3. keeping only the newest ----------
await new Promise((resolve) => setTimeout(resolve, 1200))
const second = run('backup.mjs', ...local, '--into', folder, '--keep', '1')
check('--keep leaves only the newest backup, and says so', second.status === 0 && files().length === 1 && /Removed 1 older backup, keeping the newest 1/.test(second.out), second.out + second.err)
check('a bad --keep is refused with a plain message', run('backup.mjs', ...local, '--into', folder, '--keep', '0').err.includes('whole number of 1 or more'))
check('an option it does not know is refused, naming it', /I do not know "--remove"/.test(run('backup.mjs', '--remove').err))
check('a missing value is refused', /--into needs a value/.test(run('backup.mjs', '--into').err))

// ---------- 4. pruning ----------
check('the tool only touches orders that are finished', ['delivered', 'cancelled'].every((status) => (orderStatuses as readonly string[]).includes(status)))
for (const bad of ['0', '121', 'abc', '1.5']) check(`a bad age is refused: ${bad}`, run('prune.mjs', ...local, '--older-than-months', bad).status === 1)
check('with no age at all it asks for one, with an example', /--older-than-months needs a whole number/.test(run('prune.mjs', ...local).err))
const dry = run('prune.mjs', ...local, '--older-than-months', '24')
check('by default it only says what it would delete: the old finished orders, and nothing else', dry.status === 0 && /Would delete 2 finished orders/.test(dry.out) && /Nothing has been deleted/.test(dry.out), dry.out + dry.err)
check('and the database is untouched', count('orders') === 5 && count('order_events') > 0)
const noBackup = run('prune.mjs', ...local, '--older-than-months', '24', '--yes', '--into', empty)
check('told to delete, it refuses when there is no backup from the last day', noBackup.status === 1 && /no backup from the last day/.test(noBackup.err) && count('orders') === 5, noBackup.err)
const events = count('order_events')
const done = run('prune.mjs', ...local, '--older-than-months', '24', '--yes', '--into', folder)
check('with a recent backup it deletes them, and says how many', done.status === 0 && /Deleted 2 finished orders/.test(done.out), done.out + done.err)
const remaining = sql('SELECT name FROM orders ORDER BY number').map((row) => String(row.name))
check('the old order that is still open stays, and so do the recent finished one and the new one', JSON.stringify(remaining) === JSON.stringify(['Old Still Open', 'Recent Delivered', 'Fresh Order']), remaining.join(','))
check('the history of the deleted orders went with them, and no other history did', Number(sql('SELECT COUNT(*) AS n FROM order_events WHERE order_id NOT IN (SELECT id FROM orders)')[0]?.n) === 0 && count('order_events') < events && count('order_events') >= 3)
check('run again there is nothing left to delete', /Nothing to delete/.test(run('prune.mjs', ...local, '--older-than-months', '24', '--yes', '--into', folder).out))
check('a customer who asked to be forgotten is no longer in the database, but is still in the older backup, which must be cleared too', !JSON.stringify(sql('SELECT * FROM orders')).includes('Old Delivered') && existsSync(join(folder, files()[0] ?? '')))
