import { orderStatuses, orderStatusLabels, type OrderStatus } from '../../../src/config/orderStatuses.ts'
import { requestTypeLabel } from '../../../src/config/requestTypes.ts'
import { requireAdmin } from '../../_lib/admin.ts'
import { toCsv } from '../../_lib/csv.ts'
import type { Env } from '../../_lib/env.ts'
import { fail, methodNotAllowed } from '../../_lib/http.ts'
import { listOrders, type OrderRow } from '../../_lib/orders.ts'

const PAGE = 100
/** A shop this size will not reach it. It stops one request from reading the whole database for ever. */
const MAX_ROWS = 5000
const MAX_SEARCH = 100

const HEADINGS = [
  'Number',
  'Received',
  'Last changed',
  'Status',
  'Name',
  'Email',
  'Request type',
  'Quantity',
  'Idea',
  'Reference link',
  'Bookmark',
  'Price (INR)',
  'Design',
] as const

const toRow = (order: OrderRow) => [
  order.number,
  order.created_at,
  order.updated_at,
  orderStatusLabels[order.status],
  order.name,
  order.email,
  requestTypeLabel(order.request_type),
  order.quantity,
  order.idea,
  order.reference_link,
  order.bookmark_title,
  order.price_total,
  order.design_text,
]

/** Every order that matches the same status and search the dashboard list uses, as a spreadsheet file. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env, false)
  if (admin instanceof Response) return admin

  const params = new URL(request.url).searchParams
  const status = params.get('status')
  if (status && !orderStatuses.some((known) => known === status)) return fail(400, 'invalid_status')
  const search = (params.get('q') ?? '').trim().slice(0, MAX_SEARCH)

  const orders: OrderRow[] = []
  let cursor: string | null = null
  do {
    const page = await listOrders(admin.db, {
      limit: PAGE,
      ...(status ? { status: status as OrderStatus } : {}),
      ...(search ? { q: search } : {}),
      ...(cursor ? { cursor } : {}),
    })
    orders.push(...page.orders)
    cursor = page.nextCursor
  } while (cursor && orders.length < MAX_ROWS)

  return new Response(toCsv([HEADINGS, ...orders.map(toRow)]), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export const onRequest: PagesFunction<Env> = async () => methodNotAllowed('GET')
