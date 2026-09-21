import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ROOT, main, query, readOptions } from './wrangler.mjs'

/*
 * Deletes orders you no longer need, so the details of customers are not kept for ever. It only touches orders
 * that are finished (delivered or cancelled) and whose last change is older than you say. It shows what it would
 * delete first, and deletes only when told to, and only if you have saved a backup in the last day.
 *
 *   npm run prune -- --older-than-months 24                see what would go (deletes nothing)
 *   npm run prune -- --older-than-months 24 --yes          delete them
 *   --local, --project <folder>                            the copy on this computer, as for backups
 *   --into <folder>                                        where the backups are
 *   --skip-backup-check                                    skip the backup check (do not, on the live database)
 */
const FINISHED = ['delivered', 'cancelled']
const DAY_MS = 24 * 60 * 60 * 1000

main(() => {
  const options = readOptions(process.argv.slice(2), { 'older-than-months': 'value', yes: 'flag', local: 'flag', project: 'value', into: 'value', 'skip-backup-check': 'flag' })
  const months = Number(options['older-than-months'])
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new Error('--older-than-months needs a whole number from 1 to 120. For example: npm run prune -- --older-than-months 24')

  const cutoff = new Date()
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months)
  const before = cutoff.toISOString()
  const target = { where: options.local ? 'local' : 'remote', project: options.project }
  const finished = FINISHED.map((status) => `'${status}'`).join(', ')
  const which = `status IN (${finished}) AND updated_at < '${before}'`

  const count = Number(query(`SELECT COUNT(*) AS n FROM orders WHERE ${which}`, target)[0]?.n ?? 0)
  const day = before.slice(0, 10)
  if (count === 0) {
    process.stdout.write(`No finished orders were last changed before ${day}. Nothing to delete.\n`)
    return
  }
  const noun = count === 1 ? 'order' : 'orders'
  if (!options.yes) {
    process.stdout.write(`Would delete ${count} finished ${noun}, and their history, last changed before ${day}.\nNothing has been deleted. Save a backup first (npm run backup), then add --yes to delete them.\n`)
    return
  }

  if (!options['skip-backup-check']) {
    const folder = resolve(ROOT, options.into ?? 'backups')
    const recent = existsSync(folder) && readdirSync(folder).some((name) => /^orders-.*\.sql$/.test(name) && Date.now() - statSync(join(folder, name)).mtimeMs < DAY_MS)
    if (!recent) throw new Error(`There is no backup from the last day in ${folder}, so nothing was deleted. Run npm run backup first.`)
  }

  query(`DELETE FROM order_events WHERE order_id IN (SELECT id FROM orders WHERE ${which})`, target)
  query(`DELETE FROM orders WHERE ${which}`, target)
  process.stdout.write(`Deleted ${count} finished ${noun}, and their history, last changed before ${day}.\n`)
})
