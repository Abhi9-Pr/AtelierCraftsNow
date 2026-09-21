import type { OrderStatus } from '@/config/orderStatuses'
import type { ApiInsights } from '@/types/insights'
import type { ApiEvent, ApiOrder, OrderCounts } from '@/types/orders'
import { readSnapshot } from './snapshot'

/** Why a request to the order service did not give an answer the dashboard can use. */
export type FailureKind = 'signed-out' | 'not-set-up' | 'not-found' | 'unreachable' | 'rejected'

export class ApiError extends Error {
  kind: FailureKind

  constructor(kind: FailureKind, message: string) {
    super(message)
    this.kind = kind
  }
}

export interface OrderPage {
  orders: ApiOrder[]
  counts: OrderCounts
  nextCursor: string | null
}

export interface OrderWithHistory {
  order: ApiOrder
  events: ApiEvent[]
}

export interface ListFilter {
  status: OrderStatus | null
  search: string
}

const UNREACHABLE =
  'The order service did not answer. On a test copy on your own computer, it needs npm run api (see docs/ORDERS.md).'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Sends one request and returns the JSON the service answered with, or throws an ApiError that says which kind of trouble it was. */
async function request(path: string, init?: { method: string; body?: unknown }): Promise<Record<string, unknown>> {
  let response: Response
  try {
    response = await fetch(path, {
      method: init?.method ?? 'GET',
      headers: init?.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new ApiError('unreachable', UNREACHABLE)
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    throw new ApiError('unreachable', UNREACHABLE)
  }
  if (!isRecord(body)) throw new ApiError('unreachable', UNREACHABLE)
  if (response.ok && body.ok === true) return body

  if (response.status === 401) throw new ApiError('signed-out', 'Please sign in.')
  if (response.status === 503) throw new ApiError('not-set-up', 'The order database is not set up on this site yet. See docs/SETUP.md.')
  if (response.status === 404) throw new ApiError('not-found', 'That order could not be found. It may have been deleted.')
  throw new ApiError('rejected', 'That did not work. Please try again.')
}

const withHistory = (body: Record<string, unknown>): OrderWithHistory => {
  const order = body.order as ApiOrder
  return { order: { ...order, designSnapshot: readSnapshot(order.designSnapshot) }, events: body.events as ApiEvent[] }
}

const filterParams = ({ status, search }: ListFilter): URLSearchParams => {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (search) params.set('q', search)
  return params
}

/** The GitHub login that is signed in. */
export async function fetchSession(): Promise<string> {
  const body = await request('/api/admin/session')
  return String(body.login)
}

export async function fetchOrders(filter: ListFilter, cursor: string | null): Promise<OrderPage> {
  const params = filterParams(filter)
  if (cursor) params.set('cursor', cursor)
  const body = await request(`/api/admin/orders?${params}`)
  const orders = (body.orders as ApiOrder[]).map((order) => ({ ...order, designSnapshot: readSnapshot(order.designSnapshot) }))
  return { orders, counts: body.counts as OrderCounts, nextCursor: typeof body.nextCursor === 'string' ? body.nextCursor : null }
}

export const fetchOrder = async (id: string): Promise<OrderWithHistory> => withHistory(await request(`/api/admin/orders/${id}`))

export const changeOrder = async (id: string, change: { status: OrderStatus } | { note: string }): Promise<OrderWithHistory> =>
  withHistory(await request(`/api/admin/orders/${id}`, { method: 'PATCH', body: change }))

export async function deleteOrder(id: string): Promise<void> {
  await request(`/api/admin/orders/${id}`, { method: 'DELETE' })
}

export async function fetchInsights(days: number, bookmark: string | null): Promise<ApiInsights> {
  const params = new URLSearchParams({ days: String(days) })
  if (bookmark) params.set('bookmark', bookmark)
  const body = await request(`/api/admin/insights?${params}`)
  return body.insights as ApiInsights
}

export async function signOut(): Promise<void> {
  await request('/api/admin/logout', { method: 'POST' })
}

/** Where the spreadsheet of the orders matching a filter can be fetched. */
export function exportAddress(filter: ListFilter): string {
  const query = filterParams(filter).toString()
  return query ? `/api/admin/export?${query}` : '/api/admin/export'
}
