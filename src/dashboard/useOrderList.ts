import { useCallback, useEffect, useRef, useState } from 'react'
import type { OrderStatus } from '@/config/orderStatuses'
import type { ApiOrder, OrderCounts } from '@/types/orders'
import { ApiError, fetchOrders, type ListFilter } from './api'

export interface OrderList {
  filter: ListFilter
  setStatus: (status: OrderStatus | null) => void
  setSearch: (search: string) => void
  orders: ApiOrder[]
  counts: OrderCounts | null
  hasMore: boolean
  /** True until the first answer arrives */
  loading: boolean
  loadingMore: boolean
  error: string | null
  loadMore: () => void
  refresh: () => void
}

/**
 * The order list with its filter. It keeps what it shows while a fresh copy is fetched, ignores answers
 * that arrive after a newer question was asked, and fetches again when the owner comes back to the tab.
 */
export function useOrderList(active: boolean, onSignedOut: () => void): OrderList {
  const [filter, setFilter] = useState<ListFilter>({ status: null, search: '' })
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [counts, setCounts] = useState<OrderCounts | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const asked = useRef(0)

  const fail = useCallback(
    (failure: unknown) => {
      if (failure instanceof ApiError && failure.kind === 'signed-out') onSignedOut()
      setError(failure instanceof Error ? failure.message : 'Something went wrong.')
    },
    [onSignedOut],
  )

  useEffect(() => {
    const ticket = ++asked.current
    fetchOrders(filter, null).then(
      (page) => {
        if (ticket !== asked.current) return
        setOrders(page.orders)
        setCounts(page.counts)
        setCursor(page.nextCursor)
        setError(null)
        setLoading(false)
      },
      (failure: unknown) => {
        if (ticket !== asked.current) return
        fail(failure)
        setLoading(false)
      },
    )
  }, [filter, tick, fail])

  useEffect(() => {
    if (!active) return
    const back = () => document.visibilityState === 'visible' && setTick((count) => count + 1)
    document.addEventListener('visibilitychange', back)
    return () => document.removeEventListener('visibilitychange', back)
  }, [active])

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return
    const ticket = asked.current
    setLoadingMore(true)
    fetchOrders(filter, cursor).then(
      (page) => {
        if (ticket !== asked.current) return
        setOrders((shown) => [...shown, ...page.orders.filter((order) => !shown.some((known) => known.id === order.id))])
        setCounts(page.counts)
        setCursor(page.nextCursor)
        setLoadingMore(false)
      },
      (failure: unknown) => {
        fail(failure)
        setLoadingMore(false)
      },
    )
  }, [cursor, loadingMore, filter, fail])

  const setStatus = useCallback((status: OrderStatus | null) => setFilter((was) => ({ ...was, status })), [])
  const setSearch = useCallback((search: string) => setFilter((was) => (was.search === search ? was : { ...was, search })), [])
  const refresh = useCallback(() => setTick((count) => count + 1), [])

  return {
    filter,
    setStatus,
    setSearch,
    orders,
    counts,
    hasMore: cursor !== null,
    loading,
    loadingMore,
    error,
    loadMore,
    refresh,
  }
}
