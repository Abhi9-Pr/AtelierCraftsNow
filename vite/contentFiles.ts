import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type Raw = Record<string, unknown>

export interface Entry {
  slug: string
  file: string
  data: Raw
}

export const blank = (value: unknown) => value === undefined || value === null || value === ''

/** Reads every .json file in a folder. The file name, without .json, is the entry's slug. */
export async function readEntries(root: string, dir: string, problems: string[]): Promise<Entry[]> {
  let names: string[]
  try {
    names = (await readdir(path.join(root, dir))).filter((name) => name.endsWith('.json')).sort()
  } catch {
    return []
  }

  const entries: Entry[] = []
  for (const name of names) {
    const file = `${dir}/${name}`
    const slug = name.replace(/\.json$/, '')
    if (!SLUG.test(slug)) problems.push(`${file}: the file name must be lowercase letters, numbers and hyphens`)
    try {
      const parsed: unknown = JSON.parse(await readFile(path.join(root, file), 'utf8'))
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        problems.push(`${file}: expected an object`)
      } else {
        entries.push({ slug, file, data: parsed as Raw })
      }
    } catch (error) {
      problems.push(`${file}: not valid JSON (${error instanceof Error ? error.message : 'unreadable'})`)
    }
  }
  return entries
}

export function text(entry: Entry, key: string, problems: string[]): string {
  const value = entry.data[key]
  if (typeof value === 'string' && value.trim()) return value.trim()
  problems.push(`${entry.file}: "${key}" is required`)
  return ''
}

/** Text that may be left out. Anything other than text is reported. */
export function optionalText(entry: Entry, key: string, problems: string[]): string | undefined {
  const value = entry.data[key]
  if (blank(value)) return undefined
  if (typeof value === 'string') return value.trim() || undefined
  problems.push(`${entry.file}: "${key}" must be text`)
  return undefined
}

export function flag(entry: Entry, key: string, fallback: boolean, problems: string[]): boolean {
  const value = entry.data[key]
  if (blank(value)) return fallback
  if (typeof value === 'boolean') return value
  problems.push(`${entry.file}: "${key}" must be true or false`)
  return fallback
}

export function whole(entry: Entry, key: string, problems: string[]): number | undefined {
  const value = entry.data[key]
  if (blank(value)) return undefined
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value
  problems.push(`${entry.file}: "${key}" must be a whole number, 0 or more`)
  return undefined
}

/** One of a fixed list of words. Left out is fine here. A word not on the list is reported. */
export function oneOf<T extends string>(
  entry: Entry,
  key: string,
  allowed: readonly T[],
  problems: string[],
): T | undefined {
  const value = entry.data[key]
  if (blank(value)) return undefined
  const match = allowed.find((word) => word === value)
  if (match === undefined) problems.push(`${entry.file}: "${key}" must be one of: ${allowed.join(', ')}`)
  return match
}

/** Like oneOf, but leaving it out is reported too. */
export function requiredOneOf<T extends string>(
  entry: Entry,
  key: string,
  allowed: readonly T[],
  problems: string[],
): T | undefined {
  const value = oneOf(entry, key, allowed, problems)
  if (value === undefined && blank(entry.data[key])) problems.push(`${entry.file}: "${key}" is required`)
  return value
}

export const byOrder = (a: { order: number | undefined }, b: { order: number | undefined }) =>
  (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY)

/** True when a picture path sits under the given public folder and the file is there. */
export async function pictureExists(root: string, picture: string, prefix: string): Promise<boolean> {
  if (!picture.startsWith(prefix) || picture.includes('..')) return false
  return access(path.join(root, 'public', picture)).then(() => true, () => false)
}
