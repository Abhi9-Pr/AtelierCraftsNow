import { STARTING_STATUS, orderStatuses, type OrderStatus } from '../../src/config/orderStatuses.ts'
import type { RequestType } from '../../src/types/index.ts'
import type { ApiEvent, ApiOrder, DesignSnapshot, EventKind } from '../../src/types/orders.ts'
import type { NewOrder } from './validateOrder.ts'

export interface OrderRow {
  id: string
  number: number
  created_at: string
  updated_at: string
  status: OrderStatus
  name: string
  email: string
  request_type: RequestType
  quantity: number | null
  idea: string | null
  reference_link: string | null
  bookmark_id: string | null
  design_text: string | null
  bookmark_title: string | null
  price_total: number | null
  design_json: string | null
}

export interface EventRow {
  id: number
  order_id: string
  at: string
  kind: EventKind
  from_status: string | null
  to_status: string | null
  note: string | null
  by: string | null
}

const COLUMNS =
  'id, number, created_at, updated_at, status, name, email, request_type, quantity, idea, reference_link, bookmark_id, design_text, bookmark_title, price_total, design_json'

/**
 * Adds an order and its first event together. The order number is the next one after the highest so far.
 * A back design order also keeps the snapshot the server made of its design.
 */
export async function insertOrder(
  db: D1Database,
  order: NewOrder,
  snapshot: DesignSnapshot | null,
  now: string,
): Promise<{ id: string; number: number }> {
  const id = crypto.randomUUID()
  const statements = () => [
    db
      .prepare(
        `INSERT INTO orders (${COLUMNS})
         VALUES (?1, (SELECT COALESCE(MAX(number), 1000) + 1 FROM orders), ?2, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
      )
      .bind(
        id,
        now,
        STARTING_STATUS,
        order.name,
        order.email,
        order.requestType,
        order.quantity,
        order.idea,
        order.referenceLink,
        snapshot?.bookmarkId ?? null,
        snapshot?.text ?? null,
        snapshot?.bookmarkTitle ?? null,
        snapshot?.price.total ?? null,
        snapshot ? JSON.stringify(snapshot) : null,
      ),
    db.prepare(`INSERT INTO order_events (order_id, at, kind) VALUES (?1, ?2, 'created')`).bind(id, now),
  ]

  // Two orders arriving in the same instant can pick the same number. The second is simply tried again.
  for (let attempt = 1; ; attempt++) {
    try {
      await db.batch(statements())
      break
    } catch (error) {
      if (attempt >= 3 || !(error instanceof Error) || !/UNIQUE/i.test(error.message)) throw error
    }
  }
  const row = await db.prepare('SELECT number FROM orders WHERE id = ?1').bind(id).first<{ number: number }>()
  return { id, number: row?.number ?? 0 }
}

export interface ListQuery {
  status?: OrderStatus
  q?: string
  limit: number
  /** "<created_at>|<id>" of the last order on the previous page */
  cursor?: string
}

/** Newest first. Searches the name, email, request type, bookmark and number. */
export async function listOrders(db: D1Database, query: ListQuery): Promise<{ orders: OrderRow[]; nextCursor: string | null }> {
  const args: (string | number)[] = []
  const arg = (value: string | number): string => {
    args.push(value)
    return `?${args.length}`
  }
  const where: string[] = []
  if (query.status) where.push(`status = ${arg(query.status)}`)
  if (query.q) {
    const like = arg(`%${query.q.replace(/[\\%_]/g, '\\$&')}%`)
    where.push(
      `(name LIKE ${like} ESCAPE '\\' OR email LIKE ${like} ESCAPE '\\' OR request_type LIKE ${like} ESCAPE '\\' OR bookmark_id LIKE ${like} ESCAPE '\\' OR CAST(number AS TEXT) LIKE ${like} ESCAPE '\\')`,
    )
  }
  const [at, id] = (query.cursor ?? '').split('|')
  if (at && id) {
    const before = arg(at)
    where.push(`(created_at < ${before} OR (created_at = ${before} AND id < ${arg(id)}))`)
  }

  const sql = `SELECT ${COLUMNS} FROM orders ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC LIMIT ${arg(query.limit + 1)}`
  const { results } = await db.prepare(sql).bind(...args).all<OrderRow>()
  const orders = results.slice(0, query.limit)
  const last = orders.at(-1)
  return { orders, nextCursor: results.length > query.limit && last ? `${last.created_at}|${last.id}` : null }
}

/** How many orders are in each status, every status included even when it is empty. */
export async function orderCounts(db: D1Database): Promise<Record<OrderStatus, number>> {
  const { results } = await db.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all<{ status: OrderStatus; n: number }>()
  const counts = Object.fromEntries(orderStatuses.map((status) => [status, 0])) as Record<OrderStatus, number>
  for (const row of results) counts[row.status] = row.n
  return counts
}

export async function getOrder(db: D1Database, id: string): Promise<{ order: OrderRow; events: EventRow[] } | null> {
  const order = await db.prepare(`SELECT ${COLUMNS} FROM orders WHERE id = ?1`).bind(id).first<OrderRow>()
  if (!order) return null
  const { results } = await db.prepare('SELECT id, order_id, at, kind, from_status, to_status, note, by FROM order_events WHERE order_id = ?1 ORDER BY id').bind(id).all<EventRow>()
  return { order, events: results }
}

export async function addEvent(db: D1Database, orderId: string, kind: EventKind, now: string, note: string | null = null): Promise<void> {
  await db.prepare('INSERT INTO order_events (order_id, at, kind, note) VALUES (?1, ?2, ?3, ?4)').bind(orderId, now, kind, note).run()
}

/** Changes the status, adds a note, or both. Each is recorded in the history with who did it. False if there is no such order. */
export async function changeOrder(
  db: D1Database,
  id: string,
  change: { status?: OrderStatus; note?: string },
  by: string,
  now: string,
): Promise<boolean> {
  const current = await db.prepare('SELECT status FROM orders WHERE id = ?1').bind(id).first<{ status: OrderStatus }>()
  if (!current) return false

  const statements: D1PreparedStatement[] = []
  if (change.status && change.status !== current.status) {
    statements.push(
      db.prepare('UPDATE orders SET status = ?2, updated_at = ?3 WHERE id = ?1').bind(id, change.status, now),
      db.prepare(`INSERT INTO order_events (order_id, at, kind, from_status, to_status, by) VALUES (?1, ?2, 'status', ?3, ?4, ?5)`).bind(id, now, current.status, change.status, by),
    )
  }
  if (change.note) {
    statements.push(
      db.prepare('UPDATE orders SET updated_at = ?2 WHERE id = ?1').bind(id, now),
      db.prepare(`INSERT INTO order_events (order_id, at, kind, note, by) VALUES (?1, ?2, 'note', ?3, ?4)`).bind(id, now, change.note, by),
    )
  }
  if (statements.length > 0) await db.batch(statements)
  return true
}

/** Removes an order and its whole history, for a customer who asks to be forgotten. */
export async function deleteOrder(db: D1Database, id: string): Promise<boolean> {
  const exists = await db.prepare('SELECT 1 AS found FROM orders WHERE id = ?1').bind(id).first()
  if (!exists) return false
  await db.batch([db.prepare('DELETE FROM order_events WHERE order_id = ?1').bind(id), db.prepare('DELETE FROM orders WHERE id = ?1').bind(id)])
  return true
}

/** The stored snapshot as data. A damaged one reads as none rather than breaking the whole list. */
function readSnapshot(text: string | null): DesignSnapshot | null {
  if (!text) return null
  try {
    return JSON.parse(text) as DesignSnapshot
  } catch {
    return null
  }
}

/** What the dashboard receives: the same order, with readable names. */
export const orderToApi = (row: OrderRow): ApiOrder => ({
  id: row.id,
  number: row.number,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  status: row.status,
  name: row.name,
  email: row.email,
  requestType: row.request_type,
  quantity: row.quantity,
  idea: row.idea,
  referenceLink: row.reference_link,
  bookmarkId: row.bookmark_id,
  bookmarkTitle: row.bookmark_title,
  design: row.design_text,
  priceTotal: row.price_total,
  designSnapshot: readSnapshot(row.design_json),
})

export const eventToApi = (row: EventRow): ApiEvent => ({
  id: row.id,
  at: row.at,
  kind: row.kind,
  from: row.from_status,
  to: row.to_status,
  note: row.note,
  by: row.by,
})
