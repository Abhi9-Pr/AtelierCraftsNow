import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { check } from '../helpers/check.ts'
import { ROOT } from '../helpers/paths.ts'

/*
 * The house rules for the code, checked on every run. The site's own code (src, vite, functions) gets all of them.
 * The tests get the ones about how code is written, though not the ones about what is used, since a test's helpers
 * are used by other tests.
 */
const walk = (folder: string): string[] =>
  readdirSync(folder).flatMap((name) => {
    const full = path.join(folder, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
const rel = (file: string): string => path.relative(ROOT, file).split(path.sep).join('/')
const isCode = (file: string): boolean => /\.(ts|tsx)$/.test(file)
const read = (files: string[]): Record<string, string> => Object.fromEntries(files.map((file) => [rel(file), readFileSync(file, 'utf8')]))

const siteFiles = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'vite')), ...walk(path.join(ROOT, 'functions')), path.join(ROOT, 'vite.config.ts')].filter(isCode)
const src = read(siteFiles)
const testFiles = walk(path.join(ROOT, 'tests')).filter(isCode).filter((file) => rel(file) !== 'tests/unit/rules.test.ts')
const written = { ...src, ...read(testFiles) }

// strict mode, no any, no non-null assertions, no suppressions
const tsconfigs = ['tsconfig.app.json', 'tsconfig.node.json', 'functions/tsconfig.json', 'tests/tsconfig.json', 'tests/e2e/tsconfig.json'].map((file) => readFileSync(path.join(ROOT, file), 'utf8'))
check('strict mode is on in every TypeScript project', tsconfigs.every((text) => /"strict":\s*true/.test(text)))
const anyUse = Object.entries(written).flatMap(([file, text]) => [...text.matchAll(/:\s*any\b|\bas any\b|<any>|any\[\]/g)].map(() => file))
check('no `any` anywhere, tests included', anyUse.length === 0, anyUse.join(', '))
const ignores = Object.entries(written).filter(([, text]) => /@ts-ignore|@ts-expect-error|@ts-nocheck|eslint-disable|oxlint-disable/.test(text)).map(([file]) => file)
check('no compiler or linter suppressions', ignores.length === 0, ignores.join(', '))
const nonNull = Object.entries(written).flatMap(([file, text]) => [...text.matchAll(/[\w)\]]!\s*[.[(]|[\w)\]]!\s*;/g)].map((match) => `${file}: ${match[0]}`))
check('no non-null assertions (x!.y)', nonNull.length === 0, nonNull.join(' | '))

// leftovers
const todo = Object.entries(written).filter(([, text]) => /\bTODO\b|\bFIXME\b|\bXXX\b|\bHACK\b/.test(text)).map(([file]) => file)
check('no TODO or FIXME left in code', todo.length === 0, todo.join(', '))
const logs = Object.entries(written).filter(([, text]) => /console\.(log|debug|info)/.test(text)).map(([file]) => file)
check('no console logging', logs.length === 0, logs.join(', '))

// commented-out code: a // comment line that reads like a statement
const STATEMENT = /^\/\/\s*(import |export |const |let |return |if \(|for \(|<[A-Za-z]|\w+\(.*\);?$|\w+ = )/
const commented = Object.entries(written).flatMap(([file, text]) =>
  text
    .split('\n')
    .map((line, index) => ({ line: line.trim(), number: index + 1 }))
    .filter(({ line }) => STATEMENT.test(line))
    .map(({ line, number }) => `${file}:${number} ${line.slice(0, 50)}`),
)
check('no commented-out code', commented.length === 0, commented.join(' | '))

// size
const sized = Object.entries(src)
  .filter(([file]) => /components\/|pages\/|hooks\//.test(file))
  .map(([file, text]): [string, number] => [file, text.split('\n').length])
  .sort((a, b) => b[1] - a[1])
const long = sized.filter(([, lines]) => lines > 150)
check('every component, page and hook is 150 lines or fewer', long.length === 0, `largest: ${sized[0]?.[0]} (${sized[0]?.[1]} lines)`)

// dead code: exports that nothing else uses
const exportsFound: [string, string][] = []
for (const [file, text] of Object.entries(src)) {
  for (const match of text.matchAll(/^export (?:default )?(?:async )?(?:function|const|class|interface|type|enum)\s+(\w+)/gm)) exportsFound.push([file, match[1] ?? ''])
}
const unused = exportsFound.filter(([file, name]) => {
  if (/main\.tsx$/.test(file)) return false
  // Cloudflare calls a route file's handlers by name, so nothing imports them.
  if (/^functions\/api\//.test(file) && /^onRequest/.test(name)) return false
  const word = new RegExp(`\\b${name}\\b`, 'g')
  return !Object.entries(src).some(([other, text]) => (other === file ? (text.match(word) ?? []).length > 1 : word.test(text)))
})
check('every export is used somewhere (no dead exports)', unused.length === 0, unused.map(([file, name]) => `${file}:${name}`).join(', '))

// orphan files: a source file that nothing imports
const all = Object.values(src).join('\n')
const orphans = Object.keys(src).filter((file) => {
  const base = path.posix.basename(file).replace(/\.d\.ts$|\.tsx?$/, '')
  if (['main', 'vite-env', 'react-inert'].includes(base) || file === 'vite.config.ts') return false
  // Each file under functions/api is a route of its own, reached by address, not by import.
  if (/^functions\/api\//.test(file)) return false
  // The other two email relays are documented swap-ins (docs/SETUP.md), chosen by editing relay/index.ts.
  if (/^src\/lib\/relay\/(formspree|netlify)\.ts$/.test(file)) return false
  return !new RegExp(`from ['"][^'"]*/${base}(\\.ts)?['"]|from ['"]\\./${base}['"]`).test(all)
})
check('every source file is imported by another', orphans.length === 0, orphans.join(', '))
