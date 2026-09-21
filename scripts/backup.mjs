import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ROOT, main, readOptions, wrangler } from './wrangler.mjs'

/*
 * Saves every order, with its history, to one SQL file. The file can rebuild the database from nothing (see
 * docs/BACKUP.md). It holds your customers' details, so it goes into `backups`, which git ignores.
 *
 *   npm run backup                 the live database
 *   npm run backup -- --local      the copy on this computer
 *   npm run backup -- --keep 12    afterwards, delete all but the 12 newest backups
 *   --into <folder>                keep the files somewhere else
 *   --project <folder>             a folder with its own local copy of the database (for trials)
 */
main(() => {
  const options = readOptions(process.argv.slice(2), { local: 'flag', keep: 'value', into: 'value', project: 'value' })
  const keep = options.keep === undefined ? null : Number(options.keep)
  if (keep !== null && (!Number.isInteger(keep) || keep < 1)) throw new Error('--keep needs a whole number of 1 or more.')

  const folder = resolve(ROOT, options.into ?? 'backups')
  mkdirSync(folder, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const file = join(folder, `orders-${stamp}.sql`)

  wrangler(['d1', 'export', 'DB', '--output', file], { where: options.local ? 'local' : 'remote', project: options.project })

  if (!existsSync(file) || statSync(file).size === 0) throw new Error('The export finished but the file is empty. Nothing was saved.')
  const text = readFileSync(file, 'utf8')
  if (!/CREATE TABLE\s+["`]?orders["`]?/i.test(text)) throw new Error('The file was saved but does not describe the orders table, so it cannot be trusted. Do not rely on it.')
  const orders = (text.match(/INSERT INTO\s+["`]?orders["`]?\s/gi) ?? []).length
  process.stdout.write(`Saved ${orders} ${orders === 1 ? 'order' : 'orders'}, with their history, to ${file}\n`)
  process.stdout.write('This file holds your customers’ details. Keep it private, and do not put it in the project’s git history.\n')

  if (keep !== null) {
    const backups = readdirSync(folder).filter((name) => /^orders-.*\.sql$/.test(name)).sort()
    const old = backups.slice(0, Math.max(0, backups.length - keep))
    for (const name of old) unlinkSync(join(folder, name))
    if (old.length > 0) process.stdout.write(`Removed ${old.length} older ${old.length === 1 ? 'backup' : 'backups'}, keeping the newest ${keep}.\n`)
  }
})
