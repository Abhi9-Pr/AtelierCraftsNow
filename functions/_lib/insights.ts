import { designPicks, NONE, OFF, ON, OWN_WORDS, pickWords, type Pick } from '../../src/lib/back/designPicks.ts'
import type { ApiInsights, InsightBookmark, InsightGroup, InsightOption } from '../../src/types/insights.ts'
import type { DesignSnapshot } from '../../src/types/orders.ts'
import type { Catalog } from './catalog.ts'

const DAY_MS = 24 * 60 * 60 * 1000
/** More design orders than this in one period are counted, but only this many are read for their choices. */
const READ_ORDERS = 2000

/** A day as YYYY-MM-DD in UTC, which is how the counts are kept. */
export const dayOf = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

/** Counts one design page visit and the choices it ended with. Only counts are kept. */
export async function recordVisit(db: D1Database, day: string, bookmarkId: string, picks: readonly Pick[]): Promise<void> {
  await db.batch([
    db
      .prepare('INSERT INTO design_visits (day, bookmark_id, visits) VALUES (?1, ?2, 1) ON CONFLICT (day, bookmark_id) DO UPDATE SET visits = visits + 1')
      .bind(day, bookmarkId),
    ...picks.map((pick) =>
      db
        .prepare(
          'INSERT INTO option_picks (day, bookmark_id, group_slug, option_key, picks) VALUES (?1, ?2, ?3, ?4, 1) ON CONFLICT (day, bookmark_id, group_slug, option_key) DO UPDATE SET picks = picks + 1',
        )
        .bind(day, bookmarkId, pick.group, pick.option),
    ),
  ])
}

const keyOf = (group: string, option: string): string => `${group}\u0000${option}`

/** Every choice a category offers, so a choice nobody has picked shows as zero and not as missing. */
function offered(catalog: Catalog): { groups: InsightGroup[]; rows: Map<string, InsightOption> } {
  const rows = new Map<string, InsightOption>()
  const groups = catalog.back.map((group): InsightGroup => {
    const options: InsightOption[] = group.options.map((option) => ({ key: option.slug, label: option.label, picks: 0, requested: 0 }))
    const words = group.kind === 'toggle' ? [ON, OFF] : group.required ? [] : [NONE]
    if (group.allowCustomText) words.push(OWN_WORDS)
    for (const word of words) options.push({ key: word, label: pickWords[word] ?? word, picks: 0, requested: 0 })
    for (const option of options) rows.set(keyOf(group.slug, option.key), option)
    return { slug: group.slug, label: group.label, options }
  })
  return { groups, rows }
}

const number = (value: unknown): number => (typeof value === 'number' ? value : 0)

/**
 * What the owner's Insights page shows: design page visits and back design requests per bookmark, and how
 * often each choice was picked on purpose, both by visitors and in the requests that were sent. The period is
 * the last `days` days, today included, in UTC. `bookmark` narrows all of it to one bookmark.
 */
export async function readInsights(db: D1Database, catalog: Catalog, days: number, bookmark: string | null, nowMs: number): Promise<ApiInsights> {
  const since = dayOf(nowMs - (days - 1) * DAY_MS)
  const sinceTime = `${since}T00:00:00.000Z`
  const only = bookmark ? ' AND bookmark_id = ?2' : ''
  const args = (...first: (string | number)[]) => (bookmark ? [...first, bookmark] : first)

  const [visitRows, pickRows, requestRows, orderCount, snapshots] = await db.batch<Record<string, unknown>>([
    db.prepare(`SELECT bookmark_id AS id, SUM(visits) AS n FROM design_visits WHERE day >= ?1${only} GROUP BY bookmark_id`).bind(...args(since)),
    db.prepare(`SELECT group_slug AS g, option_key AS k, SUM(picks) AS n FROM option_picks WHERE day >= ?1${only} GROUP BY group_slug, option_key`).bind(...args(since)),
    db.prepare(`SELECT bookmark_id AS id, COUNT(*) AS n FROM orders WHERE created_at >= ?1 AND bookmark_id IS NOT NULL${only} GROUP BY bookmark_id`).bind(...args(sinceTime)),
    db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE created_at >= ?1${only}`).bind(...args(sinceTime)),
    db
      .prepare(`SELECT design_json AS json FROM orders WHERE created_at >= ?1 AND design_json IS NOT NULL${only} ORDER BY created_at DESC LIMIT ${READ_ORDERS}`)
      .bind(...args(sinceTime)),
  ])

  const { groups, rows } = offered(catalog)
  const removed = new Map<string, InsightOption[]>()
  const optionFor = (group: string, key: string): InsightOption | undefined => {
    const known = rows.get(keyOf(group, key))
    if (known) return known
    if (!groups.some((candidate) => candidate.slug === group)) return undefined
    const gone: InsightOption = { key, label: `${key} (removed)`, picks: 0, requested: 0 }
    rows.set(keyOf(group, key), gone)
    removed.set(group, [...(removed.get(group) ?? []), gone])
    return gone
  }

  for (const row of pickRows?.results ?? []) {
    const option = optionFor(String(row.g), String(row.k))
    if (option) option.picks += number(row.n)
  }
  for (const row of snapshots?.results ?? []) {
    let snapshot: DesignSnapshot | null = null
    try {
      snapshot = JSON.parse(String(row.json)) as DesignSnapshot
    } catch {
      continue
    }
    for (const pick of designPicks(catalog.back, snapshot.choices)) {
      const option = optionFor(pick.group, pick.option)
      if (option) option.requested += 1
    }
  }
  for (const group of groups) group.options.push(...(removed.get(group.slug) ?? []))

  const visits = new Map((visitRows?.results ?? []).map((row) => [String(row.id), number(row.n)]))
  const requests = new Map((requestRows?.results ?? []).map((row) => [String(row.id), number(row.n)]))
  const bookmarks: InsightBookmark[] = catalog.bookmarks
    .filter((item) => (bookmark ? item.id === bookmark : item.available || visits.has(item.id) || requests.has(item.id)))
    .map((item) => ({ id: item.id, title: item.title, visits: visits.get(item.id) ?? 0, requests: requests.get(item.id) ?? 0 }))
  for (const id of new Set([...visits.keys(), ...requests.keys()])) {
    if (!bookmarks.some((item) => item.id === id)) bookmarks.push({ id, title: `${id} (removed)`, visits: visits.get(id) ?? 0, requests: requests.get(id) ?? 0 })
  }
  bookmarks.sort((a, b) => b.visits - a.visits || b.requests - a.requests || a.title.localeCompare(b.title))

  const sum = (counts: Map<string, number>): number => [...counts.values()].reduce((total, n) => total + n, 0)
  return {
    days,
    since,
    bookmark,
    totals: { visits: sum(visits), requests: sum(requests), orders: number(orderCount?.results[0]?.n) },
    choices: catalog.bookmarks.map((item) => ({ id: item.id, title: item.title })),
    bookmarks,
    groups,
  }
}
