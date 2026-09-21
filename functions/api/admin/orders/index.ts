import { orderStatuses, type OrderStatus } from '../../../../src/config/orderStatuses.ts'
import { requireAdmin } from '../../../_lib/admin.ts'
import type { Env } from '../../../_lib/env.ts'
import { fail, json, methodNotAllowed } from '../../../_lib/http.ts'
import { listOrders, orderCounts, orderToApi } from '../../../_lib/orders.ts'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const MAX_SEARCH = 100

/** The order list: newest first, filtered by status or a search, a page at a time, with the count in each status. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env, false)
  if (admin instanceof Response) return admin

  const params = new URL(request.url).searchParams
  const status = params.get('status')
  if (status && !orderStatuses.some((known) => known === status)) return fail(400, 'invalid_status')
  const limit = Number(params.get('limit') ?? DEFAULT_LIMIT)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) return fail(400, 'invalid_limit')
  const search = (params.get('q') ?? '').trim().slice(0, MAX_SEARCH)
  const cursor = (params.get('cursor') ?? '').slice(0, 200)

  const [page, counts] = await Promise.all([
    listOrders(admin.db, {
      limit,
      ...(status ? { status: status as OrderStatus } : {}),
      ...(search ? { q: search } : {}),
      ...(cursor ? { cursor } : {}),
    }),
    orderCounts(admin.db),
  ])
  return json({ ok: true, orders: page.orders.map(orderToApi), counts, nextCursor: page.nextCursor })
}

export const onRequest: PagesFunction<Env> = async () => methodNotAllowed('GET')
