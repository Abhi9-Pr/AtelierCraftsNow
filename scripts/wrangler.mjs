import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

/** The project folder, which is where wrangler.d1.toml is. */
export const ROOT = resolve(import.meta.dirname, '..')

/**
 * Reads the options a command was given, such as `--remote` or `--keep 12`. A word after an option that is not
 * another option is its value. Anything that is not an option is an error, so a typo cannot pass unnoticed.
 */
export function readOptions(argv, known) {
  const options = {}
  for (let index = 0; index < argv.length; index++) {
    const name = argv[index]
    if (!name.startsWith('--') || !(name.slice(2) in known)) throw new Error(`I do not know "${name}". The options are: ${Object.keys(known).map((option) => `--${option}`).join(', ')}.`)
    const key = name.slice(2)
    if (known[key] === 'flag') options[key] = true
    else {
      const value = argv[++index]
      if (value === undefined || value.startsWith('--')) throw new Error(`--${key} needs a value after it.`)
      options[key] = value
    }
  }
  return options
}

const quote = (text) => `"${String(text).replace(/"/g, '\\"')}"`

/**
 * Runs wrangler against the orders database. `where` is "remote" for the live database or "local" for the copy on
 * this computer. `project` is a folder that holds its own wrangler.d1.toml and local state, for a copy of the database
 * that is not the one in this project. It is only for tests and trials.
 */
export function wrangler(subcommand, { where, project }) {
  const args = ['wrangler', ...subcommand, where === 'remote' ? '--remote' : '--local', '--config', 'wrangler.d1.toml']
  if (project) args.push('--cwd', project)
  const result = spawnSync('npx', args.map((part, position) => (position === 0 ? part : quote(part))), { cwd: ROOT, shell: true, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`wrangler did not finish:\n${(result.stderr || result.stdout || 'no message').trim()}`)
  return result.stdout
}

/** Runs one SQL statement and returns the rows it gives back. */
export function query(sql, target) {
  const output = wrangler(['d1', 'execute', 'DB', '--json', '--command', sql], target)
  return JSON.parse(output.slice(output.indexOf('[')))[0]?.results ?? []
}

/** Exits with a plain message instead of a stack trace, which is what someone running a command wants to see. */
export function main(run) {
  try {
    run()
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  }
}
